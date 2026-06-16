import { useEffect, useState } from "react";
import { TopBar } from "./components/TopBar";
import { PageList } from "./components/PageList";
import { SpreadView } from "./components/SpreadView";
import { CarouselCanvas } from "./components/CarouselCanvas";
import { Inspector } from "./components/Inspector";
import { CarouselInspector } from "./components/CarouselInspector";
import { useZine } from "./store";
import { uid } from "./lib/id";
import { redo, startHistory, undo } from "./lib/history";
import {
  getCurrentDraftId,
  getDraftIndex,
  loadDraft,
  migrateLegacyIfNeeded,
  saveDraft,
  setCurrentDraftId,
} from "./lib/storage";

export default function App() {
  const [ready, setReady] = useState(false);
  const kind = useZine((s) => s.doc.kind);

  // Restore the current (or most recent) draft on first load.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        await migrateLegacyIfNeeded();
        const index = await getDraftIndex();
        const curId = await getCurrentDraftId();
        const pick =
          curId && index.some((m) => m.id === curId)
            ? curId
            : index.length > 0
              ? [...index].sort((a, b) => b.updatedAt - a.updatedAt)[0].id
              : null;
        if (pick) {
          const data = await loadDraft(pick);
          if (data && !cancelled) {
            useZine.getState().hydrate(data.doc, data.assets);
            useZine.getState().setCurrentDraftId(pick);
            await setCurrentDraftId(pick);
          }
        } else if (!cancelled) {
          // First run: persist the default document as the first draft.
          const id = uid("draft");
          useZine.getState().setCurrentDraftId(id);
          const { doc, assets } = useZine.getState();
          await saveDraft(id, doc.title, { doc, assets });
          await setCurrentDraftId(id);
        }
      } catch {
        /* fall through to a usable empty editor */
      }
      if (!cancelled) {
        startHistory();
        setReady(true);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced autosave into the current draft.
  useEffect(() => {
    if (!ready) return;
    let last = useZine.getState().revision;
    let timer: number | undefined;
    const unsub = useZine.subscribe((state) => {
      if (state.revision === last) return;
      last = state.revision;
      if (timer) clearTimeout(timer);
      timer = window.setTimeout(() => {
        const { doc, assets, currentDraftId } = useZine.getState();
        if (currentDraftId) {
          void saveDraft(currentDraftId, doc.title || "Untitled zine", {
            doc,
            assets,
          }).catch(() => {});
        }
      }, 600);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [ready]);

  // Keyboard: undo/redo and delete-selected-text.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const el = document.activeElement as HTMLElement | null;
      const inField =
        !!el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable);
      const mod = e.metaKey || e.ctrlKey;

      if (mod && (e.key === "z" || e.key === "Z")) {
        if (inField) return; // let inputs handle their own undo
        e.preventDefault();
        if (e.shiftKey) redo();
        else undo();
        return;
      }
      if (mod && (e.key === "y" || e.key === "Y")) {
        if (inField) return;
        e.preventDefault();
        redo();
        return;
      }
      if (e.key === "Delete" || e.key === "Backspace") {
        if (inField) return;
        const s = useZine.getState();
        if (s.selectedTextId) {
          e.preventDefault();
          s.removeText(s.selectedPageIndex, s.selectedTextId);
        }
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  if (!ready) {
    return (
      <div className="flex h-full items-center justify-center bg-neutral-900 text-neutral-500">
        Loading…
      </div>
    );
  }

  return (
    <div className="flex h-full flex-col bg-neutral-900 text-neutral-100">
      <TopBar />
      <div className="flex min-h-0 flex-1">
        {kind !== "carousel" && <PageList />}
        {kind === "carousel" ? <CarouselCanvas /> : <SpreadView />}
        {kind === "carousel" ? <CarouselInspector /> : <Inspector />}
      </div>
    </div>
  );
}
