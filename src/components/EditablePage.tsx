import { useRef } from "react";
import { ImageSlotCanvas } from "./ImageSlotCanvas";
import { TextBlockView } from "./TextBlockView";
import { useZine } from "../store";
import { PAGE_WIDTH_PT } from "../lib/constants";

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

interface PanState {
  startX: number;
  startY: number;
  baseX: number;
  baseY: number;
}

interface Props {
  index: number;
  width: number;
  height: number;
}

/** One editable booklet page: background, image (pan/zoom), and text blocks. */
export function EditablePage({ index, width, height }: Props) {
  const page = useZine((s) => s.doc.pages[index]);
  const assets = useZine((s) => s.assets);
  const selectedPageIndex = useZine((s) => s.selectedPageIndex);
  const selectedTextId = useZine((s) => s.selectedTextId);
  const selectPage = useZine((s) => s.selectPage);
  const focusText = useZine((s) => s.focusText);
  const updateText = useZine((s) => s.updateText);
  const updatePageImage = useZine((s) => s.updatePageImage);

  const pan = useRef<PanState | null>(null);

  if (!page) return null;

  const pxPerPt = width / PAGE_WIDTH_PT;
  const active = index === selectedPageIndex;
  const asset =
    (page.image && assets.find((a) => a.id === page.image!.assetId)) || null;

  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    selectPage(index);
    if (!page.image) return;
    pan.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: page.image.offsetX,
      baseY: page.image.offsetY,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onBackgroundPointerMove = (e: React.PointerEvent) => {
    if (!pan.current || !page.image) return;
    const dx = (e.clientX - pan.current.startX) / width;
    const dy = (e.clientY - pan.current.startY) / height;
    updatePageImage(index, {
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
    if (!page.image) return;
    e.preventDefault();
    const factor = Math.exp(-e.deltaY * 0.0015);
    updatePageImage(index, { zoom: clamp(page.image.zoom * factor, 0.2, 6) });
  };

  return (
    <div
      className="relative shrink-0 checker"
      style={{
        width,
        height,
        outline: active ? "2px solid #7c3aed" : "1px solid rgba(0,0,0,0.45)",
        outlineOffset: active ? "-1px" : "0",
      }}
    >
      <div
        className="absolute inset-0"
        style={{ background: page.background }}
        onPointerDown={onBackgroundPointerDown}
        onPointerMove={onBackgroundPointerMove}
        onPointerUp={endPan}
        onPointerCancel={endPan}
        onWheel={onWheel}
      >
        <ImageSlotCanvas
          image={page.image}
          asset={asset}
          width={width}
          height={height}
        />
      </div>

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

      {!page.image && page.texts.length === 0 && (
        <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-4 text-center text-xs text-neutral-400">
          {active ? "Add an image or text from the right panel." : ""}
        </div>
      )}
    </div>
  );
}
