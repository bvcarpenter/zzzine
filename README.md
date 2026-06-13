# zzzine

Make printable **zines** in your browser. Lay images and text onto half-letter
pages, then export a **print-ready PDF** that's already imposed for double-sided
printing — print, fold in half, staple, done.

Inspired by [dirtylittlezine](https://dirtylittlezine.com/), but built around a
proper saddle-stitch booklet so you can choose your own page count.

## What it does

- **Half-letter booklet format.** Each 8.5×11" sheet, folded in half, makes four
  5.5×8.5" pages. Page count is any multiple of 4 (4–64).
- **One image per page**, with fit (fill / fit / stretch), quarter-turn
  rotation, horizontal/vertical flip, zoom (scroll) and drag-to-reposition.
- **Text & captions** placed anywhere on a page — drag to move, double-click to
  edit. Pick a font, size, color, alignment, optional highlight background, and
  a little rotation. Text can sit over an image.
- **Fonts with personality:** Helvetica / Times / Courier plus bundled display
  faces (Anton, Archivo Black, Bebas Neue, Lobster, Permanent Marker, Special
  Elite). All are embedded into the exported PDF.
- **Optional page numbers** with position, font, color, and a "skip the covers"
  option.
- **Print-ready PDF export** with correct saddle-stitch imposition: pages are
  arranged two-up on landscape sheets in fold order. Choose draft/standard/high
  quality and a fold-guide line.
- **Runs entirely in the browser.** Your images never leave your machine. Work
  autosaves locally (IndexedDB); you can also Save/Open a project file.

## Printing your zine

1. Click **Export PDF** and download.
2. Print **double-sided** on letter paper at 100% / "Actual size".
3. If the back pages come out upside down relative to the fronts, toggle
   **"My printer flips on the long edge"** in the export dialog and re-export.
4. Keep the sheets in printed order, stack them, **fold the stack in half**, and
   staple along the spine.

## Develop

```bash
npm install
npm run dev      # start the dev server
npm run build    # type-check + production build into dist/
npm run preview  # serve the production build locally
```

Requirements: Node 20+ (developed on Node 22).

## Deploy

The build output in `dist/` is a fully static site — host it anywhere. Asset
paths are relative, so it works at the domain root or under a subpath.

- **Cloudflare Pages / Workers:** build command `npm run build`, output
  directory `dist`.
- **Vercel / Netlify:** framework "Vite", output `dist`.
- **GitHub Pages:** publish the `dist/` folder.

No backend or environment variables are required.

## Architecture

```
src/
  types.ts            # the zine document data model
  store.ts            # Zustand store (document + assets + selection)
  lib/
    constants.ts      # page/sheet dimensions in PDF points
    imposition.ts     # saddle-stitch booklet page ordering
    render.ts         # shared image-slot compositing (editor + PDF)
    pdf.ts            # PDF export (pdf-lib + fontkit), loaded on demand
    fonts.ts          # font registry (standard + embedded)
    image.ts          # image import / downscale / encode
    storage.ts        # IndexedDB autosave
  components/         # editor UI (page list, canvas, inspector, export)
```

The same `drawImageSlot` routine renders image content both on screen and into
the PDF, so the export matches the editor. Text and page numbers are drawn as
crisp vector text in the PDF; image content is composited to a raster at the
chosen DPI.

## Notes

- Fonts are redistributed under their original open licenses — see
  [`public/fonts/LICENSES.md`](public/fonts/LICENSES.md).
- `npm audit` reports a dev-only advisory in `esbuild` (a Vite build
  dependency). It does not affect the shipped static site; resolving it cleanly
  means upgrading to Vite 8, deferred for now.
