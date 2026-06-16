import { create } from "zustand";
import type {
  Asset,
  DocKind,
  ImageItem,
  LayoutKind,
  Page,
  PageImage,
  PageNumberSettings,
  TextBlock,
  Zine,
} from "./types";
import { createDoc, createPage, createTextBlock } from "./lib/factory";
import { uid } from "./lib/id";
import { MAX_PAGES, MIN_PAGES } from "./lib/constants";
import { CAROUSEL_FRAME, MAX_SLIDES, MIN_SLIDES } from "./lib/dims";
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
  /** Selected free-form image item (carousel canvas). */
  selectedItemId: string | null;
  /** When true, dragging the selected item pans the photo inside its crop. */
  reframeMode: boolean;
  /** Bumped whenever the document or assets change, to drive autosave. */
  revision: number;
  /** Id of the draft currently being edited (null until loaded). */
  currentDraftId: string | null;

  // --- lifecycle ---
  hydrate: (doc: Zine, assets: Asset[]) => void;
  newProject: (kind?: DocKind) => void;
  setCurrentDraftId: (id: string | null) => void;
  /** Replace the whole document + assets (used by undo/redo). */
  replaceState: (doc: Zine, assets: Asset[]) => void;

  // --- document-level ---
  setTitle: (title: string) => void;
  setPageCount: (count: number) => void;
  addPage: () => void;
  removePage: (index: number) => void;
  setPageNumbers: (partial: Partial<PageNumberSettings>) => void;
  /** Carousel: number of 4:5 slides the artboard is sliced into. */
  setSlideCount: (count: number) => void;

  // --- carousel free-form image items (operate on pages[0]) ---
  selectItem: (id: string | null) => void;
  setReframeMode: (on: boolean) => void;
  addImageItem: (assetId: string) => void;
  updateImageItem: (id: string, partial: Partial<ImageItem>) => void;
  removeImageItem: (id: string) => void;
  bringItemToFront: (id: string) => void;
  /** Lock an item to a display aspect ratio (w/h), or null to free it. */
  setItemAspect: (id: string, aspect: number | null) => void;

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
  /** Toggle a zine spread/cover spanning image across two facing pages. */
  toggleSpan: (index: number) => void;
  /** Span an image across `count` consecutive carousel frames from `start`. */
  setCarouselSpan: (start: number, count: number) => void;
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

/** Replace the carousel artboard (pages[0]) with the result of `fn`. */
function withArtboard(doc: Zine, fn: (p: Page) => Page): Page[] {
  return doc.pages.map((p, i) => (i === 0 ? fn(p) : p));
}

/** Replace the page at `index` with the result of `fn`, immutably. */
function withPage(pages: Page[], index: number, fn: (p: Page) => Page): Page[] {
  return pages.map((p, i) => (i === index ? fn(p) : p));
}

