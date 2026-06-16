import { ImageSlotCanvas } from "./ImageSlotCanvas";
import { TextBlockView } from "./TextBlockView";
import { cellRects } from "../lib/layout";
import { frameSize } from "../lib/dims";
import type { Asset, DocKind, Page } from "../types";

interface Props {
  page: Page;
  assets: Asset[];
  width: number;
  kind: DocKind;
}

/** Small non-interactive preview of a page/frame (all cells + text). */
export function PageThumbnail({ page, assets, width, kind }: Props) {
  const frame = frameSize(kind);
  const height = width / (frame.width / frame.height);
  const pxPerPt = width / frame.width;
  const rects = cellRects(
    page.layout,
    page.gutter / frame.width,
    page.gutter / frame.height,
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
              span={ci === 0 ? (page.span ?? null) : null}
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
