import { useRef } from "react";
import {
  FlipHorizontal,
  FlipVertical,
  Image as ImageIcon,
  Plus,
  RotateCcw,
  RotateCw,
  Trash2,
  Type,
} from "lucide-react";
import { useZine } from "../store";
import { importImageFile } from "../lib/image";
import { frameSize, MAX_SLIDES } from "../lib/dims";
import type { FitMode, Rotation } from "../types";
import { TextControls } from "./TextControls";
import {
  Button,
  ColorInput,
  Field,
  NumberInput,
  Section,
  Segmented,
  Slider,
} from "./ui";

const ASPECTS: { label: string; value: number | null }[] = [
  { label: "Free", value: null },
  { label: "1:1", value: 1 },
  { label: "4:5", value: 4 / 5 },
  { label: "5:4", value: 5 / 4 },
  { label: "3:2", value: 3 / 2 },
  { label: "2:3", value: 2 / 3 },
  { label: "16:9", value: 16 / 9 },
  { label: "9:16", value: 9 / 16 },
];

export function CarouselInspector() {
  const fileRef = useRef<HTMLInputElement>(null);

  const doc = useZine((s) => s.doc);
  const artboard = useZine((s) => s.doc.pages[0]);
  const slideCount = useZine((s) => s.doc.slideCount);
  const assets = useZine((s) => s.assets);
  const selectedItemId = useZine((s) => s.selectedItemId);
  const selectedTextId = useZine((s) => s.selectedTextId);

  const setSlideCount = useZine((s) => s.setSlideCount);
  const setItemAspect = useZine((s) => s.setItemAspect);
  const setPageBackground = useZine((s) => s.setPageBackground);
  const addImageItem = useZine((s) => s.addImageItem);
  const updateImageItem = useZine((s) => s.updateImageItem);
  const removeImageItem = useZine((s) => s.removeImageItem);
  const bringItemToFront = useZine((s) => s.bringItemToFront);
  const addAsset = useZine((s) => s.addAsset);
  const removeAsset = useZine((s) => s.removeAsset);
  const addText = useZine((s) => s.addText);
  const updateText = useZine((s) => s.updateText);
  const removeText = useZine((s) => s.removeText);
  const bringTextToFront = useZine((s) => s.bringTextToFront);

  if (!artboard) return <div className="w-[300px] shrink-0" />;

  const frame = frameSize("carousel");
  const item = artboard.items.find((i) => i.id === selectedItemId) ?? null;
  const selectedText = artboard.texts.find((t) => t.id === selectedTextId) ?? null;

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      for (const file of Array.from(files)) {
        const asset = await importImageFile(file);
        addAsset(asset);
        addImageItem(asset.id);
      }
    } catch {
      alert("Sorry, that image could not be loaded.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const rotateBy = (delta: number) => {
    if (!item) return;
    const r = (((item.rotation + delta) % 360) + 360) % 360;
    updateImageItem(item.id, { rotation: r as Rotation });
  };

  return (
    <aside className="flex w-[300px] shrink-0 flex-col overflow-y-auto border-l border-neutral-800 bg-neutral-950 text-neutral-200">
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        multiple
        className="hidden"
        onChange={(e) => onPickFiles(e.target.files)}
      />

      <Section title="Carousel">
        <Field label="Slides">
          <Button
            variant="ghost"
            disabled={slideCount <= 2}
            onClick={() => setSlideCount(slideCount - 1)}
            className="!px-2"
          >
            −
          </Button>
          <span className="w-8 text-center text-sm font-medium">{slideCount}</span>
          <Button
            variant="ghost"
            disabled={slideCount >= MAX_SLIDES}
            onClick={() => setSlideCount(slideCount + 1)}
            className="!px-2"
          >
            +
          </Button>
        </Field>
        <Field label="Background">
          <ColorInput
            value={artboard.background}
            onChange={(v) => setPageBackground(0, v)}
          />
        </Field>
        <div className="flex gap-2">
          <Button onClick={() => fileRef.current?.click()} className="flex-1">
            <ImageIcon size={15} />
            Add photo
          </Button>
          <Button onClick={() => addText(0)} className="flex-1">
            <Type size={15} />
            Add text
          </Button>
        </div>
        <p className="text-xs text-neutral-500">
          Drag photos and text across the whole canvas — the dashed lines show
          where each 4:5 slide is cut on export.
        </p>
      </Section>

      {item && (
        <Section title="Photo">
          <Field label="Fit">
            <Segmented<FitMode>
              value={item.fit}
              onChange={(v) => updateImageItem(item.id, { fit: v })}
              options={[
                { value: "cover", label: "Fill", title: "Cover & crop" },
                { value: "contain", label: "Fit", title: "Fit inside box" },
                { value: "fill", label: "Stretch", title: "Stretch" },
              ]}
            />
          </Field>
          <Field label="Rotate">
            <Button variant="ghost" onClick={() => rotateBy(-90)} className="!px-2">
              <RotateCcw size={15} />
            </Button>
            <Button variant="ghost" onClick={() => rotateBy(90)} className="!px-2">
              <RotateCw size={15} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => updateImageItem(item.id, { flipH: !item.flipH })}
              className="!px-2"
            >
              <FlipHorizontal size={15} />
            </Button>
            <Button
              variant="ghost"
              onClick={() => updateImageItem(item.id, { flipV: !item.flipV })}
              className="!px-2"
            >
              <FlipVertical size={15} />
            </Button>
          </Field>
          <Field label="Zoom">
            <Slider
              value={item.zoom}
              min={0.2}
              max={4}
              step={0.01}
              onChange={(v) => updateImageItem(item.id, { zoom: v })}
            />
            <NumberInput
              value={Math.round(item.zoom * 100) / 100}
              min={0.1}
              max={6}
              step={0.05}
              onChange={(v) =>
                updateImageItem(item.id, { zoom: Math.round(v * 100) / 100 })
              }
            />
          </Field>
          <div>
            <span className="text-xs text-neutral-400">Aspect ratio</span>
            <div className="mt-1.5 grid grid-cols-4 gap-1.5">
              {ASPECTS.map((a) => {
                const active =
                  a.value === null
                    ? item.aspect === undefined
                    : item.aspect !== undefined &&
                      Math.abs(item.aspect - a.value) < 0.01;
                return (
                  <Button
                    key={a.label}
                    variant={active ? "primary" : "ghost"}
                    className="!px-2"
                    onClick={() => setItemAspect(item.id, a.value)}
                  >
                    {a.label}
                  </Button>
                );
              })}
            </div>
          </div>
          <div>
            <span className="text-xs text-neutral-400">Fit to slides</span>
            <div className="mt-1.5 grid grid-cols-2 gap-1.5">
              <Button
                variant="ghost"
                title="Span the photo across every slide"
                onClick={() =>
                  updateImageItem(item.id, {
                    x: 0,
                    y: 0,
                    w: 1,
                    h: 1,
                    aspect: undefined,
                  })
                }
              >
                Span all slides
              </Button>
              <Button
                variant="ghost"
                title="Shrink the photo to one slide"
                onClick={() =>
                  updateImageItem(item.id, {
                    w: 1 / slideCount,
                    h: 1,
                    aspect: undefined,
                  })
                }
              >
                One slide
              </Button>
            </div>
          </div>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              className="flex-1"
              title="Center the image in its box"
              onClick={() => updateImageItem(item.id, { offsetX: 0, offsetY: 0 })}
            >
              Center
            </Button>
            <Button variant="ghost" className="flex-1" onClick={() => bringItemToFront(item.id)}>
              To front
            </Button>
            <Button variant="danger" onClick={() => removeImageItem(item.id)}>
              <Trash2 size={15} />
            </Button>
          </div>
          <p className="text-xs text-neutral-500">
            Drag the photo to move it; drag its corner handle to resize.
          </p>
        </Section>
      )}

      {selectedText && (
        <TextControls
          key={selectedText.id}
          block={selectedText}
          frame={frame}
          onChange={(p) => updateText(0, selectedText.id, p)}
          onDelete={() => removeText(0, selectedText.id)}
          onFront={() => bringTextToFront(0, selectedText.id)}
        />
      )}

      <Section title="Images">
        <Button onClick={() => fileRef.current?.click()} className="w-full">
          <Plus size={15} />
          Upload photo(s)
        </Button>
        {assets.length > 0 && (
          <div className="columns-3 gap-2">
            {assets.map((a) => (
              <div key={a.id} className="group relative mb-2 break-inside-avoid">
                <button
                  title={`Add "${a.name}" to the canvas`}
                  onClick={() => addImageItem(a.id)}
                  className="block w-full overflow-hidden rounded border border-neutral-700 hover:border-violet-500"
                >
                  <img src={a.dataUrl} alt={a.name} className="block h-auto w-full" />
                </button>
                <button
                  title="Remove from library"
                  onClick={() => removeAsset(a.id)}
                  className="absolute right-1 top-1 rounded bg-black/70 p-1 text-white opacity-0 transition group-hover:opacity-100 [@media(hover:none)]:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <div className="px-4 py-3 text-[11px] text-neutral-600">{doc.title}</div>
    </aside>
  );
}
