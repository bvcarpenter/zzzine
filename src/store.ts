import { create } from "zustand";
import type {
  Asset,
  LayoutKind,
  Page,
  PageImage,
  PageNumberSettings,
  TextBlock,
  Zine,
} from "./types";
import { createPage, createTextBlock, createZine } from "./lib/factory";
import { MAX_PAGES, MIN_PAGES } from "./lib/constants";
import { roundUpToSheet } from "./lib/imposition";
import { cellCount } from "./lib/layout";
import { buildSpreads } from "./lib/spreads";
import { migrateZine } from "./lib/migrate";

interface ZineState {
  doc: Zine;
  assets: Asset[];
  selectedPageIndex: number;
  /** Active image cell within the selected page. */
  selectedCellIndex: number;
  selectedTextId: string | null;
  /** Bumped whenever the document or assets change, to drive autosave. */
  revision: number;
  /** Id of the draft currently being edited (null until loaded). */
  currentDraftId: string | null;

  // --- lifecycle ---
  hydrate: (doc: Zine, assets: Asset[]) => void;
  newProject: () => void;
  setCurrentDraftId: (id: string | null) => void;
  /** Replace the whole document + assets (used by undo/redo). */
  replaceState: (doc: Zine, assets: Asset[]) => void;

  // --- document-level ---
  setTitle: (title: string) => void;
  setPageCount: (count: number) => void;
  setPageNumbers: (partial: Partial<PageNumberSettings>) => void;

  // --- selection ---
  selectPage: (index: number) => void;
  selectCell: (cellIndex: number) => void;
  focusCell: (index: number, cellIndex: number) => void;
  selectText: (id: string | null) => void;
  focusText: (index: number, id: string) => void;

  // --- pages ---
  setPageBackground: (index: number, color: string) => void;
  setPageLayout: (index: number, layout: LayoutKind) => void;
  setPageGutter: (index: number, gutter: number) => void;
  /** Toggle a full-spread image across the two facing pages of a spread. */
  toggleSpan: (index: number) => void;
  movePage: (from: number, to: number) => void;

  // --- assets / cells ---
  addAsset: (asset: Asset) => void;
  removeAsset: (assetId: string) => void;
  setCellImage: (index: number, cellIndex: number, assetId: string) => void;
  updateCellImage: (
    index: number,
    cellIndex: number,
    partial: Partial<PageImage>,
  ) => void;
  clearCell: (index: number, cellIndex: number) => void;

  // --- text ---
  addText: (index: number) => void;
  updateText: (index: number, textId: string, partial: Partial<TextBlock>) => void;
  removeText: (index: number, textId: string) => void;
  bringTextToFront: (index: number, textId: string) => void;
}

function defaultImage(assetId: string): PageImage {
  return {
    assetId,
    fit: "cover",
    rotation: 0,
    flipH: false,
    flipV: false,
    offsetX: 0,
    offsetY: 0,
    zoom: 1,
  };
}

/** Replace the page at `index` with the result of `fn`, immutably. */
function withPage(pages: Page[], index: number, fn: (p: Page) => Page): Page[] {
  return pages.map((p, i) => (i === index ? fn(p) : p));
}

/** The interior spread {left,right} containing `index`, or null for covers. */
function interiorSpread(pageCount: number, index: number) {
  const sp = buildSpreads(pageCount).find(
    (s) => s.left === index || s.right === index,
  );
  if (!sp || sp.left === null || sp.right === null) return null;
  return { left: sp.left, right: sp.right };
}

/**
 * The pair of pages an image can span across, given a page. Interior pages
 * span their facing reader-spread; the covers (first/last page) span each
 * other as a wrap-around — back cover on the left, front cover on the right.
 */
function spanGroup(pageCount: number, index: number) {
  if (pageCount < 4) return null;
  if (index === 0 || index === pageCount - 1) {
    return { left: pageCount - 1, right: 0 };
  }
  return interiorSpread(pageCount, index);
}

const clampPageCount = (n: number) =>
  Math.min(MAX_PAGES, Math.max(MIN_PAGES, roundUpToSheet(n)));

