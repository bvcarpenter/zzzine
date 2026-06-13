import { useState } from "react";
import { Download, FolderOpen, Redo2, Undo2 } from "lucide-react";
import { useZine } from "../store";
import { undo, redo, useHistory } from "../lib/history";
import { Button } from "./ui";
import { ExportDialog } from "./ExportDialog";
import { DraftsDialog } from "./DraftsDialog";

export function TopBar() {
  const title = useZine((s) => s.doc.title);
  const setTitle = useZine((s) => s.setTitle);
  const canUndo = useHistory((s) => s.canUndo);
  const canRedo = useHistory((s) => s.canRedo);

  const [showExport, setShowExport] = useState(false);
  const [showDrafts, setShowDrafts] = useState(false);

  return (
    <header className="flex items-center gap-3 border-b border-neutral-800 bg-neutral-950 px-4 py-2">
      <div className="flex items-center gap-2 text-neutral-100">
        <span className="text-lg font-black tracking-tight text-violet-400">
          zzz
        </span>
        <span className="text-lg font-black tracking-tight">ine</span>
      </div>

      <input
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        className="ml-2 w-64 rounded border border-transparent bg-transparent px-2 py-1 text-sm text-neutral-200 hover:border-neutral-700 focus:border-neutral-600 focus:outline-none"
        aria-label="Zine title"
      />

      <div className="ml-auto flex items-center gap-2">
        <div className="mr-1 flex items-center gap-1">
          <Button
            variant="ghost"
            disabled={!canUndo}
            onClick={undo}
            title="Undo (Ctrl/Cmd+Z)"
            className="!px-2"
          >
            <Undo2 size={16} />
          </Button>
          <Button
            variant="ghost"
            disabled={!canRedo}
            onClick={redo}
            title="Redo (Ctrl/Cmd+Shift+Z)"
            className="!px-2"
          >
            <Redo2 size={16} />
          </Button>
        </div>
        <Button variant="ghost" onClick={() => setShowDrafts(true)}>
          <FolderOpen size={15} />
          Drafts
        </Button>
        <Button variant="primary" onClick={() => setShowExport(true)}>
          <Download size={15} />
          Export PDF
        </Button>
      </div>

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
      {showDrafts && <DraftsDialog onClose={() => setShowDrafts(false)} />}
    </header>
  );
}
