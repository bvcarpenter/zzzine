import { useRef } from "react";

interface Options {
  onSelect?: () => void;
  /** A one-finger drag began (record your base position). */
  onDragStart: () => void;
  /** One-finger drag delta in pixels since the last drag start. */
  onDragMove: (dx: number, dy: number) => void;
  /** A two-finger pinch began (record your base zoom). */
  onPinchStart: () => void;
  /** Pinch scale relative to the pinch start (1 = unchanged). */
  onPinchMove: (scale: number) => void;
  onEnd?: () => void;
}

/**
 * Pointer-event handlers supporting one-finger drag and two-finger pinch on
 * the same element — used for moving/panning and zooming images on touch
 * devices (where there is no mouse wheel). Works with mouse too.
 */
export function useDragPinch(opts: Options) {
  const pts = useRef(new Map<number, { x: number; y: number }>());
  const mode = useRef<"none" | "drag" | "pinch">("none");
  const dragOrigin = useRef({ x: 0, y: 0 });
  const startDist = useRef(0);

  const distance = () => {
    const a = [...pts.current.values()];
    if (a.length < 2) return 0;
    return Math.hypot(a[0].x - a[1].x, a[0].y - a[1].y);
  };

  const onPointerDown = (e: React.PointerEvent) => {
    e.stopPropagation();
    try {
      (e.target as HTMLElement).setPointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    opts.onSelect?.();
    if (pts.current.size >= 2) {
      mode.current = "pinch";
      startDist.current = distance();
      opts.onPinchStart();
    } else {
      mode.current = "drag";
      dragOrigin.current = { x: e.clientX, y: e.clientY };
      opts.onDragStart();
    }
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.set(e.pointerId, { x: e.clientX, y: e.clientY });
    if (mode.current === "pinch") {
      const d = distance();
      if (startDist.current > 0) opts.onPinchMove(d / startDist.current);
    } else if (mode.current === "drag") {
      opts.onDragMove(
        e.clientX - dragOrigin.current.x,
        e.clientY - dragOrigin.current.y,
      );
    }
  };

  const end = (e: React.PointerEvent) => {
    if (!pts.current.has(e.pointerId)) return;
    pts.current.delete(e.pointerId);
    try {
      (e.target as HTMLElement).releasePointerCapture(e.pointerId);
    } catch {
      /* ignore */
    }
    if (pts.current.size >= 2) {
      mode.current = "pinch";
      startDist.current = distance();
      opts.onPinchStart();
    } else if (pts.current.size === 1) {
      mode.current = "drag";
      const p = [...pts.current.values()][0];
      dragOrigin.current = { x: p.x, y: p.y };
      opts.onDragStart();
    } else {
      mode.current = "none";
      opts.onEnd?.();
    }
  };

  return {
    onPointerDown,
    onPointerMove,
    onPointerUp: end,
    onPointerCancel: end,
  };
}
