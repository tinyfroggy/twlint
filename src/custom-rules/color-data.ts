import { parseColor } from "./color-values.js";

/** Tailwind's built-in palette families. */
export const PALETTE_FAMILIES = [
  "slate",
  "gray",
  "zinc",
  "neutral",
  "stone",
  "mauve",
  "olive",
  "mist",
  "taupe",
  "red",
  "orange",
  "amber",
  "yellow",
  "lime",
  "green",
  "emerald",
  "teal",
  "cyan",
  "sky",
  "blue",
  "indigo",
  "violet",
  "purple",
  "fuchsia",
  "pink",
  "rose",
] as const;

/** Tailwind's built-in palette shades. */
export const PALETTE_SHADES = [
  "50",
  "100",
  "200",
  "300",
  "400",
  "500",
  "600",
  "700",
  "800",
  "900",
  "950",
] as const;

/** Every built-in palette token, e.g. `red-500`. */
export const PALETTE_TOKENS: string[] = PALETTE_FAMILIES.flatMap((family) =>
  PALETTE_SHADES.map((shade) => `${family}-${shade}`),
);

/**
 * Utilities that accept a color. The prefix is matched exactly, so
 * `text-shadow-red-500` prefers the longer `text-shadow` over `text`.
 */
export const COLOR_UTILITY_PREFIXES = new Set([
  "bg",
  "text",
  "border",
  "border-x",
  "border-y",
  "border-t",
  "border-r",
  "border-b",
  "border-l",
  "border-s",
  "border-e",
  "divide",
  "ring",
  "ring-offset",
  "inset-ring",
  "outline",
  "fill",
  "stroke",
  "from",
  "via",
  "to",
  "accent",
  "caret",
  "decoration",
  "placeholder",
  "shadow",
  "inset-shadow",
  "drop-shadow",
  "text-shadow",
  "scrollbar-thumb",
  "scrollbar-track",
  "mask-linear-from",
  "mask-linear-to",
  "mask-radial-from",
  "mask-radial-to",
  "mask-conic-from",
  "mask-conic-to",
  "mask-t-from",
  "mask-t-to",
  "mask-r-from",
  "mask-r-to",
  "mask-b-from",
  "mask-b-to",
  "mask-l-from",
  "mask-l-to",
  "mask-x-from",
  "mask-x-to",
  "mask-y-from",
  "mask-y-to",
]);

const PALETTE_CLASS_RE = new RegExp(
  `^([a-z-]+)-(${PALETTE_FAMILIES.join("|")})-(${PALETTE_SHADES.join("|")})$`,
);

export type PaletteClass = {
  /** Color utility, e.g. `bg` or `border-t`, used to build replacements. */
  prefix: string;
  /** Palette token, e.g. `red-500`. */
  color: string;
  /** Opacity modifier including its slash, e.g. `/50`, or `""`. */
  opacity: string;
};

/**
 * Match a class base such as `hover:bg-red-500/50` (already stripped of
 * variants) against the built-in palette. Returns `null` when the class is
 * not a raw palette color.
 */
export function splitPaletteClass(base: string): PaletteClass | null {
  const slash = base.lastIndexOf("/");
  const core = slash === -1 ? base : base.slice(0, slash);
  const opacity = slash === -1 ? "" : base.slice(slash);

  const match = PALETTE_CLASS_RE.exec(core);
  if (!match) return null;

  const [, prefix, family, shade] = match;
  if (!COLOR_UTILITY_PREFIXES.has(prefix)) return null;

  return { prefix, color: `${family}-${shade}`, opacity };
}

const COLOR_UTILITY_RE = new RegExp(
  `^(${[...COLOR_UTILITY_PREFIXES].sort((a, b) => b.length - a.length).join("|")})-(.+)$`,
);

export type ColorUtility = {
  prefix: string;
  value: string;
  opacity: string;
};

/**
 * Split a class base into a color utility and the color value it names,
 * whether or not the value is a known palette color. Returns `null` for
 * classes outside the color utilities and for arbitrary values.
 */
export function splitColorUtility(base: string): ColorUtility | null {
  const slash = base.lastIndexOf("/");
  const core = slash === -1 ? base : base.slice(0, slash);
  const opacity = slash === -1 ? "" : base.slice(slash);

  const match = COLOR_UTILITY_RE.exec(core);
  if (!match) return null;

  const value = match[2];
  if (value.startsWith("[") || value.startsWith("(")) return null;

  return { prefix: match[1], value, opacity };
}

/** JSX/SVG attributes that take a color literally. */
export const COLOR_ATTRIBUTES = new Set([
  "fill",
  "stroke",
  "color",
  "stopColor",
  "floodColor",
  "lightingColor",
]);

/** Attribute values that defer to the cascade or to a token. */
export const ALLOWED_ATTRIBUTE_VALUES = new Set([
  "currentColor",
  "currentcolor",
  "none",
  "inherit",
  "transparent",
  "initial",
  "unset",
]);

/** True when a literal attribute value is a raw CSS color. */
export function isRawColorValue(value: string): boolean {
  const trimmed = value.trim();
  if (trimmed === "" || ALLOWED_ATTRIBUTE_VALUES.has(trimmed)) return false;
  if (trimmed.startsWith("var(")) return false;
  return parseColor(trimmed) !== null;
}
