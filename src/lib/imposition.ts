// Saddle-stitch booklet imposition.
//
// A booklet is made of folded sheets nested inside each other. Each sheet is
// one piece of paper printed on both sides; folded in half it yields 4 pages.
// To make the finished, folded, stapled booklet read 1, 2, 3, ... in order,
// the pages must be arranged on the sheets in a specific paired order.
//
// For an N-page booklet (N a multiple of 4) with sheets numbered s = 0
// (outermost) .. N/4 - 1, using 1-based page numbers:
//
//   front of sheet s:  [ N - 2s        |  1 + 2s     ]   (left | right)
//   back  of sheet s:  [ 2 + 2s        |  N - 1 - 2s ]
//
// Example, N = 8 (2 sheets):
//   sheet 0 front: 8 | 1     sheet 0 back: 2 | 7
//   sheet 1 front: 6 | 3     sheet 1 back: 4 | 5
//
// The faces are emitted in print order: s0-front, s0-back, s1-front, s1-back,
// ... so a duplex printer produces correctly collated sheets to stack and fold.

import { PAGES_PER_SHEET } from "./constants";

export type FaceSide = "front" | "back";

export interface ImposedFace {
  sheetIndex: number;
  side: FaceSide;
  /** 0-based index into the pages array for the left half (null = blank). */
  left: number | null;
  /** 0-based index into the pages array for the right half (null = blank). */
  right: number | null;
}

/** Round a desired page count up to the nearest valid booklet size. */
export function roundUpToSheet(pageCount: number): number {
  return Math.ceil(pageCount / PAGES_PER_SHEET) * PAGES_PER_SHEET;
}

export function sheetCount(pageCount: number): number {
  return roundUpToSheet(pageCount) / PAGES_PER_SHEET;
}

/**
 * Compute the imposed faces for a booklet of `pageCount` pages.
 * `pageCount` should already be a multiple of 4; if not it is rounded up and
 * the extra slots are emitted as blanks (null).
 */
export function imposeBooklet(pageCount: number): ImposedFace[] {
  const n = roundUpToSheet(pageCount);
  const sheets = n / PAGES_PER_SHEET;
  const faces: ImposedFace[] = [];

  // Convert a 1-based page number to a 0-based page index, or null if it
  // falls beyond the actual pages (a padded blank).
  const idx = (pageNumber: number): number | null => {
    const i = pageNumber - 1;
    return i < pageCount ? i : null;
  };

  for (let s = 0; s < sheets; s++) {
    faces.push({
      sheetIndex: s,
      side: "front",
      left: idx(n - 2 * s),
      right: idx(1 + 2 * s),
    });
    faces.push({
      sheetIndex: s,
      side: "back",
      left: idx(2 + 2 * s),
      right: idx(n - 1 - 2 * s),
    });
  }

  return faces;
}
