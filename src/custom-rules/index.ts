import { Diagnostic } from "../types.js";
import path from "node:path";
import {
  extractClassLists,
  extractHelperClassLists,
  extractStringLiterals,
  extractElements,
  extractElementsWithClasses,
  extractApplyBlocks,
  stripVariants,
  parseClassName,
  VARIANT_CLASS_FUNCTIONS,
} from "./utils.js";
import {
  COLOR_ATTRIBUTES,
  isRawColorValue,
  splitColorUtility,
  splitPaletteClass,
} from "./color-data.js";
import { nearestColorTokens, parseColor, roleOf } from "./color-values.js";
import { collectJsClassSites, isJsFile } from "./js-sites.js";

import { boundedEditDistance } from "../core/class-kind.js";
import type { ClassKind } from "../core/class-kind.js";
import type { Lab } from "./color-values.js";

/** A component-scoped exception, matched against the JSX tag name. */
export type NoRawColorsContract = {
  /** Regular expression the component name must match, e.g. `^Badge$`. */
  pattern: string;
  allow?: string[];
  deny?: string[];
  message?: string;
};

/** User-facing `no-raw-colors` configuration, mirroring shadcn's rule. */
export type NoRawColorsPolicy = {
  /** Class patterns that are allowed, e.g. `["*-amber-100"]`. */
  allow?: string[];
  /** Class patterns that are always reported, taking precedence over `allow`. */
  deny?: string[];
  /** Replaces the built-in message. Supports `{{className}}`, `{{file}}`, `{{tokens}}`, `{{suggestions}}`. */
  message?: string;
  /** Scan every string literal, not just recognized class sites. */
  scanAllStrings?: boolean;
  /** Component-scoped allow/deny/message, matched on the JSX tag name. */
  contracts?: NoRawColorsContract[];
  /** Extra functions whose arguments are class lists, e.g. `["customMerge"]`. */
  mergeFunctions?: string[];
  /** Extra functions whose object values are class lists, e.g. `["myVariants"]`. */
  variantFunctions?: string[];
};

export type CustomRuleOptions = {
  tailwindVersion?: 3 | 4;
  /**
   * Color token names (`--color-<name>`) the project declares. When present,
   * a palette class matching a declared token is allowed, and the rule can
   * point at the project's own colors. Supplied by the CLI; absent in the
   * plugin, which has no project context.
   */
  themeColors?: ReadonlySet<string>;
  /** Theme stylesheet, shown in messages so agents know where to add a token. */
  themeFile?: string;
  /** Resolve a color token name to a CSS color, e.g. `red-500` -> `oklch(...)`. */
  resolveColor?: (name: string) => string | null;
  /** Classify a class as a color utility, another utility, or an unknown color. */
  classifyClass?: (className: string) => ClassKind;
  /** User configuration for the `no-raw-colors` rule. */
  noRawColors?: NoRawColorsPolicy;
};

export type RuleCheck = (
  text: string,
  filePath: string,
  options?: CustomRuleOptions,
) => Diagnostic[];

function positionAtOffset(fileText: string, offset: number): { line: number; column: number } {
  const before = fileText.slice(0, offset);
  const lines = before.split("\n");
  return { line: lines.length, column: (lines.at(-1) ?? "").length + 1 };
}

function diag(
  filePath: string,
  fileText: string,
  offset: number,
  message: string,
  rule: string,
  fix?: { range: [number, number]; text: string },
  suggestions?: string[],
): Diagnostic {
  const pos = positionAtOffset(fileText, offset);
  return {
    file: path.relative(process.cwd(), filePath),
    line: pos.line,
    column: pos.column,
    severity: "warning",
    rule,
    message,
    source: "tw",
    ...(fix ? { fix } : {}),
    ...(suggestions && suggestions.length > 0 ? { suggestions } : {}),
  };
}

// ─── no-duplicate-utilities ─────────────────────────────────────────────────

