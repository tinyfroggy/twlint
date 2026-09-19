/**
 * Single source of truth for every twlint rule.
 *
 * Both frontends read this catalog:
 * - the CLI runs every rule through `runRules` (see `rules/run.ts`);
 * - the ESLint/Oxlint plugin exposes one rule module per entry
 *   (see `plugin.ts`).
 *
 * `capability` describes the context a rule needs. The text rules only need
 * the file's text. The Tailwind design-system rules need the language service
 * / compiled design system, which the plugin can only reach by delegating to
 * the CLI (see `plugin/context-delegate.ts`).
 */

export type RuleCapability = "text" | "design-system" | "design-system-or-v3";

export type RuleType = "problem" | "suggestion" | "layout";

export type RuleDefaultSeverity = "error" | "warn";

export type RuleMeta = {
  id: string;
  /** Short, human-readable description shown by `twlinter --rules`. */
  description: string;
  /** ESLint-flavoured rule type, used by the plugin metadata. */
  type: RuleType;
  defaultSeverity: RuleDefaultSeverity;
  capability: RuleCapability;
  fixable?: "code" | "whitespace";
  hasSuggestions?: boolean;
  schema?: unknown[];
};

const NO_RAW_COLORS_SCHEMA = [
  {
    type: "object",
    properties: {
      allow: { type: "array", items: { type: "string" } },
      deny: { type: "array", items: { type: "string" } },
      message: { type: "string" },
      scanAllStrings: { type: "boolean" },
      mergeFunctions: { type: "array", items: { type: "string" } },
      variantFunctions: { type: "array", items: { type: "string" } },
      contracts: {
        type: "array",
        items: {
          type: "object",
          properties: {
            pattern: { type: "string" },
            allow: { type: "array", items: { type: "string" } },
            deny: { type: "array", items: { type: "string" } },
            message: { type: "string" },
          },
          required: ["pattern"],
          additionalProperties: false,
        },
      },
    },
    additionalProperties: false,
  },
];

export const RULE_CATALOG: readonly RuleMeta[] = [
  {
    id: "no-duplicate-utilities",
    description: "Disallow the same utility appearing more than once in one class list.",
    type: "problem",
    defaultSeverity: "warn",
    capability: "text",
  },
  {
    id: "prefer-truncate-shorthand",
    description: "Prefer the `truncate` shorthand over its three component utilities.",
    type: "suggestion",
    defaultSeverity: "warn",
    capability: "text",
  },
  {
    id: "no-important-abuse",
    description: "Disallow stacking many `!` important utilities in one class list.",
    type: "suggestion",
    defaultSeverity: "warn",
    capability: "text",
  },
  {
    id: "no-sr-only-display-conflict",
    description: "Disallow `sr-only` combined with a display utility that overrides it.",
    type: "problem",
    defaultSeverity: "warn",
    capability: "text",
  },
  {
    id: "consistent-negative-arbitrary-values",
    description: "Prefer the `-utility-[value]` form over a negative value in brackets.",
    type: "suggestion",
    defaultSeverity: "warn",
    capability: "text",
  },
  {
    id: "require-flex-for-flex-utilities",
    description: "Require `flex` or `inline-flex` for flex direction and wrap utilities.",
    type: "problem",
    defaultSeverity: "warn",
    capability: "text",
  },
  {
    id: "prefer-theme-scale",
    description: "Prefer Tailwind spacing scale and font-size tokens over arbitrary values.",
    type: "suggestion",
    defaultSeverity: "warn",
    capability: "text",
  },
  {
    id: "no-magic-spacing",
    description: "Disallow arbitrary spacing values that land off the spacing scale.",
    type: "suggestion",
    defaultSeverity: "warn",
    capability: "text",
  },
  {
    id: "detect-conflicts-in-template-literals",
    description: "Disallow duplicate utilities across parts of a template literal.",
    type: "problem",
    defaultSeverity: "warn",
    capability: "text",
  },
  {
    id: "prefer-design-tokens",
    description: "Prefer theme color tokens over raw hex colors in arbitrary values.",
    type: "suggestion",
    defaultSeverity: "warn",
    capability: "text",
  },
  {
    id: "no-raw-colors",
    description: "Disallow raw Tailwind palette colors in classes and color attributes.",
    type: "problem",
    defaultSeverity: "warn",
    capability: "text",
    fixable: "code",
    hasSuggestions: true,
    schema: NO_RAW_COLORS_SCHEMA,
  },
  {
    id: "suggestCanonicalClasses",
    description: "Suggest canonical class forms, e.g. `w-[350px]` -> `w-87.5`.",
    type: "suggestion",
    defaultSeverity: "warn",
    capability: "design-system-or-v3",
  },
  {
    id: "cssConflict",
    description: "Disallow conflicting utilities such as `block` and `hidden`.",
    type: "problem",
    defaultSeverity: "warn",
    capability: "design-system-or-v3",
  },
  {
    id: "usedBlocklistedClass",
    description: "Disallow classes blocked by the Tailwind configuration.",
    type: "problem",
    defaultSeverity: "warn",
    capability: "design-system-or-v3",
  },
  {
    id: "shorthand-classes",
    description: "Suggest class lists that collapse to fewer utilities.",
    type: "suggestion",
    defaultSeverity: "warn",
    capability: "design-system",
  },
  {
    id: "no-unknown-classes",
    description: "Disallow classes Tailwind cannot generate, with spelling suggestions.",
    type: "problem",
    defaultSeverity: "warn",
    capability: "design-system-or-v3",
  },
] as const;

export const RULE_BY_ID: ReadonlyMap<string, RuleMeta> = new Map(
  RULE_CATALOG.map((rule) => [rule.id, rule]),
);

export const RULE_IDS: readonly string[] = RULE_CATALOG.map((rule) => rule.id);

export function isRuleId(id: string): boolean {
  return RULE_BY_ID.has(id);
}

export function ruleMeta(id: string): RuleMeta | undefined {
  return RULE_BY_ID.get(id);
}
