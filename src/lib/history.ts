// Undo/redo for the document.
//
// The controller subscribes to the store and snapshots {doc, assets} whenever
// the content changes. Rapid changes within a short window (e.g. dragging or
// dragging a slider) are coalesced into a single history entry so one undo
// reverses one logical edit.

import { create } from "zustand";
import { useZine } from "../store";
import type { Asset, Zine } from "../types";

interface Snapshot {
  doc: Zine;
  assets: Asset[];
}

const LIMIT = 100;
const COALESCE_MS = 350;

let past: Snapshot[] = [];
let future: Snapshot[] = [];
let present: Snapshot = snapshotNow();
let lastPush = 0;
let applying = false;
let started = false;

interface HistoryFlags {
  canUndo: boolean;
  canRedo: boolean;
  set: (canUndo: boolean, canRedo: boolean) => void;
}

export const useHistory = create<HistoryFlags>((set) => ({
  canUndo: false,
  canRedo: false,
  set: (canUndo, canRedo) => set({ canUndo, canRedo }),
}));

function snapshotNow(): Snapshot {
  const s = useZine.getState();
  return { doc: s.doc, assets: s.assets };
}

function syncFlags() {
  useHistory.getState().set(past.length > 0, future.length > 0);
}

/** Start tracking history. Safe to call once on app start. */
export function startHistory() {
  if (started) return;
  started = true;
  present = snapshotNow();
  useZine.subscribe((s) => {
    if (applying) return;
    if (s.doc === present.doc && s.assets === present.assets) return; // selection-only
    const now = Date.now();
    if (now - lastPush > COALESCE_MS) {
      past.push(present);
      if (past.length > LIMIT) past.shift();
      future = [];
    }
    present = { doc: s.doc, assets: s.assets };
    lastPush = now;
    syncFlags();
  });
  syncFlags();
}

/** Forget all history and treat the current state as the baseline. */
export function resetHistory() {
  past = [];
  future = [];
  present = snapshotNow();
  lastPush = 0;
  syncFlags();
}

export function undo() {
  if (past.length === 0) return;
  future.unshift(present);
  present = past.pop()!;
  applying = true;
  useZine.getState().replaceState(present.doc, present.assets);
  applying = false;
  lastPush = 0;
  syncFlags();
}

export function redo() {
  if (future.length === 0) return;
  past.push(present);
  present = future.shift()!;
  applying = true;
  useZine.getState().replaceState(present.doc, present.assets);
  applying = false;
  lastPush = 0;
  syncFlags();
}
