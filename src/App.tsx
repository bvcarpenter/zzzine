import { useEffect, useState } from "react";
import { TopBar } from "./components/TopBar";
import { PageList } from "./components/PageList";
import { SpreadView } from "./components/SpreadView";
import { Inspector } from "./components/Inspector";
import { useZine } from "./store";
import { loadProject, saveProject } from "./lib/storage";

export default function App() {
  const [ready, setReady] = useState(false);

  // Restore the saved project (if any) on first load.
  useEffect(() => {
    let cancelled = false;
    loadProject()
      .then((p) => {
        if (!cancelled && p?.doc && p.assets) {
          useZine.getState().hydrate(p.doc, p.assets);
        }
      })
      .catch(() => {})
      .finally(() => !cancelled && setReady(true));
    return () => {
      cancelled = true;
    };
  }, []);

  // Debounced autosave whenever the document changes.
  useEffect(() => {
    if (!ready) return;
    let last = useZine.getState().revision;
    let timer: number | undefined;
    const unsub = useZine.subscribe((state) => {
      if (state.revision === last) return;
      last = state.revision;
      if (timer) clearTimeout(timer);
      timer = window.setTimeout(() => {
        const { doc, assets } = useZine.getState();
        void saveProject({ doc, assets }).catch(() => {});
      }, 600);
    });
    return () => {
      if (timer) clearTimeout(timer);
      unsub();
    };
  }, [ready]);

  // Delete the selected text block with the keyboard.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Delete" && e.key !== "Backspace") return;
      const el = document.activeElement as HTMLElement | null;
      if (
        el &&
        (el.tagName === "INPUT" ||
          el.tagName === "TEXTAREA" ||
          el.isContentEditable)
      )
        return;
      const s = useZine.getState();
      if (s.selectedTextId) {
        e.preventDefault();
        s.removeText(s.selectedPageIndex, s.selectedTextId);
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
        <PageList />
        <SpreadView />
        <Inspector />
      </div>
    </div>
  );
}
