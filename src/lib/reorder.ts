// Pure helper for moving a (possibly non-contiguous) set of pages together by
// one slot. Returns the new arrangement as a permutation of the original
// indices, plus the new positions of the moved pages — or null if the move is
// a no-op (empty selection or already at the edge).

export interface Reordered {
  /** New order expressed as original indices. */
  order: number[];
  /** New positions of the moved (selected) pages, ascending. */
  selected: number[];
  /** Where the moved block was inserted in the result. */
  insertAt: number;
}

export function movePagesByIndices(
  length: number,
  selected: number[],
  direction: -1 | 1,
): Reordered | null {
  const sel = [...new Set(selected)]
    .filter((i) => i >= 0 && i < length)
    .sort((a, b) => a - b);
  if (sel.length === 0) return null;

  const minIdx = sel[0];
  const maxIdx = sel[sel.length - 1];
  if (direction === -1 && minIdx === 0) return null;
  if (direction === 1 && maxIdx === length - 1) return null;

  const set = new Set(sel);
  const all = Array.from({ length }, (_, i) => i);
  const moved = all.filter((i) => set.has(i));
  const rest = all.filter((i) => !set.has(i));
  // Unselected pages before the block number `minIdx`; shift one slot over.
  const insertAt = Math.max(0, Math.min(rest.length, minIdx + direction));
  const order = [...rest.slice(0, insertAt), ...moved, ...rest.slice(insertAt)];
  const newSelected = moved.map((_, k) => insertAt + k);
  return { order, selected: newSelected, insertAt };
}
