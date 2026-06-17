import { ChevronUp, ChevronDown, X } from "lucide-react";
import { PageThumbnail } from "./PageThumbnail";
import { useZine } from "../store";
import { roundUpToSheet } from "../lib/imposition";
import type { DocKind } from "../types";

const THUMB_WIDTH = 116;

function pageLabel(index: number, total: number, kind: DocKind): string {
  if (kind === "carousel") return `Slide ${index + 1}`;
  if (index === 0) return "Front cover";
  if (index === total - 1) return "Back cover";
  return `Page ${index + 1}`;
}

export function PageList() {
  const pages = useZine((s) => s.doc.pages);
  const assets = useZine((s) => s.assets);
  const kind = useZine((s) => s.doc.kind);
  const selected = useZine((s) => s.selectedPageIndex);
  const selectedPages = useZine((s) => s.selectedPages);
  const selectPage = useZine((s) => s.selectPage);
  const movePage = useZine((s) => s.movePage);
  const movePagesBy = useZine((s) => s.movePagesBy);

  const groupSel = selectedPages.length > 1;
  const minSel = Math.min(...selectedPages);
  const maxSel = Math.max(...selectedPages);
  const label = kind === "carousel" ? "Slides" : "Pages";

  // The saddle-stitch centerfold sits between the two middle reading-order
  // pages of the sheet-padded booklet (zine only).
  const padded = roundUpToSheet(pages.length);
  const centerRight = kind === "carousel" ? -1 : padded / 2;
  const centerLeft = kind === "carousel" ? -1 : padded / 2 - 1;
  const isCenter = (i: number) => i === centerLeft || i === centerRight;

  // A chevron on a grouped page moves the whole selection; otherwise one page.
  const moveItem = (i: number, dir: -1 | 1) => {
    if (groupSel && selectedPages.includes(i)) movePagesBy(dir);
    else movePage(i, i + dir);
  };
  const disableUp = (i: number) =>
    groupSel && selectedPages.includes(i) ? minSel === 0 : i === 0;
  const disableDown = (i: number) =>
    groupSel && selectedPages.includes(i)
      ? maxSel === pages.length - 1
      : i === pages.length - 1;

  return (
    <aside className="flex w-[180px] shrink-0 flex-col border-r border-neutral-800 bg-neutral-950">
      <div className="border-b border-neutral-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {label} · {pages.length}
      </div>

      {groupSel && (
        <div className="flex items-center gap-1 border-b border-neutral-800 bg-violet-600/10 px-2 py-1.5">
          <span className="flex-1 text-[11px] font-medium text-violet-200">
            {selectedPages.length} selected
          </span>
          <button
            title="Move selected up together"
            disabled={minSel === 0}
            onClick={() => movePagesBy(-1)}
            className="rounded bg-neutral-800 p-1 text-neutral-200 hover:bg-neutral-700 disabled:opacity-30"
          >
            <ChevronUp size={14} />
          </button>
          <button
            title="Move selected down together"
            disabled={maxSel === pages.length - 1}
            onClick={() => movePagesBy(1)}
            className="rounded bg-neutral-800 p-1 text-neutral-200 hover:bg-neutral-700 disabled:opacity-30"
          >
            <ChevronDown size={14} />
          </button>
          <button
            title="Clear selection"
            onClick={() => selectPage(selected, "single")}
            className="rounded bg-neutral-800 p-1 text-neutral-200 hover:bg-neutral-700"
          >
            <X size={14} />
          </button>
        </div>
      )}

      <div className="flex-1 overflow-y-auto p-3">
        <ol className="flex flex-col gap-3">
          {pages.map((page, i) => {
            const isActive = i === selected;
            const inGroup = selectedPages.includes(i);
            const foldHere = i === centerRight && centerRight < pages.length;
            return (
              <li key={page.id} className="group relative">
                {foldHere && (
                  <div
                    aria-hidden
                    className="-mt-1 mb-2 flex items-center gap-2 text-amber-400"
                  >
                    <span className="h-px flex-1 bg-amber-500/60" />
                    <span className="text-[10px] font-semibold uppercase tracking-wide">
                      Center fold
                    </span>
                    <span className="h-px flex-1 bg-amber-500/60" />
                  </div>
                )}
                <button
                  onClick={(e) =>
                    selectPage(
                      i,
                      e.metaKey || e.ctrlKey
                        ? "toggle"
                        : e.shiftKey
                          ? "range"
                          : "single",
                    )
                  }
                  className={`block w-full rounded-md p-1 text-left transition ${
                    isActive
                      ? "bg-violet-600/20 ring-2 ring-violet-500"
                      : inGroup
                        ? "bg-violet-600/10 ring-2 ring-violet-400/70"
                        : isCenter(i)
                          ? "ring-2 ring-amber-500/50 hover:ring-amber-400"
                          : "ring-1 ring-neutral-800 hover:ring-neutral-600"
                  }`}
                >
                  <div className="mx-auto overflow-hidden rounded-sm ring-1 ring-black/30">
                    <PageThumbnail
                      page={page}
                      assets={assets}
                      width={THUMB_WIDTH}
                      kind={kind}
                    />
                  </div>
                  <div className="mt-1 flex items-center justify-between px-0.5">
                    <span className="text-[11px] text-neutral-400">
                      {pageLabel(i, pages.length, kind)}
                    </span>
                    <span className="flex items-center gap-1 text-[11px] font-medium text-neutral-500">
                      {isCenter(i) && (
                        <span className="text-amber-400" title="Center of the booklet">
                          ◆
                        </span>
                      )}
                      {i + 1}
                    </span>
                  </div>
                </button>
                <div className="absolute right-1 top-1 flex flex-col gap-1 opacity-0 transition group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                  <button
                    title={
                      groupSel && inGroup ? "Move selected up together" : "Move up"
                    }
                    disabled={disableUp(i)}
                    onClick={() => moveItem(i, -1)}
                    className="rounded bg-neutral-800/90 p-0.5 text-neutral-200 hover:bg-neutral-700 disabled:opacity-30"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    title={
                      groupSel && inGroup
                        ? "Move selected down together"
                        : "Move down"
                    }
                    disabled={disableDown(i)}
                    onClick={() => moveItem(i, 1)}
                    className="rounded bg-neutral-800/90 p-0.5 text-neutral-200 hover:bg-neutral-700 disabled:opacity-30"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
        <p className="mt-3 px-1 text-[10px] leading-tight text-neutral-600">
          ⌘/Ctrl-click or Shift-click to select multiple {label.toLowerCase()} and
          move them together.
        </p>
      </div>
    </aside>
  );
}
