import { Diagnostic } from "../types.js";
import path from "node:path";
import {
  extractClassLists,
  extractElementsWithClasses,
  extractApplyBlocks,
  stripVariants,
  parseClassName,
  extractElements,
} from "./utils.js";
import {
  hasBaseInScope,
  normalizeRuleContext,
  resolveElementClasses,
  type RuleContext,
} from "./context.js";
export type { RuleContext } from "./context.js";

export type RuleCheck = (text: string, filePath: string, context?: RuleContext) => Diagnostic[];

export type RuleEntry = {
  id: string;
  check: RuleCheck;
  description: string;
};

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

// ─── 1. no-duplicate-utilities ──────────────────────────────────────────────

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

// ─── 3. prefer-truncate-shorthand ────────────────────────────────────────────

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

// ─── 4. no-important-abuse ──────────────────────────────────────────────────

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

// ─── 7. consistent-negative-arbitrary-values ─────────────────────────────────

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

// ─── 8. prefer-logical-properties ────────────────────────────────────────────

const PHYSICAL_TO_LOGICAL: Record<string, string> = {
  pl: "ps",
  pr: "pe",
  ml: "ms",
  mr: "me",
  "border-l": "border-s",
  "border-r": "border-e",
  "rounded-l": "rounded-s",
  "rounded-r": "rounded-e",
  "rounded-tl": "rounded-ss",
  "rounded-tr": "rounded-se",
  "rounded-bl": "rounded-es",
  "rounded-br": "rounded-ee",
  left: "start",
  right: "end",
};

function checkPreferLogicalProperties(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  for (const { offset, classes } of extractClassLists(text)) {
    for (const c of classes) {
      const parsed = parseClassName(c);
      if (parsed.variant) continue;
      for (const [phys, log] of Object.entries(PHYSICAL_TO_LOGICAL)) {
        if (parsed.base === phys || parsed.base.startsWith(phys + "-")) {
          const replacement = parsed.base.replace(phys, log);
          if (replacement !== parsed.base) {
            results.push(
              diag(
                filePath,
                text,
                offset,
                `Use \`${replacement}\` instead of \`${parsed.base}\` for better RTL support.`,
                "prefer-logical-properties",
              ),
            );
          }
        }
      }
    }
  }
  return results;
}

// ─── 9. require-motion-reduce-for-animation ──────────────────────────────────

function checkRequireMotionReduceForAnimation(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  for (const { offset, classes } of extractClassLists(text)) {
    let hasAnimation = false;
    let hasMotionReduce = false;
    for (const c of classes) {
      const parsed = parseClassName(c);
      if (parsed.base.startsWith("animate-") && parsed.base !== "animate-none") {
        if (!parsed.variant) hasAnimation = true;
      }
      if (parsed.variant === "motion-reduce") {
        if (parsed.base.startsWith("animate-")) hasMotionReduce = true;
      }
    }
    if (hasAnimation && !hasMotionReduce) {
      results.push(
        diag(
          filePath,
          text,
          offset,
          "Add `motion-reduce:animate-none` for users who prefer reduced motion.",
          "require-motion-reduce-for-animation",
        ),
      );
    }
  }
  return results;
}

// ─── 11. require-flex-for-flex-utilities ─────────────────────────────────────

const FLEX_DISPLAY_BASES = new Set(["flex", "inline-flex"]);
const GRID_DISPLAY_BASES = new Set(["grid", "inline-grid"]);

const FLEX_CONTAINER_CLASSES = [
  "flex-col",
  "flex-row",
  "flex-wrap",
  "flex-nowrap",
  "flex-col-reverse",
  "flex-row-reverse",
  "flex-wrap-reverse",
];

