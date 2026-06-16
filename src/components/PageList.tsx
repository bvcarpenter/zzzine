import { ChevronUp, ChevronDown } from "lucide-react";
import { PageThumbnail } from "./PageThumbnail";
import { useZine } from "../store";
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
  const selectPage = useZine((s) => s.selectPage);
  const movePage = useZine((s) => s.movePage);

  return (
    <aside className="flex w-[180px] shrink-0 flex-col border-r border-neutral-800 bg-neutral-950">
      <div className="border-b border-neutral-800 px-3 py-2 text-xs font-semibold uppercase tracking-wide text-neutral-400">
        {kind === "carousel" ? "Slides" : "Pages"} · {pages.length}
      </div>
      <div className="flex-1 overflow-y-auto p-3">
        <ol className="flex flex-col gap-3">
          {pages.map((page, i) => {
            const isSel = i === selected;
            return (
              <li key={page.id} className="group relative">
                <button
                  onClick={() => selectPage(i)}
                  className={`block w-full rounded-md p-1 text-left transition ${
                    isSel
                      ? "bg-violet-600/20 ring-2 ring-violet-500"
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
                    <span className="text-[11px] font-medium text-neutral-500">
                      {i + 1}
                    </span>
                  </div>
                </button>
                <div className="absolute right-1 top-1 flex flex-col gap-1 opacity-0 transition group-hover:opacity-100 [@media(hover:none)]:opacity-100">
                  <button
                    title="Move up"
                    disabled={i === 0}
                    onClick={() => movePage(i, i - 1)}
                    className="rounded bg-neutral-800/90 p-0.5 text-neutral-200 hover:bg-neutral-700 disabled:opacity-30"
                  >
                    <ChevronUp size={14} />
                  </button>
                  <button
                    title="Move down"
                    disabled={i === pages.length - 1}
                    onClick={() => movePage(i, i + 1)}
                    className="rounded bg-neutral-800/90 p-0.5 text-neutral-200 hover:bg-neutral-700 disabled:opacity-30"
                  >
                    <ChevronDown size={14} />
                  </button>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </aside>
  );
}
