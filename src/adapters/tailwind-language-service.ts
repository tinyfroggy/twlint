import path from "node:path";
import { pathToFileURL } from "node:url";

import { TextDocument } from "vscode-languageserver-textdocument";

import { loadDesignSystem } from "./tailwind-design-system.js";
import { createV3ValidationState } from "./tailwind-v3-state.js";
import {
  createState,
  doValidate,
  getDefaultTailwindSettings,
} from "./tailwind-language-service-api.js";
import { getShorthandClassDiagnostics } from "../core/shorthand-classes.js";
import { getUnknownClassDiagnostics } from "../core/unknown-classes.js";
import { runCustomRules } from "../custom-rules/index.js";
import { DEFAULT_CLASS_FUNCTIONS } from "../constants.js";

import type { TailwindProject } from "../discovery/resolve-tailwind-project.js";
import type { CandidateInput, Diagnostic, TailwindDiagnostic } from "../types.js";

const DIAGNOSTIC_KINDS = [
  "suggestCanonicalClasses",
  "cssConflict",
  "usedBlocklistedClass",
] as const;

export async function createValidationState(project: TailwindProject) {
  if (project.version === 3) {
    const { state, dependencyPaths } = await createV3ValidationState(project);

    return {
      dependencyPaths,
      state,
      designSystem: undefined as unknown,
    };
  }

  const { dependencyPaths, designSystem } = await loadDesignSystem(project.cssEntry);
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
  dependencyPaths?: Iterable<string>,
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
    // The shorthand check requires a Tailwind v4 design system.
  }

  try {
    diagnostics.push(
      ...getUnknownClassDiagnostics(state, designSystem, document, candidate.file, {
        dependencyPaths,
      }),
    );
  } catch {
    // The existence check requires a Tailwind design system or v3 JIT context.
  }

  diagnostics.push(
    ...runCustomRules(candidate.text, candidate.file, {
      tailwindVersion: state?.v4 === false ? 3 : 4,
    }),
  );

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
