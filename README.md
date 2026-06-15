# zzzine

Make printable **zines** in your browser. Lay images and text onto half-letter
pages, then export a **print-ready PDF** that's already imposed for double-sided
printing — print, fold in half, staple, done.

Inspired by [dirtylittlezine](https://dirtylittlezine.com/), but built around a
proper saddle-stitch booklet so you can choose your own page count.

## What it does

- **Half-letter booklet format.** Each 8.5×11" sheet, folded in half, makes four
  5.5×8.5" pages. Page count is any multiple of 4 (4–64).
- **Open-book spread editor.** Edit two facing pages side by side, the way the
  folded booklet actually reads — cover alone, then 2–3, 4–5, … with the back
  cover alone. Click either page to edit it; flip spreads with the arrows.
- **Image layouts per page** — single, 2-up (across or stacked), 3-up, or a
  2×2 grid — with an adjustable gap. Each cell has its own fit (fill / fit /
  stretch), quarter-turn rotation, flip, zoom (scroll) and drag-to-reposition.
- **Spread images** — span one image across two facing pages, or wrap a
  landscape photo around the front and back covers. It's split into matching
  halves that line up across the fold when the booklet is assembled.
- **Text & captions** placed anywhere on a page — drag to move, double-click to
  edit. Pick a font, size, color, alignment, optional highlight background, and
  a little rotation. Text can sit over an image.
- **Centering tools** — one click to center text horizontally, vertically, or
  both; images have a Center button too.
- **Fonts with personality:** Helvetica / Times / Courier plus bundled display
  faces (Anton, Archivo Black, Bebas Neue, Lobster, Permanent Marker, Special
  Elite). All are embedded into the exported PDF.
- **Optional page numbers** with position, font, color, and a "skip the covers"
  option.
- **Print-ready PDF export** with correct saddle-stitch imposition: pages are
  arranged two-up on landscape sheets in fold order. Choose draft/standard/high
  quality and a fold-guide line.
- **Undo / redo** for every edit (Ctrl/Cmd+Z, Ctrl/Cmd+Shift+Z), with rapid
  changes like dragging coalesced into single steps.
- **Multiple drafts.** Keep several zines in the browser, switch between them,
  rename, duplicate, and delete. The current draft autosaves as you work.
- **Runs entirely in the browser.** Your images never leave your machine.
  Drafts are stored locally (IndexedDB); you can also export/import a project
  file for backup or sharing.

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
npm test         # run the imposition tests
```

The imposition is covered by `src/lib/imposition.test.ts`, which checks the
page pairing against the textbook saddle-stitch tables and simulates folding
the printed sheets to confirm the assembled booklet reads 1, 2, 3 … in order.

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
    imposition.ts     # saddle-stitch booklet page ordering (for printing)
    spreads.ts        # reader spreads for the open-book editor
    render.ts         # shared image-slot compositing (editor + PDF)
    pdf.ts            # PDF export (pdf-lib + fontkit), loaded on demand
    fonts.ts          # font registry (standard + embedded)
    image.ts          # image import / downscale / encode
    storage.ts        # IndexedDB draft storage
    history.ts        # undo/redo controller
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
