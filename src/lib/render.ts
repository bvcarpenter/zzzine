// Shared image-slot compositing.
//
// This single routine is used both by the on-screen editor and by the PDF
// exporter, so what you arrange is exactly what prints. It draws an image into
// a rectangular page slot applying fit, zoom, pan, quarter-turn rotation and
// flips, clipped to the slot.

import type { PageImage } from "../types";

export interface SlotSize {
  width: number;
  height: number;
}

/**
 * Draw an image into the rectangle (0,0)-(W,H) of the given 2D context,
 * applying the PageImage transforms. The caller is responsible for any
 * translation to position the slot and for the slot background.
 *
 * `srcW`/`srcH` are the natural pixel dimensions of the source image.
 */
export function drawImageSlot(
  ctx: CanvasRenderingContext2D,
  source: CanvasImageSource,
  srcW: number,
  srcH: number,
  image: PageImage,
  size: SlotSize,
): void {
  const { width: W, height: H } = size;
  if (!srcW || !srcH) return;

  const swap = image.rotation === 90 || image.rotation === 270;
  // Effective image dimensions in slot axes after rotation.
  const ew = swap ? srcH : srcW;
  const eh = swap ? srcW : srcH;

  // Drawn image size in the image's own axes.
  let dw: number;
  let dh: number;
  if (image.fit === "fill") {
    dw = swap ? H : W;
    dh = swap ? W : H;
  } else {
    const s =
      image.fit === "cover"
        ? Math.max(W / ew, H / eh)
        : Math.min(W / ew, H / eh);
    dw = srcW * s;
    dh = srcH * s;
  }
  dw *= image.zoom;
  dh *= image.zoom;

  ctx.save();
  ctx.beginPath();
  ctx.rect(0, 0, W, H);
  ctx.clip();
  ctx.translate(W / 2 + image.offsetX * W, H / 2 + image.offsetY * H);
  ctx.rotate((image.rotation * Math.PI) / 180);
  ctx.scale(image.flipH ? -1 : 1, image.flipV ? -1 : 1);
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(source, -dw / 2, -dh / 2, dw, dh);
  ctx.restore();
}
