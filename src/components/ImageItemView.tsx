import { useRef } from "react";
import { ImageSlotCanvas } from "./ImageSlotCanvas";
import { useZine } from "../store";
import { useDragPinch } from "../hooks/useDragPinch";
import type { Asset, ImageItem } from "../types";

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

interface Props {
  item: ImageItem;
  asset: Asset | null;
  canvasW: number;
  canvasH: number;
  selected: boolean;
}

/** A free-form image on the carousel canvas: drag to move, pinch to zoom,
 *  corner handle to resize. */
export function ImageItemView({ item, asset, canvasW, canvasH, selected }: Props) {
  const selectItem = useZine((s) => s.selectItem);
  const updateImageItem = useZine((s) => s.updateImageItem);
  const base = useRef({ x: 0, y: 0, zoom: 1 });
  const resize = useRef<{ sx: number; sy: number; bw: number; bh: number } | null>(
    null,
  );

  const left = item.x * canvasW;
  const top = item.y * canvasH;
  const width = item.w * canvasW;
  const height = item.h * canvasH;

  const gesture = useDragPinch({
    onSelect: () => selectItem(item.id),
    onDragStart: () => {
      base.current = { ...base.current, x: item.x, y: item.y };
    },
    onDragMove: (dx, dy) => {
      updateImageItem(item.id, {
        x: clamp(base.current.x + dx / canvasW, -item.w + 0.04, 1 - 0.04),
        y: clamp(base.current.y + dy / canvasH, -item.h + 0.04, 1 - 0.04),
      });
    },
    onPinchStart: () => {
      base.current = { ...base.current, zoom: item.zoom };
    },
    onPinchMove: (scale) => {
      updateImageItem(item.id, {
        zoom: Math.round(clamp(base.current.zoom * scale, 0.2, 6) * 100) / 100,
      });
    },
  });

  const onResizeDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    selectItem(item.id);
    resize.current = { sx: e.clientX, sy: e.clientY, bw: item.w, bh: item.h };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };
  const onResizeMove = (e: React.PointerEvent) => {
    const r = resize.current;
    if (!r) return;
    const w = clamp(r.bw + (e.clientX - r.sx) / canvasW, 0.03, 4);
    if (item.aspect) {
      // Keep the locked display ratio: height follows width.
      const h = clamp((w * (canvasW / canvasH)) / item.aspect, 0.03, 3);
      updateImageItem(item.id, { w, h });
    } else {
      updateImageItem(item.id, {
        w,
        h: clamp(r.bh + (e.clientY - r.sy) / canvasH, 0.03, 1.5),
      });
    }
  };
  const onResizeEnd = (e: React.PointerEvent) => {
    resize.current = null;
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
  };

  return (
    <div
      className="absolute"
      style={{
        left,
        top,
        width,
        height,
        outline: selected ? "2px solid #7c3aed" : "none",
        touchAction: "none",
      }}
    >
      <div className="absolute inset-0 cursor-move touch-none overflow-hidden" {...gesture}>
        <ImageSlotCanvas
          image={{
            assetId: item.assetId,
            fit: item.fit,
            rotation: item.rotation,
            flipH: item.flipH,
            flipV: item.flipV,
            offsetX: item.offsetX,
            offsetY: item.offsetY,
            zoom: item.zoom,
          }}
          asset={asset}
          width={width}
          height={height}
        />
      </div>
      {selected && (
        <div
          title="Drag to resize"
          onPointerDown={onResizeDown}
          onPointerMove={onResizeMove}
          onPointerUp={onResizeEnd}
          onPointerCancel={onResizeEnd}
          className="absolute -bottom-2.5 -right-2.5 h-6 w-6 cursor-se-resize touch-none rounded-full border-2 border-white bg-violet-600 shadow"
        />
      )}
    </div>
  );
}
