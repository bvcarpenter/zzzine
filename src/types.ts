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

/** One page of the zine (one half-letter face). */
export interface Page {
  id: string;
  /** Solid background color of the page. */
  background: string;
  image: PageImage | null;
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
  title: string;
  pages: Page[];
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