function checkNoDuplicateUtilities(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  for (const { offset, classes } of extractClassLists(text)) {
    const seen = new Map<string, number[]>();
    for (let i = 0; i < classes.length; i++) {
      const p = parseClassName(classes[i]);
      const key = p.variant + ":" + p.base;
      const existing = seen.get(key);
      if (existing) {
        existing.push(i);
      } else {
        seen.set(key, [i]);
      }
    }
    for (const [key, indices] of seen) {
      if (indices.length >= 2) {
        const colon = key.indexOf(":");
        const display = key.slice(colon + 1);
        results.push(
          diag(
            filePath,
            text,
            offset,
            `Duplicate utility \`${display}\` appears ${indices.length} times.`,
            "no-duplicate-utilities",
          ),
        );
      }
    }
  }
  return results;
}

// ─── prefer-truncate-shorthand ──────────────────────────────────────────────

function checkPreferTruncateShorthand(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  for (const { offset, classes } of extractClassLists(text)) {
    const bases = new Set(classes.map((c) => stripVariants(c)));
    if (
      bases.has("overflow-hidden") &&
      bases.has("text-ellipsis") &&
      bases.has("whitespace-nowrap")
    ) {
      results.push(
        diag(
          filePath,
          text,
          offset,
          "These classes can be replaced with: `truncate`",
          "prefer-truncate-shorthand",
        ),
      );
    }
  }
  return results;
}

// ─── no-important-abuse ─────────────────────────────────────────────────────

function checkNoImportantAbuse(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  const MAX_IMPORTANT = 2;
  for (const { offset, classes } of extractClassLists(text)) {
    const count = classes.filter((c) => c.startsWith("!")).length;
    if (count > MAX_IMPORTANT) {
      results.push(
        diag(
          filePath,
          text,
          offset,
          `Using \`!\` on ${count} utilities in one class list. Prefer CSS overrides via selectors.`,
          "no-important-abuse",
        ),
      );
    }
  }
  return results;
}

const DISPLAY_CLASSES = new Set([
  "block",
  "inline",
  "inline-block",
  "flex",
  "inline-flex",
  "grid",
  "inline-grid",
  "table",
  "inline-table",
  "table-cell",
  "table-row",
  "flow-root",
  "contents",
  "list-item",
  "hidden",
]);

function checkNoSrOnlyDisplayConflict(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  for (const { offset, classes } of extractClassLists(text)) {
    const bases = new Set(classes.map((c) => stripVariants(c)));
    if (bases.has("sr-only")) {
      for (const display of DISPLAY_CLASSES) {
        if (bases.has(display)) {
          results.push(
            diag(
              filePath,
              text,
              offset,
              `\`sr-only\` combined with \`${display}\` will override the screen-reader behavior. Remove one of them.`,
              "no-sr-only-display-conflict",
            ),
          );
        }
      }
    }
  }
  return results;
}

// ─── consistent-negative-arbitrary-values ───────────────────────────────────

function checkConsistentNegativeArbitraryValues(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  const inlineNegRe = /([a-z-]+)-\[-(\d+[a-z]*)\]/g;
  for (const { offset, raw } of extractClassLists(text)) {
    let match: RegExpExecArray | null;
    while ((match = inlineNegRe.exec(raw)) !== null) {
      results.push(
        diag(
          filePath,
          text,
          offset,
          `Use \`-${match[1]}-[${match[2]}]\` instead of \`${match[1]}-[-${match[2]}]\` for consistency.`,
          "consistent-negative-arbitrary-values",
        ),
      );
    }
  }
  return results;
}

// ─── require-flex-for-flex-utilities ────────────────────────────────────────

const FLEX_DISPLAY_BASES = new Set(["flex", "inline-flex"]);

const FLEX_CONTAINER_CLASSES = [
  "flex-col",
  "flex-row",
  "flex-wrap",
  "flex-nowrap",
  "flex-col-reverse",
  "flex-row-reverse",
  "flex-wrap-reverse",
];

