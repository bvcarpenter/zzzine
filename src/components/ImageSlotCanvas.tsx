import { useEffect, useRef, useState } from "react";
import { drawImageSlot } from "../lib/render";
import { loadImage } from "../lib/image";
import type { Asset, PageImage } from "../types";

interface Props {
  image: PageImage | null;
  asset: Asset | null;
  width: number;
  height: number;
}

/** Renders a page's image (with all transforms) into a crisp canvas. */
export function ImageSlotCanvas({ image, asset, width, height }: Props) {
  const ref = useRef<HTMLCanvasElement>(null);
  const [el, setEl] = useState<HTMLImageElement | null>(null);

  useEffect(() => {
    let active = true;
    if (!asset) {
      setEl(null);
      return;
    }
    loadImage(asset.dataUrl).then(
      (img) => active && setEl(img),
      () => active && setEl(null),
    );
    return () => {
      active = false;
    };
  }, [asset]);

  useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const dpr = window.devicePixelRatio || 1;
    const w = Math.max(1, Math.round(width));
    const h = Math.max(1, Math.round(height));
    canvas.width = Math.round(w * dpr);
    canvas.height = Math.round(h * dpr);
    canvas.style.width = `${w}px`;
    canvas.style.height = `${h}px`;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, w, h);
    if (el && image && asset) {
      drawImageSlot(ctx, el, asset.width, asset.height, image, {
        width: w,
        height: h,
      });
    }
  }, [el, image, asset, width, height]);

  return <canvas ref={ref} className="block h-full w-full" />;
}
