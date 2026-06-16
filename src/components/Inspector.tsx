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
import { MAX_PAGES, MIN_PAGES, PAGES_PER_SHEET } from "../lib/constants";
import { LAYOUTS, layoutDef } from "../lib/layout";
import { frameSize } from "../lib/dims";
import type { FitMode, LayoutKind, PageNumberPosition, Rotation } from "../types";
import { FontSelect } from "./FontSelect";
import { TextControls } from "./TextControls";
import {
  Button,
  ColorInput,
  Field,
  NumberInput,
  Section,
  Segmented,
  Slider,
  Toggle,
} from "./ui";

/** Tiny grid glyph illustrating a layout. */
function LayoutGlyph({ kind }: { kind: LayoutKind }) {
  const { rows, cols } = layoutDef(kind);
  return (
    <div
      className="grid gap-[1px]"
      style={{
        width: 16,
        height: 20,
        gridTemplateColumns: `repeat(${cols}, 1fr)`,
        gridTemplateRows: `repeat(${rows}, 1fr)`,
      }}
    >
      {Array.from({ length: rows * cols }).map((_, i) => (
        <div key={i} className="bg-current" />
      ))}
    </div>
  );
}

/** Inspector for zine documents. */
export function Inspector() {
  const fileRef = useRef<HTMLInputElement>(null);

  const doc = useZine((s) => s.doc);
  const index = useZine((s) => s.selectedPageIndex);
  const page = useZine((s) => s.doc.pages[s.selectedPageIndex]);
  const assets = useZine((s) => s.assets);
  const cellIndex = useZine((s) => s.selectedCellIndex);
  const selectedTextId = useZine((s) => s.selectedTextId);

  const setPageCount = useZine((s) => s.setPageCount);
  const setPageBackground = useZine((s) => s.setPageBackground);
  const setPageLayout = useZine((s) => s.setPageLayout);
  const setPageGutter = useZine((s) => s.setPageGutter);
  const toggleSpan = useZine((s) => s.toggleSpan);
  const addText = useZine((s) => s.addText);
  const addAsset = useZine((s) => s.addAsset);
  const removeAsset = useZine((s) => s.removeAsset);
  const setCellImage = useZine((s) => s.setCellImage);
  const updateCellImage = useZine((s) => s.updateCellImage);
  const clearCell = useZine((s) => s.clearCell);
  const selectCell = useZine((s) => s.selectCell);
  const updateText = useZine((s) => s.updateText);
  const removeText = useZine((s) => s.removeText);
  const bringTextToFront = useZine((s) => s.bringTextToFront);
  const setPageNumbers = useZine((s) => s.setPageNumbers);

  if (!page) return <div className="w-[300px] shrink-0" />;

  const frame = frameSize("zine");
  const safeCell = Math.min(cellIndex, page.cells.length - 1);
  const img = page.cells[safeCell] ?? null;
  const selectedText = page.texts.find((t) => t.id === selectedTextId) ?? null;
  const total = doc.pages.length;
  const spanning = !!page.span;
  const multiCell = page.cells.length > 1 && !spanning;

  // Interior pages span their facing spread; the covers wrap around.
  const isCover = index === 0 || index === total - 1;
  const canSpan = total >= 4;
  const spanLabel = isCover
    ? "Wrap photo across covers"
    : "Span image across spread";

  const onPickFiles = async (files: FileList | null) => {
    if (!files || files.length === 0) return;
    try {
      let target = safeCell;
      for (const file of Array.from(files)) {
        const asset = await importImageFile(file);
        addAsset(asset);
        if (target < page.cells.length) {
          setCellImage(index, target, asset.id);
          target += 1;
        }
      }
    } catch {
      alert("Sorry, that image could not be loaded.");
    }
    if (fileRef.current) fileRef.current.value = "";
  };

  const rotateBy = (delta: number) => {
    if (!img) return;
    const r = (((img.rotation + delta) % 360) + 360) % 360;
    updateCellImage(index, safeCell, { rotation: r as Rotation });
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

      <Section title="Booklet">
        <Field label="Pages">
          <Button
            variant="ghost"
            disabled={total <= MIN_PAGES}
            onClick={() => setPageCount(total - PAGES_PER_SHEET)}
            className="!px-2"
          >
            −4
          </Button>
          <span className="w-8 text-center text-sm font-medium">{total}</span>
          <Button
            variant="ghost"
            disabled={total >= MAX_PAGES}
            onClick={() => setPageCount(total + PAGES_PER_SHEET)}
            className="!px-2"
          >
            +4
          </Button>
        </Field>
        <p className="text-xs text-neutral-500">
          {total / PAGES_PER_SHEET} folded sheet
          {total / PAGES_PER_SHEET === 1 ? "" : "s"}. Pages come in multiples of
          4.
        </p>
      </Section>

      <Section title={`Page ${index + 1}`}>
        {canSpan && (
          <Toggle
            label={spanLabel}
            checked={spanning}
            onChange={() => toggleSpan(index)}
          />
        )}
        {!spanning && (
          <>
            <span className="text-xs text-neutral-400">Layout</span>
            <div className="grid grid-cols-6 gap-1.5">
              {LAYOUTS.map((l) => (
                <button
                  key={l.kind}
                  title={l.label}
                  onClick={() => setPageLayout(index, l.kind)}
                  className={`flex items-center justify-center rounded border py-1.5 ${
                    page.layout === l.kind
                      ? "border-violet-500 bg-violet-600/20 text-violet-300"
                      : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                  }`}
                >
                  <LayoutGlyph kind={l.kind} />
                </button>
              ))}
            </div>
            <Field label="Gap">
              <Slider
                value={page.gutter}
                min={0}
                max={48}
                onChange={(v) => setPageGutter(index, v)}
              />
              <NumberInput
                value={page.gutter}
                min={0}
                max={96}
                step={1}
                onChange={(v) => setPageGutter(index, v)}
              />
            </Field>
          </>
        )}
        {spanning && (
          <p className="text-xs text-neutral-500">
            {isCover
              ? "This photo wraps across the back and front covers. Edits apply to both."
              : "This image spans both facing pages. Edits apply to the whole spread."}
          </p>
        )}
        <Field label="Background">
          <ColorInput
            value={page.background}
            onChange={(v) => setPageBackground(index, v)}
          />
        </Field>
        <Button onClick={() => addText(index)} className="w-full">
          <Type size={15} />
          Add text
        </Button>
      </Section>

      {multiCell && (
        <Section title="Image cells">
          <div className="grid grid-cols-4 gap-1.5">
            {page.cells.map((c, i) => (
              <button
                key={i}
                onClick={() => selectCell(i)}
                className={`rounded border py-1.5 text-xs ${
                  i === safeCell
                    ? "border-violet-500 bg-violet-600/20 text-violet-200"
                    : "border-neutral-700 text-neutral-400 hover:border-neutral-500"
                }`}
              >
                {i + 1}
                {c ? " •" : ""}
              </button>
            ))}
          </div>
          <p className="text-xs text-neutral-500">
            Pick a cell (or click it on the page), then add or adjust its image.
          </p>
        </Section>
      )}

      <Section title={multiCell ? `Image · cell ${safeCell + 1}` : "Image"}>
        <Button onClick={() => fileRef.current?.click()} className="w-full">
          <ImageIcon size={15} />
          {img ? "Replace image" : "Add image"}
        </Button>
        {img && (
          <>
            <Field label="Fit">
              <Segmented<FitMode>
                value={img.fit}
                onChange={(v) => updateCellImage(index, safeCell, { fit: v })}
                options={[
                  { value: "cover", label: "Fill", title: "Cover & crop" },
                  { value: "contain", label: "Fit", title: "Fit inside" },
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
                onClick={() => updateCellImage(index, safeCell, { flipH: !img.flipH })}
                className="!px-2"
              >
                <FlipHorizontal size={15} />
              </Button>
              <Button
                variant="ghost"
                onClick={() => updateCellImage(index, safeCell, { flipV: !img.flipV })}
                className="!px-2"
              >
                <FlipVertical size={15} />
              </Button>
            </Field>
            <Field label="Zoom">
              <Slider
                value={img.zoom}
                min={0.2}
                max={4}
                step={0.01}
                onChange={(v) => updateCellImage(index, safeCell, { zoom: v })}
              />
              <NumberInput
                value={Math.round(img.zoom * 100) / 100}
                min={0.1}
                max={6}
                step={0.05}
                onChange={(v) =>
                  updateCellImage(index, safeCell, {
                    zoom: Math.round(v * 100) / 100,
                  })
                }
              />
            </Field>
            <div className="flex gap-2">
              <Button
                variant="ghost"
                className="flex-1"
                title="Center the image in its slot"
                onClick={() => updateCellImage(index, safeCell, { offsetX: 0, offsetY: 0 })}
              >
                Center
              </Button>
              <Button
                variant="ghost"
                className="flex-1"
                onClick={() =>
                  updateCellImage(index, safeCell, { offsetX: 0, offsetY: 0, zoom: 1 })
                }
              >
                Reset
              </Button>
              <Button variant="danger" onClick={() => clearCell(index, safeCell)}>
                <Trash2 size={15} />
              </Button>
            </div>
            <p className="text-xs text-neutral-500">
              Drag the image on the page to reposition; scroll to zoom.
            </p>
          </>
        )}
      </Section>

      {selectedText && (
        <TextControls
          key={selectedText.id}
          block={selectedText}
          frame={frame}
          onChange={(p) => updateText(index, selectedText.id, p)}
          onDelete={() => removeText(index, selectedText.id)}
          onFront={() => bringTextToFront(index, selectedText.id)}
        />
      )}

      <Section title="Images">
        <Button onClick={() => fileRef.current?.click()} className="w-full">
          <Plus size={15} />
          Upload image(s)
        </Button>
        {assets.length > 0 && (
          <div className="grid grid-cols-3 gap-2">
            {assets.map((a) => (
              <div key={a.id} className="group relative">
                <button
                  title={`Place "${a.name}" in cell ${safeCell + 1}`}
                  onClick={() => setCellImage(index, safeCell, a.id)}
                  className="block aspect-square w-full overflow-hidden rounded border border-neutral-700 hover:border-violet-500"
                >
                  <img src={a.dataUrl} alt={a.name} className="h-full w-full object-cover" />
                </button>
                <button
                  title="Remove from library"
                  onClick={() => removeAsset(a.id)}
                  className="absolute right-1 top-1 rounded bg-black/70 p-0.5 text-white opacity-0 transition group-hover:opacity-100"
                >
                  <Trash2 size={12} />
                </button>
              </div>
            ))}
          </div>
        )}
      </Section>

      <Section title="Page numbers">
        <Toggle
          label="Show page numbers"
          checked={doc.pageNumbers.enabled}
          onChange={(v) => setPageNumbers({ enabled: v })}
        />
        {doc.pageNumbers.enabled && (
          <>
            <Field label="Position">
              <select
                value={doc.pageNumbers.position}
                onChange={(e) =>
                  setPageNumbers({ position: e.target.value as PageNumberPosition })
                }
                className="rounded border border-neutral-700 bg-neutral-900 px-2 py-1 text-sm"
              >
                <option value="bottom-outer">Bottom outer</option>
                <option value="bottom-center">Bottom center</option>
                <option value="bottom-inner">Bottom inner</option>
                <option value="top-outer">Top outer</option>
                <option value="top-center">Top center</option>
              </select>
            </Field>
            <Field label="Font">
              <div className="w-40">
                <FontSelect
                  value={doc.pageNumbers.fontFamily}
                  onChange={(v) => setPageNumbers({ fontFamily: v })}
                />
              </div>
            </Field>
            <Field label="Size">
              <NumberInput
                value={doc.pageNumbers.fontSize}
                min={6}
                max={48}
                onChange={(v) => setPageNumbers({ fontSize: v })}
              />
            </Field>
            <Field label="Color">
              <ColorInput
                value={doc.pageNumbers.color}
                onChange={(v) => setPageNumbers({ color: v })}
              />
            </Field>
            <Toggle
              label="Skip cover pages"
              checked={doc.pageNumbers.skipCovers}
              onChange={(v) => setPageNumbers({ skipCovers: v })}
            />
          </>
        )}
      </Section>
    </aside>
  );
}
