// Factories for default document entities.

import { DEFAULT_PAGES } from "./constants";
import { DEFAULT_FONT_KEY } from "./fonts";
import { uid } from "./id";
import type { DocKind, Page, TextBlock, Zine } from "../types";

const DEFAULT_SLIDES = 3;

export function createPage(): Page {
  return {
    id: uid("page"),
    background: "#ffffff",
    layout: "single",
    cells: [null],
    gutter: 0,
    texts: [],
  };
}

export function createTextBlock(partial: Partial<TextBlock> = {}): TextBlock {
  return {
    id: uid("text"),
    text: "Double-click to edit",
    x: 0.1,
    y: 0.08,
    width: 0.8,
    fontFamily: DEFAULT_FONT_KEY,
    fontSize: 24,
    color: "#111111",
    align: "center",
    vAlign: "top",
    bold: false,
    italic: false,
    background: null,
    lineHeight: 1.2,
    rotation: 0,
    ...partial,
  };
}

export function createDoc(kind: DocKind = "zine"): Zine {
  const count = kind === "carousel" ? DEFAULT_SLIDES : DEFAULT_PAGES;
  return {
    version: 1,
    kind,
    title: kind === "carousel" ? "Untitled carousel" : "Untitled zine",
    pages: Array.from({ length: count }, () => createPage()),
    pageNumbers: {
      enabled: false,
      fontFamily: DEFAULT_FONT_KEY,
      fontSize: 11,
      color: "#111111",
      position: "bottom-outer",
      skipCovers: true,
      startAt: 1,
    },
  };
}

/** Back-compat alias used in a few places. */
export function createZine(): Zine {
  return createDoc("zine");
}
