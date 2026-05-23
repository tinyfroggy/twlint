import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

import { TextDocument } from "vscode-languageserver-textdocument";

import { loadDesignSystem } from "./tailwind-design-system.js";
import { normalizeDiagnostic } from "../core/normalize-diagnostic.js";
import { getShorthandClassDiagnostics } from "../core/shorthand-classes.js";
import { resolveRules, DEFAULT_RULES, type RuleId } from "../core/rules.js";
import { ALL_RULES, runCustomRules } from "../custom-rules/index.js";
import type { RuleContext } from "../custom-rules/index.js";

import type { CandidateInput, Diagnostic, TailwindDiagnostic } from "../types.js";

const require = createRequire(import.meta.url);
const {
  createState,
  doValidate,
  getDefaultTailwindSettings,
} = require("@tailwindcss/language-service");

const RULE_TO_DIAGNOSTIC_KIND: Record<string, string> = {
  "canonical-classes": "suggestCanonicalClasses",
  "class-conflicts": "cssConflict",
  "recommended-variant-order": "invalidApply",
  "used-blocklisted-class": "suggestCanonicalClasses",
};

const LS_RULES = new Set([
  "canonical-classes",
  "class-conflicts",
  "recommended-variant-order",
  "used-blocklisted-class",
]);

const CUSTOM_RULE_SET = new Set<string>(ALL_RULES.map((r) => r.id));

export async function createValidationState(cssEntry: string) {
  const { dependencyPaths, designSystem } = await loadDesignSystem(cssEntry);
  const settings = getDefaultTailwindSettings();
  const state = createState({
    v4: true,
    version: "4",
    separator: ":",
    designSystem: designSystem as never,
    editor: {
      folder: process.cwd(),
      getConfiguration: async () => settings,
      getDocumentSymbols: async () => [],
      readDirectory: async () => [],
    },
  });

  return {
    dependencyPaths,
    state,
    designSystem,
  };
}

export async function validateCandidate(
  state: ReturnType<typeof createState>,
  designSystem: unknown,
  candidate: CandidateInput,
  rules: RuleId[] = DEFAULT_RULES,
  ruleContext?: RuleContext,
): Promise<Diagnostic[]> {
  const document = TextDocument.create(
    pathToFileURL(candidate.file).href,
    detectLanguageId(candidate.file),
    1,
    candidate.text,
  );
  const resolved = resolveRules(rules);
  const diagnostics: Diagnostic[] = [];

  const lsRules = resolved.filter((r) => LS_RULES.has(r));
  if (lsRules.length > 0) {
    try {
      const kinds = lsRules.map((rule) => RULE_TO_DIAGNOSTIC_KIND[rule]) as unknown[] as Parameters<
        typeof doValidate
      >[2];
      const lsDiagnostics = (await doValidate(state, document, kinds)) as TailwindDiagnostic[];
      diagnostics.push(...lsDiagnostics.map((raw) => normalizeDiagnostic(raw, candidate.file)));
    } catch {
      // LS rules failed silently; shorthand-classes and custom rules still run
    }
  }

  if (resolved.includes("shorthand-classes")) {
    try {
      diagnostics.push(...getShorthandClassDiagnostics(designSystem, document, candidate.file));
    } catch {
      // shorthand-classes requires the design system; skip if unavailable
    }
  }

  const customRuleIds = resolved.filter((r) => CUSTOM_RULE_SET.has(r));
  if (customRuleIds.length > 0) {
    diagnostics.push(...runCustomRules(customRuleIds, candidate.text, candidate.file, ruleContext));
  }

  return diagnostics;
}

function detectLanguageId(file: string): string {
  switch (path.extname(file)) {
    case ".css":
      return "css";
    case ".html":
      return "html";
    case ".js":
    case ".mjs":
    case ".cjs":
      return "javascript";
    case ".jsx":
      return "javascriptreact";
    case ".ts":
      return "typescript";
    case ".tsx":
      return "typescriptreact";
    case ".vue":
      return "vue";
    case ".svelte":
      return "svelte";
    case ".astro":
      return "astro";
    case ".mdx":
      return "mdx";
    default:
      return "plaintext";
  }
}
