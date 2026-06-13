import { ChevronLeft, ChevronRight } from "lucide-react";
import { useElementSize } from "../hooks/useElementSize";
import { EditablePage } from "./EditablePage";
import { useZine } from "../store";
import { PAGE_HEIGHT_PT, PAGE_WIDTH_PT } from "../lib/constants";
import { buildSpreads, spreadIndexOf, spreadLabel } from "../lib/spreads";

const SPREAD_ASPECT = (2 * PAGE_WIDTH_PT) / PAGE_HEIGHT_PT;
const PAD = 36;

/** A blank "outside the booklet" panel for the open side of a cover spread. */
function EmptyHalf({ width, height }: { width: number; height: number }) {
  return (
    <div
      className="shrink-0 rounded-sm border border-dashed border-neutral-700 bg-neutral-900/40"
      style={{ width, height }}
    />
  );
}

export function SpreadView() {
  const { ref, size } = useElementSize<HTMLDivElement>();
  const pageCount = useZine((s) => s.doc.pages.length);
  const selectedPageIndex = useZine((s) => s.selectedPageIndex);
  const selectPage = useZine((s) => s.selectPage);

  const spreads = buildSpreads(pageCount);
  const current = spreadIndexOf(spreads, selectedPageIndex);
  const spread = spreads[current];

  const goTo = (target: number) => {
    const s = spreads[Math.min(spreads.length - 1, Math.max(0, target))];
    if (!s) return;
    const idx = s.right ?? s.left;
    if (idx !== null) selectPage(idx);
  };

  // Fit the two-page spread into the available area.
  const availW = Math.max(0, size.width - PAD * 2);
  const availH = Math.max(0, size.height - PAD * 2);
  let spreadW = availW;
  let spreadH = spreadW / SPREAD_ASPECT;
  if (spreadH > availH) {
    spreadH = availH;
    spreadW = spreadH * SPREAD_ASPECT;
  }
  const pageW = spreadW / 2;
  const pageH = spreadH;

  return (
    <div className="flex min-h-0 flex-1 flex-col bg-neutral-900">
      {/* Spread navigation */}
      <div className="flex items-center justify-center gap-4 border-b border-neutral-800 px-4 py-2">
        <button
          onClick={() => goTo(current - 1)}
          disabled={current === 0}
          className="rounded p-1 text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
          title="Previous spread"
        >
          <ChevronLeft size={20} />
        </button>
        <span className="min-w-[120px] text-center text-sm font-medium text-neutral-300">
          {spread ? spreadLabel(spread, pageCount) : ""}
        </span>
        <button
          onClick={() => goTo(current + 1)}
          disabled={current >= spreads.length - 1}
          className="rounded p-1 text-neutral-300 hover:bg-neutral-800 disabled:opacity-30"
          title="Next spread"
        >
          <ChevronRight size={20} />
        </button>
      </div>

      {/* The open book */}
      <div
        ref={ref}
        className="relative flex flex-1 items-center justify-center overflow-hidden p-9"
      >
        {size.width > 0 && spread && (
          <div
            className="flex shadow-2xl ring-1 ring-black/50"
            style={{ width: spreadW, height: spreadH }}
          >
            {spread.left !== null ? (
              <EditablePage index={spread.left} width={pageW} height={pageH} />
            ) : (
              <EmptyHalf width={pageW} height={pageH} />
            )}
            {/* spine */}
            <div className="z-10 -mx-px w-0.5 bg-gradient-to-r from-black/30 via-black/50 to-black/30" />
            {spread.right !== null ? (
              <EditablePage index={spread.right} width={pageW} height={pageH} />
            ) : (
              <EmptyHalf width={pageW} height={pageH} />
            )}
          </div>
        )}
      </div>
    </div>
  );
}
