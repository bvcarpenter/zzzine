import { useRef } from "react";
import { ImageIcon } from "lucide-react";
import { ImageSlotCanvas } from "./ImageSlotCanvas";
import { TextBlockView } from "./TextBlockView";
import { useZine } from "../store";
import { PAGE_HEIGHT_PT, PAGE_WIDTH_PT } from "../lib/constants";
import { cellRects } from "../lib/layout";
import type { Asset, PageImage } from "../types";

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

interface PanState {
  startX: number;
  startY: number;
  baseX: number;
  baseY: number;
}

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
}: CellProps) {
  const focusCell = useZine((s) => s.focusCell);
  const updateCellImage = useZine((s) => s.updateCellImage);
  const pan = useRef<PanState | null>(null);

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    focusCell(pageIndex, cellIndex);
    if (!image) return;
    pan.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: image.offsetX,
      baseY: image.offsetY,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pan.current || !image) return;
    const dx = (e.clientX - pan.current.startX) / width;
    const dy = (e.clientY - pan.current.startY) / height;
    updateCellImage(pageIndex, cellIndex, {
      offsetX: clamp(pan.current.baseX + dx, -1.5, 1.5),
      offsetY: clamp(pan.current.baseY + dy, -1.5, 1.5),
    });
  };

  const endPan = (e: React.PointerEvent) => {
    pan.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  const onWheel = (e: React.WheelEvent) => {
    if (!image) return;
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    updateCellImage(pageIndex, cellIndex, {
      zoom: clamp(image.zoom * factor, 0.2, 6),
    });
  };

  return (
    <div
      className="absolute overflow-hidden"
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
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endPan}
      onPointerCancel={endPan}
      onWheel={onWheel}
    >
      <ImageSlotCanvas
        image={image}
        asset={asset}
        width={width}
        height={height}
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
}

/** One editable booklet page: a grid of image cells plus text blocks. */
export function EditablePage({ index, width, height }: Props) {
  const page = useZine((s) => s.doc.pages[index]);
  const assets = useZine((s) => s.assets);
  const selectedPageIndex = useZine((s) => s.selectedPageIndex);
  const selectedCellIndex = useZine((s) => s.selectedCellIndex);
  const selectedTextId = useZine((s) => s.selectedTextId);
  const selectPage = useZine((s) => s.selectPage);
  const focusText = useZine((s) => s.focusText);
  const updateText = useZine((s) => s.updateText);

  if (!page) return null;

  const pxPerPt = width / PAGE_WIDTH_PT;
  const active = index === selectedPageIndex;
  const rects = cellRects(
    page.layout,
    page.gutter / PAGE_WIDTH_PT,
    page.gutter / PAGE_HEIGHT_PT,
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
