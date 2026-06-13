// PDF export with saddle-stitch booklet imposition.
//
// Pages are laid out two-up on landscape letter sheets in fold order. Image
// content is composited (with all transforms) onto a canvas and embedded as a
// raster so it matches the editor exactly; text and page numbers are drawn as
// crisp vector text using the chosen fonts.

import {
  PDFDocument,
  PDFFont,
  rgb,
  degrees,
  type RGB,
} from "pdf-lib";
import fontkit from "@pdf-lib/fontkit";
import {
  PAGE_HEIGHT_PT,
  PAGE_WIDTH_PT,
  PT_PER_INCH,
  SHEET_HEIGHT_PT,
  SHEET_WIDTH_PT,
} from "./constants";
import { imposeBooklet } from "./imposition";
import { cellRects } from "./layout";
import { FONTS, getFont } from "./fonts";
import { wrapLines } from "./textlayout";
import { drawImageSlot } from "./render";
import { loadImage } from "./image";
import type { Asset, Page, TextBlock, Zine } from "../types";

export interface ExportOptions {
  /** Raster DPI used for composited image content. */
  dpi: number;
  /** Rotate back faces 180° for printers that flip on the long edge. */
  longEdgeBinding: boolean;
  /** Draw a light dashed fold line down the spine of each sheet. */
  foldGuide: boolean;
}

export const DEFAULT_EXPORT_OPTIONS: ExportOptions = {
  dpi: 300,
  longEdgeBinding: false,
  foldGuide: false,
};

function hexToRgb(hex: string): RGB {
  let h = hex.replace("#", "").trim();
  if (h.length === 3) {
    h = h
      .split("")
      .map((c) => c + c)
      .join("");
  }
  const n = parseInt(h, 16);
  if (Number.isNaN(n)) return rgb(0, 0, 0);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
}

/** Page number shown for a 0-based page index, or null if not numbered. */
export function pageNumberFor(
  doc: Zine,
  index: number,
): string | null {
  const pn = doc.pageNumbers;
  if (!pn.enabled) return null;
  const last = doc.pages.length - 1;
  if (pn.skipCovers && (index === 0 || index === last)) return null;
  const offset = pn.skipCovers ? 1 : 0;
  return String(pn.startAt + (index - offset));
}

/** Rotate (px,py) around (ax,ay) by `rad` (counter-clockwise, y-up). */
function rotatePoint(px: number, py: number, ax: number, ay: number, rad: number) {
  const dx = px - ax;
  const dy = py - ay;
  return {
    x: ax + dx * Math.cos(rad) - dy * Math.sin(rad),
    y: ay + dx * Math.sin(rad) + dy * Math.cos(rad),
  };
}

interface FontResolver {
  forBlock: (fontFamily: string, bold: boolean, italic: boolean) => PDFFont;
}

/** Embed every font referenced by the document up front. */
async function buildFontResolver(
  pdf: PDFDocument,
  doc: Zine,
): Promise<FontResolver> {
  const cache = new Map<string, PDFFont>();

  const usedKeys = new Set<string>();
  for (const page of doc.pages) {
    for (const t of page.texts) usedKeys.add(t.fontFamily);
  }
  if (doc.pageNumbers.enabled) usedKeys.add(doc.pageNumbers.fontFamily);

  for (const key of usedKeys) {
    const def = getFont(key);
    if (def.kind === "embedded" && def.file) {
      const url = `${import.meta.env.BASE_URL}${def.file}`;
      const bytes = await (await fetch(url)).arrayBuffer();
      const font = await pdf.embedFont(bytes, { subset: true });
      cache.set(`embedded:${key}`, font);
    } else if (def.standard) {
      cache.set(`std:${key}:r`, await pdf.embedFont(def.standard.regular));
      cache.set(`std:${key}:b`, await pdf.embedFont(def.standard.bold));
      cache.set(`std:${key}:i`, await pdf.embedFont(def.standard.italic));
      cache.set(`std:${key}:bi`, await pdf.embedFont(def.standard.boldItalic));
    }
  }

  const fallback = await pdf.embedFont(
    getFont("helvetica").standard!.regular,
  );

  return {
    forBlock(fontFamily, bold, italic) {
      const def = getFont(fontFamily);
      if (def.kind === "embedded") {
        return cache.get(`embedded:${fontFamily}`) ?? fallback;
      }
      const suffix = bold && italic ? "bi" : bold ? "b" : italic ? "i" : "r";
      return cache.get(`std:${fontFamily}:${suffix}`) ?? fallback;
    },
  };
}

