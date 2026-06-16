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
