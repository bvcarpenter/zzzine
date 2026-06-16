import { useRef } from "react";
import { ImageSlotCanvas } from "./ImageSlotCanvas";
import { useZine } from "../store";
import type { Asset, ImageItem } from "../types";

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

interface DragState {
  mode: "move" | "resize";
  sx: number;
  sy: number;
  bx: number;
  by: number;
  bw: number;
  bh: number;
}

interface Props {
  item: ImageItem;
  asset: Asset | null;
  canvasW: number;
  canvasH: number;
  selected: boolean;
}

/** A free-form image on the carousel canvas: drag to move, corner to resize. */
export function ImageItemView({ item, asset, canvasW, canvasH, selected }: Props) {
  const selectItem = useZine((s) => s.selectItem);
  const updateImageItem = useZine((s) => s.updateImageItem);
  const drag = useRef<DragState | null>(null);

  const left = item.x * canvasW;
  const top = item.y * canvasH;
  const width = item.w * canvasW;
  const height = item.h * canvasH;

  const begin = (mode: DragState["mode"]) => (e: React.PointerEvent) => {
    e.stopPropagation();
    selectItem(item.id);
    drag.current = {
      mode,
      sx: e.clientX,
      sy: e.clientY,
      bx: item.x,
      by: item.y,
      bw: item.w,
      bh: item.h,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    const d = drag.current;
    if (!d) return;
    const dx = (e.clientX - d.sx) / canvasW;
    const dy = (e.clientY - d.sy) / canvasH;
    if (d.mode === "move") {
      updateImageItem(item.id, {
        x: clamp(d.bx + dx, -d.bw + 0.04, 1 - 0.04),
        y: clamp(d.by + dy, -d.bh + 0.04, 1 - 0.04),
      });
    } else {
      updateImageItem(item.id, {
        w: clamp(d.bw + dx, 0.03, 4),
        h: clamp(d.bh + dy, 0.03, 1.5),
      });
    }
  };

  const end = (e: React.PointerEvent) => {
    drag.current = null;
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
      <div
        className="absolute inset-0 cursor-move overflow-hidden"
        onPointerDown={begin("move")}
        onPointerMove={onPointerMove}
        onPointerUp={end}
        onPointerCancel={end}
      >
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
          onPointerDown={begin("resize")}
          onPointerMove={onPointerMove}
          onPointerUp={end}
          onPointerCancel={end}
          className="absolute -bottom-1.5 -right-1.5 h-3.5 w-3.5 cursor-se-resize rounded-sm border border-white bg-violet-600"
          style={{ touchAction: "none" }}
        />
      )}
    </div>
  );
}
