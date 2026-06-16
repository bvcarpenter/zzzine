import { Plus } from "lucide-react";
import { useElementSize } from "../hooks/useElementSize";
import { EditablePage } from "./EditablePage";
import { useZine } from "../store";
import { frameSize, MAX_SLIDES } from "../lib/dims";

const FRAME = frameSize("carousel");
const ASPECT = FRAME.width / FRAME.height; // 0.8 (4:5)
const LABEL_H = 26;
const PAD = 28;
const MAX_FRAME_H = 660;

/** Horizontal filmstrip of 4:5 carousel slides. */
export function CarouselView() {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const pages = useZine((s) => s.doc.pages);
  const selectedPageIndex = useZine((s) => s.selectedPageIndex);
  const addPage = useZine((s) => s.addPage);

  let frameH = Math.max(0, size.height - PAD * 2 - LABEL_H);
  if (frameH > MAX_FRAME_H) frameH = MAX_FRAME_H;
  const frameW = frameH * ASPECT;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-neutral-900">
      <div className="border-b border-neutral-800 px-4 py-2 text-center text-sm font-medium text-neutral-300">
        {pages.length} slide{pages.length === 1 ? "" : "s"} · 4:5 · 1080×1350
      </div>
      <div ref={ref} className="relative flex-1 overflow-x-auto overflow-y-hidden">
        {size.height > 0 && (
          <div className="flex h-full w-max items-center gap-5 px-8">
            {pages.map((p, i) => {
              const isSel = i === selectedPageIndex;
              return (
                <div key={p.id} className="flex shrink-0 flex-col items-center">
                  <div
                    className="shadow-2xl ring-1 ring-black/50"
                    style={{ width: frameW, height: frameH }}
                  >
                    <EditablePage
                      index={i}
                      width={frameW}
                      height={frameH}
                      frame={FRAME}
                    />
                  </div>
                  <div
                    className={`mt-1.5 text-xs ${
                      isSel ? "text-violet-300" : "text-neutral-500"
                    }`}
                  >
                    Slide {i + 1}
                    {p.span ? " · span" : ""}
                  </div>
                </div>
              );
            })}
            {pages.length < MAX_SLIDES && (
              <button
                onClick={addPage}
                title="Add slide"
                className="flex shrink-0 flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-neutral-700 text-neutral-500 transition hover:border-neutral-500 hover:text-neutral-300"
                style={{ width: frameW, height: frameH }}
              >
                <Plus size={32} />
                <span className="text-xs">Add slide</span>
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
