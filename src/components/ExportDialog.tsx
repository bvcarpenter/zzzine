import { useState } from "react";
import { Loader2, X } from "lucide-react";
import { useZine } from "../store";
import type { ExportOptions } from "../lib/pdf";
import { Button, Section, Toggle } from "./ui";

const DPI_CHOICES = [150, 300, 450];

export function ExportDialog({ onClose }: { onClose: () => void }) {
  const doc = useZine((s) => s.doc);
  const assets = useZine((s) => s.assets);

  const [dpi, setDpi] = useState(300);
  const [longEdge, setLongEdge] = useState(false);
  const [foldGuide, setFoldGuide] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const sheets = doc.pages.length / 4;
  const isCarousel = doc.kind === "carousel";

  const run = async () => {
    setBusy(true);
    setError(null);
    try {
      if (isCarousel) {
        const { exportCarouselZip } = await import("../lib/carouselExport");
        await exportCarouselZip(doc, assets);
      } else {
        const opts: Partial<ExportOptions> = {
          dpi,
          longEdgeBinding: longEdge,
          foldGuide,
        };
        // Loaded on demand so pdf-lib/fontkit aren't in the initial bundle.
        const { downloadZinePdf } = await import("../lib/pdf");
        await downloadZinePdf(doc, assets, opts);
      }
      onClose();
    } catch (e) {
      setError(e instanceof Error ? e.message : "Export failed.");
    } finally {
      setBusy(false);
    }
  };

  if (isCarousel) {
    return (
      <div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
        onClick={onClose}
      >
        <div
          className="w-full max-w-md overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-200 shadow-2xl"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
            <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
              Export carousel
            </h2>
            <button
              onClick={onClose}
              className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
            >
              <X size={18} />
            </button>
          </div>
          <Section title="Instagram">
            <p className="text-xs leading-relaxed text-neutral-500">
              Slices the canvas into <strong>{doc.slideCount}</strong> images at{" "}
              <strong>1080×1350</strong> (4:5), numbered in order, in a{" "}
              <strong>.zip</strong>. Unzip and upload them to a single Instagram
              post in sequence — anything spanning a cut line continues across
              slides as you swipe.
            </p>
          </Section>
          {error && <div className="px-4 py-2 text-sm text-red-400">{error}</div>}
          <div className="flex justify-end gap-2 border-t border-neutral-800 px-4 py-3">
            <Button variant="ghost" onClick={onClose}>
              Cancel
            </Button>
            <Button variant="primary" onClick={run} disabled={busy}>
              {busy ? (
                <>
                  <Loader2 size={15} className="animate-spin" />
                  Rendering…
                </>
              ) : (
                "Download ZIP"
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4"
      onClick={onClose}
    >
      <div
        className="w-full max-w-md overflow-hidden rounded-xl border border-neutral-800 bg-neutral-950 text-neutral-200 shadow-2xl"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between border-b border-neutral-800 px-4 py-3">
          <h2 className="text-sm font-semibold uppercase tracking-wide text-neutral-300">
            Export printable PDF
          </h2>
          <button
            onClick={onClose}
            className="rounded p-1 text-neutral-400 hover:bg-neutral-800 hover:text-neutral-100"
          >
            <X size={18} />
          </button>
        </div>

        <Section title="Quality">
          <div className="flex gap-2">
            {DPI_CHOICES.map((d) => (
              <Button
                key={d}
                variant={dpi === d ? "primary" : "ghost"}
                className="flex-1"
                onClick={() => setDpi(d)}
              >
                {d === 150 ? "Draft" : d === 300 ? "Standard" : "High"}
                <span className="ml-1 text-xs opacity-70">{d}dpi</span>
              </Button>
            ))}
          </div>
        </Section>

        <Section title="Printing">
          <Toggle
            label="My printer flips on the long edge"
            checked={longEdge}
            onChange={setLongEdge}
          />
          <Toggle
            label="Draw fold line down the spine"
            checked={foldGuide}
            onChange={setFoldGuide}
          />
          <div className="text-xs leading-relaxed text-neutral-500">
            {sheets} landscape sheet{sheets === 1 ? "" : "s"}, printed
            double-sided. To assemble:
            <ol className="mt-1 list-decimal space-y-0.5 pl-4">
              <li>
                Print two-sided at 100% (actual size). For these landscape
                sheets, choose <strong>flip on short edge</strong>.
              </li>
              <li>
                If the back sides come out upside down, turn on the long-edge
                option above and re-export.
              </li>
              <li>
                Keep the sheets in printed order (first sheet on top), fold the
                whole stack in half, and staple along the spine.
              </li>
            </ol>
          </div>
        </Section>

        {error && (
          <div className="px-4 py-2 text-sm text-red-400">{error}</div>
        )}

        <div className="flex justify-end gap-2 border-t border-neutral-800 px-4 py-3">
          <Button variant="ghost" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" onClick={run} disabled={busy}>
            {busy ? (
              <>
                <Loader2 size={15} className="animate-spin" />
                Building…
              </>
            ) : (
              "Download PDF"
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