function checkRequireFlexForFlexUtilities(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];

  for (const el of extractElementsWithClasses(text)) {
    if (el.isComponent) continue;

    const classes = el.classes.map((className) => parseClassName(className));
    const culprits = classes.filter((className) => FLEX_CONTAINER_CLASSES.includes(className.base));
    for (const culprit of culprits) {
      if (hasBaseInScope(classes, culprit.responsive, FLEX_DISPLAY_BASES)) continue;

      results.push(
        diag(
          filePath,
          text,
          el.offset,
          `\`${culprit.base}\` requires \`flex\` or \`inline-flex\` to have an effect.`,
          "require-flex-for-flex-utilities",
        ),
      );
    }
  }

  for (const { offset, classes } of extractApplyBlocks(text)) {
    const bases = new Set(classes.map((c) => stripVariants(c)));
    if (bases.has("flex") || bases.has("inline-flex")) continue;
    for (const fc of FLEX_CONTAINER_CLASSES) {
      if (bases.has(fc)) {
        results.push(
          diag(
            filePath,
            text,
            offset,
            `\`${fc}\` requires \`flex\` or \`inline-flex\` to have an effect.`,
            "require-flex-for-flex-utilities",
          ),
        );
        break;
      }
    }
  }

  return results;
}

// ─── prefer-theme-scale ─────────────────────────────────────────────────────

/** Convert an arbitrary value + unit to a Tailwind spacing-scale index (4px base). */
function toScaleValue(value: number, unit: string): number {
  return unit === "px" ? value / 4 : value * 4;
}

/**
 * The default Tailwind v3 spacing scale. v3 only ships these named steps, so
 * values that resolve off the scale (e.g. `w-[350px]` -> `w-87.5`) have no
 * valid v3 shorthand even though v4 accepts them.
 */
const V3_SPACING_SCALE = new Set([
  0, 0.5, 1, 1.5, 2, 2.5, 3, 3.5, 4, 5, 6, 7, 8, 9, 10, 11, 12, 14, 16, 20, 24, 28, 32, 36, 40, 44,
  48, 52, 56, 60, 64, 72, 80, 96,
]);

function isV3SpacingValue(value: number, unit: string): boolean {
  if (unit === "px" && value === 1) {
    return true;
  }
  return V3_SPACING_SCALE.has(toScaleValue(value, unit));
}

const SPACING_UTILITIES =
  /^(?:m[trblxyse]?|p[trblxyse]?|gap(?:-[xy])?|space-[xy]|scroll-m[trblxyse]?|scroll-p[trblxyse]?|w|min-w|max-w|h|min-h|max-h|size|basis|inset(?:-[xy])?|start|end|top|right|bottom|left|translate-[xy]|indent)$/;

const DEFAULT_FONT_SIZE_TOKENS = [
  { pixels: 12, name: "xs" },
  { pixels: 14, name: "sm" },
  { pixels: 16, name: "base" },
  { pixels: 18, name: "lg" },
  { pixels: 20, name: "xl" },
  { pixels: 24, name: "2xl" },
  { pixels: 30, name: "3xl" },
  { pixels: 36, name: "4xl" },
  { pixels: 48, name: "5xl" },
  { pixels: 60, name: "6xl" },
  { pixels: 72, name: "7xl" },
  { pixels: 96, name: "8xl" },
  { pixels: 128, name: "9xl" },
] as const;

function toPixels(value: number, unit: string): number | undefined {
  if (unit === "px") return value;
  if (unit === "rem") return value * 16;
  return undefined;
}

function nearestFontSize(pixels: number) {
  return DEFAULT_FONT_SIZE_TOKENS.reduce((nearest, token) =>
    Math.abs(token.pixels - pixels) <= Math.abs(nearest.pixels - pixels) ? token : nearest,
  );
}

