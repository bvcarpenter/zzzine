import { useRef } from "react";
import { ImageIcon } from "lucide-react";
import { ImageSlotCanvas } from "./ImageSlotCanvas";
import { TextBlockView } from "./TextBlockView";
import { useZine } from "../store";
import { cellRects } from "../lib/layout";
import { useDragPinch } from "../hooks/useDragPinch";
import type { FrameSize } from "../lib/dims";
import type { Asset, PageImage, SpanSlice } from "../types";

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

interface CellProps {
  pageIndex: number;
  cellIndex: number;
  image: PageImage | null;
  asset: Asset | null;
  left: number;
  top: number;
  width: number;
  height: number;
  selected: boolean;
  span: SpanSlice | null;
}

function CellView({
  pageIndex,
  cellIndex,
  image,
  asset,
  left,
  top,
  width,
  height,
  selected,
  span,
}: CellProps) {
  const focusCell = useZine((s) => s.focusCell);
  const updateCellImage = useZine((s) => s.updateCellImage);
  const base = useRef({ x: 0, y: 0, zoom: 1 });

  const gesture = useDragPinch({
    onSelect: () => focusCell(pageIndex, cellIndex),
    onDragStart: () => {
      if (image) base.current = { ...base.current, x: image.offsetX, y: image.offsetY };
    },
    onDragMove: (dx, dy) => {
      if (!image) return;
      // A spanning image is fit to a slot `count` frames wide, so pan slower.
      const denomX = width * (span?.count ?? 1);
      updateCellImage(pageIndex, cellIndex, {
        offsetX: clamp(base.current.x + dx / denomX, -1.5, 1.5),
        offsetY: clamp(base.current.y + dy / height, -1.5, 1.5),
      });
    },
    onPinchStart: () => {
      if (image) base.current = { ...base.current, zoom: image.zoom };
    },
    onPinchMove: (scale) => {
      if (!image) return;
      updateCellImage(pageIndex, cellIndex, {
        zoom: Math.round(clamp(base.current.zoom * scale, 0.2, 6) * 100) / 100,
      });
    },
  });

  const onWheel = (e: React.WheelEvent) => {
    if (!image) return;
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    updateCellImage(pageIndex, cellIndex, {
      zoom: Math.round(clamp(image.zoom * factor, 0.2, 6) * 100) / 100,
    });
  };

  return (
    <div
      className="absolute touch-none overflow-hidden"
      style={{
        left,
        top,
        width,
        height,
        outline: selected
          ? "2px solid #7c3aed"
          : "1px solid rgba(255,255,255,0.12)",
        outlineOffset: "-1px",
      }}
      {...gesture}
      onWheel={onWheel}
    >
      <ImageSlotCanvas
        image={image}
        asset={asset}
        width={width}
        height={height}
        span={span}
      />
      {!image && (
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center gap-1 text-neutral-400/70">
          <ImageIcon size={Math.min(22, width / 4)} />
          {selected && <span className="text-[10px]">Add image →</span>}
        </div>
      )}
    </div>
  );
}

interface Props {
  index: number;
  width: number;
  height: number;
  /** Logical frame size (points) for this document kind. */
  frame: FrameSize;
}

/** One editable page/frame: a grid of image cells plus text blocks. */
export function EditablePage({ index, width, height, frame }: Props) {
  const page = useZine((s) => s.doc.pages[index]);
  const assets = useZine((s) => s.assets);
  const selectedPageIndex = useZine((s) => s.selectedPageIndex);
  const selectedCellIndex = useZine((s) => s.selectedCellIndex);
  const selectedTextId = useZine((s) => s.selectedTextId);
  const selectPage = useZine((s) => s.selectPage);
  const focusText = useZine((s) => s.focusText);
  const updateText = useZine((s) => s.updateText);

  if (!page) return null;

  const pxPerPt = width / frame.width;
  const active = index === selectedPageIndex;
  const rects = cellRects(
    page.layout,
    page.gutter / frame.width,
    page.gutter / frame.height,
  );

  const assetFor = (img: PageImage | null) =>
    (img && assets.find((a) => a.id === img.assetId)) || null;

  return (
    <div
      className="relative shrink-0"
      style={{
        width,
        height,
        background: page.background,
        outline: active ? "2px solid #7c3aed" : "1px solid rgba(0,0,0,0.45)",
        outlineOffset: active ? "-1px" : "0",
      }}
      onPointerDown={() => selectPage(index)}
    >
      {rects.map((r, ci) => (
        <CellView
          key={ci}
          pageIndex={index}
          cellIndex={ci}
          image={page.cells[ci] ?? null}
          asset={assetFor(page.cells[ci] ?? null)}
          left={r.x * width}
          top={r.y * height}
          width={r.w * width}
          height={r.h * height}
          selected={active && ci === selectedCellIndex}
          span={ci === 0 ? (page.span ?? null) : null}
        />
      ))}

      {page.texts.map((t) => (
        <TextBlockView
          key={t.id}
          block={t}
          pageWidth={width}
          pageHeight={height}
          pxPerPt={pxPerPt}
          interactive
          selected={t.id === selectedTextId}
          onSelect={() => focusText(index, t.id)}
          onChange={(partial) => updateText(index, t.id, partial)}
        />
      ))}
    </div>
  );
}
