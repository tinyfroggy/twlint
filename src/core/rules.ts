export type RuleId =
  | "canonical-classes"
  | "class-conflicts"
  | "recommended-variant-order"
  | "used-blocklisted-class"
  | "shorthand-classes"
  | "no-duplicate-utilities"
  | "canonical-class-order"
  | "prefer-truncate-shorthand"
  | "no-important-abuse"
  | "no-sr-only-display-conflict"
  | "consistent-negative-arbitrary-values"
  | "prefer-logical-properties"
  | "require-motion-reduce-for-animation"
  | "no-orphan-layout-utilities"
  | "require-flex-for-flex-utilities"
  | "require-grid-for-grid-utilities"
  | "warn-ineffective-z-index"
  | "require-display-for-sizing"
  | "warn-hover-on-disabled"
  | "require-focus-visible-for-interactive"
  | "warn-incomplete-dark-color-pair"
  | "prefer-theme-scale"
  | "no-magic-spacing"
  | "detect-conflicts-in-template-literals"
  | "suggest-reusable-patterns"
  | "prefer-design-tokens"
  | "prefer-shorthand"
  | "no-conflicting-utilities";

export const DEFAULT_RULES: RuleId[] = [
  "canonical-classes",
  "class-conflicts",
  "recommended-variant-order",
  "used-blocklisted-class",
  "shorthand-classes",
  "no-duplicate-utilities",
  "canonical-class-order",
  "prefer-truncate-shorthand",
  "no-important-abuse",
  "no-sr-only-display-conflict",
  "consistent-negative-arbitrary-values",
  "prefer-logical-properties",
  "require-motion-reduce-for-animation",
  "no-orphan-layout-utilities",
  "require-flex-for-flex-utilities",
  "require-grid-for-grid-utilities",
  "warn-ineffective-z-index",
  "require-display-for-sizing",
  "warn-hover-on-disabled",
  "require-focus-visible-for-interactive",
  "warn-incomplete-dark-color-pair",
  "prefer-theme-scale",
  "no-magic-spacing",
  "detect-conflicts-in-template-literals",
  "suggest-reusable-patterns",
  "prefer-design-tokens",
];

const ALIASES: Record<string, RuleId> = {
  "prefer-shorthand": "shorthand-classes",
  "no-conflicting-utilities": "class-conflicts",
};

export function resolveRules(requested?: string[]): RuleId[] {
  if (!requested || requested.length === 0) {
    return DEFAULT_RULES;
  }

  const known = new Set<string>([
    "canonical-classes",
    "class-conflicts",
    "recommended-variant-order",
    "used-blocklisted-class",
    "shorthand-classes",
    "no-duplicate-utilities",
    "canonical-class-order",
    "prefer-truncate-shorthand",
    "no-important-abuse",
    "no-sr-only-display-conflict",
    "consistent-negative-arbitrary-values",
    "prefer-logical-properties",
    "require-motion-reduce-for-animation",
    "no-orphan-layout-utilities",
    "require-flex-for-flex-utilities",
    "require-grid-for-grid-utilities",
    "warn-ineffective-z-index",
    "require-display-for-sizing",
    "warn-hover-on-disabled",
    "require-focus-visible-for-interactive",
    "warn-incomplete-dark-color-pair",
    "prefer-theme-scale",
    "no-magic-spacing",
    "detect-conflicts-in-template-literals",
    "suggest-reusable-patterns",
    "prefer-design-tokens",
  ]);

  return requested.map((r) => ALIASES[r] ?? r).filter((r) => known.has(r)) as RuleId[];
}
