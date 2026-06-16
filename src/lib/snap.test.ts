import { describe, expect, it } from "vitest";
import { snap1D } from "./snap";

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
