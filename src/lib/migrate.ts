// Upgrade documents saved by older versions of the app to the current shape.

import { createPage } from "./factory";
import type { Page, PageImage, SpanSlice, Zine } from "../types";

/** A page as stored by the original single-image-per-page version. */
interface LegacyPage {
  id: string;
  background: string;
  image?: PageImage | null;
  texts: Page["texts"];
  layout?: Page["layout"];
  cells?: (PageImage | null)[];
  gutter?: number;
  items?: Page["items"];
  // Older span shape was a "left" | "right" string.
  span?: SpanSlice | "left" | "right";
}

/** Normalize the older "left"/"right" span string into a slice descriptor. */
function migrateSpan(span: LegacyPage["span"]): SpanSlice | undefined {
  if (!span) return undefined;
  if (span === "left") return { count: 2, index: 0 };
  if (span === "right") return { count: 2, index: 1 };
  return span;
}

function migratePage(page: Page | LegacyPage): Page {
  // Already in the current (cells-based) shape.
  if ("cells" in page && Array.isArray(page.cells)) {
    return {
      ...(page as Page),
      gutter: typeof page.gutter === "number" ? page.gutter : 0,
      layout: page.layout ?? "single",
      items: Array.isArray(page.items) ? page.items : [],
      span: migrateSpan((page as LegacyPage).span),
    };
  }
  // Legacy single-image page -> single-cell layout.
  const legacy = page as LegacyPage;
  return {
    id: legacy.id,
    background: legacy.background ?? "#ffffff",
    layout: "single",
    cells: [legacy.image ?? null],
    gutter: 0,
    items: [],
    texts: legacy.texts ?? [],
  };
}

/** Normalize a loaded document so it matches the current schema. */
export function migrateZine(doc: Zine): Zine {
  const kind = doc.kind ?? "zine";
  let pages = (doc.pages ?? []).map(migratePage);
  let slideCount = typeof doc.slideCount === "number" ? doc.slideCount : 3;

  // Older carousels were per-slide pages; the model is now one wide artboard.
  if (kind === "carousel" && (pages.length !== 1 || typeof doc.slideCount !== "number")) {
    slideCount = Math.min(20, Math.max(2, pages.length || 3));
    pages = [createPage()];
  }

  return { ...doc, kind, slideCount, pages };
}
