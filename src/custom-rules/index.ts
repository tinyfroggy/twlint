import { Diagnostic } from "../types.js";
import path from "node:path";
import {
  extractClassLists,
  extractElementsWithClasses,
  extractApplyBlocks,
  stripVariants,
  parseClassName,
} from "./utils.js";
type RuleCheck = (text: string, filePath: string) => Diagnostic[];

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

function checkPreferThemeScale(text: string, filePath: string): Diagnostic[] {
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
        const customName = pixels === undefined ? "custom" : String(pixels).replace(".", "_");
        const message =
          nearest !== undefined && difference === 0
            ? `\`${arbitraryClass}\` matches built-in \`text-${nearest.name}\` (${nearest.pixels}px). Use \`text-${nearest.name}\`.`
            : nearest !== undefined && difference !== undefined
              ? `\`${arbitraryClass}\`: nearest is \`text-${nearest.name}\` (${nearest.pixels}px, ${Math.abs(difference)}px ${difference > 0 ? "larger" : "smaller"}). Exact: add \`@theme { --text-${customName}: ${valueWithUnit}; }\` to global CSS; use \`text-${customName}\`.`
              : `No built-in token for \`${arbitraryClass}\`. Add \`@theme { --text-${customName}: ${valueWithUnit}; }\` to global CSS; use \`text-${customName}\`.`;
        results.push(diag(filePath, text, offset, message, "prefer-theme-scale"));
        continue;
      }

      if (!SPACING_UTILITIES.test(utility)) continue;
      if (unit !== "px" && unit !== "rem") continue;

      const themeVal = toScaleValue(value, unit);
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

function checkNoMagicSpacing(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  const spacingRe =
    /(?:^|\s)((?:m|p|gap|space-[xy]|scroll-m|scroll-p)[a-z]?)-\[(\d+(?:\.\d+)?)(px|rem)\]/g;
  for (const { offset, raw } of extractClassLists(text)) {
    let match: RegExpExecArray | null;
    while ((match = spacingRe.exec(raw)) !== null) {
      const value = Number(match[2]);
      const scaleValue = toScaleValue(value, match[3]);
      if (!Number.isInteger(scaleValue)) {
        const arbitraryClass = `${match[1]}-[${match[2]}${match[3]}]`;
        results.push(
          diag(
            filePath,
            text,
            offset,
            `Class \`${arbitraryClass}\` can be written as \`${match[1]}-${scaleValue}\`.`,
            "no-magic-spacing",
          ),
        );
      }
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

const CUSTOM_RULES: RuleCheck[] = [
  checkNoDuplicateUtilities,
  checkPreferTruncateShorthand,
  checkNoImportantAbuse,
  checkNoSrOnlyDisplayConflict,
  checkConsistentNegativeArbitraryValues,
  checkRequireFlexForFlexUtilities,
  checkPreferThemeScale,
  checkNoMagicSpacing,
  checkDetectConflictsInTemplateLiterals,
  checkPreferDesignTokens,
];

export function runCustomRules(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  for (const rule of CUSTOM_RULES) {
    try {
      results.push(...rule(text, filePath));
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
