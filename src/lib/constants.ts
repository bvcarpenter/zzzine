// Physical dimensions, in PDF points (1 pt = 1/72 inch).

export const PT_PER_INCH = 72;

/** A finished zine page = half of a letter sheet = 5.5" x 8.5" (portrait). */
export const PAGE_WIDTH_PT = 5.5 * PT_PER_INCH; // 396
export const PAGE_HEIGHT_PT = 8.5 * PT_PER_INCH; // 612

/** A printed sheet holds two pages side-by-side: 11" x 8.5" (landscape). */
export const SHEET_WIDTH_PT = 11 * PT_PER_INCH; // 792
export const SHEET_HEIGHT_PT = 8.5 * PT_PER_INCH; // 612

/** Aspect ratio (w/h) of a single page, used for on-screen layout. */
export const PAGE_ASPECT = PAGE_WIDTH_PT / PAGE_HEIGHT_PT;

/** Pages per folded sheet. The total page count is always a multiple of this. */
export const PAGES_PER_SHEET = 4;

export const MIN_PAGES = 4;
export const MAX_PAGES = 64;
export const DEFAULT_PAGES = 8;
