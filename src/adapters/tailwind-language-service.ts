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
import { createClassKind, createV3ClassKind } from "../core/class-kind.js";
import { readDeclaredColorTokens } from "../core/theme-tokens.js";
import { isUndeclaredColorToken, runCustomRules } from "../custom-rules/index.js";
import { DEFAULT_CLASS_FUNCTIONS } from "../constants.js";

import type { ClassKind } from "../core/class-kind.js";
import type { TailwindProject } from "../discovery/resolve-tailwind-project.js";
import type { CandidateInput, Diagnostic, TailwindDiagnostic } from "../types.js";
import type { CustomRuleOptions } from "../custom-rules/index.js";

const DIAGNOSTIC_KINDS = [
  "suggestCanonicalClasses",
  "cssConflict",
  "usedBlocklistedClass",
] as const;

/** Project theme context handed to the custom rules. */
export type ThemeContext = {
  colors: ReadonlySet<string>;
  file?: string;
  resolveColor?: (name: string) => string | null;
  classifyClass?: (className: string) => ClassKind;
};

export async function createValidationState(project: TailwindProject) {
  if (project.version === 3) {
    const { state, dependencyPaths, declaredColors, allColors } =
      await createV3ValidationState(project);

    return {
      dependencyPaths,
      state,
      designSystem: undefined as unknown,
      theme: {
        colors: new Set(declaredColors.keys()),
        file: project.configPath ? path.relative(process.cwd(), project.configPath) : undefined,
        resolveColor: (name) => declaredColors.get(name) ?? allColors.get(name) ?? null,
        classifyClass: createV3ClassKind(state),
      } satisfies ThemeContext,
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
    theme: {
      colors: readDeclaredColorTokens(dependencyPaths),
      file: path.relative(process.cwd(), project.cssEntry),
      classifyClass: createClassKind(designSystem),
      resolveColor: createColorResolver(designSystem),
    } satisfies ThemeContext,
  };
}

/** Resolve a `--color-<name>` token through the design system, if it can. */
function createColorResolver(designSystem: unknown): (name: string) => string | null {
  const design = designSystem as { resolveThemeValue?: (key: string) => unknown } | undefined;
  if (!design || typeof design.resolveThemeValue !== "function") return () => null;

  const resolve = design.resolveThemeValue.bind(design);
  const cache = new Map<string, string | null>();

  return (name: string): string | null => {
    const cached = cache.get(name);
    if (cached !== undefined) return cached;

    let value: string | null = null;
    try {
      const resolved = resolve(`--color-${name}`);
      value = typeof resolved === "string" ? resolved : null;
    } catch {
      value = null;
    }
    cache.set(name, value);
    return value;
  };
}

export async function validateCandidate(
  state: ReturnType<typeof createState>,
  designSystem: unknown,
  candidate: CandidateInput,
  dependencyPaths?: Iterable<string>,
  theme?: ThemeContext,
): Promise<Diagnostic[]> {
  const document = TextDocument.create(
    pathToFileURL(candidate.file).href,
    detectLanguageId(candidate.file),
    1,
    candidate.text,
  );
  const diagnostics: Diagnostic[] = [];

  const ruleOptions: CustomRuleOptions = {
    tailwindVersion: state?.v4 === false ? 3 : 4,
    themeColors: theme?.colors,
    themeFile: theme?.file,
    resolveColor: theme?.resolveColor,
    classifyClass: theme?.classifyClass,
  };

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
        // `no-raw-colors` owns undeclared color tokens when a theme is readable.
        ownsColorToken: (token) => isUndeclaredColorToken(token, ruleOptions),
      }),
    );
  } catch {
    // The existence check requires a Tailwind design system or v3 JIT context.
  }

  diagnostics.push(...runCustomRules(candidate.text, candidate.file, ruleOptions));

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
