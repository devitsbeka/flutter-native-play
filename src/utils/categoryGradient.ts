/**
 * A real CSS gradient from what `categories.color` actually holds.
 *
 * That column stores a Tailwind class fragment — "from-yellow-300 to-amber-400"
 * — not a colour. Screens that fed it straight into
 * `linear-gradient(135deg, ${color}, ${color}dd)` emitted
 * `linear-gradient(135deg, from-yellow-300 to-amber-400, ...)`, which is not
 * valid CSS, so the browser dropped the whole declaration and the element
 * painted nothing. Every one of the 46 colours in the table is this shape, so
 * every video-less category card was rendering transparent: white text and
 * white glyphs over the page, which is how a picked category ended up
 * unreadable with its + and × buttons invisible.
 *
 * Using the class as a className is not the fix either — the value arrives at
 * runtime, and Tailwind's scanner only emits classes it can see in the source,
 * so those utilities are never generated.
 */

/** The shades used by categories.color, plus room to grow. */
const TAILWIND_SHADES: Record<string, string> = {
  "amber-300": "#fcd34d", "amber-400": "#fbbf24", "amber-500": "#f59e0b", "amber-600": "#d97706",
  "blue-300": "#93c5fd", "blue-400": "#60a5fa", "blue-500": "#3b82f6", "blue-600": "#2563eb",
  "cyan-300": "#67e8f9", "cyan-400": "#22d3ee", "cyan-500": "#06b6d4", "cyan-600": "#0891b2",
  "emerald-300": "#6ee7b7", "emerald-400": "#34d399", "emerald-500": "#10b981", "emerald-600": "#059669",
  "fuchsia-300": "#f0abfc", "fuchsia-400": "#e879f9", "fuchsia-500": "#d946ef", "fuchsia-600": "#c026d3",
  "gray-400": "#9ca3af", "gray-500": "#6b7280", "gray-600": "#4b5563",
  "green-300": "#86efac", "green-400": "#4ade80", "green-500": "#22c55e", "green-600": "#16a34a",
  "indigo-300": "#a5b4fc", "indigo-400": "#818cf8", "indigo-500": "#6366f1", "indigo-600": "#4f46e5",
  "lime-300": "#bef264", "lime-400": "#a3e635", "lime-500": "#84cc16", "lime-600": "#65a30d",
  "neutral-400": "#a3a3a3", "neutral-500": "#737373", "neutral-600": "#525252",
  "orange-300": "#fdba74", "orange-400": "#fb923c", "orange-500": "#f97316", "orange-600": "#ea580c",
  "pink-300": "#f9a8d4", "pink-400": "#f472b6", "pink-500": "#ec4899", "pink-600": "#db2777",
  "purple-300": "#d8b4fe", "purple-400": "#c084fc", "purple-500": "#a855f7", "purple-600": "#9333ea",
  "red-300": "#fca5a5", "red-400": "#f87171", "red-500": "#ef4444", "red-600": "#dc2626",
  "rose-300": "#fda4af", "rose-400": "#fb7185", "rose-500": "#f43f5e", "rose-600": "#e11d48",
  "sky-300": "#7dd3fc", "sky-400": "#38bdf8", "sky-500": "#0ea5e9", "sky-600": "#0284c7",
  "slate-300": "#cbd5e1", "slate-400": "#94a3b8", "slate-500": "#64748b", "slate-600": "#475569",
  "stone-300": "#d6d3d1", "stone-400": "#a8a29e", "stone-500": "#78716c", "stone-600": "#57534e",
  "teal-300": "#5eead4", "teal-400": "#2dd4bf", "teal-500": "#14b8a6", "teal-600": "#0d9488",
  "violet-300": "#c4b5fd", "violet-400": "#a78bfa", "violet-500": "#8b5cf6", "violet-600": "#7c3aed",
  "yellow-300": "#fde047", "yellow-400": "#facc15", "yellow-500": "#eab308", "yellow-600": "#ca8a04",
  "zinc-300": "#d4d4d8", "zinc-400": "#a1a1aa", "zinc-500": "#71717a", "zinc-600": "#52525b",
};

/** Used when a category has no colour, or one nothing here recognises. */
const FALLBACK: [string, string] = ["#8b5cf6", "#6366f1"];

function stopsOf(color: string | null | undefined): [string, string] {
  if (!color) return FALLBACK;

  // Already a colour rather than a class fragment (hex, hsl(), var(), ...):
  // use it for both stops and let the caller's overlay do the shading.
  const trimmed = color.trim();
  if (!/(?:^|\s)(?:from|via|to)-/.test(trimmed)) {
    return [trimmed, trimmed];
  }

  const shade = (prefix: string): string | undefined => {
    const match = trimmed.match(new RegExp(`(?:^|\\s)${prefix}-([a-z]+-\\d{2,3})`));
    return match ? TAILWIND_SHADES[match[1]] : undefined;
  };

  const from = shade("from");
  const to = shade("to") ?? shade("via");
  if (!from && !to) return FALLBACK;
  return [from ?? to!, to ?? from!];
}

/**
 * `categories.color` as a CSS gradient.
 *
 * @param color the raw column value ("from-yellow-300 to-amber-400")
 * @param angle gradient direction, default the 135deg the cards were written for
 */
export function categoryGradient(color: string | null | undefined, angle = "135deg"): string {
  const [from, to] = stopsOf(color);
  return `linear-gradient(${angle}, ${from}, ${to})`;
}
