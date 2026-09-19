import { CUSTOM_RULES } from "./custom-rules/index.js";

import type { CustomRuleOptions, RuleCheck } from "./custom-rules/index.js";

export type RuleSeverity = "problem" | "suggestion" | "layout";

export type RuleMeta = {
  type: RuleSeverity;
  docs: {
    description: string;
    url: string;
  };
  schema: unknown[];
  messages: Record<string, string>;
  fixable?: "code" | "whitespace";
  hasSuggestions?: boolean;
};

export type SourceCode = {
  getText(): string;
};

export type Fix = {
  range: [number, number];
  text: string;
};

export type RuleFixer = {
  replaceTextRange(range: [number, number], text: string): Fix;
};

export type RuleSuggestion = {
  desc: string;
  fix(fixer: RuleFixer): Fix;
};

export type RuleReport = {
  loc: { line: number; column: number };
  message: string;
  fix?(fixer: RuleFixer): Fix;
  suggest?: RuleSuggestion[];
};

export type RuleContext = {
  sourceCode?: SourceCode;
  getSourceCode?(): SourceCode;
  filename?: string;
  getFilename?(): string;
  options?: unknown[];
  report(descriptor: RuleReport): void;
};

export type RuleVisitors = {
  Program(): void;
};

export type RuleModule = {
  meta: RuleMeta;
  create(context: RuleContext): RuleVisitors;
};

const RULES: Record<
  string,
  {
    description: string;
    type: RuleSeverity;
    schema?: unknown[];
    fixable?: "code" | "whitespace";
    hasSuggestions?: boolean;
  }
> = {
  "no-duplicate-utilities": {
    description: "Disallow the same utility appearing more than once in one class list.",
    type: "problem",
  },
  "prefer-truncate-shorthand": {
    description: "Prefer the `truncate` shorthand over its three component utilities.",
    type: "suggestion",
  },
  "no-important-abuse": {
    description: "Disallow stacking many `!` important utilities in one class list.",
    type: "suggestion",
  },
  "no-sr-only-display-conflict": {
    description: "Disallow `sr-only` combined with a display utility that overrides it.",
    type: "problem",
  },
  "consistent-negative-arbitrary-values": {
    description: "Prefer the `-utility-[value]` form over a negative value in brackets.",
    type: "suggestion",
  },
  "require-flex-for-flex-utilities": {
    description: "Require `flex` or `inline-flex` for flex direction and wrap utilities.",
    type: "problem",
  },
  "prefer-theme-scale": {
    description: "Prefer Tailwind spacing scale and font-size tokens over arbitrary values.",
    type: "suggestion",
  },
  "no-magic-spacing": {
    description: "Disallow arbitrary spacing values that land off the spacing scale.",
    type: "suggestion",
  },
  "detect-conflicts-in-template-literals": {
    description: "Disallow duplicate utilities across parts of a template literal.",
    type: "problem",
  },
  "prefer-design-tokens": {
    description: "Prefer theme color tokens over raw hex colors in arbitrary values.",
    type: "suggestion",
  },
  "no-raw-colors": {
    description: "Disallow raw Tailwind palette colors in classes and color attributes.",
    type: "problem",
    fixable: "code",
    hasSuggestions: true,
    schema: [
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
    ],
  },
};

function getSourceCode(context: RuleContext): SourceCode | undefined {
  return context.sourceCode ?? context.getSourceCode?.();
}

function getFilename(context: RuleContext): string {
  return context.filename ?? context.getFilename?.() ?? "";
}

function createRule(name: string, check: RuleCheck): RuleModule {
  const meta: {
    description: string;
    type: RuleSeverity;
    schema?: unknown[];
    fixable?: "code" | "whitespace";
    hasSuggestions?: boolean;
  } = RULES[name] ?? {
    description: `twlinter rule ${name}.`,
    type: "suggestion" as const,
  };

  return {
    meta: {
      type: meta.type,
      docs: {
        description: meta.description,
        url: "https://github.com/tinyfroggy/twlint#readme",
      },
      schema: meta.schema ?? [],
      messages: {},
      ...(meta.fixable ? { fixable: meta.fixable } : {}),
      ...(meta.hasSuggestions ? { hasSuggestions: true } : {}),
    },
    create(context) {
      return {
        Program() {
          const sourceCode = getSourceCode(context);
          if (!sourceCode) return;

          let diagnostics;
          try {
            const ruleOptions = context.options?.[0] as CustomRuleOptions["noRawColors"];
            diagnostics = check(sourceCode.getText(), getFilename(context), {
              noRawColors: ruleOptions ?? undefined,
            });
          } catch {
            return;
          }

          for (const diagnostic of diagnostics) {
            const report: RuleReport = {
              loc: {
                line: diagnostic.line,
                column: Math.max(0, diagnostic.column - 1),
              },
              message: diagnostic.message,
            };

            if (diagnostic.fix) {
              const { range, text } = diagnostic.fix;
              report.fix = (fixer) => fixer.replaceTextRange(range, text);

              const alternatives = diagnostic.suggestions ?? [];
              if (alternatives.length > 0) {
                report.suggest = alternatives.map((replacement) => ({
                  desc: `Replace with "${replacement}"`,
                  fix: (fixer: RuleFixer) => fixer.replaceTextRange(range, replacement),
                }));
              }
            }

            context.report(report);
          }
        },
      };
    },
  };
}

export const rules: Record<string, RuleModule> = Object.fromEntries(
  Object.entries(CUSTOM_RULES).map(([name, check]) => [name, createRule(name, check)]),
);

export const plugin = {
  meta: { name: "twlinter" },
  rules,
};

export default plugin;
