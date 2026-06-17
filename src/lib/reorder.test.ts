import { describe, expect, it } from "vitest";
import { movePagesByIndices } from "./reorder";

describe("movePagesByIndices", () => {
  it("moves a contiguous pair down together", () => {
    // [0,1,2,3,4], move {1,2} down -> [0,3,1,2,4]
    const r = movePagesByIndices(5, [1, 2], 1);
    expect(r).not.toBeNull();
    expect(r!.order).toEqual([0, 3, 1, 2, 4]);
    expect(r!.selected).toEqual([2, 3]);
  });

  it("moves a contiguous pair up together", () => {
    // move {1,2} up -> [1,2,0,3,4]
    const r = movePagesByIndices(5, [1, 2], -1);
    expect(r!.order).toEqual([1, 2, 0, 3, 4]);
    expect(r!.selected).toEqual([0, 1]);
  });

  it("compacts a non-contiguous selection as a block", () => {
    // move {1,3} down -> remove ->[0,2,4]; insert at 2 -> [0,2,1,3,4]
    const r = movePagesByIndices(5, [1, 3], 1);
    expect(r!.order).toEqual([0, 2, 1, 3, 4]);
    expect(r!.selected).toEqual([2, 3]);
  });

  it("returns null at the top edge", () => {
    expect(movePagesByIndices(5, [0, 1], -1)).toBeNull();
  });

  it("returns null at the bottom edge", () => {
    expect(movePagesByIndices(5, [3, 4], 1)).toBeNull();
  });

  it("returns null for an empty selection", () => {
    expect(movePagesByIndices(5, [], 1)).toBeNull();
  });

  it("is a faithful permutation (no pages lost)", () => {
    const r = movePagesByIndices(6, [2, 4], -1);
    expect([...r!.order].sort((a, b) => a - b)).toEqual([0, 1, 2, 3, 4, 5]);
  });
});
