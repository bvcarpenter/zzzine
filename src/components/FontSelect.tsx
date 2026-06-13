import { FONTS, fontCss } from "../lib/fonts";

interface Props {
  value: string;
  onChange: (key: string) => void;
}

const CATEGORIES = ["Sans", "Serif", "Mono", "Display", "Handwriting"] as const;

/** Native select grouped by category, each option shown in its own font. */
export function FontSelect({ value, onChange }: Props) {
  return (
    <select
      value={value}
      onChange={(e) => onChange(e.target.value)}
      className="w-full rounded border border-neutral-700 bg-neutral-900 px-2 py-1.5 text-sm text-neutral-100"
      style={{ fontFamily: fontCss(value) }}
    >
      {CATEGORIES.map((cat) => {
        const fonts = FONTS.filter((f) => f.category === cat);
        if (fonts.length === 0) return null;
        return (
          <optgroup key={cat} label={cat}>
            {fonts.map((f) => (
              <option
                key={f.key}
                value={f.key}
                style={{ fontFamily: fontCss(f.key) }}
              >
                {f.label}
              </option>
            ))}
          </optgroup>
        );
      })}
    </select>
  );
}
