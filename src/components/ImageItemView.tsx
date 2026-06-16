import { useRef } from "react";
import { ImageSlotCanvas } from "./ImageSlotCanvas";
import { useZine } from "../store";
import { useDragPinch } from "../hooks/useDragPinch";
import { snap1D } from "../lib/snap";
import type { Asset, ImageItem } from "../types";

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

const SNAP_PX = 7;

interface Props {
  item: ImageItem;
  asset: Asset | null;
  canvasW: number;
  canvasH: number;
  selected: boolean;
  /** Other items, for edge/center alignment. */
  siblings: ImageItem[];
  slideCount: number;
  /** Report active snap guide lines (fractions); empty arrays clear them. */
  onSnapChange: (xs: number[], ys: number[]) => void;
}

/** A free-form image on the carousel canvas: drag to move, pinch to zoom,
 *  corner handle to resize, with snapping to edges/centers/other photos. */
export function ImageItemView({
  item,
  asset,
  canvasW,
  canvasH,
  selected,
  siblings,
  slideCount,
  onSnapChange,
}: Props) {
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

  // Candidate snap lines (fractions of the canvas).
  const snapLines = () => {
    const cuts = Array.from({ length: slideCount - 1 }, (_, k) => (k + 1) / slideCount);
    const xs = [0, 0.5, 1, ...cuts];
    const ys = [0, 0.5, 1];
    for (const s of siblings) {
      xs.push(s.x, s.x + s.w / 2, s.x + s.w);
      ys.push(s.y, s.y + s.h / 2, s.y + s.h);
    }
    return { xs, ys };
  };

  const gesture = useDragPinch({
    onSelect: () => selectItem(item.id),
    onDragStart: () => {
      base.current = { ...base.current, x: item.x, y: item.y };
    },
    onDragMove: (dx, dy) => {
      const { xs, ys } = snapLines();
      const rawX = clamp(base.current.x + dx / canvasW, -item.w + 0.04, 1 - 0.04);
      const rawY = clamp(base.current.y + dy / canvasH, -item.h + 0.04, 1 - 0.04);
      const sx = snap1D(rawX, [0, item.w / 2, item.w], xs, SNAP_PX / canvasW);
      const sy = snap1D(rawY, [0, item.h / 2, item.h], ys, SNAP_PX / canvasH);
      updateImageItem(item.id, { x: sx.value, y: sy.value });
      onSnapChange(
        sx.line === null ? [] : [sx.line],
        sy.line === null ? [] : [sy.line],
      );
    },
    onPinchStart: () => {
      base.current = { ...base.current, zoom: item.zoom };
    },
    onPinchMove: (scale) => {
      updateImageItem(item.id, {
        zoom: Math.round(clamp(base.current.zoom * scale, 0.2, 6) * 100) / 100,
      });
    },
    onEnd: () => onSnapChange([], []),
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
    const { xs, ys } = snapLines();
    let w = clamp(r.bw + (e.clientX - r.sx) / canvasW, 0.03, 4);
    // Snap the right edge to a candidate line.
    const sx = snap1D(item.x + w, [0], xs, SNAP_PX / canvasW);
    if (sx.line !== null) w = clamp(sx.line - item.x, 0.03, 4);

    if (item.aspect) {
      const h = clamp((w * (canvasW / canvasH)) / item.aspect, 0.03, 3);
      updateImageItem(item.id, { w, h });
      onSnapChange(sx.line === null ? [] : [sx.line], []);
    } else {
      let h = clamp(r.bh + (e.clientY - r.sy) / canvasH, 0.03, 1.5);
      const sy = snap1D(item.y + h, [0], ys, SNAP_PX / canvasH);
      if (sy.line !== null) h = clamp(sy.line - item.y, 0.03, 1.5);
      updateImageItem(item.id, { w, h });
      onSnapChange(
        sx.line === null ? [] : [sx.line],
        sy.line === null ? [] : [sy.line],
      );
    }
  };
  const onResizeEnd = (e: React.PointerEvent) => {
    resize.current = null;
    onSnapChange([], []);
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
