import { Diagnostic } from "../types.js";
import path from "node:path";
import {
  extractClassLists,
  stripVariants,
  parseClassName,
  extractElements,
  INLINE_TAGS,
} from "./utils.js";

export type RuleCheck = (text: string, filePath: string) => Diagnostic[];

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

// ─── 2. canonical-class-order ────────────────────────────────────────────────

const RESPONSIVE_ORDER = ["", "sm", "md", "lg", "xl", "2xl", "3xl", "4xl", "5xl", "6xl", "7xl"];

const STATE_VARIANTS = new Set([
  "hover",
  "focus",
  "focus-visible",
  "active",
  "visited",
  "disabled",
  "group-hover",
  "group-focus",
  "peer-hover",
  "peer-focus",
  "dark",
  "light",
  "motion-safe",
  "motion-reduce",
]);

function variantOrderIndex(v: string): number {
  const idx = RESPONSIVE_ORDER.indexOf(v);
  if (idx !== -1) return idx;
  if (v.startsWith("max-")) return RESPONSIVE_ORDER.indexOf(v.slice(4)) + 100;
  if (v.startsWith("min-[") || v.startsWith("max-[")) return 200;
  if (STATE_VARIANTS.has(v)) return 300;
  return 400;
}

function checkCanonicalClassOrder(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  for (const { offset, classes } of extractClassLists(text)) {
    const parsed = classes.map((c) => parseClassName(c));
    for (let i = 1; i < parsed.length; i++) {
      const prev = parsed[i - 1];
      const curr = parsed[i];
      const prevIdx = variantOrderIndex(prev.variant);
      const currIdx = variantOrderIndex(curr.variant);
      if (currIdx < prevIdx) {
        results.push(
          diag(
            filePath,
            text,
            offset,
            `Class \`${curr.original}\` should come before \`${prev.original}\`. ` +
              `Expected variant order: base → sm → md → lg → xl → 2xl → state variants.`,
            "canonical-class-order",
          ),
        );
        break;
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

// ─── 10. no-orphan-layout-utilities ──────────────────────────────────────────

const FLEX_GRID_CHILD_CLASSES = [
  "items-",
  "justify-",
  "content-",
  "place-items-",
  "place-content-",
  "place-self-",
  "justify-self-",
  "justify-items-",
  "self-",
];

function checkNoOrphanLayoutUtilities(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  for (const { offset, classes } of extractClassLists(text)) {
    const bases = new Set(classes.map((c) => stripVariants(c)));
    const hasFlex = bases.has("flex");
    const hasGrid = bases.has("grid");
    const hasInlineFlex = bases.has("inline-flex");
    const hasInlineGrid = bases.has("inline-grid");

    if (hasFlex || hasGrid || hasInlineFlex || hasInlineGrid) continue;

    for (const prefix of FLEX_GRID_CHILD_CLASSES) {
      for (const b of bases) {
        if (b.startsWith(prefix)) {
          results.push(
            diag(
              filePath,
              text,
              offset,
              `\`${b}\` requires \`flex\` or \`grid\` parent context but neither is present.`,
              "no-orphan-layout-utilities",
            ),
          );
          break;
        }
      }
    }

    if (!hasFlex && !hasInlineFlex) {
      if (bases.has("gap-") || [...bases].some((b) => b.startsWith("gap-"))) {
        results.push(
          diag(
            filePath,
            text,
            offset,
            "`gap-*` requires `flex` or `grid` parent context but neither is present.",
            "no-orphan-layout-utilities",
          ),
        );
      }
    }
  }
  return results;
}

// ─── 11. require-flex-for-flex-utilities ─────────────────────────────────────

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
  for (const { offset, classes } of extractClassLists(text)) {
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

function checkRequireGridForGridUtilities(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  for (const { offset, classes } of extractClassLists(text)) {
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

// ─── 13. warn-ineffective-z-index ────────────────────────────────────────────

const POSITIONING_CLASSES = new Set(["relative", "absolute", "fixed", "sticky"]);

function checkWarnIneffectiveZIndex(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  for (const { offset, classes } of extractClassLists(text)) {
    const bases = new Set(classes.map((c) => stripVariants(c)));
    let hasZIndex = false;
    for (const b of bases) {
      if (b.startsWith("z-") && b !== "z-auto") {
        hasZIndex = true;
        break;
      }
    }
    if (!hasZIndex) continue;
    const hasPosition = [...POSITIONING_CLASSES].some((p) => bases.has(p));
    if (!hasPosition) {
      results.push(
        diag(
          filePath,
          text,
          offset,
          "`z-*` has no effect without `relative`, `absolute`, `fixed`, or `sticky`.",
          "warn-ineffective-z-index",
        ),
      );
    }
  }
  return results;
}

// ─── 14. require-display-for-sizing ─────────────────────────────────────────

function checkRequireDisplayForSizing(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  const elements = extractElements(text);
  for (const el of elements) {
    const classStr = el.attrs["className"] ?? el.attrs["class"] ?? "";
    if (!classStr) continue;
    const classes = classStr.trim().split(/\s+/).filter(Boolean);
    const bases = new Set(classes.map((c) => stripVariants(c)));

    let hasSizing = false;
    for (const b of bases) {
      if (b.startsWith("w-") || b.startsWith("h-") || b.startsWith("size-")) {
        hasSizing = true;
        break;
      }
    }
    if (!hasSizing) continue;

    if (INLINE_TAGS.has(el.tag)) {
      const hasBlockDisplay =
        [...DISPLAY_CLASSES].some((d) => bases.has(d)) && !bases.has("inline");
      if (!hasBlockDisplay) {
        results.push(
          diag(
            filePath,
            text,
            el.offset,
            `\`<${el.tag}>\` is inline by default. Add \`inline-block\` (or another block display) for \`w-*\`/\`h-*\` to take effect.`,
            "require-display-for-sizing",
          ),
        );
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

// ─── 16. require-focus-visible-for-interactive ───────────────────────────────

const INTERACTIVE_TAGS = new Set([
  "button",
  "a",
  "input",
  "select",
  "textarea",
  "details",
  "summary",
]);

function checkRequireFocusVisibleForInteractive(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  const elements = extractElements(text);
  for (const el of elements) {
    if (!INTERACTIVE_TAGS.has(el.tag)) continue;
    const classStr = el.attrs["className"] ?? el.attrs["class"] ?? "";
    if (!classStr) continue;
    const classes = classStr.trim().split(/\s+/).filter(Boolean);
    let hasHover = false;
    let hasFocusVisible = false;
    for (const c of classes) {
      const parsed = parseClassName(c);
      if (parsed.variant === "hover") hasHover = true;
      if (parsed.variant === "focus-visible") hasFocusVisible = true;
    }
    if (hasHover && !hasFocusVisible) {
      results.push(
        diag(
          filePath,
          text,
          el.offset,
          "Interactive element has `hover:*` variant but no `focus-visible:*`. Add keyboard focus styles for accessibility.",
          "require-focus-visible-for-interactive",
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

function checkPreferThemeScale(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  const scaleValueRe = /(?:^|\s)([a-z-]+)-\[(\d+)(?:px|rem|em|pt|pc|mm|cm)\]/g;
  for (const { offset, raw } of extractClassLists(text)) {
    let match: RegExpExecArray | null;
    while ((match = scaleValueRe.exec(raw)) !== null) {
      results.push(
        diag(
          filePath,
          text,
          offset,
          `Prefer Tailwind's design scale over arbitrary value \`${match[1]}-[${match[2]}]\`. Use a theme value like \`${match[1]}-${match[2]}\` if it matches the scale.`,
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
    /(?:^|\s)((?:m|p|gap|space-[xy]|scroll-m|scroll-p)[a-z]?)-\[(\d+)(?:px|rem|em)\]/g;
  for (const { offset, raw } of extractClassLists(text)) {
    let match: RegExpExecArray | null;
    while ((match = spacingRe.exec(raw)) !== null) {
      const val = Number(match[2]);
      if (val > 0 && val % 4 !== 0) {
        results.push(
          diag(
            filePath,
            text,
            offset,
            `Magic spacing value \`${match[0].trim()}\`. This doesn't match the 4px design grid. Use a theme scale value or \`calc()\`/ \`var()\` for intentional values.`,
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

// ─── 21. suggest-reusable-patterns ──────────────────────────────────────────

const COMMON_PATTERNS = [
  { pattern: ["flex", "items-center", "justify-center"], suggestion: "flex-center" },
  { pattern: ["flex", "items-center", "justify-between"], suggestion: "flex-between" },
  { pattern: ["flex", "items-center"], suggestion: "flex-center" },
  { pattern: ["flex", "flex-col"], suggestion: "flex-col" },
];

const PATTERN_COUNTS = new Map<string, number>();

function checkSuggestReusablePatterns(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  for (const { classes } of extractClassLists(text)) {
    const bases = classes.map((c) => stripVariants(c));
    for (const { pattern } of COMMON_PATTERNS) {
      if (pattern.every((p) => bases.includes(p))) {
        const key = pattern.join("+");
        PATTERN_COUNTS.set(key, (PATTERN_COUNTS.get(key) ?? 0) + 1);
      }
    }
  }
  for (const { pattern, suggestion } of COMMON_PATTERNS) {
    const key = pattern.join("+");
    const count = PATTERN_COUNTS.get(key) ?? 0;
    if (count >= 3) {
      results.push(
        diag(
          filePath,
          text,
          0,
          `Pattern \`${pattern.join(" ")}\` was used ${count} times. Consider extracting an \`@utility ${suggestion}\`.`,
          "suggest-reusable-patterns",
        ),
      );
      PATTERN_COUNTS.delete(key);
    }
  }
  return results;
}

// ─── 22. prefer-design-tokens ──────────────────────────────────────────────

function checkPreferDesignTokens(text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  const colorHexRe = /(?:^|\s)([a-z-]+)-\[#([0-9a-fA-F]{3,8})\]/g;
  for (const { offset, raw } of extractClassLists(text)) {
    let match: RegExpExecArray | null;
    while ((match = colorHexRe.exec(raw)) !== null) {
      results.push(
        diag(
          filePath,
          text,
          offset,
          `Prefer design tokens over raw hex colors: \`${match[0].trim()}\`. Use \`bg-background\`, \`text-foreground\`, or similar project tokens.`,
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
    id: "canonical-class-order",
    check: checkCanonicalClassOrder,
    description: "Enforce deterministic utility ordering",
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
    id: "no-orphan-layout-utilities",
    check: checkNoOrphanLayoutUtilities,
    description: "Detect layout utilities without flex/grid",
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
    id: "warn-ineffective-z-index",
    check: checkWarnIneffectiveZIndex,
    description: "Detect z-index without positioning",
  },
  {
    id: "require-display-for-sizing",
    check: checkRequireDisplayForSizing,
    description: "Detect sizing on inline elements without block display",
  },
  {
    id: "warn-hover-on-disabled",
    check: checkWarnHoverOnDisabled,
    description: "Detect hover variants on disabled elements",
  },
  {
    id: "require-focus-visible-for-interactive",
    check: checkRequireFocusVisibleForInteractive,
    description: "Require focus-visible styles on interactive elements with hover",
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
    id: "suggest-reusable-patterns",
    check: checkSuggestReusablePatterns,
    description: "Suggest reusable utility patterns",
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

export function runCustomRules(ruleIds: string[], text: string, filePath: string): Diagnostic[] {
  const results: Diagnostic[] = [];
  for (const id of ruleIds) {
    const check = getRuleCheck(id);
    if (check) {
      try {
        results.push(...check(text, filePath));
      } catch {
        // skip failing rules
      }
    }
  }
  return results;
}
