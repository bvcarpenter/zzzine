import { useEffect, useRef, useState } from "react";
import { Copy, Download, FilePlus2, Pencil, Trash2, Upload, X } from "lucide-react";
import { useZine } from "../store";
import { uid } from "../lib/id";
import { resetHistory } from "../lib/history";
import {
  deleteDraft,
  getDraftIndex,
  loadDraft,
  renameDraft,
  saveDraft,
  setCurrentDraftId,
  type DraftMeta,
} from "../lib/storage";
import { downloadProjectFile, readProjectFile } from "../lib/projectFile";
import { Button } from "./ui";

function timeAgo(ts: number): string {
  const s = Math.round((Date.now() - ts) / 1000);
  if (s < 60) return "just now";
  const m = Math.round(s / 60);
  if (m < 60) return `${m} min ago`;
  const h = Math.round(m / 60);
  if (h < 24) return `${h} hr ago`;
  return new Date(ts).toLocaleDateString();
}

const byRecent = (a: DraftMeta, b: DraftMeta) => b.updatedAt - a.updatedAt;

export function DraftsDialog({ onClose }: { onClose: () => void }) {
  const currentId = useZine((s) => s.currentDraftId);
  const [list, setList] = useState<DraftMeta[]>([]);
  const importRef = useRef<HTMLInputElement>(null);

  const refresh = async () => setList((await getDraftIndex()).sort(byRecent));

  useEffect(() => {
    void refresh();
  }, []);

  /** Load a stored draft into the editor (no dialog close). */
  const switchTo = async (id: string): Promise<boolean> => {
    const data = await loadDraft(id);
    if (!data) return false;
    useZine.getState().hydrate(data.doc, data.assets);
    useZine.getState().setCurrentDraftId(id);
    await setCurrentDraftId(id);
    resetHistory();
    return true;
  };

  /** Start a fresh, empty draft (no dialog close). */
  const createBlank = async (): Promise<void> => {
    const id = uid("draft");
    useZine.getState().newProject();
    useZine.getState().setCurrentDraftId(id);
    const { doc, assets } = useZine.getState();
    await saveDraft(id, doc.title, { doc, assets });
    await setCurrentDraftId(id);
    resetHistory();
  };

  const open = async (id: string) => {
    if (await switchTo(id)) onClose();
  };

  const newDraft = async () => {
    await createBlank();
    onClose();
  };

  const duplicate = async (id: string) => {
    const data = await loadDraft(id);
    if (!data) return;
    const newId = uid("draft");
    const name = `${data.doc.title || "Untitled zine"} (copy)`;
    await saveDraft(newId, name, {
      doc: { ...data.doc, title: name },
      assets: data.assets,
    });
    await refresh();
  };

  const rename = async (meta: DraftMeta) => {
    const name = window.prompt("Rename draft", meta.name);
    if (!name) return;
    await renameDraft(meta.id, name);
    if (meta.id === currentId) useZine.getState().setTitle(name);
    await refresh();
  };

  const remove = async (id: string) => {
    if (!confirm("Delete this draft? This can't be undone.")) return;
    const next = (await deleteDraft(id)).sort(byRecent);
    if (id === currentId) {
      if (next.length > 0) await switchTo(next[0].id);
      else await createBlank();
    }
    await refresh();
  };

  const onImport = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { doc, assets } = await readProjectFile(file);
      const id = uid("draft");
      await saveDraft(id, doc.title || "Imported zine", { doc, assets });
      await switchTo(id);
      onClose();
    } catch {
      alert("That file is not a valid zzzine project.");
    }
    if (importRef.current) importRef.current.value = "";
  };

  const exportCurrent = () => {
    const { doc, assets } = useZine.getState();
    downloadProjectFile(doc, assets);
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="flex max-h-[80vh] w-full max-w-lg flex-col overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
            Drafts
          </h2>
          <div className="flex items-center gap-2">
            <Button variant="primary" onClick={newDraft}>
              <FilePlus2 size={15} />
              New zine
            </Button>
            <button
              onClick={onClose}
              className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            >
              <X size={18} />
            </button>
          </div>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto p-2">
          {list.length === 0 && (
            <p className="px-3 py-6 text-center text-sm text-neutral-500">
              No saved drafts yet.
            </p>
          )}
          <ul className="flex flex-col gap-1">
            {list.map((m) => {
              const isCurrent = m.id === currentId;
              return (
                <li
                  key={m.id}
                  className={`flex items-center gap-2 rounded-lg px-3 py-2 ${
                    isCurrent ? "bg-violet-600/15 ring-1 ring-violet-600/40" : "hover:bg-neutral-900"
                  }`}
                >
                  <button
                    className="min-w-0 flex-1 text-left"
                    onClick={() => open(m.id)}
                    title="Open this draft"
                  >
                    <div className="truncate text-sm font-medium text-neutral-100">
                      {m.name || "Untitled zine"}
                      {isCurrent && (
                        <span className="ml-2 text-[11px] font-normal text-violet-300">
                          editing
                        </span>
                      )}
                    </div>
                    <div className="text-[11px] text-neutral-500">
                      Edited {timeAgo(m.updatedAt)}
                    </div>
                  </button>
                  <button
                    title="Rename"
                    onClick={() => rename(m)}
                    className="rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
                  >
                    <Pencil size={15} />
                  </button>
                  <button
                    title="Duplicate"
                    onClick={() => duplicate(m.id)}
                    className="rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
                  >
                    <Copy size={15} />
                  </button>
                  <button
                    title="Delete"
                    onClick={() => remove(m.id)}
                    className="rounded p-1.5 text-neutral-400 hover:bg-neutral-800 hover:text-red-400"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="flex items-center justify-between gap-2 border-t border-neutral-800 px-4 py-3">
          <span className="text-[11px] text-neutral-500">
            Saved in this browser.
          </span>
          <div className="flex gap-2">
            <input
              ref={importRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={(e) => onImport(e.target.files?.[0])}
            />
            <Button variant="ghost" onClick={() => importRef.current?.click()}>
              <Upload size={15} />
              Import file
            </Button>
            <Button variant="ghost" onClick={exportCurrent}>
              <Download size={15} />
              Export file
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
