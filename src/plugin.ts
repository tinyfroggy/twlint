import { CUSTOM_RULES } from "./custom-rules/index.js";
import { RULE_CATALOG } from "./rules/catalog.js";
import { getDelegatedDiagnostics } from "./plugin/context-delegate.js";

import type { NoRawColorsPolicy } from "./custom-rules/index.js";
import type { RuleMeta } from "./rules/catalog.js";
import type { Diagnostic } from "./types.js";

export type RuleSeverity = "problem" | "suggestion" | "layout";

export type RuleMetaShape = {
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
  meta: RuleMetaShape;
  create(context: RuleContext): RuleVisitors;
};

function getSourceCode(context: RuleContext): SourceCode | undefined {
  return context.sourceCode ?? context.getSourceCode?.();
}

function getFilename(context: RuleContext): string {
  return context.filename ?? context.getFilename?.() ?? "";
}

function metaFor(rule: RuleMeta): RuleMetaShape {
  return {
    type: rule.type,
    docs: {
      description: rule.description,
      url: "https://github.com/tinyfroggy/twlint#readme",
    },
    schema: rule.schema ?? [],
    messages: {},
    ...(rule.fixable ? { fixable: rule.fixable } : {}),
    ...(rule.hasSuggestions ? { hasSuggestions: true } : {}),
  };
}

function runTextRule(rule: RuleMeta, text: string, file: string, options: unknown): Diagnostic[] {
  const check = CUSTOM_RULES[rule.id];
  if (!check) return [];

  return check(
    text,
    file,
    rule.id === "no-raw-colors" && options !== undefined
      ? { noRawColors: options as NoRawColorsPolicy }
      : undefined,
  );
}

function createRule(rule: RuleMeta): RuleModule {
  return {
    meta: metaFor(rule),
    create(context) {
      return {
        Program() {
          const sourceCode = getSourceCode(context);
          if (!sourceCode) return;

          const file = getFilename(context);
          let diagnostics: Diagnostic[];
          try {
            diagnostics =
              rule.capability === "text"
                ? runTextRule(rule, sourceCode.getText(), file, context.options?.[0])
                : getDelegatedDiagnostics(file, rule.id);
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
  RULE_CATALOG.map((rule) => [rule.id, createRule(rule)]),
);

export const plugin = {
  meta: { name: "twlinter" },
  rules,
};

export default plugin;