function checkPreferThemeScale(
  text: string,
  filePath: string,
  options?: CustomRuleOptions,
): Diagnostic[] {
  const version = options?.tailwindVersion ?? 4;
  const results: Diagnostic[] = [];
  const arbitraryValueRe = /^([a-z-]+)-\[(\d+(?:\.\d+)?)(px|rem|em|pt|pc|mm|cm)\]$/;
  for (const { offset, classes } of extractClassLists(text)) {
    for (const className of classes) {
      const base = parseClassName(className).base;
      const match = arbitraryValueRe.exec(base);
      if (!match) continue;

      const utility = match[1];
      const value = Number(match[2]);
      const unit = match[3];
      const valueWithUnit = `${match[2]}${unit}`;
      const arbitraryClass = `${utility}-[${valueWithUnit}]`;

      if (utility === "text") {
        const pixels = toPixels(value, unit);
        const nearest = pixels === undefined ? undefined : nearestFontSize(pixels);
        const difference =
          nearest === undefined || pixels === undefined ? undefined : nearest.pixels - pixels;

        if (nearest !== undefined && difference === 0) {
          results.push(
            diag(
              filePath,
              text,
              offset,
              `\`${arbitraryClass}\` matches built-in \`text-${nearest.name}\` (${nearest.pixels}px). Use \`text-${nearest.name}\`.`,
              "prefer-theme-scale",
            ),
          );
          continue;
        }

        if (version === 3) continue;

        const customName = pixels === undefined ? "custom" : String(pixels).replace(".", "_");
        const message =
          nearest !== undefined && difference !== undefined
            ? `\`${arbitraryClass}\`: nearest is \`text-${nearest.name}\` (${nearest.pixels}px, ${Math.abs(difference)}px ${difference > 0 ? "larger" : "smaller"}). Exact: add \`@theme { --text-${customName}: ${valueWithUnit}; }\` to global CSS; use \`text-${customName}\`.`
            : `No built-in token for \`${arbitraryClass}\`. Add \`@theme { --text-${customName}: ${valueWithUnit}; }\` to global CSS; use \`text-${customName}\`.`;
        results.push(diag(filePath, text, offset, message, "prefer-theme-scale"));
        continue;
      }

      if (!SPACING_UTILITIES.test(utility)) continue;
      if (unit !== "px" && unit !== "rem") continue;
      if (version === 3 && !isV3SpacingValue(value, unit)) continue;

      const themeVal =
        version === 3 && unit === "px" && value === 1 ? "px" : toScaleValue(value, unit);
      results.push(
        diag(
          filePath,
          text,
          offset,
          `Prefer Tailwind's spacing scale over \`${arbitraryClass}\`. Use \`${utility}-${themeVal}\` instead.`,
          "prefer-theme-scale",
        ),
      );
    }
  }
  return results;
}

// ─── no-magic-spacing ───────────────────────────────────────────────────────

function checkNoMagicSpacing(
  text: string,
  filePath: string,
  options?: CustomRuleOptions,
): Diagnostic[] {
  const version = options?.tailwindVersion ?? 4;
  const results: Diagnostic[] = [];
  const spacingRe =
    /(?:^|\s)((?:m|p|gap|space-[xy]|scroll-m|scroll-p)[a-z]?)-\[(\d+(?:\.\d+)?)(px|rem)\]/g;
  for (const { offset, raw } of extractClassLists(text)) {
    let match: RegExpExecArray | null;
    while ((match = spacingRe.exec(raw)) !== null) {
      const value = Number(match[2]);
      const unit = match[3];
      const scaleValue = toScaleValue(value, unit);
      if (Number.isInteger(scaleValue)) continue;
      if (version === 3 && !isV3SpacingValue(value, unit)) continue;

      const arbitraryClass = `${match[1]}-[${value}${unit}]`;
      const suggestion =
        version === 3 && unit === "px" && value === 1
          ? `${match[1]}-px`
          : `${match[1]}-${scaleValue}`;
      results.push(
        diag(
          filePath,
          text,
          offset,
          `Class \`${arbitraryClass}\` can be written as \`${suggestion}\`.`,
          "no-magic-spacing",
        ),
      );
    }
  }
  return results;
}

// ─── detect-conflicts-in-template-literals ─────────────────────────────────

