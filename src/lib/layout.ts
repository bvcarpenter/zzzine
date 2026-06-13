// Image grid layouts: how a page's cells are arranged.

import type { LayoutKind } from "../types";

export interface Rect {
  /** All values are fractions of the page (0..1). */
  x: number;
  y: number;
  w: number;
  h: number;
}

interface LayoutDef {
  kind: LayoutKind;
  label: string;
  rows: number;
  cols: number;
}

export const LAYOUTS: LayoutDef[] = [
  { kind: "single", label: "Single", rows: 1, cols: 1 },
  { kind: "two-h", label: "2 across", rows: 1, cols: 2 },
  { kind: "two-v", label: "2 stacked", rows: 2, cols: 1 },
  { kind: "three-h", label: "3 across", rows: 1, cols: 3 },
  { kind: "three-v", label: "3 stacked", rows: 3, cols: 1 },
  { kind: "four", label: "4 grid", rows: 2, cols: 2 },
];

const BY_KIND = new Map(LAYOUTS.map((l) => [l.kind, l]));

export function layoutDef(kind: LayoutKind): LayoutDef {
  return BY_KIND.get(kind) ?? BY_KIND.get("single")!;
}

export function cellCount(kind: LayoutKind): number {
  const d = layoutDef(kind);
  return d.rows * d.cols;
}

/**
 * Cell rectangles for a layout, as fractions of the page. `gx`/`gy` are the
 * gutter as a fraction of page width/height; the gutter is applied both around
 * the outside and between cells.
 */
export function cellRects(kind: LayoutKind, gx: number, gy: number): Rect[] {
  const { rows, cols } = layoutDef(kind);
  const cellW = (1 - gx * (cols + 1)) / cols;
  const cellH = (1 - gy * (rows + 1)) / rows;
  const rects: Rect[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      rects.push({
        x: gx + c * (cellW + gx),
        y: gy + r * (cellH + gy),
        w: Math.max(0, cellW),
        h: Math.max(0, cellH),
      });
    }
  }
  return rects;
}
