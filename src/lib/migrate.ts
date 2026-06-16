// Upgrade documents saved by older versions of the app to the current shape.

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
    texts: legacy.texts ?? [],
  };
}

/** Normalize a loaded document so it matches the current schema. */
export function migrateZine(doc: Zine): Zine {
  return {
    ...doc,
    kind: doc.kind ?? "zine",
    pages: (doc.pages ?? []).map(migratePage),
  };
}