/** Composite a page's image cells (if any) to a JPEG data URL at export DPI. */
async function renderPageImage(
  page: Page,
  assetById: Map<string, Asset>,
  imgCache: Map<string, HTMLImageElement>,
  dpi: number,
): Promise<string | null> {
  const rects = cellRects(
    page.layout,
    page.gutter / PAGE_WIDTH_PT,
    page.gutter / PAGE_HEIGHT_PT,
  );
  const filled = page.cells
    .map((cell, i) => ({ cell, rect: rects[i] }))
    .filter((x) => x.cell && x.rect);
  if (filled.length === 0) return null;

  const scale = dpi / PT_PER_INCH;
  const w = Math.round(PAGE_WIDTH_PT * scale);
  const h = Math.round(PAGE_HEIGHT_PT * scale);
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  // Bake the page background so the composited JPEG fills gutters/letterboxing.
  ctx.fillStyle = page.background;
  ctx.fillRect(0, 0, w, h);

  for (const { cell, rect } of filled) {
    const asset = assetById.get(cell!.assetId);
    if (!asset) continue;
    let el = imgCache.get(asset.id);
    if (!el) {
      el = await loadImage(asset.dataUrl);
      imgCache.set(asset.id, el);
    }
    ctx.save();
    ctx.translate(rect.x * w, rect.y * h);
    drawImageSlot(ctx, el, asset.width, asset.height, cell!, {
      width: rect.w * w,
      height: rect.h * h,
    });
    ctx.restore();
  }

  return canvas.toDataURL("image/jpeg", 0.92);
}

/** Draw one finished page into the PDF page at offset (ox, oy) [bottom-left]. */
function drawPage(
  pdfPage: ReturnType<PDFDocument["addPage"]>,
  page: Page,
  ox: number,
  oy: number,
  fonts: FontResolver,
  imageEmbed: Awaited<ReturnType<PDFDocument["embedJpg"]>> | null,
  pageNumber: string | null,
  doc: Zine,
  isVerso: boolean,
) {
  const W = PAGE_WIDTH_PT;
  const H = PAGE_HEIGHT_PT;

  // Background.
  pdfPage.drawRectangle({
    x: ox,
    y: oy,
    width: W,
    height: H,
    color: hexToRgb(page.background),
  });

  // Image (covers the full page; its own background is already baked in).
  if (imageEmbed) {
    pdfPage.drawImage(imageEmbed, { x: ox, y: oy, width: W, height: H });
  }

  // Text blocks (in array order; later = on top).
  for (const t of page.texts) {
    drawTextBlock(pdfPage, t, ox, oy, fonts);
  }

  // Page number.
  if (pageNumber) {
    drawPageNumber(pdfPage, pageNumber, ox, oy, fonts, doc, isVerso);
  }
}

function drawTextBlock(
  pdfPage: ReturnType<PDFDocument["addPage"]>,
  t: TextBlock,
  ox: number,
  oy: number,
  fonts: FontResolver,
) {
  if (!t.text.trim() && !t.background) return;
  const W = PAGE_WIDTH_PT;
  const H = PAGE_HEIGHT_PT;
  const font = fonts.forBlock(t.fontFamily, t.bold, t.italic);
  const size = t.fontSize;
  const lineHeight = size * t.lineHeight;
  const maxWidth = t.width * W;

  const lines = wrapLines(t.text, maxWidth, (s) =>
    font.widthOfTextAtSize(s, size),
  );

  const blockLeft = ox + t.x * W;
  const blockTop = oy + H - t.y * H; // pdf y of the top of the block
  const anchorX = blockLeft;
  const anchorY = blockTop;
  const rad = (-t.rotation * Math.PI) / 180; // CSS clockwise -> pdf ccw

  const totalHeight = Math.max(lines.length, 1) * lineHeight;

  // Optional background rectangle behind the text.
  if (t.background) {
    const pad = size * 0.25;
    // Rectangle corners (unrotated), then rotated about the anchor.
    const corners = [
      { x: blockLeft - pad, y: blockTop + pad },
      { x: blockLeft + maxWidth + pad, y: blockTop + pad },
      { x: blockLeft + maxWidth + pad, y: blockTop - totalHeight - pad },
      { x: blockLeft - pad, y: blockTop - totalHeight - pad },
    ].map((c) => rotatePoint(c.x, c.y, anchorX, anchorY, rad));
    // pdf-lib has no polygon fill helper exposed simply; approximate with a
    // rotated rectangle drawn from its lower-left corner.
    const originRot = corners[3];
    pdfPage.drawRectangle({
      x: originRot.x,
      y: originRot.y,
      width: maxWidth + pad * 2,
      height: totalHeight + pad * 2,
      color: hexToRgb(t.background),
      rotate: degrees(-t.rotation),
    });
  }

  const ascent = size * 0.8;
  lines.forEach((line, i) => {
    const lineWidth = font.widthOfTextAtSize(line, size);
    let lx = blockLeft;
    if (t.align === "center") lx = blockLeft + (maxWidth - lineWidth) / 2;
    else if (t.align === "right") lx = blockLeft + (maxWidth - lineWidth);

    const baselineY =
      blockTop - i * lineHeight - (ascent + (lineHeight - size) / 2);
    const p = rotatePoint(lx, baselineY, anchorX, anchorY, rad);
    pdfPage.drawText(line, {
      x: p.x,
      y: p.y,
      size,
      font,
      color: hexToRgb(t.color),
      rotate: degrees(-t.rotation),
    });
  });
}

