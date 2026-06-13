// Image import helpers. Imported images are drawn to a canvas, downscaled to a
// sane maximum dimension, and re-encoded so that documents stay small enough to
// persist locally and export quickly.

import type { Asset } from "../types";

/** Longest edge (px) an imported image is downscaled to. */
const MAX_DIMENSION = 2200;
const JPEG_QUALITY = 0.88;

let assetCounter = 0;
function nextAssetId(): string {
  assetCounter += 1;
  return `asset-${Date.now().toString(36)}-${assetCounter}`;
}

/** Load an HTMLImageElement from a data/object URL. */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("Could not load image"));
    img.src = src;
  });
}

function hasAlpha(file: File): boolean {
  return file.type === "image/png" || file.type === "image/webp";
}

/**
 * Read an image File into an Asset, downscaling large images. PNG/WebP (which
 * may have transparency) are re-encoded as PNG; everything else as JPEG.
 */
export async function importImageFile(file: File): Promise<Asset> {
  const objectUrl = URL.createObjectURL(file);
  try {
    const img = await loadImage(objectUrl);
    const { naturalWidth: w, naturalHeight: h } = img;
    const scale = Math.min(1, MAX_DIMENSION / Math.max(w, h));
    const outW = Math.max(1, Math.round(w * scale));
    const outH = Math.max(1, Math.round(h * scale));

    const canvas = document.createElement("canvas");
    canvas.width = outW;
    canvas.height = outH;
    const ctx = canvas.getContext("2d");
    if (!ctx) throw new Error("Canvas not supported");
    ctx.drawImage(img, 0, 0, outW, outH);

    const keepAlpha = hasAlpha(file);
    const dataUrl = keepAlpha
      ? canvas.toDataURL("image/png")
      : canvas.toDataURL("image/jpeg", JPEG_QUALITY);

    return {
      id: nextAssetId(),
      name: file.name,
      dataUrl,
      width: outW,
      height: outH,
    };
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

/** True if the data URL is a PNG (vs JPEG), used to pick the pdf-lib embedder. */
export function isPngDataUrl(dataUrl: string): boolean {
  return dataUrl.startsWith("data:image/png");
}

/** Decode a data URL into the raw bytes for embedding into a PDF. */
export function dataUrlToBytes(dataUrl: string): Uint8Array {
  const comma = dataUrl.indexOf(",");
  const b64 = dataUrl.slice(comma + 1);
  const binary = atob(b64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) bytes[i] = binary.charCodeAt(i);
  return bytes;
}
