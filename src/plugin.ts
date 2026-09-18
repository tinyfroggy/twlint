import { CUSTOM_RULES } from "./custom-rules/index.js";

import type { RuleCheck } from "./custom-rules/index.js";

export type RuleSeverity = "problem" | "suggestion" | "layout";

export type RuleMeta = {
  type: RuleSeverity;
  docs: {
    description: string;
    url: string;
  };
  schema: [];
  messages: Record<string, string>;
};

export type SourceCode = {
  getText(): string;
};

export type RuleReport = {
  loc: { line: number; column: number };
  message: string;
};

export type RuleContext = {
  sourceCode?: SourceCode;
  getSourceCode?(): SourceCode;
  filename?: string;
  getFilename?(): string;
  report(descriptor: RuleReport): void;
};

export type RuleVisitors = {
  Program(): void;
};

export type RuleModule = {
  meta: RuleMeta;
  create(context: RuleContext): RuleVisitors;
};

const RULES: Record<string, { description: string; type: RuleSeverity }> = {
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
};

function getSourceCode(context: RuleContext): SourceCode | undefined {
  return context.sourceCode ?? context.getSourceCode?.();
}

function getFilename(context: RuleContext): string {
  return context.filename ?? context.getFilename?.() ?? "";
}

function createRule(name: string, check: RuleCheck): RuleModule {
  const meta = RULES[name] ?? {
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
      schema: [],
      messages: {},
    },
    create(context) {
      return {
        Program() {
          const sourceCode = getSourceCode(context);
          if (!sourceCode) return;

          let diagnostics;
          try {
            diagnostics = check(sourceCode.getText(), getFilename(context));
          } catch {
            return;
          }

          for (const diagnostic of diagnostics) {
            context.report({
              loc: {
                line: diagnostic.line,
                column: Math.max(0, diagnostic.column - 1),
              },
              message: diagnostic.message,
            });
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