function clearAllSpans(pages: Page[]): Page[] {
  return pages.map((p) => (p.span ? { ...p, span: undefined } : p));
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
 * The pair of zine pages an image spans, given a page. Interior pages span
 * their facing reader-spread; the covers (first/last page) wrap around — back
 * cover on the left, front cover on the right.
 */
function zineSpanGroup(pageCount: number, index: number) {
  if (pageCount < 4) return null;
  if (index === 0 || index === pageCount - 1) {
    return { left: pageCount - 1, right: 0 };
  }
  return interiorSpread(pageCount, index);
}

/** All page indices in the span group containing `index` (in slice order). */
function spanMembers(doc: Zine, index: number): number[] {
  const page = doc.pages[index];
  if (!page?.span) return [index];
  if (doc.kind === "carousel") {
    const start = index - page.span.index;
    const members: number[] = [];
    for (let i = start; i < start + page.span.count; i++) {
      if (i >= 0 && i < doc.pages.length) members.push(i);
    }
    return members.length ? members : [index];
  }
  const g = zineSpanGroup(doc.pages.length, index);
  return g ? [g.left, g.right] : [index];
}

const clampPageCount = (n: number) =>
  Math.min(MAX_PAGES, Math.max(MIN_PAGES, roundUpToSheet(n)));

export const useZine = create<ZineState>((set) => ({
  doc: createDoc("zine"),
  assets: [],
  selectedPageIndex: 0,
  selectedCellIndex: 0,
  selectedTextId: null,
  selectedItemId: null,
  reframeMode: false,
  revision: 0,
  currentDraftId: null,

  hydrate: (doc, assets) =>
    set({
      doc: migrateZine(doc),
      assets,
      selectedPageIndex: 0,
      selectedCellIndex: 0,
      selectedTextId: null,
      selectedItemId: null,
      revision: 0,
    }),

  newProject: (kind = "zine") =>
    set((s) => ({
      doc: createDoc(kind),
      assets: [],
      selectedPageIndex: 0,
      selectedCellIndex: 0,
      selectedTextId: null,
      selectedItemId: null,
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
      selectedItemId: null,
      revision: s.revision + 1,
    })),

  setSlideCount: (count) =>
    set((s) => {
      const next = Math.min(MAX_SLIDES, Math.max(2, count));
      const old = s.doc.slideCount || next;
      const f = old / next; // keep content on the same slides
      const pages = withArtboard(s.doc, (p) => ({
        ...p,
        items: p.items.map((it) => ({ ...it, x: it.x * f, w: it.w * f })),
        texts: p.texts.map((t) => ({ ...t, x: t.x * f, width: t.width * f })),
      }));
      return {
        doc: { ...s.doc, slideCount: next, pages },
        revision: s.revision + 1,
      };
    }),

  selectItem: (id) =>
    set((s) => ({
      selectedItemId: id,
      selectedTextId: null,
      // Keep reframe on when re-selecting the same item (e.g. on drag-start);
      // turn it off when switching to a different item or deselecting.
      reframeMode: id !== null && id === s.selectedItemId ? s.reframeMode : false,
    })),
  setReframeMode: (on) => set({ reframeMode: on }),

  addImageItem: (assetId) =>
    set((s) => {
      const n = s.doc.slideCount || 1;
      const slideAspect = CAROUSEL_FRAME.width / CAROUSEL_FRAME.height;
      // Auto-size from the image: a wide photo spans the slides it naturally
      // covers at full canvas height; a single slide otherwise.
      const asset = s.assets.find((a) => a.id === assetId);
      let w = 1 / n;
      if (asset && asset.height > 0) {
        const imgAspect = asset.width / asset.height;
        w = Math.min(1, Math.max(1 / n, imgAspect / slideAspect / n));
      }
      const count = s.doc.pages[0]?.items.length ?? 0;
      const x = w >= 1 ? 0 : Math.min(1 - w, count * 0.04);
      const item: ImageItem = {
        id: uid("item"),
        assetId,
        x: Math.max(0, x),
        y: 0,
        w,
        h: 1,
        fit: "cover",
        rotation: 0,
        flipH: false,
        flipV: false,
        offsetX: 0,
        offsetY: 0,
        zoom: 1,
      };
      return {
        doc: { ...s.doc, pages: withArtboard(s.doc, (p) => ({ ...p, items: [...p.items, item] })) },
        selectedItemId: item.id,
        selectedTextId: null,
        revision: s.revision + 1,
      };
    }),

  updateImageItem: (id, partial) =>
    set((s) => ({
      doc: {
        ...s.doc,
        pages: withArtboard(s.doc, (p) => ({
          ...p,
          items: p.items.map((it) => (it.id === id ? { ...it, ...partial } : it)),
        })),
      },
      revision: s.revision + 1,
    })),

  removeImageItem: (id) =>
    set((s) => ({
      doc: {
        ...s.doc,
        pages: withArtboard(s.doc, (p) => ({
          ...p,
          items: p.items.filter((it) => it.id !== id),
        })),
      },
      selectedItemId: s.selectedItemId === id ? null : s.selectedItemId,
      revision: s.revision + 1,
    })),

  bringItemToFront: (id) =>
    set((s) => ({
      doc: {
        ...s.doc,
        pages: withArtboard(s.doc, (p) => {
          const target = p.items.find((it) => it.id === id);
          if (!target) return p;
          return { ...p, items: [...p.items.filter((it) => it.id !== id), target] };
        }),
      },
      revision: s.revision + 1,
    })),

  setItemAspect: (id, aspect) =>
    set((s) => {
      // canvasW/canvasH ratio = slideCount * (slide width / slide height).
      const ratio =
        (s.doc.slideCount || 1) *
        (CAROUSEL_FRAME.width / CAROUSEL_FRAME.height);
      const pages = withArtboard(s.doc, (p) => ({
        ...p,
        items: p.items.map((it) => {
          if (it.id !== id) return it;
          if (!aspect) return { ...it, aspect: undefined };
          // Keep width; derive height for the target aspect. If that would
          // overflow the canvas height, keep full height and shrink width.
          let w = it.w;
          let h = (w * ratio) / aspect;
          if (h > 1) {
            h = 1;
            w = aspect / ratio;
          }
          return {
            ...it,
            aspect,
            w: Math.min(1, Math.max(0.03, w)),
            h: Math.min(1.5, Math.max(0.03, h)),
          };
        }),
      }));
      return { doc: { ...s.doc, pages }, revision: s.revision + 1 };
    }),

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

  addPage: () =>
    set((s) => {
      if (s.doc.pages.length >= MAX_SLIDES) return s;
      const pages = [...s.doc.pages, createPage()];
      return {
        doc: { ...s.doc, pages },
        selectedPageIndex: pages.length - 1,
        selectedCellIndex: 0,
        selectedTextId: null,
        revision: s.revision + 1,
      };
    }),

  removePage: (index) =>
    set((s) => {
      if (s.doc.pages.length <= MIN_SLIDES) return s;
      // Removing shifts indices, which would break position-based spans.
      const pages = clearAllSpans(s.doc.pages).filter((_, i) => i !== index);
      return {
        doc: { ...s.doc, pages },
        selectedPageIndex: Math.min(s.selectedPageIndex, pages.length - 1),
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
      selectedItemId: null,
    }),

  selectCell: (cellIndex) => set({ selectedCellIndex: cellIndex }),

  focusCell: (index, cellIndex) =>
    set({
      selectedPageIndex: index,
      selectedCellIndex: cellIndex,
      selectedTextId: null,
      selectedItemId: null,
    }),

  selectText: (id) => set({ selectedTextId: id, selectedItemId: null }),

  focusText: (index, id) =>
    set({ selectedPageIndex: index, selectedTextId: id, selectedItemId: null }),

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
      // Choosing a grid layout exits span mode for the whole group.
      const members = new Set(
        s.doc.pages[index].span ? spanMembers(s.doc, index) : [],
      );
      const pages = s.doc.pages.map((p, i) => {
        if (i === index) {
          return {
            ...p,
            layout,
            span: undefined,
            cells: Array.from({ length: count }, (_, j) => p.cells[j] ?? null),
          };
        }
        if (members.has(i)) return { ...p, span: undefined };
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
      const g = zineSpanGroup(s.doc.pages.length, index);
      if (!g) return s;
      const spanning = !!s.doc.pages[g.left].span;
      const shared =
        s.doc.pages[g.left].cells[0] ?? s.doc.pages[g.right].cells[0] ?? null;
      const pages = s.doc.pages.map((p, i) => {
        if (i === g.left) {
          return spanning
            ? { ...p, span: undefined }
            : {
                ...p,
                layout: "single" as LayoutKind,
                span: { count: 2, index: 0 },
                cells: [shared],
              };
        }
        if (i === g.right) {
          return spanning
            ? { ...p, span: undefined }
            : {
                ...p,
                layout: "single" as LayoutKind,
                span: { count: 2, index: 1 },
                cells: [shared],
              };
        }
        return p;
      });
      return {
        doc: { ...s.doc, pages },
        selectedCellIndex: 0,
        revision: s.revision + 1,
      };
    }),

  setCarouselSpan: (start, count) =>
    set((s) => {
      const len = s.doc.pages.length;
      const n = Math.max(1, Math.min(count, len - start));
      const newEnd = n > 1 ? start + n - 1 : start;
      const pages = s.doc.pages.slice();

      // Clear any existing span group that overlaps the target range.
      for (let i = 0; i < len; i++) {
        const sp = pages[i].span;
        if (!sp) continue;
        const gs = i - sp.index;
        const ge = gs + sp.count - 1;
        if (gs <= newEnd && start <= ge) pages[i] = { ...pages[i], span: undefined };
      }

      if (n > 1) {
        let shared: PageImage | null = null;
        for (let i = start; i < start + n; i++) shared = shared ?? pages[i].cells[0] ?? null;
        for (let j = 0; j < n; j++) {
          const i = start + j;
          pages[i] = {
            ...pages[i],
            layout: "single",
            cells: [shared],
            span: { count: n, index: j },
          };
        }
      }

      return {
        doc: { ...s.doc, pages },
        selectedCellIndex: 0,
        revision: s.revision + 1,
      };
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
      // Reordering breaks position-based spans; clear them for carousels.
      const base =
        s.doc.kind === "carousel" ? clearAllSpans(s.doc.pages) : [...s.doc.pages];
      const [moved] = base.splice(from, 1);
      base.splice(to, 0, moved);
      return {
        doc: { ...s.doc, pages: base },
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
          items: p.items.filter((it) => it.assetId !== assetId),
        })),
      },
      revision: s.revision + 1,
    })),

  setCellImage: (index, cellIndex, assetId) =>
    set((s) => {
      const page = s.doc.pages[index];
      if (!page) return s;
      const isSpan = !!page.span && cellIndex === 0;
      const members = new Set(isSpan ? spanMembers(s.doc, index) : [index]);
      const existing = page.cells[isSpan ? 0 : cellIndex];
      const img =
        existing && existing.assetId === assetId
          ? existing
          : defaultImage(assetId);
      const pages = s.doc.pages.map((p, i) => {
        if (!members.has(i)) return p;
        if (isSpan) return { ...p, cells: [img] };
        return {
          ...p,
          cells: p.cells.map((c, ci) => (ci === cellIndex ? img : c)),
        };
      });
      return { doc: { ...s.doc, pages }, revision: s.revision + 1 };
    }),

  updateCellImage: (index, cellIndex, partial) =>
    set((s) => {
      const page = s.doc.pages[index];
      if (!page) return s;
      const isSpan = !!page.span && cellIndex === 0;
      const members = new Set(isSpan ? spanMembers(s.doc, index) : [index]);
      const target = isSpan ? 0 : cellIndex;
      const pages = s.doc.pages.map((p, i) => {
        if (!members.has(i)) return p;
        return {
          ...p,
          cells: p.cells.map((c, ci) =>
            ci === target && c ? { ...c, ...partial } : c,
          ),
        };
      });
      return { doc: { ...s.doc, pages }, revision: s.revision + 1 };
    }),

  clearCell: (index, cellIndex) =>
    set((s) => {
      const page = s.doc.pages[index];
      if (!page) return s;
      const isSpan = !!page.span && cellIndex === 0;
      const members = new Set(isSpan ? spanMembers(s.doc, index) : [index]);
      const target = isSpan ? 0 : cellIndex;
      const pages = s.doc.pages.map((p, i) => {
        if (!members.has(i)) return p;
        return { ...p, cells: p.cells.map((c, ci) => (ci === target ? null : c)) };
      });
      return { doc: { ...s.doc, pages }, revision: s.revision + 1 };
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
        selectedItemId: null,
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
