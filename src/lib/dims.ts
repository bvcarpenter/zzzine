// Frame dimensions per document kind.
//
// Zine pages are half-letter (5.5x8.5"). Instagram carousel frames are 4:5
// portrait, exported at 1080x1350px. The editor works in "points"; carousel
// frames use a comparable point size so font sizes feel consistent, and export
// rasters at the real pixel size.

import { PAGE_HEIGHT_PT, PAGE_WIDTH_PT } from "./constants";
import type { DocKind } from "../types";

export interface FrameSize {
  width: number;
  height: number;
}

/** Carousel frame in editor points (4:5). */
export const CAROUSEL_FRAME: FrameSize = { width: 432, height: 540 };
/** Carousel export pixels (Instagram 4:5 portrait). */
export const CAROUSEL_PX: FrameSize = { width: 1080, height: 1350 };

export const MIN_SLIDES = 1;
export const MAX_SLIDES = 20;

export function frameSize(kind: DocKind): FrameSize {
  return kind === "carousel"
    ? CAROUSEL_FRAME
    : { width: PAGE_WIDTH_PT, height: PAGE_HEIGHT_PT };
}

export function frameAspect(kind: DocKind): number {
  const f = frameSize(kind);
  return f.width / f.height;
}
