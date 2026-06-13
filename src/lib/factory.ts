// Factories for default document entities.

import { DEFAULT_PAGES } from "./constants";
import { DEFAULT_FONT_KEY } from "./fonts";
import { uid } from "./id";
import type { Page, TextBlock, Zine } from "../types";

export function createPage(): Page {
  return {
    id: uid("page"),
    background: "#ffffff",
    image: null,
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

export function createZine(pageCount: number = DEFAULT_PAGES): Zine {
  return {
    version: 1,
    title: "Untitled zine",
    pages: Array.from({ length: pageCount }, () => createPage()),
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
