// Carousel export: render the wide artboard once, slice it into 4:5 frames at
// 1080x1350, and bundle the numbered PNGs into a .zip for Instagram.

import { zipSync } from "fflate";
import { CAROUSEL_PX, frameSize } from "./dims";
import { drawImageSlot } from "./render";
import { loadImage } from "./image";
import { wrapLines } from "./textlayout";
import { fontCss, getFont } from "./fonts";
import type { Asset, Page, TextBlock, Zine } from "../types";

/** Draw a text block onto the canvas, mirroring the editor's CSS. */
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

/** Render the whole carousel artboard (all slides wide) to one canvas. */
async function renderArtboard(
  artboard: Page,
  slideCount: number,
  assetById: Map<string, Asset>,
  imgCache: Map<string, HTMLImageElement>,
): Promise<HTMLCanvasElement> {
  const frame = frameSize("carousel");
  const W = CAROUSEL_PX.width * slideCount;
  const H = CAROUSEL_PX.height;
  const pxPerPt = CAROUSEL_PX.width / frame.width;

  const canvas = document.createElement("canvas");
  canvas.width = W;
  canvas.height = H;
  const ctx = canvas.getContext("2d")!;
  ctx.fillStyle = artboard.background;
  ctx.fillRect(0, 0, W, H);

  for (const item of artboard.items) {
    const asset = assetById.get(item.assetId);
    if (!asset) continue;
    let el = imgCache.get(asset.id);
    if (!el) {
      el = await loadImage(asset.dataUrl);
      imgCache.set(asset.id, el);
    }
    ctx.save();
    ctx.translate(item.x * W, item.y * H);
    drawImageSlot(ctx, el, asset.width, asset.height, item, {
      width: item.w * W,
      height: item.h * H,
    });
    ctx.restore();
  }

  for (const t of artboard.texts) drawText(ctx, t, W, H, pxPerPt);
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

/** Render the artboard, slice it into slides, and download a .zip of PNGs. */
export async function exportCarouselZip(
  doc: Zine,
  assets: Asset[],
): Promise<void> {
  const artboard = doc.pages[0];
  if (!artboard) return;
  const slideCount = Math.max(1, doc.slideCount);
  const assetById = new Map(assets.map((a) => [a.id, a]));
  const imgCache = new Map<string, HTMLImageElement>();

  const wide = await renderArtboard(artboard, slideCount, assetById, imgCache);

  const { width: SW, height: SH } = CAROUSEL_PX;
  const files: Record<string, Uint8Array> = {};
  for (let k = 0; k < slideCount; k++) {
    const slide = document.createElement("canvas");
    slide.width = SW;
    slide.height = SH;
    const ctx = slide.getContext("2d")!;
    ctx.drawImage(wide, k * SW, 0, SW, SH, 0, 0, SW, SH);
    files[`${String(k + 1).padStart(2, "0")}.png`] = await canvasToBytes(slide);
  }

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
