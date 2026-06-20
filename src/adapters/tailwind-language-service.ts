import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

import { TextDocument } from "vscode-languageserver-textdocument";

import { loadDesignSystem } from "./tailwind-design-system.js";
import { normalizeDiagnostic } from "../core/normalize-diagnostic.js";
import { getShorthandClassDiagnostics } from "../core/shorthand-classes.js";
import {
  resolveRules,
  DEFAULT_RULES,
  LS_RULES,
  CUSTOM_RULE_IDS,
  RULE_TO_DIAGNOSTIC_KIND,
  type RuleId,
} from "../core/rules.js";
import { runCustomRules } from "../custom-rules/index.js";
import type { RuleContext } from "../custom-rules/index.js";
import { DEFAULT_CLASS_FUNCTIONS } from "../constants.js";

import type { CandidateInput, Diagnostic, TailwindDiagnostic } from "../types.js";

const require = createRequire(import.meta.url);
const {
  createState,
  doValidate,
  getDefaultTailwindSettings,
} = require("@tailwindcss/language-service");

const CUSTOM_RULE_SET: ReadonlySet<string> = CUSTOM_RULE_IDS;

export async function createValidationState(cssEntry: string) {
  const { dependencyPaths, designSystem } = await loadDesignSystem(cssEntry);
  const settings = getDefaultTailwindSettings();

  // Harden class extraction: by default the language service only scans
  // `class`/`className` attributes. Registering common class-helper functions
  // lets it pull classes out of cva/clsx/cn/tv/... call sites, including
  // template-literal static segments and object keys, with no AST dependency.
  settings.tailwindCSS.classFunctions = [
    ...(settings.tailwindCSS.classFunctions ?? []),
    ...DEFAULT_CLASS_FUNCTIONS,
  ];

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
