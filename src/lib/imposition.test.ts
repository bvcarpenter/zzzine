import { describe, expect, it } from "vitest";
import { imposeBooklet, roundUpToSheet, sheetCount } from "./imposition";

// Turn imposed faces into 1-based page numbers (the way a person reads them).
function pairs(pageCount: number) {
  return imposeBooklet(pageCount).map((f) => ({
    sheet: f.sheetIndex,
    side: f.side,
    left: f.left === null ? null : f.left + 1,
    right: f.right === null ? null : f.right + 1,
  }));
}

describe("imposeBooklet — textbook saddle-stitch tables", () => {
  it("4 pages (1 sheet)", () => {
    expect(pairs(4)).toEqual([
      { sheet: 0, side: "front", left: 4, right: 1 },
      { sheet: 0, side: "back", left: 2, right: 3 },
    ]);
  });

  it("8 pages (2 sheets)", () => {
    expect(pairs(8)).toEqual([
      { sheet: 0, side: "front", left: 8, right: 1 },
      { sheet: 0, side: "back", left: 2, right: 7 },
      { sheet: 1, side: "front", left: 6, right: 3 },
      { sheet: 1, side: "back", left: 4, right: 5 },
    ]);
  });

  it("12 pages (3 sheets)", () => {
    expect(pairs(12)).toEqual([
      { sheet: 0, side: "front", left: 12, right: 1 },
      { sheet: 0, side: "back", left: 2, right: 11 },
      { sheet: 1, side: "front", left: 10, right: 3 },
      { sheet: 1, side: "back", left: 4, right: 9 },
      { sheet: 2, side: "front", left: 8, right: 5 },
      { sheet: 2, side: "back", left: 6, right: 7 },
    ]);
  });
});

/**
 * Simulate the physical booklet: print the imposed faces double-sided
 * (flip on the short edge, so back pages are upright), stack the sheets in
 * order, fold the stack in half, and read it front to back. The result must
 * be 1, 2, 3, ... N.
 *
 * Under a short-edge flip the back-left is the reverse of the front-right and
 * the back-right is the reverse of the front-left. So each sheet contributes:
 *   - an "early" leaf near the front:  recto = frontRight, verso = backLeft
 *   - a "late"  leaf near the back:    recto = backRight,  verso = frontLeft
 * Early leaves run outer->inner; late leaves run inner->outer.
 */
function readingOrder(pageCount: number): number[] {
  const n = roundUpToSheet(pageCount);
  const faces = imposeBooklet(n);
  const sheets = n / 4;
  const front: { L: number; R: number }[] = [];
  const back: { L: number; R: number }[] = [];
  for (const f of faces) {
    const L = (f.left ?? -1) + 1;
    const R = (f.right ?? -1) + 1;
    if (f.side === "front") front[f.sheetIndex] = { L, R };
    else back[f.sheetIndex] = { L, R };
  }

  const result: number[] = [];
  // Front half: outer -> inner.
  for (let i = 0; i < sheets; i++) {
    result.push(front[i].R, back[i].L);
  }
  // Back half: inner -> outer.
  for (let i = sheets - 1; i >= 0; i--) {
    result.push(back[i].R, front[i].L);
  }
  return result;
}

describe("folded booklet reads in order", () => {
  for (const n of [4, 8, 12, 16, 20, 32, 64]) {
    it(`${n} pages assemble to 1..${n}`, () => {
      const expected = Array.from({ length: n }, (_, i) => i + 1);
      expect(readingOrder(n)).toEqual(expected);
    });
  }
});

describe("rounding helpers", () => {
  it("rounds up to whole sheets (multiples of 4)", () => {
    expect(roundUpToSheet(1)).toBe(4);
    expect(roundUpToSheet(4)).toBe(4);
    expect(roundUpToSheet(5)).toBe(8);
    expect(roundUpToSheet(9)).toBe(12);
  });

  it("counts sheets", () => {
    expect(sheetCount(4)).toBe(1);
    expect(sheetCount(8)).toBe(2);
    expect(sheetCount(16)).toBe(4);
  });
});