export const useZine = create<ZineState>((set) => ({
  doc: createZine(),
  assets: [],
  selectedPageIndex: 0,
  selectedCellIndex: 0,
  selectedTextId: null,
  revision: 0,
  currentDraftId: null,

  hydrate: (doc, assets) =>
    set({
      doc: migrateZine(doc),
      assets,
      selectedPageIndex: 0,
      selectedCellIndex: 0,
      selectedTextId: null,
      revision: 0,
    }),

  newProject: () =>
    set((s) => ({
      doc: createZine(),
      assets: [],
      selectedPageIndex: 0,
      selectedCellIndex: 0,
      selectedTextId: null,
      revision: s.revision + 1,
    })),

  setCurrentDraftId: (id) => set({ currentDraftId: id }),

  replaceState: (doc, assets) =>
    set((s) => ({
      doc,
      assets,
      selectedPageIndex: Math.min(s.selectedPageIndex, doc.pages.length - 1),
      selectedCellIndex: 0,
      selectedTextId: null,
      revision: s.revision + 1,
    })),

  setTitle: (title) =>
    set((s) => ({ doc: { ...s.doc, title }, revision: s.revision + 1 })),

  setPageCount: (count) =>
    set((s) => {
      const target = clampPageCount(count);
      const current = s.doc.pages.length;
      let pages = s.doc.pages;
      if (target > current) {
        pages = [
          ...pages,
          ...Array.from({ length: target - current }, () => createPage()),
        ];
      } else if (target < current) {
        pages = pages.slice(0, target);
      }
      const selectedPageIndex = Math.min(s.selectedPageIndex, target - 1);
      return {
        doc: { ...s.doc, pages },
        selectedPageIndex,
        selectedCellIndex: 0,
        selectedTextId: null,
        revision: s.revision + 1,
      };
    }),

  setPageNumbers: (partial) =>
    set((s) => ({
      doc: { ...s.doc, pageNumbers: { ...s.doc.pageNumbers, ...partial } },
      revision: s.revision + 1,
    })),

  selectPage: (index) =>
    set({
      selectedPageIndex: index,
      selectedCellIndex: 0,
      selectedTextId: null,
    }),

  selectCell: (cellIndex) => set({ selectedCellIndex: cellIndex }),

  focusCell: (index, cellIndex) =>
    set({
      selectedPageIndex: index,
      selectedCellIndex: cellIndex,
      selectedTextId: null,
    }),

  selectText: (id) => set({ selectedTextId: id }),

  focusText: (index, id) =>
    set({ selectedPageIndex: index, selectedTextId: id }),

  setPageBackground: (index, color) =>
    set((s) => ({
      doc: {
        ...s.doc,
        pages: withPage(s.doc.pages, index, (p) => ({
          ...p,
          background: color,
        })),
      },
      revision: s.revision + 1,
    })),

  setPageLayout: (index, layout) =>
    set((s) => {
      const count = cellCount(layout);
      // Choosing a grid layout exits span mode (clear both facing pages).
      const partner = s.doc.pages[index].span
        ? spanGroup(s.doc.pages.length, index)
        : null;
      const pages = s.doc.pages.map((p, i) => {
        if (i === index) {
          return {
            ...p,
            layout,
            span: undefined,
            cells: Array.from({ length: count }, (_, j) => p.cells[j] ?? null),
          };
        }
        if (partner && (i === partner.left || i === partner.right)) {
          return { ...p, span: undefined };
        }
        return p;
      });
      return {
        doc: { ...s.doc, pages },
        selectedCellIndex: Math.min(s.selectedCellIndex, count - 1),
        revision: s.revision + 1,
      };
    }),

  toggleSpan: (index) =>
    set((s) => {
      const sp = spanGroup(s.doc.pages.length, index);
      if (!sp) return s; // need at least one folded sheet to span
      const spanning = !!s.doc.pages[sp.left].span;
      const shared =
        s.doc.pages[sp.left].cells[0] ?? s.doc.pages[sp.right].cells[0] ?? null;
      const pages = s.doc.pages.map((p, i) => {
        if (i === sp.left) {
          return spanning
            ? { ...p, span: undefined }
            : { ...p, layout: "single" as LayoutKind, span: "left" as const, cells: [shared] };
        }
        if (i === sp.right) {
          return spanning
            ? { ...p, span: undefined }
            : { ...p, layout: "single" as LayoutKind, span: "right" as const, cells: [shared] };
        }
        return p;
      });
      return { doc: { ...s.doc, pages }, selectedCellIndex: 0, revision: s.revision + 1 };
    }),

  setPageGutter: (index, gutter) =>
    set((s) => ({
      doc: {
        ...s.doc,
        pages: withPage(s.doc.pages, index, (p) => ({ ...p, gutter })),
      },
      revision: s.revision + 1,
    })),

  movePage: (from, to) =>
    set((s) => {
      if (to < 0 || to >= s.doc.pages.length || from === to) return s;
      const pages = [...s.doc.pages];
      const [moved] = pages.splice(from, 1);
      pages.splice(to, 0, moved);
      return {
        doc: { ...s.doc, pages },
        selectedPageIndex: to,
        revision: s.revision + 1,
      };
    }),

  addAsset: (asset) =>
    set((s) => ({ assets: [...s.assets, asset], revision: s.revision + 1 })),

  removeAsset: (assetId) =>
    set((s) => ({
      assets: s.assets.filter((a) => a.id !== assetId),
      doc: {
        ...s.doc,
        pages: s.doc.pages.map((p) => ({
          ...p,
          cells: p.cells.map((c) => (c && c.assetId === assetId ? null : c)),
        })),
      },
      revision: s.revision + 1,
    })),

  setCellImage: (index, cellIndex, assetId) =>
    set((s) => {
      const page = s.doc.pages[index];
      const sp = page?.span && cellIndex === 0
        ? spanGroup(s.doc.pages.length, index)
        : null;
      if (sp) {
        const existing = page.cells[0];
        const img =
          existing && existing.assetId === assetId
            ? existing
            : defaultImage(assetId);
        const pages = s.doc.pages.map((p, i) =>
          i === sp.left || i === sp.right ? { ...p, cells: [img] } : p,
        );
        return { doc: { ...s.doc, pages }, revision: s.revision + 1 };
      }
      return {
        doc: {
          ...s.doc,
          pages: withPage(s.doc.pages, index, (p) => ({
            ...p,
            cells: p.cells.map((c, i) =>
              i === cellIndex
                ? c && c.assetId === assetId
                  ? c
                  : defaultImage(assetId)
                : c,
            ),
          })),
        },
        revision: s.revision + 1,
      };
    }),

  updateCellImage: (index, cellIndex, partial) =>
    set((s) => {
      const page = s.doc.pages[index];
      const sp = page?.span && cellIndex === 0
        ? spanGroup(s.doc.pages.length, index)
        : null;
      if (sp) {
        const pages = s.doc.pages.map((p, i) =>
          i === sp.left || i === sp.right
            ? {
                ...p,
                cells: p.cells.map((c, j) =>
                  j === 0 && c ? { ...c, ...partial } : c,
                ),
              }
            : p,
        );
        return { doc: { ...s.doc, pages }, revision: s.revision + 1 };
      }
      return {
        doc: {
          ...s.doc,
          pages: withPage(s.doc.pages, index, (p) => ({
            ...p,
            cells: p.cells.map((c, i) =>
              i === cellIndex && c ? { ...c, ...partial } : c,
            ),
          })),
        },
        revision: s.revision + 1,
      };
    }),

  clearCell: (index, cellIndex) =>
    set((s) => {
      const page = s.doc.pages[index];
      const sp = page?.span && cellIndex === 0
        ? spanGroup(s.doc.pages.length, index)
        : null;
      if (sp) {
        const pages = s.doc.pages.map((p, i) =>
          i === sp.left || i === sp.right ? { ...p, cells: [null] } : p,
        );
        return { doc: { ...s.doc, pages }, revision: s.revision + 1 };
      }
      return {
        doc: {
          ...s.doc,
          pages: withPage(s.doc.pages, index, (p) => ({
            ...p,
            cells: p.cells.map((c, i) => (i === cellIndex ? null : c)),
          })),
        },
        revision: s.revision + 1,
      };
    }),

  addText: (index) =>
    set((s) => {
      const block = createTextBlock();
      return {
        doc: {
          ...s.doc,
          pages: withPage(s.doc.pages, index, (p) => ({
            ...p,
            texts: [...p.texts, block],
          })),
        },
        selectedTextId: block.id,
        revision: s.revision + 1,
      };
    }),

  updateText: (index, textId, partial) =>
    set((s) => ({
      doc: {
        ...s.doc,
        pages: withPage(s.doc.pages, index, (p) => ({
          ...p,
          texts: p.texts.map((t) =>
            t.id === textId ? { ...t, ...partial } : t,
          ),
        })),
      },
      revision: s.revision + 1,
    })),

  removeText: (index, textId) =>
    set((s) => ({
      doc: {
        ...s.doc,
        pages: withPage(s.doc.pages, index, (p) => ({
          ...p,
          texts: p.texts.filter((t) => t.id !== textId),
        })),
      },
      selectedTextId: s.selectedTextId === textId ? null : s.selectedTextId,
      revision: s.revision + 1,
    })),

  bringTextToFront: (index, textId) =>
    set((s) => ({
      doc: {
        ...s.doc,
        pages: withPage(s.doc.pages, index, (p) => {
          const target = p.texts.find((t) => t.id === textId);
          if (!target) return p;
          return {
            ...p,
            texts: [...p.texts.filter((t) => t.id !== textId), target],
          };
        }),
      },
      revision: s.revision + 1,
    })),
}));
