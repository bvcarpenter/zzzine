// Load the bundled embedded fonts into the browser for editor preview.
// Uses the FontFace API so the URLs honor the app's base path (works under
// subpath hosting like GitHub Pages project sites).

import { FONTS } from "./fonts";

let loaded: Promise<void> | null = null;

export function loadEditorFonts(): Promise<void> {
  if (loaded) return loaded;
  loaded = (async () => {
    if (typeof FontFace === "undefined") return;
    await Promise.all(
      FONTS.filter((f) => f.kind === "embedded" && f.file && f.family).map(
        async (f) => {
          try {
            const url = `${import.meta.env.BASE_URL}${f.file}`;
            const face = new FontFace(f.family!, `url(${url})`);
            await face.load();
            document.fonts.add(face);
          } catch {
            // Non-fatal: the editor falls back to a system font.
          }
        },
      ),
    );
  })();
  return loaded;
}
