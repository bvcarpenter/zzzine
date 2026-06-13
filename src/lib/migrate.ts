// Upgrade documents saved by older versions of the app to the current shape.

import type { Page, PageImage, Zine } from "../types";

/** A page as stored by the original single-image-per-page version. */
interface LegacyPage {
  id: string;
  background: string;
  image?: PageImage | null;
  texts: Page["texts"];
}

function migratePage(page: Page | LegacyPage): Page {
  // Already in the current (cells-based) shape.
  if ("cells" in page && Array.isArray(page.cells)) {
    return {
      ...page,
      gutter: typeof page.gutter === "number" ? page.gutter : 0,
      layout: page.layout ?? "single",
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

/** Normalize a loaded document so every page has layout/cells/gutter. */
export function migrateZine(doc: Zine): Zine {
  return {
    ...doc,
    pages: (doc.pages ?? []).map(migratePage),
  };
}