function checkRequireFlexForFlexUtilities(
  text: string,
  filePath: string,
  context?: RuleContext,
): Diagnostic[] {
  const results: Diagnostic[] = [];
  const ruleContext = normalizeRuleContext(context);
  const strict = ruleContext.strict ?? false;

  for (const el of extractElementsWithClasses(text)) {
    const resolved = resolveElementClasses(el, ruleContext);
    const culprits = resolved.userClasses.filter((className) =>
      FLEX_CONTAINER_CLASSES.includes(className.base),
    );
    for (const culprit of culprits) {
      if (hasBaseInScope(resolved.effectiveClasses, culprit.responsive, FLEX_DISPLAY_BASES))
        continue;

      if (resolved.kind === "unknown-component") {
        if (!strict) continue;
        results.push(
          diag(
            filePath,
            text,
            resolved.offset,
            `Low confidence: \`${culprit.base}\` requires \`flex\` or \`inline-flex\` unless \`${resolved.tag}\` provides it internally.`,
            "require-flex-for-flex-utilities",
          ),
        );
        continue;
      }

      const suffix =
        resolved.kind === "known-component"
          ? ` Component \`${resolved.tag}\` does not provide it internally.`
          : "";
      results.push(
        diag(
          filePath,
          text,
          resolved.offset,
          `\`${culprit.base}\` requires \`flex\` or \`inline-flex\` to have an effect.${suffix}`,
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

// ─── 12. require-grid-for-grid-utilities ─────────────────────────────────────

const GRID_CONTAINER_CLASSES = [
  "grid-cols-",
  "grid-rows-",
  "auto-cols-",
  "auto-rows-",
  "col-span-",
  "row-span-",
  "col-start-",
  "col-end-",
  "row-start-",
  "row-end-",
];

function checkRequireGridForGridUtilities(
  text: string,
  filePath: string,
  context?: RuleContext,
): Diagnostic[] {
  const results: Diagnostic[] = [];
  const ruleContext = normalizeRuleContext(context);
  const strict = ruleContext.strict ?? false;

  for (const el of extractElementsWithClasses(text)) {
    const resolved = resolveElementClasses(el, ruleContext);
    const culprits = resolved.userClasses.filter((className) =>
      GRID_CONTAINER_CLASSES.some((prefix) => className.base.startsWith(prefix)),
    );
    for (const culprit of culprits) {
      if (hasBaseInScope(resolved.effectiveClasses, culprit.responsive, GRID_DISPLAY_BASES))
        continue;

      if (resolved.kind === "unknown-component") {
        if (!strict) continue;
        results.push(
          diag(
            filePath,
            text,
            resolved.offset,
            `Low confidence: \`${culprit.base}\` requires \`grid\` or \`inline-grid\` unless \`${resolved.tag}\` provides it internally.`,
            "require-grid-for-grid-utilities",
          ),
        );
        continue;
      }

      const suffix =
        resolved.kind === "known-component"
          ? ` Component \`${resolved.tag}\` does not provide it internally.`
          : "";
      results.push(
        diag(
          filePath,
          text,
          resolved.offset,
          `\`${culprit.base}\` requires \`grid\` or \`inline-grid\` to have an effect.${suffix}`,
          "require-grid-for-grid-utilities",
        ),
      );
    }
  }

  for (const { offset, classes } of extractApplyBlocks(text)) {
    const bases = new Set(classes.map((c) => stripVariants(c)));
    if (bases.has("grid") || bases.has("inline-grid")) continue;
    for (const prefix of GRID_CONTAINER_CLASSES) {
      for (const b of bases) {
        if (b.startsWith(prefix)) {
          results.push(
            diag(
              filePath,
              text,
              offset,
              `\`${b}\` requires \`grid\` or \`inline-grid\` to have an effect.`,
              "require-grid-for-grid-utilities",
            ),
          );
          break;
        }
      }
    }
  }

  return results;
}

// ─── 15. warn-hover-on-disabled ─────────────────────────────────────────────

function checkWarnHoverOnDisabled(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  const elements = extractElements(text);
  for (const el of elements) {
    if (el.attrs["disabled"] === undefined) continue;
    const classStr = el.attrs["className"] ?? el.attrs["class"] ?? "";
    if (!classStr) continue;
    const classes = classStr.trim().split(/\s+/).filter(Boolean);
    let hasHover = false;
    for (const c of classes) {
      const parsed = parseClassName(c);
      if (parsed.variant === "hover") {
        hasHover = true;
        break;
      }
    }
    if (hasHover) {
      results.push(
        diag(
          filePath,
          text,
          el.offset,
          "Disabled element has `hover:*` variant which will not work. Use `disabled:*` variants instead.",
          "warn-hover-on-disabled",
        ),
      );
    }
  }
  return results;
}

// ─── 17. warn-incomplete-dark-color-pair ─────────────────────────────────────

const COLOR_PROPERTIES = [
  "text-",
  "bg-",
  "border-",
  "ring-",
  "outline-",
  "shadow-",
  "decoration-",
  "accent-",
  "caret-",
];

function checkWarnIncompleteDarkColorPair(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  for (const { offset, classes } of extractClassLists(text)) {
    const parsed = classes.map((c) => parseClassName(c));
    const lightColors = new Set<string>();
    const darkColors = new Set<string>();
    for (const p of parsed) {
      if (p.variant === "dark") {
        for (const prop of COLOR_PROPERTIES) {
          if (p.base.startsWith(prop)) {
            darkColors.add(prop);
          }
        }
      } else if (!p.variant) {
        for (const prop of COLOR_PROPERTIES) {
          if (p.base.startsWith(prop)) {
            lightColors.add(prop);
          }
        }
      }
    }
    for (const prop of lightColors) {
      if (!darkColors.has(prop)) {
        results.push(
          diag(
            filePath,
            text,
            offset,
            `\`${prop}*\` has a light mode value but no \`dark:${prop}*\` counterpart. Consider adding one for dark mode support.`,
            "warn-incomplete-dark-color-pair",
          ),
        );
      }
    }
  }
  return results;
}

// ─── 18. prefer-theme-scale ─────────────────────────────────────────────────

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

// ─── 19. no-magic-spacing ───────────────────────────────────────────────────

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

// ─── 20. detect-conflicts-in-template-literals ──────────────────────────────

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

// ─── 21. prefer-design-tokens ──────────────────────────────────────────────

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

// ─── Rule Registry ───────────────────────────────────────────────────────────

export const ALL_RULES: RuleEntry[] = [
  {
    id: "no-duplicate-utilities",
    check: checkNoDuplicateUtilities,
    description: "Detect repeated identical utilities",
  },
  {
    id: "prefer-truncate-shorthand",
    check: checkPreferTruncateShorthand,
    description: "Suggest truncate over overflow-hidden text-ellipsis whitespace-nowrap",
  },
  {
    id: "no-important-abuse",
    check: checkNoImportantAbuse,
    description: "Warn when !important is overused",
  },
  {
    id: "no-sr-only-display-conflict",
    check: checkNoSrOnlyDisplayConflict,
    description: "Detect sr-only combined with display utilities",
  },
  {
    id: "consistent-negative-arbitrary-values",
    check: checkConsistentNegativeArbitraryValues,
    description: "Enforce consistent negative arbitrary value syntax",
  },
  {
    id: "prefer-logical-properties",
    check: checkPreferLogicalProperties,
    description: "Encourage logical properties over physical left/right",
  },
  {
    id: "require-motion-reduce-for-animation",
    check: checkRequireMotionReduceForAnimation,
    description: "Require motion-reduce variant for animations",
  },
  {
    id: "require-flex-for-flex-utilities",
    check: checkRequireFlexForFlexUtilities,
    description: "Detect flex container utilities without flex",
  },
  {
    id: "require-grid-for-grid-utilities",
    check: checkRequireGridForGridUtilities,
    description: "Detect grid utilities without grid",
  },
  {
    id: "warn-hover-on-disabled",
    check: checkWarnHoverOnDisabled,
    description: "Detect hover variants on disabled elements",
  },
  {
    id: "warn-incomplete-dark-color-pair",
    check: checkWarnIncompleteDarkColorPair,
    description: "Detect incomplete dark mode color pairs",
  },
  {
    id: "prefer-theme-scale",
    check: checkPreferThemeScale,
    description: "Prefer Tailwind design tokens over arbitrary values with theme-matching units",
  },
  {
    id: "no-magic-spacing",
    check: checkNoMagicSpacing,
    description: "Detect spacing values that don't match the 4px design grid",
  },
  {
    id: "detect-conflicts-in-template-literals",
    check: checkDetectConflictsInTemplateLiterals,
    description: "Detect conflicting utilities within template literals",
  },
  {
    id: "prefer-design-tokens",
    check: checkPreferDesignTokens,
    description: "Prefer design tokens over raw hex colors",
  },
];

const RULE_MAP = new Map<string, RuleCheck>();
for (const rule of ALL_RULES) {
  RULE_MAP.set(rule.id, rule.check);
}

export function getRuleCheck(id: string): RuleCheck | undefined {
  return RULE_MAP.get(id);
}

export function runCustomRules(
  ruleIds: string[],
  text: string,
  filePath: string,
  context?: RuleContext,
): Diagnostic[] {
  const results: Diagnostic[] = [];
  const ruleContext = normalizeRuleContext(context);
  for (const id of ruleIds) {
    const check = getRuleCheck(id);
    if (check) {
      try {
        results.push(...check(text, filePath, ruleContext));
      } catch {
        // skip failing rules
      }
    }
  }
  return results;
}