function checkDetectConflictsInTemplateLiterals(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  const templateRe = /className\s*=\s*\{`([^`]*)`\}/g;
  let match: RegExpExecArray | null;
  while ((match = templateRe.exec(text)) !== null) {
    const template = match[1];
    const parts: string[][] = [];
    let current: string[] = [];
    let depth = 0;
    let word = "";
    for (let i = 0; i < template.length; i++) {
      const ch = template[i];
      if (ch === "$" && template[i + 1] === "{") {
        if (word) {
          current.push(...word.split(/\s+/).filter(Boolean));
          word = "";
        }
        parts.push(current);
        current = [];
        i++;
        depth = 1;
        while (depth > 0 && i < template.length) {
          i++;
          if (template[i] === "{") depth++;
          if (template[i] === "}") depth--;
        }
        continue;
      }
      word += ch;
    }
    if (word) current.push(...word.split(/\s+/).filter(Boolean));
    parts.push(current);

    const allBases = new Map<string, number[]>();
    let idx = 0;
    for (const part of parts) {
      for (const c of part) {
        const base = stripVariants(c);
        const existing = allBases.get(base);
        if (existing) {
          existing.push(idx);
        } else {
          allBases.set(base, [idx]);
        }
        idx++;
      }
    }
    for (const [base, indices] of allBases) {
      if (indices.length >= 2) {
        results.push(
          diag(
            filePath,
            text,
            match.index,
            `Utility \`${base}\` appears in multiple parts of a template literal, which may cause conflicts.`,
            "detect-conflicts-in-template-literals",
          ),
        );
      }
    }
  }
  return results;
}

// ─── no-raw-colors ──────────────────────────────────────────────────────────

/** Color keywords that name a color without being a raw palette color. */
const ALLOWED_COLOR_KEYWORDS = new Set(["white", "black", "transparent", "current", "inherit"]);

/** Rebuild a class around a new base, keeping variants, `!`, and `-`. */
function withBase(original: string, newBase: string): string {
  const parsed = parseClassName(original);
  const prefix = parsed.variants.length > 0 ? `${parsed.variants.join(":")}:` : "";
  const bang = parsed.important ? "!" : "";
  const negative = parsed.negative ? "-" : "";
  return `${prefix}${bang}${negative}${newBase}`;
}

type ClassSiteLike = { offset: number; ranges?: Map<string, [number, number]> };

/** Source range of a class token, preferring the AST resolver's range. */
function tokenRange(text: string, site: ClassSiteLike, className: string): [number, number] | null {
  const direct = site.ranges?.get(className);
  if (direct) return direct;

  const at = text.indexOf(className, site.offset);
  return at === -1 ? null : [at, at + className.length];
}

function compilePatterns(patterns?: string[]): RegExp[] {
  return (patterns ?? []).map((pattern) => {
    const source = pattern
      .replace(/[.+^${}()|[\]\\]/g, "\\$&")
      .replace(/\*/g, ".*")
      .replace(/\?/g, ".");
    return new RegExp(`^${source}$`);
  });
}

function matchesAny(patterns: RegExp[], token: string): boolean {
  return patterns.some((pattern) => pattern.test(token));
}

type CompiledContract = {
  match: RegExp;
  allow: RegExp[];
  deny: RegExp[];
  message?: string;
};

function compileContracts(contracts?: NoRawColorsContract[]): CompiledContract[] {
  return (contracts ?? []).flatMap((contract) => {
    try {
      return [
        {
          match: new RegExp(contract.pattern),
          allow: compilePatterns(contract.allow),
          deny: compilePatterns(contract.deny),
          message: contract.message,
        },
      ];
    } catch {
      // An invalid pattern is ignored rather than failing the whole rule.
      return [];
    }
  });
}

function applyMessage(template: string, data: Record<string, string>): string {
  return template.replace(/\{\{(\w+)\}\}/g, (_, key: string) => data[key] ?? "");
}

/** Placeholder values for a custom `message`. */
function messageData(
  className: string,
  options: CustomRuleOptions | undefined,
  replacements: string[],
): Record<string, string> {
  const tokens = options?.themeColors;
  return {
    className,
    file: options?.themeFile ?? "",
    tokens: tokens ? formatTokenList(tokens) : "",
    suggestions: replacements.join(", "),
  };
}

/**
 * `allow`/`deny`: deny wins over allow, and deny alone means only the named
 * classes are checked.
 */
function policyAllows(token: string, allow: RegExp[], deny: RegExp[]): boolean {
  if (matchesAny(deny, token)) return false;
  if (matchesAny(allow, token)) return true;
  return deny.length > 0 && allow.length === 0;
}

function formatTokenList(colors: ReadonlySet<string>, limit = 12): string {
  const names = [...colors].sort();
  const shown = names
    .slice(0, limit)
    .map((name) => `\`${name}\``)
    .join(", ");
  return names.length <= limit ? shown : `${shown} (+${names.length - limit} more)`;
}

