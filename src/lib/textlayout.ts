// Word-wrapping used by the PDF exporter. The editor wraps text via CSS; this
// reproduces the same behaviour for vector text using real font metrics.

/** Measure the rendered width of a string at the working font size. */
export type Measure = (text: string) => number;

/**
 * Wrap `text` to lines no wider than `maxWidth`. Honors explicit newlines and
 * breaks over-long words character-by-character so nothing overflows the slot.
 */
export function wrapLines(text: string, maxWidth: number, measure: Measure): string[] {
  const out: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (paragraph.length === 0) {
      out.push("");
      continue;
    }
    const words = paragraph.split(/(\s+)/); // keep whitespace tokens
    let line = "";

    const pushLine = () => {
      out.push(line.replace(/\s+$/, ""));
      line = "";
    };

    for (const word of words) {
      const candidate = line + word;
      if (measure(candidate) <= maxWidth || line === "") {
        // Fits, or the line is empty and we must place at least something.
        if (line === "" && measure(word) > maxWidth) {
          // A single token wider than the slot: hard-break it.
          let chunk = "";
          for (const ch of word) {
            if (measure(chunk + ch) > maxWidth && chunk !== "") {
              out.push(chunk);
              chunk = ch;
            } else {
              chunk += ch;
            }
          }
          line = chunk;
        } else {
          line = candidate;
        }
      } else {
        pushLine();
        line = word.replace(/^\s+/, "");
      }
    }
    pushLine();
  }

  return out;
}
