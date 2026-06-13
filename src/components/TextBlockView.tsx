import { useEffect, useRef, useState } from "react";
import { fontCss, getFont } from "../lib/fonts";
import type { TextBlock } from "../types";

interface Props {
  block: TextBlock;
  pageWidth: number;
  pageHeight: number;
  pxPerPt: number;
  interactive?: boolean;
  selected?: boolean;
  onSelect?: () => void;
  onChange?: (partial: Partial<TextBlock>) => void;
}

interface DragState {
  startX: number;
  startY: number;
  baseX: number;
  baseY: number;
}

const clamp = (v: number, lo: number, hi: number) =>
  Math.min(hi, Math.max(lo, v));

export function TextBlockView({
  block,
  pageWidth,
  pageHeight,
  pxPerPt,
  interactive = false,
  selected = false,
  onSelect,
  onChange,
}: Props) {
  const [editing, setEditing] = useState(false);
  const drag = useRef<DragState | null>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  const def = getFont(block.fontFamily);
  const bold = def.supportsStyles ? block.bold : false;
  const italic = def.supportsStyles ? block.italic : false;

  useEffect(() => {
    if (editing && taRef.current) {
      taRef.current.focus();
      taRef.current.select();
    }
  }, [editing]);

  const onPointerDown = (e: React.PointerEvent) => {
    if (!interactive || editing) return;
    e.stopPropagation();
    onSelect?.();
    drag.current = {
      startX: e.clientX,
      startY: e.clientY,
      baseX: block.x,
      baseY: block.y,
    };
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (!drag.current || !onChange) return;
    const dx = (e.clientX - drag.current.startX) / pageWidth;
    const dy = (e.clientY - drag.current.startY) / pageHeight;
    onChange({
      x: clamp(drag.current.baseX + dx, -0.25, 1),
      y: clamp(drag.current.baseY + dy, -0.1, 1),
    });
  };

  const endDrag = (e: React.PointerEvent) => {
    if (drag.current) {
      drag.current = null;
      try {
        (e.target as HTMLElement).releasePointerCapture(e.pointerId);
      } catch {
        /* ignore */
      }
    }
  };

  const fontSizePx = block.fontSize * pxPerPt;
  const padding = block.background ? fontSizePx * 0.25 : 0;

  const wrapperStyle: React.CSSProperties = {
    position: "absolute",
    left: block.x * pageWidth,
    top: block.y * pageHeight,
    width: block.width * pageWidth,
    transform: block.rotation ? `rotate(${block.rotation}deg)` : undefined,
    transformOrigin: "top left",
    cursor: interactive ? (editing ? "text" : "move") : "default",
    outline: selected ? "1.5px solid #6d28d9" : "none",
    outlineOffset: 2,
    touchAction: "none",
  };

  const textStyle: React.CSSProperties = {
    fontFamily: fontCss(block.fontFamily),
    fontSize: fontSizePx,
    lineHeight: block.lineHeight,
    color: block.color,
    textAlign: block.align,
    fontWeight: bold ? 700 : 400,
    fontStyle: italic ? "italic" : "normal",
    background: block.background ?? "transparent",
    padding,
    whiteSpace: "pre-wrap",
    overflowWrap: "break-word",
    wordBreak: "break-word",
  };

  return (
    <div
      style={wrapperStyle}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={endDrag}
      onPointerCancel={endDrag}
      onDoubleClick={(e) => {
        if (!interactive) return;
        e.stopPropagation();
        setEditing(true);
      }}
    >
      {editing ? (
        <textarea
          ref={taRef}
          value={block.text}
          onChange={(e) => onChange?.({ text: e.target.value })}
          onBlur={() => setEditing(false)}
          onKeyDown={(e) => {
            if (e.key === "Escape") setEditing(false);
          }}
          style={{
            ...textStyle,
            width: "100%",
            border: "none",
            outline: "none",
            resize: "none",
            background: block.background ?? "rgba(255,255,255,0.85)",
            overflow: "hidden",
          }}
          rows={Math.max(1, block.text.split("\n").length)}
        />
      ) : (
        <div style={textStyle}>{block.text || " "}</div>
      )}
    </div>
  );
}
