// Reader spreads for the open-book editor.
//
// A saddle-stitch booklet reads as facing-page spreads. The front cover (page
// 1) sits alone on the right; the back cover (the last page) sits alone on the
// left; everything in between pairs up as (2,3), (4,5), ... — even page numbers
// on the left (verso), odd on the right (recto).

export interface Spread {
  /** 0-based page index on the left (verso), or null (outside the booklet). */
  left: number | null;
  /** 0-based page index on the right (recto), or null. */
  right: number | null;
}

/** Build the ordered list of reader spreads for an N-page booklet. */
export function buildSpreads(pageCount: number): Spread[] {
  if (pageCount <= 0) return [];
  const spreads: Spread[] = [{ left: null, right: 0 }]; // front cover, alone
  for (let pageNum = 2; pageNum <= pageCount; pageNum += 2) {
    const leftIndex = pageNum - 1; // even page number -> left
    const rightNum = pageNum + 1; // odd page number -> right
    spreads.push({
      left: leftIndex,
      right: rightNum <= pageCount ? rightNum - 1 : null,
    });
  }
  return spreads;
}

/** Index of the spread that contains a given page. */
export function spreadIndexOf(spreads: Spread[], pageIndex: number): number {
  const i = spreads.findIndex(
    (s) => s.left === pageIndex || s.right === pageIndex,
  );
  return i < 0 ? 0 : i;
}

/** A human label for a spread, e.g. "Cover", "Pages 2–3", "Back cover". */
export function spreadLabel(spread: Spread, pageCount: number): string {
  if (spread.left === null && spread.right === 0) return "Front cover";
  if (spread.right === null && spread.left === pageCount - 1)
    return "Back cover";
  const nums = [spread.left, spread.right]
    .filter((i): i is number => i !== null)
    .map((i) => i + 1);
  return nums.length === 2 ? `Pages ${nums[0]}–${nums[1]}` : `Page ${nums[0]}`;
}
