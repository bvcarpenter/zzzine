import { ImageSlotCanvas } from "./ImageSlotCanvas";
import { TextBlockView } from "./TextBlockView";
import { PAGE_ASPECT, PAGE_WIDTH_PT } from "../lib/constants";
import type { Asset, Page } from "../types";

interface Props {
  page: Page;
  assets: Asset[];
  width: number;
}

/** Small non-interactive preview of a page. */
export function PageThumbnail({ page, assets, width }: Props) {
  const height = width / PAGE_ASPECT;
  const pxPerPt = width / PAGE_WIDTH_PT;
  const asset =
    (page.image && assets.find((a) => a.id === page.image!.assetId)) || null;

  return (
    <div
      className="relative overflow-hidden"
      style={{ width, height, background: page.background }}
    >
      <ImageSlotCanvas
        image={page.image}
        asset={asset}
        width={width}
        height={height}
      />
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
