// Save/load a project to a single .json file (document + embedded images).

import type { Asset, Zine } from "../types";

interface ProjectFile {
  app: "zzzine";
  version: 1;
  doc: Zine;
  assets: Asset[];
}

export function downloadProjectFile(doc: Zine, assets: Asset[]): void {
  const payload: ProjectFile = { app: "zzzine", version: 1, doc, assets };
  const blob = new Blob([JSON.stringify(payload)], {
    type: "application/json",
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  const safe = (doc.title || "zine").replace(/[^a-z0-9-_]+/gi, "_");
  a.href = url;
  a.download = `${safe}.zzzine.json`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export async function readProjectFile(
  file: File,
): Promise<{ doc: Zine; assets: Asset[] }> {
  const text = await file.text();
  const data = JSON.parse(text) as Partial<ProjectFile>;
  if (data.app !== "zzzine" || !data.doc || !data.assets) {
    throw new Error("Not a valid zzzine project file");
  }
  return { doc: data.doc, assets: data.assets };
}
