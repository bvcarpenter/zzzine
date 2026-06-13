import { ImageSlotCanvas } from "./ImageSlotCanvas";
import { TextBlockView } from "./TextBlockView";
import { PAGE_ASPECT, PAGE_HEIGHT_PT, PAGE_WIDTH_PT } from "../lib/constants";
import { cellRects } from "../lib/layout";
import type { Asset, Page } from "../types";

interface Props {
  page: Page;
  assets: Asset[];
  width: number;
}

/** Small non-interactive preview of a page (all cells + text). */
export function PageThumbnail({ page, assets, width }: Props) {
  const height = width / PAGE_ASPECT;
  const pxPerPt = width / PAGE_WIDTH_PT;
  const rects = cellRects(
    page.layout,
    page.gutter / PAGE_WIDTH_PT,
    page.gutter / PAGE_HEIGHT_PT,
  );

  return (
    <div
      className="relative overflow-hidden"
      style={{ width, height, background: page.background }}
    >
      {rects.map((r, ci) => {
        const img = page.cells[ci] ?? null;
        const asset = (img && assets.find((a) => a.id === img.assetId)) || null;
        return (
          <div
            key={ci}
            className="absolute overflow-hidden"
            style={{
              left: r.x * width,
              top: r.y * height,
              width: r.w * width,
              height: r.h * height,
            }}
          >
            <ImageSlotCanvas
              image={img}
              asset={asset}
              width={r.w * width}
              height={r.h * height}
            />
          </div>
        );
      })}
      {page.texts.map((t) => (
        <TextBlockView
          key={t.id}
          block={t}
          pageWidth={width}
          pageHeight={height}
          pxPerPt={pxPerPt}
        />
      ))}
    </div>
  );
}
