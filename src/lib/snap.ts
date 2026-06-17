// Snapping helper for free-form items: align a moving anchor to candidate lines.

export interface Snapped {
  /** The (possibly adjusted) position. */
  value: number;
  /** The line that was snapped to, or null if none was close enough. */
  line: number | null;
}

/**
 * Snap `pos` so that one of its `anchors` (offsets added to pos, e.g. the
 * left/center/right of a box) lands on the nearest `line` within `threshold`.
 */
export function snap1D(
  pos: number,
  anchors: number[],
  lines: number[],
  threshold: number,
): Snapped {
  let bestAbs = threshold;
  let bestDelta = 0;
  let bestLine: number | null = null;
  for (const a of anchors) {
    const anchorPos = pos + a;
    for (const line of lines) {
      const d = line - anchorPos;
      const ad = Math.abs(d);
      if (ad <= bestAbs) {
        bestAbs = ad;
        bestDelta = d;
        bestLine = line;
      }
    }
  }
  return { value: pos + bestDelta, line: bestLine };
}

/** One axis of a box: `start`..`start+size`, occupying cross-axis `lo`..`hi`. */
export interface AxisBox {
  start: number;
  size: number;
  lo: number;
  hi: number;
}

const r4 = (n: number) => Math.round(n * 1e4) / 1e4;

/**
 * Snap a moving box along one axis so its margins match the layout: equal gaps
 * between it and the neighbours on each side, or a gap equal to an existing gap
 * / canvas-edge margin of another box that shares its cross-axis band.
 *
 * Returns the adjusted `start` plus the edge positions to draw as guides, or
 * null if nothing is within `threshold`. Canvas bounds are assumed 0..1.
 */
export function marginSnap(
  box: AxisBox,
  siblings: AxisBox[],
  threshold: number,
): { value: number; guides: number[] } | null {
  const overlapping = siblings.filter((s) => s.lo < box.hi && s.hi > box.lo);
  if (overlapping.length === 0) return null;

  const x = box.start;
  const w = box.size;
  const right = x + w;

  let leftEdge: number | null = null; // nearest neighbour edge to the left
  let rightEdge: number | null = null; // nearest neighbour edge to the right
  for (const s of overlapping) {
    const sEnd = s.start + s.size;
    if (sEnd <= x + 1e-6) leftEdge = leftEdge === null ? sEnd : Math.max(leftEdge, sEnd);
    if (s.start >= right - 1e-6)
      rightEdge = rightEdge === null ? s.start : Math.min(rightEdge, s.start);
  }

  // Reference distances to match: each neighbour's canvas-edge margins and the
  // gaps between adjacent neighbours.
  const gaps = new Set<number>();
  for (const s of overlapping) {
    if (s.start > 1e-6) gaps.add(r4(s.start));
    const rm = 1 - (s.start + s.size);
    if (rm > 1e-6) gaps.add(r4(rm));
  }
  const sorted = [...overlapping].sort((a, b) => a.start - b.start);
  for (let i = 0; i < sorted.length - 1; i++) {
    const g = sorted[i + 1].start - (sorted[i].start + sorted[i].size);
    if (g > 1e-3) gaps.add(r4(g));
  }

  let best: { value: number; guides: number[] } | null = null;
  let bestAbs = threshold;
  const consider = (val: number, guides: number[]) => {
    const d = Math.abs(val - x);
    if (d <= bestAbs) {
      bestAbs = d;
      best = { value: val, guides };
    }
  };

  // Equal gaps on both sides (centre between two neighbours).
  if (leftEdge !== null && rightEdge !== null) {
    const xc = (leftEdge + rightEdge - w) / 2;
    consider(xc, [leftEdge, xc, xc + w, rightEdge]);
  }
  // Match an existing gap / margin against either neighbour.
  for (const d of gaps) {
    if (leftEdge !== null) consider(leftEdge + d, [leftEdge, leftEdge + d]);
    if (rightEdge !== null) consider(rightEdge - d - w, [rightEdge - d, rightEdge]);
  }
  return best;
}

/**
 * Like {@link marginSnap} but for resizing: the box `start` is fixed and the
 * far edge (start+size) moves. Snaps that edge so the gap to the right
 * neighbour matches the gap on the left, or an existing gap / margin. Returns
 * the new `size` and guide edges, or null.
 */
export function marginSnapEnd(
  box: AxisBox,
  siblings: AxisBox[],
  threshold: number,
): { size: number; guides: number[] } | null {
  const overlapping = siblings.filter((s) => s.lo < box.hi && s.hi > box.lo);
  if (overlapping.length === 0) return null;

  const start = box.start;
  const end = box.start + box.size;
  let leftEdge: number | null = null;
  let rightEdge: number | null = null;
  for (const s of overlapping) {
    const sEnd = s.start + s.size;
    if (sEnd <= start + 1e-6) leftEdge = leftEdge === null ? sEnd : Math.max(leftEdge, sEnd);
    if (s.start >= end - 1e-6)
      rightEdge = rightEdge === null ? s.start : Math.min(rightEdge, s.start);
  }

  const gaps = new Set<number>();
  for (const s of overlapping) {
    if (s.start > 1e-6) gaps.add(r4(s.start));
    const rm = 1 - (s.start + s.size);
    if (rm > 1e-6) gaps.add(r4(rm));
  }
  const sorted = [...overlapping].sort((a, b) => a.start - b.start);
  for (let i = 0; i < sorted.length - 1; i++) {
    const g = sorted[i + 1].start - (sorted[i].start + sorted[i].size);
    if (g > 1e-3) gaps.add(r4(g));
  }

  let best: { size: number; guides: number[] } | null = null;
  let bestAbs = threshold;
  const consider = (newEnd: number, guides: number[]) => {
    const d = Math.abs(newEnd - end);
    if (d <= bestAbs && newEnd - start > 0.02) {
      bestAbs = d;
      best = { size: newEnd - start, guides };
    }
  };

  // Make the right gap equal the left gap (symmetric margins).
  if (leftEdge !== null && rightEdge !== null) {
    const leftGap = start - leftEdge;
    consider(rightEdge - leftGap, [leftEdge, start, rightEdge - leftGap, rightEdge]);
  }
  for (const d of gaps) {
    if (rightEdge !== null) consider(rightEdge - d, [rightEdge - d, rightEdge]);
  }
  return best;
}
