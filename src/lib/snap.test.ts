import { describe, expect, it } from "vitest";
import { type AxisBox, marginSnap, marginSnapEnd, snap1D } from "./snap";

describe("snap1D", () => {
  it("snaps to a line within threshold", () => {
    const r = snap1D(0.02, [0], [0], 0.05);
    expect(r.line).toBe(0);
    expect(r.value).toBeCloseTo(0);
  });

  it("ignores lines outside the threshold", () => {
    const r = snap1D(0.2, [0], [0], 0.05);
    expect(r.line).toBeNull();
    expect(r.value).toBeCloseTo(0.2);
  });

  it("snaps a non-origin anchor (e.g. the right edge)", () => {
    // pos=0.42, right edge anchor=+0.2 -> 0.62 snaps to line 0.6.
    const r = snap1D(0.42, [0, 0.2], [0.6], 0.05);
    expect(r.line).toBe(0.6);
    expect(r.value).toBeCloseTo(0.4); // moved so right edge hits 0.6
  });

  it("picks the closest line", () => {
    const r = snap1D(0.49, [0], [0.3, 0.5], 0.05);
    expect(r.line).toBe(0.5);
    expect(r.value).toBeCloseTo(0.5);
  });
});

const band = (start: number, size: number): AxisBox => ({ start, size, lo: 0, hi: 1 });

describe("marginSnap (move)", () => {
  const left = band(0, 0.2); // right edge 0.2
  const right = band(0.8, 0.2); // left edge 0.8

  it("centers between two neighbours (equal gaps)", () => {
    const r = marginSnap({ start: 0.41, size: 0.2, lo: 0, hi: 1 }, [left, right], 0.05);
    expect(r).not.toBeNull();
    expect(r!.value).toBeCloseTo(0.4); // gap 0.2 on each side
  });

  it("matches an existing gap between photos", () => {
    const a = band(0, 0.2); // right edge 0.2
    const b = band(0.3, 0.2); // gap a->b is 0.1
    // Dropping a third box just right of b should snap to a 0.1 gap.
    const r = marginSnap({ start: 0.61, size: 0.2, lo: 0, hi: 1 }, [a, b], 0.05);
    expect(r).not.toBeNull();
    expect(r!.value).toBeCloseTo(0.6);
  });

  it("ignores photos that don't share the cross-axis band", () => {
    const elsewhere: AxisBox = { start: 0, size: 0.2, lo: 0, hi: 0.3 };
    const r = marginSnap({ start: 0.41, size: 0.2, lo: 0.5, hi: 1 }, [elsewhere], 0.05);
    expect(r).toBeNull();
  });
});

describe("marginSnapEnd (resize)", () => {
  it("makes the right gap equal the left gap", () => {
    const a = band(0, 0.2); // left neighbour, right edge 0.2
    const c = band(0.8, 0.2); // right neighbour, left edge 0.8
    // Box starts at 0.3 (left gap 0.1); resizing its right edge near 0.72.
    const r = marginSnapEnd({ start: 0.3, size: 0.42, lo: 0, hi: 1 }, [a, c], 0.05);
    expect(r).not.toBeNull();
    expect(r!.size).toBeCloseTo(0.4); // right edge -> 0.7, gap 0.1 each side
  });

  it("returns null with no overlapping neighbours", () => {
    const r = marginSnapEnd({ start: 0.3, size: 0.4, lo: 0, hi: 1 }, [], 0.05);
    expect(r).toBeNull();
  });
});
