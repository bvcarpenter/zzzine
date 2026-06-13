import { useRef, useState } from "react";
import { Download, FilePlus2, FolderOpen, Save } from "lucide-react";
import { useZine } from "../store";
import { Button } from "./ui";
import { ExportDialog } from "./ExportDialog";
import { downloadProjectFile, readProjectFile } from "../lib/projectFile";

export function TopBar() {
  const title = useZine((s) => s.doc.title);
  const setTitle = useZine((s) => s.setTitle);
  const doc = useZine((s) => s.doc);
  const assets = useZine((s) => s.assets);
  const hydrate = useZine((s) => s.hydrate);
  const newProject = useZine((s) => s.newProject);

  const [showExport, setShowExport] = useState(false);
  const openRef = useRef<HTMLInputElement>(null);

  const onOpen = async (file: File | undefined) => {
    if (!file) return;
    try {
      const { doc: d, assets: a } = await readProjectFile(file);
      hydrate(d, a);
    } catch {
      alert("That file is not a valid zzzine project.");
    }
    if (openRef.current) openRef.current.value = "";
  };

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
        <input
          ref={openRef}
          type="file"
          accept=".json,application/json"
          className="hidden"
          onChange={(e) => onOpen(e.target.files?.[0])}
        />
        <Button
          variant="ghost"
          onClick={() => {
            if (confirm("Start a new zine? Unsaved changes will be lost."))
              newProject();
          }}
        >
          <FilePlus2 size={15} />
          New
        </Button>
        <Button variant="ghost" onClick={() => openRef.current?.click()}>
          <FolderOpen size={15} />
          Open
        </Button>
        <Button variant="ghost" onClick={() => downloadProjectFile(doc, assets)}>
          <Save size={15} />
          Save
        </Button>
        <Button variant="primary" onClick={() => setShowExport(true)}>
          <Download size={15} />
          Export PDF
        </Button>
      </div>

      {showExport && <ExportDialog onClose={() => setShowExport(false)} />}
    </header>
  );
}
