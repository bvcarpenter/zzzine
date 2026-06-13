// Font registry.
//
// Two kinds of fonts:
//  - "standard": one of the 14 built-in PDF fonts. No file to embed; rendered
//    in the editor with a matching CSS font stack. Supports bold/italic.
//  - "embedded": a bundled .ttf in /public/fonts, embedded (subset) into the
//    PDF and registered as an @font-face for the editor. Single weight, so the
//    bold/italic toggles are ignored.

import { StandardFonts } from "pdf-lib";

export type FontKind = "standard" | "embedded";

export interface FontDef {
  /** Stable key stored in the document. */
  key: string;
  /** Human label shown in the UI. */
  label: string;
  kind: FontKind;
  /** CSS font-family used in the editor preview. */
  cssFamily: string;
  /** Short category for grouping in the picker. */
  category: "Sans" | "Serif" | "Mono" | "Display" | "Handwriting";
  /** Whether bold/italic toggles apply (true only for standard fonts). */
  supportsStyles: boolean;
  /** For embedded fonts: the bare CSS family name (e.g. "Bebas Neue"). */
  family?: string;
  /** For embedded fonts: path (relative to base) of the .ttf file. */
  file?: string;
  /** For standard fonts: pdf-lib StandardFonts for each style combination. */
  standard?: {
    regular: StandardFonts;
    bold: StandardFonts;
    italic: StandardFonts;
    boldItalic: StandardFonts;
  };
}

export const FONTS: FontDef[] = [
  {
    key: "helvetica",
    label: "Helvetica",
    kind: "standard",
    category: "Sans",
    cssFamily:
      "Helvetica, 'Helvetica Neue', Arial, 'Liberation Sans', sans-serif",
    supportsStyles: true,
    standard: {
      regular: StandardFonts.Helvetica,
      bold: StandardFonts.HelveticaBold,
      italic: StandardFonts.HelveticaOblique,
      boldItalic: StandardFonts.HelveticaBoldOblique,
    },
  },
  {
    key: "times",
    label: "Times",
    kind: "standard",
    category: "Serif",
    cssFamily: "'Times New Roman', Times, 'Liberation Serif', serif",
    supportsStyles: true,
    standard: {
      regular: StandardFonts.TimesRoman,
      bold: StandardFonts.TimesRomanBold,
      italic: StandardFonts.TimesRomanItalic,
      boldItalic: StandardFonts.TimesRomanBoldItalic,
    },
  },
  {
    key: "courier",
    label: "Courier",
    kind: "standard",
    category: "Mono",
    cssFamily: "'Courier New', Courier, 'Liberation Mono', monospace",
    supportsStyles: true,
    standard: {
      regular: StandardFonts.Courier,
      bold: StandardFonts.CourierBold,
      italic: StandardFonts.CourierOblique,
      boldItalic: StandardFonts.CourierBoldOblique,
    },
  },
  {
    key: "anton",
    label: "Anton",
    kind: "embedded",
    category: "Display",
    family: "Anton",
    cssFamily: "'Anton', sans-serif",
    supportsStyles: false,
    file: "fonts/Anton-Regular.ttf",
  },
  {
    key: "archivo-black",
    label: "Archivo Black",
    kind: "embedded",
    category: "Display",
    family: "Archivo Black",
    cssFamily: "'Archivo Black', sans-serif",
    supportsStyles: false,
    file: "fonts/ArchivoBlack-Regular.ttf",
  },
  {
    key: "bebas-neue",
    label: "Bebas Neue",
    kind: "embedded",
    category: "Display",
    family: "Bebas Neue",
    cssFamily: "'Bebas Neue', sans-serif",
    supportsStyles: false,
    file: "fonts/BebasNeue-Regular.ttf",
  },
  {
    key: "lobster",
    label: "Lobster",
    kind: "embedded",
    category: "Handwriting",
    family: "Lobster",
    cssFamily: "'Lobster', cursive",
    supportsStyles: false,
    file: "fonts/Lobster-Regular.ttf",
  },
  {
    key: "permanent-marker",
    label: "Permanent Marker",
    kind: "embedded",
    category: "Handwriting",
    family: "Permanent Marker",
    cssFamily: "'Permanent Marker', cursive",
    supportsStyles: false,
    file: "fonts/PermanentMarker-Regular.ttf",
  },
  {
    key: "special-elite",
    label: "Special Elite",
    kind: "embedded",
    category: "Mono",
    family: "Special Elite",
    cssFamily: "'Special Elite', monospace",
    supportsStyles: false,
    file: "fonts/SpecialElite-Regular.ttf",
  },
];

const FONT_BY_KEY = new Map(FONTS.map((f) => [f.key, f]));

export const DEFAULT_FONT_KEY = "helvetica";

export function getFont(key: string): FontDef {
  return FONT_BY_KEY.get(key) ?? FONT_BY_KEY.get(DEFAULT_FONT_KEY)!;
}

/** Resolve the CSS font-family string for editor rendering. */
export function fontCss(key: string): string {
  return getFont(key).cssFamily;
}
