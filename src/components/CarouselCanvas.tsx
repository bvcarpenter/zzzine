import { useState } from "react";
import { useElementSize } from "../hooks/useElementSize";
import { ImageItemView } from "./ImageItemView";
import { TextBlockView } from "./TextBlockView";
import { useZine } from "../store";
import { frameSize } from "../lib/dims";

const FRAME = frameSize("carousel");
const SLIDE_ASPECT = FRAME.width / FRAME.height; // 0.8 (4:5)
const PAD = 28;
const LABEL_H = 22;
const MAX_SLIDE_H = 660;

/** One wide artboard the width of all slides, with slide-cut guides. */
export function CarouselCanvas() {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const artboard = useZine((s) => s.doc.pages[0]);
  const slideCount = useZine((s) => s.doc.slideCount);
  const assets = useZine((s) => s.assets);
  const selectedItemId = useZine((s) => s.selectedItemId);
  const selectedTextId = useZine((s) => s.selectedTextId);
  const selectItem = useZine((s) => s.selectItem);
  const selectText = useZine((s) => s.selectText);
  const updateText = useZine((s) => s.updateText);

  if (!artboard) return <div className="flex-1 bg-neutral-900" />;

  let slideH = Math.min(size.height - PAD * 2 - LABEL_H, MAX_SLIDE_H);
  if (!(slideH > 0)) slideH = 0;
  const slideW = slideH * SLIDE_ASPECT;
  const canvasW = slideW * slideCount;
  const canvasH = slideH;
  const pxPerPt = slideW / FRAME.width;

  const assetFor = (id: string) => assets.find((a) => a.id === id) ?? null;

  const [snap, setSnap] = useState<{ xs: number[]; ys: number[] }>({
    xs: [],
    ys: [],
  });

  // Vertical intervals (0..1) of a cut line at fraction `xc` that lie over a
  // photo — drawn light so the separator stays visible; the rest is dark grey.
  const coveredIntervals = (xc: number): [number, number][] => {
    const ivs = artboard.items
      .filter((it) => it.x <= xc && xc <= it.x + it.w)
      .map((it) => [Math.max(0, it.y), Math.min(1, it.y + it.h)] as [number, number])
      .filter(([a, b]) => b > a)
      .sort((a, b) => a[0] - b[0]);
    const merged: [number, number][] = [];
    for (const iv of ivs) {
      const last = merged[merged.length - 1];
      if (!last || iv[0] > last[1]) merged.push([iv[0], iv[1]]);
      else last[1] = Math.max(last[1], iv[1]);
    }
    return merged;
  };

  const gapIntervals = (covered: [number, number][]): [number, number][] => {
    const gaps: [number, number][] = [];
    let cursor = 0;
    for (const [a, b] of covered) {
      if (a > cursor) gaps.push([cursor, a]);
      cursor = Math.max(cursor, b);
    }
    if (cursor < 1) gaps.push([cursor, 1]);
    return gaps;
  };

  return (
    <div className="flex min-h-0 min-w-0 flex-1 flex-col bg-neutral-900">
      <div className="border-b border-neutral-800 px-4 py-2 text-center text-sm font-medium text-neutral-300">
        {slideCount} slides · 4:5 · slice to 1080×1350
      </div>
      <div ref={ref} className="relative flex-1 overflow-auto">
        {canvasH > 0 && (
          <div className="mx-auto w-max p-7">
            <div
              className="relative shadow-2xl ring-1 ring-black/50"
              style={{ width: canvasW, height: canvasH, background: artboard.background }}
              onPointerDown={() => {
                selectItem(null);
                selectText(null);
              }}
            >
              {artboard.items.map((it) => (
                <ImageItemView
                  key={it.id}
                  item={it}
                  asset={assetFor(it.assetId)}
                  canvasW={canvasW}
                  canvasH={canvasH}
                  selected={it.id === selectedItemId}
                  siblings={artboard.items.filter((o) => o.id !== it.id)}
                  slideCount={slideCount}
                  onSnapChange={(xs, ys) => setSnap({ xs, ys })}
                />
              ))}

              {artboard.texts.map((t) => (
                <TextBlockView
                  key={t.id}
                  block={t}
                  pageWidth={canvasW}
                  pageHeight={canvasH}
                  pxPerPt={pxPerPt}
                  interactive
                  selected={t.id === selectedTextId}
                  onSelect={() => selectText(t.id)}
                  onChange={(partial) => updateText(0, t.id, partial)}
                />
              ))}

              {/* slide-cut guides: dark grey, but light where over a photo */}
              {Array.from({ length: slideCount - 1 }, (_, k) => k + 1).map((k) => {
                const xc = k / slideCount;
                const covered = coveredIntervals(xc);
                const gaps = gapIntervals(covered);
                return (
                  <div
                    key={k}
                    className="pointer-events-none absolute bottom-0 top-0"
                    style={{ left: k * slideW }}
                  >
                    {gaps.map(([a, b], i) => (
                      <div
                        key={`g${i}`}
                        className="absolute"
                        style={{
                          top: a * canvasH,
                          height: (b - a) * canvasH,
                          borderLeft: "2px dashed #4b5563",
                        }}
                      />
                    ))}
                    {covered.map(([a, b], i) => (
                      <div
                        key={`c${i}`}
                        className="absolute"
                        style={{
                          top: a * canvasH,
                          height: (b - a) * canvasH,
                          borderLeft: "2px dashed rgba(255,255,255,0.75)",
                        }}
                      />
                    ))}
                  </div>
                );
              })}

              {/* alignment snap guides */}
              {snap.xs.map((x, i) => (
                <div
                  key={`sx${i}`}
                  className="pointer-events-none absolute bottom-0 top-0 z-20"
                  style={{ left: x * canvasW, borderLeft: "1px solid #a78bfa" }}
                />
              ))}
              {snap.ys.map((y, i) => (
                <div
                  key={`sy${i}`}
                  className="pointer-events-none absolute left-0 right-0 z-20"
                  style={{ top: y * canvasH, borderTop: "1px solid #a78bfa" }}
                />
              ))}
            </div>
            <div className="mt-1.5 flex" style={{ width: canvasW }}>
              {Array.from({ length: slideCount }, (_, k) => (
                <div
                  key={k}
                  className="text-center text-xs text-neutral-500"
                  style={{ width: slideW }}
                >
                  Slide {k + 1}
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
