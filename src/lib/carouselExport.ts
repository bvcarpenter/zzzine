// Carousel export: render each 4:5 slide to a 1080x1350 PNG and bundle them
// into a .zip for uploading to Instagram.

import { zipSync } from "fflate";
import { CAROUSEL_PX, frameSize } from "./dims";
import { cellRects } from "./layout";
import { drawImageSlot } from "./render";
import { loadImage } from "./image";
import { wrapLines } from "./textlayout";
import { fontCss, getFont } from "./fonts";
import type { Asset, Page, TextBlock, Zine } from "../types";

/** Draw a text block onto the frame canvas, mirroring the editor's CSS. */
function drawText(
  ctx: CanvasRenderingContext2D,
  block: TextBlock,
  W: number,
  H: number,
  pxPerPt: number,
) {
  if (!block.text.trim() && !block.background) return;
  const def = getFont(block.fontFamily);
  const bold = def.supportsStyles && block.bold;
  const italic = def.supportsStyles && block.italic;
  const fontSizePx = block.fontSize * pxPerPt;
  const lineHeight = fontSizePx * block.lineHeight;
  const maxWidth = block.width * W;
  const pad = block.background ? fontSizePx * 0.25 : 0;
  const contentWidth = Math.max(1, maxWidth - pad * 2);

  ctx.save();
  ctx.translate(block.x * W, block.y * H);
  ctx.rotate((block.rotation * Math.PI) / 180);

  ctx.font = `${italic ? "italic " : ""}${bold ? "700 " : ""}${fontSizePx}px ${fontCss(
    block.fontFamily,
  )}`;
  const lines = wrapLines(block.text || " ", contentWidth, (s) =>
    ctx.measureText(s).width,
  );
  const totalH = Math.max(lines.length, 1) * lineHeight;

  if (block.background) {
    ctx.fillStyle = block.background;
    ctx.fillRect(0, 0, maxWidth, totalH + pad * 2);
  }

  ctx.fillStyle = block.color;
  ctx.textBaseline = "top";
  ctx.textAlign = block.align;
  const tx =
    block.align === "center"
      ? maxWidth / 2
      : block.align === "right"
        ? maxWidth - pad
        : pad;
  lines.forEach((line, k) => {
    const ly = pad + k * lineHeight + (lineHeight - fontSizePx) / 2;
    ctx.fillText(line, tx, ly);
  });
  ctx.restore();
}

async function renderFrame(
  page: Page,
  assetById: Map<string, Asset>,
  imgCache: Map<string, HTMLImageElement>,
): Promise<HTMLCanvasElement> {
  const { width: W, height: H } = CAROUSEL_PX;
  const frame = frameSize("carousel");
  const pxPerPt = W / frame.width;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = page.background;
  ctx.fillRect(0, 0, W, H);

  const rects = cellRects(
    page.layout,
    page.gutter / frame.width,
    page.gutter / frame.height,
  );
  for (let i = 0; i < page.cells.length; i++) {
    const cell = page.cells[i];
    const rect = rects[i];
    if (!cell || !rect) continue;
    const asset = assetById.get(cell.assetId);
    if (!asset) continue;
    let el = imgCache.get(asset.id);
    if (!el) {
      el = await loadImage(asset.dataUrl);
      imgCache.set(asset.id, el);
    }
    const cw = rect.w * W;
    const ch = rect.h * H;
    ctx.save();
    ctx.translate(rect.x * W, rect.y * H);
    if (page.span && i === 0) {
      ctx.translate(-page.span.index * cw, 0);
      drawImageSlot(ctx, el, asset.width, asset.height, cell, {
        width: cw * page.span.count,
        height: ch,
      });
    } else {
      drawImageSlot(ctx, el, asset.width, asset.height, cell, {
        width: cw,
        height: ch,
      });
    }
    ctx.restore();
  }

  for (const t of page.texts) drawText(ctx, t, W, H, pxPerPt);
  return canvas;
}

function canvasToBytes(canvas: HTMLCanvasElement): Promise<Uint8Array> {
  return new Promise((resolve, reject) => {
    canvas.toBlob((blob) => {
      if (!blob) return reject(new Error("Could not render slide"));
      blob
        .arrayBuffer()
        .then((buf) => resolve(new Uint8Array(buf)))
        .catch(reject);
    }, "image/png");
  });
}

/** Render every slide and download a .zip of numbered PNGs. */
export async function exportCarouselZip(
  doc: Zine,
  assets: Asset[],
): Promise<void> {
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const imgCache = new Map<string, HTMLImageElement>();
  const files: Record<string, Uint8Array> = {};
  for (let i = 0; i < doc.pages.length; i++) {
    const canvas = await renderFrame(doc.pages[i], assetById, imgCache);
    files[`${String(i + 1).padStart(2, "0")}.png`] = await canvasToBytes(canvas);
  }
  // PNGs are already compressed, so store them without re-deflating.
  const zipped = zipSync(files, { level: 0 });
  const blob = new Blob([zipped as BlobPart], { type: "application/zip" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safe = (doc.title || "carousel").replace(/[^a-z0-9-_]+/gi, "_");
  a.href = url;
  a.download = `${safe}.zip`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
