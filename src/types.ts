// Core data model for a zine project.
//
// A zine is a half-letter saddle-stitch booklet: 8.5x11 sheets folded in half
// to make 5.5x8.5 pages, printed double-sided and stapled at the spine. The
// page count is always a multiple of 4 (one folded sheet = 4 pages).

/** How an image is sized within its page slot. */
export type FitMode = "contain" | "cover" | "fill";

/** Quarter-turn rotation applied to an image, in degrees. */
export type Rotation = 0 | 90 | 180 | 270;

/** A single placed image filling (most of) a page. */
export interface PageImage {
  /** Unique id of the asset in the asset store (data URL lives there). */
  assetId: string;
  fit: FitMode;
  rotation: Rotation;
  flipH: boolean;
  flipV: boolean;
  /** Pan offset as a fraction of page size, -1..1. 0 = centered. */
  offsetX: number;
  offsetY: number;
  /** Zoom multiplier on top of the fit. 1 = no extra zoom. */
  zoom: number;
}

export type TextAlign = "left" | "center" | "right";
export type VerticalAnchor = "top" | "middle" | "bottom";

/** A document is either a folded-booklet zine or an Instagram carousel. */
export type DocKind = "zine" | "carousel";

/** One frame's slice of an image spanning several frames. */
export interface SpanSlice {
  /** Total number of frames the image spans. */
  count: number;
  /** This frame's position within the span (0-based). */
  index: number;
}

/** A text block (caption, title, or text-over-image) placed on a page. */
export interface TextBlock {
  id: string;
  text: string;
  /** Position/size as fractions of the page (0..1). x,y is the top-left. */
  x: number;
  y: number;
  width: number;
  /** Font family key, see lib/fonts.ts FONTS registry. */
  fontFamily: string;
  /** Font size in points (1pt = 1/72 inch). */
  fontSize: number;
  color: string;
  align: TextAlign;
  vAlign: VerticalAnchor;
  bold: boolean;
  italic: boolean;
  /** Optional solid background behind the text. null = transparent. */
  background: string | null;
  /** Background padding in points, used when background is set. */
  lineHeight: number;
  /** Rotation of the whole block in degrees (free, 0 by default). */
  rotation: number;
}

/** Image grid layouts for a page. */
export type LayoutKind =
  | "single" // 1
  | "two-h" // 2 side by side
  | "two-v" // 2 stacked
  | "three-h" // 3 in a row
  | "three-v" // 3 stacked
  | "four"; // 2x2 grid

/** A free-form image placed on the carousel canvas (box + transforms). */
export interface ImageItem {
  id: string;
  assetId: string;
  /** Box on the canvas as fractions of the whole canvas (0..1). */
  x: number;
  y: number;
  w: number;
  h: number;
  /** How the image fills its box. */
  fit: FitMode;
  rotation: Rotation;
  flipH: boolean;
  flipV: boolean;
  /** Pan within the box and zoom on top of fit. */
  offsetX: number;
  offsetY: number;
  zoom: number;
  /** Locked display aspect ratio (width/height in px); undefined = free. */
  aspect?: number;
}

/** One page of the zine (one half-letter face) or a carousel artboard. */
export interface Page {
  id: string;
  /** Solid background color of the page. */
  background: string;
  /** Image grid layout (zine). */
  layout: LayoutKind;
  /** One image slot per layout cell, in row-major order; null = empty (zine). */
  cells: (PageImage | null)[];
  /** Gap between and around cells, in points (zine). */
  gutter: number;
  /** Free-form image items (carousel canvas), bottom-to-top. */
  items: ImageItem[];
  /**
   * When set, this page shows one slice of an image spanning several frames
   * (a zine spread/cover pair = 2; a carousel panorama = N). The frames in the
   * group share the same cells[0] image. Forces a single-cell layout.
   */
  span?: SpanSlice;
  texts: TextBlock[];
}

export type PageNumberPosition =
  | "bottom-center"
  | "bottom-outer"
  | "bottom-inner"
  | "top-center"
  | "top-outer";

export interface PageNumberSettings {
  enabled: boolean;
  fontFamily: string;
  fontSize: number;
  color: string;
  position: PageNumberPosition;
  /** Skip numbering the front and back cover pages. */
  skipCovers: boolean;
  /** Number to start counting from (usually 1). */
  startAt: number;
}

export interface Zine {
  /** Schema version, for migrating saved projects. */
  version: 1;
  /** Whether this is a folded-booklet zine or an Instagram carousel. */
  kind: DocKind;
  title: string;
  /** Zine: the pages. Carousel: a single wide artboard at pages[0]. */
  pages: Page[];
  /** Carousel: number of 4:5 slides the artboard is cut into on export. */
  slideCount: number;
  pageNumbers: PageNumberSettings;
}

/** An uploaded image, stored separately from pages so it can be reused. */
export interface Asset {
  id: string;
  /** Original file name, for display. */
  name: string;
  /** data: URL of the (possibly re-encoded) image. */
  dataUrl: string;
  /** Natural pixel dimensions. */
  width: number;
  height: number;
}