/** Theme tokens that parse to a color, for nearest-color suggestions. */
const colorValueCache = new WeakMap<ReadonlySet<string>, Map<string, Lab>>();

function themeColorValues(options?: CustomRuleOptions): Map<string, Lab> {
  if (!options?.themeColors || !options.resolveColor) return new Map();

  const cached = colorValueCache.get(options.themeColors);
  if (cached) return cached;

  const values = new Map<string, Lab>();
  for (const name of options.themeColors) {
    const raw = options.resolveColor(name);
    const lab = raw ? parseColor(raw) : null;
    if (lab) values.set(name, lab);
  }

  colorValueCache.set(options.themeColors, values);
  return values;
}

/**
 * True when a class is a color utility whose value is not a declared theme
 * color and is not a built-in palette color. The CLI uses this both to report
 * the token and to let `no-unknown-classes` leave it to this rule.
 */
export function isUndeclaredColorToken(token: string, options?: CustomRuleOptions): boolean {
  const colors = options?.themeColors;
  if (!colors || colors.size === 0 || !options?.classifyClass) return false;

  let base = parseClassName(token).base;
  if (base.endsWith("!")) base = base.slice(0, -1);
  if (base.includes("[") || base.includes("(")) return false;
  if (splitPaletteClass(base)) return false;

  const utility = splitColorUtility(base);
  if (!utility) return false;
  if (ALLOWED_COLOR_KEYWORDS.has(utility.value)) return false;
  if (colors.has(utility.value)) return false;

  return options.classifyClass(base) === "unknown-color";
}

function didYouMean(value: string, names: ReadonlySet<string>): string | null {
  const maxDistance = Math.max(1, Math.min(3, Math.floor(value.length / 3) + 1));
  let best: string | null = null;
  let bestDistance = maxDistance + 1;

  for (const name of names) {
    if (Math.abs(name.length - value.length) >= bestDistance) continue;

    const distance = boundedEditDistance(value, name, bestDistance - 1);
    if (distance < bestDistance) {
      best = name;
      bestDistance = distance;
    }
  }

  return best !== null && bestDistance <= maxDistance ? best : null;
}

function rawColorMessage(
  className: string,
  prefix: string,
  replacements: string[],
  options?: CustomRuleOptions,
): string {
  const tokens = options?.themeColors;
  const target = options?.themeFile ? `\`${options.themeFile}\`` : "global CSS";
  const declare = `or declare one with \`@theme { --color-custom: <value>; }\` in ${target} and use \`${prefix}-custom\`.`;

  if (replacements.length > 0) {
    const list = replacements.map((replacement) => `\`${replacement}\``).join(" or ");
    return `\`${className}\` uses a raw Tailwind palette color. Use ${list}, ${declare}`;
  }
  if (tokens && tokens.size > 0) {
    return `\`${className}\` uses a raw Tailwind palette color. Use one of: ${formatTokenList(tokens)}, ${declare}`;
  }
  return `\`${className}\` uses a raw Tailwind palette color. Use a theme color token, ${declare}`;
}

function undeclaredMessage(
  className: string,
  suggestion: string | undefined,
  options?: CustomRuleOptions,
): string {
  const tokens = options?.themeColors ?? new Set<string>();
  const target = options?.themeFile ? `\`${options.themeFile}\`` : "global CSS";
  const list = formatTokenList(tokens);
  const add = `To add a color, declare \`@theme { --color-<name>: <value>; }\` in ${target} first.`;

  if (suggestion) {
    return `\`${className}\` is not a declared theme color. Did you mean \`${suggestion}\`? Declared colors: ${list}. ${add}`;
  }
  return `\`${className}\` is not a declared theme color. Use one of: ${list}, or ${add.charAt(0).toLowerCase()}${add.slice(1)}`;
}

function paletteReplacements(
  className: string,
  palette: ReturnType<typeof splitPaletteClass> & object,
  values: Map<string, Lab>,
  options?: CustomRuleOptions,
): string[] {
  if (values.size === 0 || !options?.resolveColor) return [];

  const raw = options.resolveColor(palette.color);
  const lab = raw ? parseColor(raw) : null;
  if (!lab) return [];

  return nearestColorTokens(lab, values, roleOf(palette.prefix)).map((name) =>
    withBase(className, `${palette.prefix}-${name}${palette.opacity}`),
  );
}

