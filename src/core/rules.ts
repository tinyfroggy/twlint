// Single source of truth for the rule registry.
//
// Every rule's metadata (id, bucket, description, and — for language-service
// rules — the diagnostic kind it maps to) lives in the RULE_REGISTRY table
// below. The RuleId union type, KNOWN_RULES, DEFAULT_RULES, LS_RULES, and
// RULE_TO_DIAGNOSTIC_KIND are all derived from it so they can never drift.
//
// Buckets:
//   - "ls":        handled by @tailwindcss/language-service via doValidate.
//   - "shorthand": handled by getShorthandClassDiagnostics.
//   - "custom":    check functions live in src/custom-rules/index.ts (ALL_RULES).
//
// To avoid circular imports, this module holds metadata only. The actual custom
// rule check functions stay in src/custom-rules/index.ts; a test asserts the two
// stay in sync.

export type RuleBucket = "ls" | "shorthand" | "custom";

export type RuleDefinition = {
  id: string;
  bucket: RuleBucket;
  description: string;
  /** Diagnostic kind from @tailwindcss/language-service. Only set for "ls" rules. */
  diagnosticKind?: string;
};

export const RULE_REGISTRY = [
  // ── Language-service rules (handled by doValidate) ──────────────────────────
  {
    id: "canonical-classes",
    bucket: "ls",
    description: "Suggest canonical class names",
    diagnosticKind: "suggestCanonicalClasses",
  },
  {
    id: "class-conflicts",
    bucket: "ls",
    description: "Detect conflicting CSS utilities",
    diagnosticKind: "cssConflict",
  },
  {
    id: "recommended-variant-order",
    bucket: "ls",
    description: "Enforce the recommended variant order",
    diagnosticKind: "recommendedVariantOrder",
  },
  {
    id: "used-blocklisted-class",
    bucket: "ls",
    description: "Flag usage of blocklisted classes",
    diagnosticKind: "usedBlocklistedClass",
  },

  // ── Shorthand rule ──────────────────────────────────────────────────────────
  {
    id: "shorthand-classes",
    bucket: "shorthand",
    description: "Suggest shorthand utilities",
  },

  // ── Custom rules (check functions in src/custom-rules/index.ts) ──────────────
  {
    id: "no-duplicate-utilities",
    bucket: "custom",
    description: "Detect repeated identical utilities",
  },
  {
    id: "canonical-class-order",
    bucket: "custom",
    description: "Enforce deterministic utility ordering",
  },
  {
    id: "prefer-truncate-shorthand",
    bucket: "custom",
    description: "Suggest truncate over overflow-hidden text-ellipsis whitespace-nowrap",
  },
  {
    id: "no-important-abuse",
    bucket: "custom",
    description: "Warn when !important is overused",
  },
  {
    id: "no-sr-only-display-conflict",
    bucket: "custom",
    description: "Detect sr-only combined with display utilities",
  },
  {
    id: "consistent-negative-arbitrary-values",
    bucket: "custom",
    description: "Enforce consistent negative arbitrary value syntax",
  },
  {
    id: "prefer-logical-properties",
    bucket: "custom",
    description: "Encourage logical properties over physical left/right",
  },
  {
    id: "require-motion-reduce-for-animation",
    bucket: "custom",
    description: "Require motion-reduce variant for animations",
  },
  {
    id: "no-orphan-layout-utilities",
    bucket: "custom",
    description: "Detect layout utilities without flex/grid",
  },
  {
    id: "require-flex-for-flex-utilities",
    bucket: "custom",
    description: "Detect flex container utilities without flex",
  },
  {
    id: "require-grid-for-grid-utilities",
    bucket: "custom",
    description: "Detect grid utilities without grid",
  },
  {
    id: "warn-ineffective-z-index",
    bucket: "custom",
    description: "Detect z-index without positioning",
  },
  {
    id: "require-display-for-sizing",
    bucket: "custom",
    description: "Detect sizing on inline elements without block display",
  },
  {
    id: "warn-hover-on-disabled",
    bucket: "custom",
    description: "Detect hover variants on disabled elements",
  },
  {
    id: "require-focus-visible-for-interactive",
    bucket: "custom",
    description: "Require focus-visible styles on interactive elements with hover",
  },
  {
    id: "warn-incomplete-dark-color-pair",
    bucket: "custom",
    description: "Detect incomplete dark mode color pairs",
  },
  {
    id: "prefer-theme-scale",
    bucket: "custom",
    description: "Prefer Tailwind design tokens over arbitrary values with theme-matching units",
  },
  {
    id: "no-magic-spacing",
    bucket: "custom",
    description: "Detect spacing values that don't match the 4px design grid",
  },
  {
    id: "detect-conflicts-in-template-literals",
    bucket: "custom",
    description: "Detect conflicting utilities within template literals",
  },
  {
    id: "prefer-design-tokens",
    bucket: "custom",
    description: "Prefer design tokens over raw hex colors",
  },
] as const satisfies readonly RuleDefinition[];

export type RuleId = (typeof RULE_REGISTRY)[number]["id"];

export const KNOWN_RULES: RuleId[] = RULE_REGISTRY.map((rule) => rule.id);

/**
 * Default rules enabled with no config.
 *
 * Some rules are opt-in because they produce noisy output for common code
 * patterns or require parent-context analysis that is not yet implemented.
 *
 * Opt-in rules (enable via `--rules` or `.twlinter.json`):
 *   - prefer-logical-properties       (RTL suggestions — not all projects target RTL)
 *   - require-motion-reduce-for-animation  (AX suggestion — noisy in practice)
 *   - warn-incomplete-dark-color-pair      (AX suggestion — noisy for every utility)
 *   - require-grid-for-grid-utilities      (needs parent-context DOM analysis to avoid false positives)
 */
export const DEFAULT_RULES: RuleId[] = KNOWN_RULES.filter(
  (id) =>
    id !== "prefer-logical-properties" &&
    id !== "require-motion-reduce-for-animation" &&
    id !== "warn-incomplete-dark-color-pair" &&
    id !== "require-grid-for-grid-utilities",
);

/** Ids of rules handled by @tailwindcss/language-service. */
export const LS_RULES = new Set<RuleId>(
  RULE_REGISTRY.filter((rule) => rule.bucket === "ls").map((rule) => rule.id),
);

/** Ids of custom rules (check functions in src/custom-rules/index.ts). */
export const CUSTOM_RULE_IDS = new Set<RuleId>(
  RULE_REGISTRY.filter((rule) => rule.bucket === "custom").map((rule) => rule.id),
);

/** Maps each language-service rule id to its diagnostic kind. */
export const RULE_TO_DIAGNOSTIC_KIND: Record<string, string> = Object.fromEntries(
  RULE_REGISTRY.filter((rule) => rule.bucket === "ls").map((rule) => [
    rule.id,
    rule.diagnosticKind as string,
  ]),
);

const ALIASES: Record<string, RuleId> = {
  "prefer-shorthand": "shorthand-classes",
  "no-conflicting-utilities": "class-conflicts",
};

export function resolveRules(requested?: string[]): RuleId[] {
  if (!requested || requested.length === 0) {
    return DEFAULT_RULES;
  }

  const known = new Set<string>(KNOWN_RULES);

  return requested.map((r) => ALIASES[r] ?? r).filter((r) => known.has(r)) as RuleId[];
}