function drawPageNumber(
  pdfPage: ReturnType<PDFDocument["addPage"]>,
  label: string,
  ox: number,
  oy: number,
  fonts: FontResolver,
  doc: Zine,
  isVerso: boolean,
) {
  const pn = doc.pageNumbers;
  const font = fonts.forBlock(pn.fontFamily, false, false);
  const size = pn.fontSize;
  const margin = 0.4 * PT_PER_INCH;
  const textWidth = font.widthOfTextAtSize(label, size);

  // Outer edge is right for recto (odd) pages, left for verso (even) pages.
  // Resolve the concrete horizontal placement from the abstract position.
  const pos = pn.position;
  let horiz: "left" | "center" | "right" = "center";
  if (pos === "bottom-center" || pos === "top-center") horiz = "center";
  else if (pos === "bottom-outer" || pos === "top-outer")
    horiz = isVerso ? "left" : "right";
  else if (pos === "bottom-inner") horiz = isVerso ? "right" : "left";

  let x = ox + (PAGE_WIDTH_PT - textWidth) / 2;
  if (horiz === "left") x = ox + margin;
  else if (horiz === "right") x = ox + PAGE_WIDTH_PT - margin - textWidth;

  const top = pos === "top-center" || pos === "top-outer";
  const y = top ? oy + PAGE_HEIGHT_PT - margin : oy + margin;

  pdfPage.drawText(label, { x, y, size, font, color: hexToRgb(pn.color) });
}

export async function exportZinePdf(
  doc: Zine,
  assets: Asset[],
  options: Partial<ExportOptions> = {},
): Promise<Uint8Array> {
  const opts = { ...DEFAULT_EXPORT_OPTIONS, ...options };
  const pdf = await PDFDocument.create();
  pdf.registerFontkit(fontkit);
  pdf.setTitle(doc.title || "zine");
  pdf.setCreator("zzzine");

  const fonts = await buildFontResolver(pdf, doc);
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const imgCache = new Map<string, HTMLImageElement>();

  // Pre-render each page's composited image once.
  const pageImageData: (string | null)[] = [];
  for (const page of doc.pages) {
    pageImageData.push(
      await renderPageImage(page, assetById, imgCache, opts.dpi),
    );
  }

  const faces = imposeBooklet(doc.pages.length);

  for (const face of faces) {
    const sheet = pdf.addPage([SHEET_WIDTH_PT, SHEET_HEIGHT_PT]);
    if (opts.longEdgeBinding && face.side === "back") {
      sheet.setRotation(degrees(180));
    }

    const halves: Array<{ index: number | null; ox: number; isVerso: boolean }> =
      [
        // Left page is a verso (even page); right page is a recto (odd page).
        { index: face.left, ox: 0, isVerso: true },
        { index: face.right, ox: PAGE_WIDTH_PT, isVerso: false },
      ];

    for (const half of halves) {
      if (half.index == null) continue;
      const page = doc.pages[half.index];
      const dataUrl = pageImageData[half.index];
      const embed = dataUrl ? await pdf.embedJpg(dataUrl) : null;
      drawPage(
        sheet,
        page,
        half.ox,
        0,
        fonts,
        embed,
        pageNumberFor(doc, half.index),
        doc,
        half.isVerso,
      );
    }

    if (opts.foldGuide) {
      sheet.drawLine({
        start: { x: PAGE_WIDTH_PT, y: 0 },
        end: { x: PAGE_WIDTH_PT, y: SHEET_HEIGHT_PT },
        thickness: 0.5,
        color: rgb(0.7, 0.7, 0.7),
        dashArray: [3, 3],
      });
    }
  }

  return pdf.save();
}

/** Convenience: build the PDF and trigger a browser download. */
export async function downloadZinePdf(
  doc: Zine,
  assets: Asset[],
  options: Partial<ExportOptions> = {},
): Promise<void> {
  const bytes = await exportZinePdf(doc, assets, options);
  const blob = new Blob([bytes as BlobPart], { type: "application/pdf" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safe = (doc.title || "zine").replace(/[^a-z0-9-_]+/gi, "_");
  a.href = url;
  a.download = `${safe}.pdf`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

/** List of fonts for UI pickers, grouped by category. */
export function fontOptions() {
  return FONTS.map((f) => ({ key: f.key, label: f.label, category: f.category }));
}