/** JS/TS files use the AST resolver; other files use text extraction. */
function collectClassLists(
  text: string,
  filePath: string,
  functions: Set<string>,
): ReturnType<typeof extractClassLists> {
  if (isJsFile(filePath)) {
    const sites = collectJsClassSites(text, functions);
    if (sites.length > 0) return sites;
  }
  return [...extractClassLists(text), ...extractHelperClassLists(text, functions)];
}

function checkNoRawColors(
  text: string,
  filePath: string,
  options?: CustomRuleOptions,
): Diagnostic[] {
  const results: Diagnostic[] = [];
  const themeColors = options?.themeColors;
  const policy = options?.noRawColors;
  const baseAllow = compilePatterns(policy?.allow);
  const baseDeny = compilePatterns(policy?.deny);
  const contracts = compileContracts(policy?.contracts);
  const values = themeColorValues(options);
  const functions = new Set(VARIANT_CLASS_FUNCTIONS);
  for (const name of policy?.mergeFunctions ?? []) functions.add(name);
  for (const name of policy?.variantFunctions ?? []) functions.add(name);

  const classLists = policy?.scanAllStrings
    ? extractStringLiterals(text)
    : collectClassLists(text, filePath, functions);

  for (const site of classLists) {
    const component = (site as { component?: string }).component;
    const contract = component ? contracts.find((entry) => entry.match.test(component)) : undefined;
    const allow = contract ? [...baseAllow, ...contract.allow] : baseAllow;
    const deny = contract ? [...baseDeny, ...contract.deny] : baseDeny;
    const message = contract?.message ?? policy?.message;

    for (const className of site.classes) {
      let base = parseClassName(className).base;
      if (base.endsWith("!")) base = base.slice(0, -1);
      if (base.includes("[") || base.includes("(")) continue;
      if (policyAllows(className, allow, deny)) continue;

      const palette = splitPaletteClass(base);
      if (palette) {
        if (themeColors?.has(palette.color)) continue;
        const replacements = paletteReplacements(className, palette, values, options);
        const range = tokenRange(text, site, className);
        const fix = range && replacements[0] ? { range, text: replacements[0] } : undefined;
        const text2 =
          message !== undefined
            ? applyMessage(message, messageData(className, options, replacements))
            : rawColorMessage(className, palette.prefix, replacements, options);
        results.push(
          diag(
            filePath,
            text,
            range?.[0] ?? site.offset,
            text2,
            "no-raw-colors",
            fix,
            replacements.length > 1 ? replacements.slice(1) : undefined,
          ),
        );
        continue;
      }

      if (!isUndeclaredColorToken(className, options)) continue;
      const utility = splitColorUtility(base);
      if (!utility) continue;

      const suggestionName = themeColors ? didYouMean(utility.value, themeColors) : null;
      const suggestion = suggestionName
        ? withBase(className, `${utility.prefix}-${suggestionName}${utility.opacity}`)
        : undefined;
      const range = tokenRange(text, site, className);
      const fix = range && suggestion ? { range, text: suggestion } : undefined;
      const text2 =
        message !== undefined
          ? applyMessage(message, messageData(className, options, suggestion ? [suggestion] : []))
          : undeclaredMessage(className, suggestion, options);
      results.push(diag(filePath, text, range?.[0] ?? site.offset, text2, "no-raw-colors", fix));
    }
  }

  results.push(...checkRawColorAttributes(text, filePath, options, values));
  return results;
}

