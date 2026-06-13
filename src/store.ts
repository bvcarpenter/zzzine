import { create } from "zustand";
import type {
  Asset,
  Page,
  PageImage,
  PageNumberSettings,
  TextBlock,
  Zine,
} from "./types";
import { createPage, createTextBlock, createZine } from "./lib/factory";
import { MAX_PAGES, MIN_PAGES } from "./lib/constants";
import { roundUpToSheet } from "./lib/imposition";

interface ZineState {
  doc: Zine;
  assets: Asset[];
  selectedPageIndex: number;
  selectedTextId: string | null;
  /** Bumped whenever the document or assets change, to drive autosave. */
  revision: number;

  // --- lifecycle ---
  hydrate: (doc: Zine, assets: Asset[]) => void;
  newProject: () => void;

  // --- document-level ---
  setTitle: (title: string) => void;
  setPageCount: (count: number) => void;
  setPageNumbers: (partial: Partial<PageNumberSettings>) => void;

  // --- selection ---
  selectPage: (index: number) => void;
  selectText: (id: string | null) => void;
  /** Select a text block and the page it lives on in one step. */
  focusText: (index: number, id: string) => void;

  // --- pages ---
  setPageBackground: (index: number, color: string) => void;
  movePage: (from: number, to: number) => void;

  // --- assets / images ---
  addAsset: (asset: Asset) => void;
  removeAsset: (assetId: string) => void;
  setPageImage: (index: number, assetId: string) => void;
  updatePageImage: (index: number, partial: Partial<PageImage>) => void;
  clearPageImage: (index: number) => void;

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

const clampPageCount = (n: number) =>
  Math.min(MAX_PAGES, Math.max(MIN_PAGES, roundUpToSheet(n)));

export const useZine = create<ZineState>((set) => ({
  doc: createZine(),
  assets: [],
  selectedPageIndex: 0,
  selectedTextId: null,
  revision: 0,

  hydrate: (doc, assets) =>
    set({
      doc,
      assets,
      selectedPageIndex: 0,
      selectedTextId: null,
      revision: 0,
    }),

  newProject: () =>
    set((s) => ({
      doc: createZine(),
      assets: [],
      selectedPageIndex: 0,
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
    set({ selectedPageIndex: index, selectedTextId: null }),

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
        pages: s.doc.pages.map((p) =>
          p.image?.assetId === assetId ? { ...p, image: null } : p,
        ),
      },
      revision: s.revision + 1,
    })),

  setPageImage: (index, assetId) =>
    set((s) => ({
      doc: {
        ...s.doc,
        pages: withPage(s.doc.pages, index, (p) => ({
          ...p,
          // Keep existing adjustments if the same asset is re-selected.
          image:
            p.image && p.image.assetId === assetId
              ? p.image
              : defaultImage(assetId),
        })),
      },
      revision: s.revision + 1,
    })),

  updatePageImage: (index, partial) =>
    set((s) => ({
      doc: {
        ...s.doc,
        pages: withPage(s.doc.pages, index, (p) =>
          p.image ? { ...p, image: { ...p.image, ...partial } } : p,
        ),
      },
      revision: s.revision + 1,
    })),

  clearPageImage: (index) =>
    set((s) => ({
      doc: {
        ...s.doc,
        pages: withPage(s.doc.pages, index, (p) => ({ ...p, image: null })),
      },
      revision: s.revision + 1,
    })),

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
