import { Trash2 } from "lucide-react";
import { fontCss, getFont } from "../lib/fonts";
import { wrapLines } from "../lib/textlayout";
import type { FrameSize } from "../lib/dims";
import type { TextBlock } from "../types";
import { FontSelect } from "./FontSelect";
import { Button, ColorInput, Field, NumberInput, Section, Segmented, Slider, Toggle } from "./ui";

const clamp01 = (v: number) => Math.min(1, Math.max(0, v));

/** Estimate a text block's rendered height as a fraction of the frame. */
function textHeightFraction(block: TextBlock, frame: FrameSize): number {
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");
  const def = getFont(block.fontFamily);
  const weight = def.supportsStyles && block.bold ? "700 " : "";
  const style = def.supportsStyles && block.italic ? "italic " : "";
  let lineCount = 1;
  if (ctx) {
    ctx.font = `${style}${weight}${block.fontSize}px ${fontCss(block.fontFamily)}`;
    const maxWidth = block.width * frame.width;
    lineCount = Math.max(
      1,
      wrapLines(block.text || " ", maxWidth, (t) => ctx.measureText(t).width)
        .length,
    );
  }
  return (lineCount * block.fontSize * block.lineHeight) / frame.height;
}

export function TextControls({
  block,
  frame,
  onChange,
  onDelete,
  onFront,
}: {
  block: TextBlock;
  frame: FrameSize;
  onChange: (p: Partial<TextBlock>) => void;
  onDelete: () => void;
  onFront: () => void;
}) {
  const def = getFont(block.fontFamily);
  return (
    <Section title="Text">
      <textarea
        value={block.text}
        onChange={(e) => onChange({ text: e.target.value })}
        rows={3}
        className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100"
        placeholder="Type your text…"
      />
      <FontSelect value={block.fontFamily} onChange={(v) => onChange({ fontFamily: v })} />
      <Field label="Size">
        <Slider value={block.fontSize} min={6} max={160} onChange={(v) => onChange({ fontSize: v })} />
        <NumberInput value={block.fontSize} min={6} max={400} onChange={(v) => onChange({ fontSize: v })} />
      </Field>
      <Field label="Align">
        <Segmented
          value={block.align}
          onChange={(v) => onChange({ align: v })}
          options={[
            { value: "left", label: "L" },
            { value: "center", label: "C" },
            { value: "right", label: "R" },
          ]}
        />
      </Field>
      <Field label="Color">
        <ColorInput value={block.color} onChange={(v) => onChange({ color: v })} />
      </Field>
      {def.supportsStyles && (
        <Field label="Style">
          <Button variant={block.bold ? "primary" : "ghost"} onClick={() => onChange({ bold: !block.bold })} className="!px-3 font-bold">
            B
          </Button>
          <Button variant={block.italic ? "primary" : "ghost"} onClick={() => onChange({ italic: !block.italic })} className="!px-3 italic">
            I
          </Button>
        </Field>
      )}
      <Field label="Highlight">
        <Toggle
          label=""
          checked={block.background !== null}
          onChange={(v) => onChange({ background: v ? "#ffffff" : null })}
        />
        {block.background !== null && (
          <ColorInput value={block.background} onChange={(v) => onChange({ background: v })} />
        )}
      </Field>
      <Field label="Width">
        <Slider value={block.width} min={0.05} max={1} step={0.01} onChange={(v) => onChange({ width: v })} />
      </Field>
      <div>
        <span className="text-xs text-neutral-400">Center on canvas</span>
        <div className="mt-1.5 grid grid-cols-3 gap-1.5">
          <Button variant="ghost" title="Center horizontally" onClick={() => onChange({ x: clamp01((1 - block.width) / 2) })}>
            ↔ Across
          </Button>
          <Button
            variant="ghost"
            title="Center vertically"
            onClick={() => onChange({ y: clamp01((1 - textHeightFraction(block, frame)) / 2) })}
          >
            ↕ Down
          </Button>
          <Button
            variant="ghost"
            title="Center both ways"
            onClick={() =>
              onChange({
                x: clamp01((1 - block.width) / 2),
                y: clamp01((1 - textHeightFraction(block, frame)) / 2),
              })
            }
          >
            Both
          </Button>
        </div>
      </div>
      <Field label="Rotation">
        <Slider value={block.rotation} min={-45} max={45} step={1} onChange={(v) => onChange({ rotation: v })} />
        <NumberInput value={block.rotation} min={-180} max={180} onChange={(v) => onChange({ rotation: v })} />
      </Field>
      <div className="flex gap-2">
        <Button variant="ghost" className="flex-1" onClick={onFront}>
          Bring to front
        </Button>
        <Button variant="danger" onClick={onDelete}>
          <Trash2 size={15} />
        </Button>
      </div>
    </Section>
  );
}