/** Literal values on SVG/JSX color attributes such as `fill="#ec4899"`. */
function checkRawColorAttributes(
  text: string,
  filePath: string,
  options?: CustomRuleOptions,
  values: Map<string, Lab> = new Map(),
): Diagnostic[] {
  const results: Diagnostic[] = [];

  for (const element of extractElements(text)) {
    // On a component, `color="red"` is an enum prop, not a literal color.
    if (!/^[a-z]/.test(element.tag)) continue;

    for (const [name, rawValue] of Object.entries(element.attrs)) {
      if (!COLOR_ATTRIBUTES.has(name)) continue;

      const value = literalAttributeValue(rawValue);
      if (value === null || !isRawColorValue(value)) continue;

      const lab = values.size > 0 ? parseColor(value) : null;
      const [token] = lab ? nearestColorTokens(lab, values, "text", 1) : [];
      const source = `${name}="${value}"`;
      const replacement = token ? [`var(--color-${token})`] : [];

      const message =
        options?.noRawColors?.message !== undefined
          ? applyMessage(options.noRawColors.message, messageData(source, options, replacement))
          : token
            ? `\`${source}\` hardcodes a color. Use \`currentColor\` with a text color class, or the nearest theme token: \`var(--color-${token})\`.`
            : `\`${source}\` hardcodes a color. Use \`currentColor\` with a text color class, or reference a theme token with \`var(--color-<name>)\`.`;

      const at = text.indexOf(value, element.offset);
      const range: [number, number] | null = at === -1 ? null : [at, at + value.length];
      const fix = range
        ? { range, text: token ? `var(--color-${token})` : "currentColor" }
        : undefined;

      results.push(
        diag(filePath, text, range?.[0] ?? element.offset, message, "no-raw-colors", fix),
      );
    }
  }

  return results;
}

/** Unwrap a JSX expression container and its quotes around a literal. */
function literalAttributeValue(raw: string): string | null {
  let value = raw.trim();
  if (value.startsWith("{")) value = value.slice(1);
  if (value.endsWith("}")) value = value.slice(0, -1);
  value = value.trim();

  const quoted =
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"));
  if (quoted && value.length >= 2) value = value.slice(1, -1);

  return value.length > 0 ? value : null;
}

// ─── prefer-design-tokens ───────────────────────────────────────────────────

function checkPreferDesignTokens(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  const colorHexRe = /(?:^|\s)([a-z-]+)-\[#([0-9a-fA-F]{3,8})\]/g;
  for (const { offset, raw } of extractClassLists(text)) {
    let match: RegExpExecArray | null;
    while ((match = colorHexRe.exec(raw)) !== null) {
      const utility = match[1];
      const color = `#${match[2]}`;
      results.push(
        diag(
          filePath,
          text,
          offset,
          `For \`${match[0].trim()}\`, add \`@theme { --color-custom: ${color}; }\` to global CSS; use \`${utility}-custom\`. Rename \`custom\` for its role.`,
          "prefer-design-tokens",
        ),
      );
    }
  }
  return results;
}

/**
 * Named registry of the built-in custom rules. The CLI runs every entry
 * through `runCustomRules`; the ESLint/Oxlint plugin exposes each entry as
 * its own rule module.
 */
export const CUSTOM_RULES: Record<string, RuleCheck> = {
  "no-duplicate-utilities": checkNoDuplicateUtilities,
  "prefer-truncate-shorthand": checkPreferTruncateShorthand,
  "no-important-abuse": checkNoImportantAbuse,
  "no-sr-only-display-conflict": checkNoSrOnlyDisplayConflict,
  "consistent-negative-arbitrary-values": checkConsistentNegativeArbitraryValues,
  "require-flex-for-flex-utilities": checkRequireFlexForFlexUtilities,
  "prefer-theme-scale": checkPreferThemeScale,
  "no-magic-spacing": checkNoMagicSpacing,
  "detect-conflicts-in-template-literals": checkDetectConflictsInTemplateLiterals,
  "prefer-design-tokens": checkPreferDesignTokens,
  "no-raw-colors": checkNoRawColors,
};

export function runCustomRules(
  text: string,
  filePath: string,
  options?: CustomRuleOptions,
): Diagnostic[] {
  const results: Diagnostic[] = [];
  for (const rule of Object.values(CUSTOM_RULES)) {
    try {
      results.push(...rule(text, filePath, options));
    } catch {
      // One failing check should not hide other diagnostics.
    }
  }
  return results;
}

function hasBaseInScope(
  classes: ReturnType<typeof parseClassName>[],
  targetScope: string,
  bases: Set<string>,
): boolean {
  return classes.some((className) => {
    if (!bases.has(className.base)) return false;
    return className.responsive === "" || className.responsive === targetScope;
  });
}
