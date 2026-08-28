import path from "node:path";
import { createRequire } from "node:module";
import { pathToFileURL } from "node:url";

import { TextDocument } from "vscode-languageserver-textdocument";

import { loadDesignSystem } from "./tailwind-design-system.js";
import { getShorthandClassDiagnostics } from "../core/shorthand-classes.js";
import { runCustomRules } from "../custom-rules/index.js";
import { DEFAULT_CLASS_FUNCTIONS } from "../constants.js";

import type { CandidateInput, Diagnostic, TailwindDiagnostic } from "../types.js";

const require = createRequire(import.meta.url);
const {
  createState,
  doValidate,
  getDefaultTailwindSettings,
} = require("@tailwindcss/language-service");

const DIAGNOSTIC_KINDS = [
  "suggestCanonicalClasses",
  "cssConflict",
  "usedBlocklistedClass",
] as const;

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
): Promise<Diagnostic[]> {
  const document = TextDocument.create(
    pathToFileURL(candidate.file).href,
    detectLanguageId(candidate.file),
    1,
    candidate.text,
  );
  const diagnostics: Diagnostic[] = [];

  for (const kind of DIAGNOSTIC_KINDS) {
    try {
      const rawDiagnostics = (await doValidate(state, document, [kind])) as TailwindDiagnostic[];
      diagnostics.push(
        ...rawDiagnostics.map((raw) => ({
          file: path.relative(process.cwd(), candidate.file),
          line: raw.range.start.line + 1,
          column: raw.range.start.character + 1,
          severity: "warning" as const,
          rule: typeof raw.code === "string" ? raw.code : "suggestCanonicalClasses",
          message: raw.message,
          source: "tw",
        })),
      );
    } catch {
      // One unsupported Tailwind check should not hide other diagnostics.
    }
  }

  try {
    diagnostics.push(...getShorthandClassDiagnostics(designSystem, document, candidate.file));
  } catch {
    // The shorthand check requires the Tailwind design system.
  }

  diagnostics.push(...runCustomRules(candidate.text, candidate.file));

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
