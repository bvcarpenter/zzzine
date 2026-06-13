import { useRef } from "react";
import { useElementSize } from "../hooks/useElementSize";
import { ImageSlotCanvas } from "./ImageSlotCanvas";
import { TextBlockView } from "./TextBlockView";
import { useZine } from "../store";
import { PAGE_ASPECT, PAGE_WIDTH_PT } from "../lib/constants";

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

interface PanState {
  startX: number;
  startY: number;
  baseX: number;
  baseY: number;
}

export function PageCanvas() {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const index = useZine((s) => s.selectedPageIndex);
  const page = useZine((s) => s.doc.pages[s.selectedPageIndex]);
  const assets = useZine((s) => s.assets);
  const selectedTextId = useZine((s) => s.selectedTextId);
  const updateText = useZine((s) => s.updateText);
  const selectText = useZine((s) => s.selectText);
  const updatePageImage = useZine((s) => s.updatePageImage);

  const pan = useRef<PanState | null>(null);

  if (!page) return <div ref={ref} className="flex-1" />;

  const pad = 32;
  const availW = Math.max(0, size.width - pad * 2);
  const availH = Math.max(0, size.height - pad * 2);
  let dispW = availW;
  let dispH = dispW / PAGE_ASPECT;
  if (dispH > availH) {
    dispH = availH;
    dispW = dispH * PAGE_ASPECT;
  }
  const pxPerPt = dispW / PAGE_WIDTH_PT;

  const asset =
    (page.image && assets.find((a) => a.id === page.image!.assetId)) || null;

  const onBackgroundPointerDown = (e: React.PointerEvent) => {
    selectText(null);
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
    const dx = (e.clientX - pan.current.startX) / dispW;
    const dy = (e.clientY - pan.current.startY) / dispH;
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
    updatePageImage(index, {
      zoom: clamp(page.image.zoom * factor, 0.2, 6),
    });
  };

  return (
    <div
      ref={ref}
      className="relative flex flex-1 items-center justify-center overflow-hidden bg-neutral-900"
    >
      {size.width > 0 && (
        <div
          className="relative shadow-2xl ring-1 ring-black/40 checker"
          style={{ width: dispW, height: dispH }}
        >
          {/* page background */}
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
              width={dispW}
              height={dispH}
            />
          </div>

          {/* text blocks */}
          {page.texts.map((t) => (
            <TextBlockView
              key={t.id}
              block={t}
              pageWidth={dispW}
              pageHeight={dispH}
              pxPerPt={pxPerPt}
              interactive
              selected={t.id === selectedTextId}
              onSelect={() => selectText(t.id)}
              onChange={(partial) => updateText(index, t.id, partial)}
            />
          ))}

          {!page.image && page.texts.length === 0 && (
            <div className="pointer-events-none absolute inset-0 flex items-center justify-center p-6 text-center text-sm text-neutral-400">
              Add an image or text from the panel on the right.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
