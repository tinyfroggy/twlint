import { readFile, stat, writeFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

import {
  DiagnosticKind,
  createState,
  doValidate,
  getDefaultTailwindSettings,
} from "@tailwindcss/language-service";
import fg from "fast-glob";
import { __unstable__loadDesignSystem } from "tailwindcss";
import { TextDocument } from "vscode-languageserver-textdocument";

import type { Diagnostic } from "./formatter.js";

const DEFAULT_GLOB =
  "**/*.{html,js,jsx,ts,tsx,mjs,cjs,astro,vue,svelte,mdx,css}";
const DEFAULT_PATTERNS = [DEFAULT_GLOB];
const DEFAULT_CSS_ENTRY_PATTERNS = ["**/*.css"];
const CACHE_PATH = path.join(process.cwd(), ".tw-lint-cache.json");
const CACHE_VERSION = 1;
const require = createRequire(import.meta.url);

type ScanOptions = {
  cssEntry?: string;
  useCache?: boolean;
};

type ScanResult = {
  matchedFiles: number;
  diagnostics: Diagnostic[];
};

type TailwindDiagnostic = {
  message: string;
  range: {
    start: {
      line: number;
      character: number;
    };
  };
  severity?: number;
  code?: string;
};

type FileStamp = {
  mtimeMs: number;
  size: number;
};

type CacheEntry = {
  stamp: FileStamp;
  relevant: boolean;
  diagnostics: Diagnostic[];
};

type CacheData = {
  version: number;
  cssEntry: string;
  dependencies: Record<string, FileStamp>;
  files: Record<string, CacheEntry>;
};

type CandidateInput = {
  file: string;
  text: string;
  stamp: FileStamp;
};

export async function scan(
  patterns: string[],
  options: ScanOptions = {},
): Promise<ScanResult> {
  const normalizedPatterns = await normalizePatterns(patterns);
  const entries = await fg(normalizedPatterns, {
    absolute: true,
    dot: false,
    onlyFiles: true,
    ignore: ["**/node_modules/**", "**/dist/**"],
  });

  if (entries.length === 0) {
    return {
      matchedFiles: 0,
      diagnostics: [],
    };
  }

  const cssEntry = await resolveCssEntry(options.cssEntry);
  const persistedCache = options.useCache === false ? null : await loadCache();
  const cacheIsFresh = await isCacheFresh(persistedCache, cssEntry);
  const fileStamps = new Map(
    await Promise.all(
      entries.map(async (file) => [file, await getFileStamp(file)] as const),
    ),
  );
  const nextCache: CacheData = {
    version: CACHE_VERSION,
    cssEntry,
    dependencies:
      cacheIsFresh && persistedCache ? persistedCache.dependencies : {},
    files: {},
  };
  const diagnostics: Diagnostic[] = [];
  const filesToRead: string[] = [];

  for (const file of entries) {
    const stamp = fileStamps.get(file)!;
    const cached = persistedCache?.files[file];

    if (file === cssEntry) {
      nextCache.files[file] = {
        stamp,
        relevant: false,
        diagnostics: [],
      };
      continue;
    }

    if (cached && sameStamp(cached.stamp, stamp)) {
      if (cacheIsFresh) {
        nextCache.files[file] = cached;
        diagnostics.push(...cached.diagnostics);
        continue;
      }

      if (!cached.relevant) {
        nextCache.files[file] = cached;
        continue;
      }
    }

    filesToRead.push(file);
  }

  const candidates = await collectCandidateInputs(
    filesToRead,
    fileStamps,
    nextCache,
  );

  if (candidates.length > 0) {
    const { dependencyStamps, state } = await createValidationState(cssEntry);
    nextCache.dependencies = dependencyStamps;

    const validated = await Promise.all(
      candidates.map((candidate) => validateFile(state, candidate)),
    );

    for (const result of validated) {
      nextCache.files[result.file] = {
        stamp: result.stamp,
        relevant: true,
        diagnostics: result.diagnostics,
      };
      diagnostics.push(...result.diagnostics);
    }
  }

  if (options.useCache !== false) {
    await saveCache(nextCache);
  }

  diagnostics.sort((a, b) => {
    return (
      a.file.localeCompare(b.file) || a.line - b.line || a.column - b.column
    );
  });

  return {
    matchedFiles: entries.length,
    diagnostics,
  };
}

async function normalizePatterns(patterns: string[]): Promise<string[]> {
  if (patterns.length === 0) {
    return DEFAULT_PATTERNS;
  }

  const normalized = await Promise.all(patterns.map(normalizePattern));
  return normalized.flat();
}

async function normalizePattern(pattern: string): Promise<string[]> {
  if (pattern === ".") {
    return DEFAULT_PATTERNS;
  }

  try {
    const fileInfo = await stat(path.resolve(pattern));

    if (fileInfo.isDirectory()) {
      const relativeDirectory = path.relative(
        process.cwd(),
        path.resolve(pattern),
      );

      if (relativeDirectory === "") {
        return DEFAULT_PATTERNS;
      }

      return [`${toGlobPath(relativeDirectory)}/${DEFAULT_GLOB}`];
    }
  } catch {
    return [pattern];
  }

  return [pattern];
}

async function collectCandidateInputs(
  files: string[],
  fileStamps: Map<string, FileStamp>,
  nextCache: CacheData,
): Promise<CandidateInput[]> {
  const candidates = await Promise.all(
    files.map(async (file) => {
      const text = await readFile(file, "utf8");
      const relevant = mightContainTailwindClasses(file, text);
      const stamp = fileStamps.get(file)!;

      if (!relevant) {
        nextCache.files[file] = {
          stamp,
          relevant: false,
          diagnostics: [],
        };

        return null;
      }

      return { file, text, stamp };
    }),
  );

  return candidates.filter(
    (candidate): candidate is CandidateInput => candidate !== null,
  );
}

async function createValidationState(cssEntry: string) {
  const { dependencyPaths, designSystem } = await loadDesignSystem(cssEntry);
  const settings = getDefaultTailwindSettings();
  const state = createState({
    v4: true,
    version: "4.2.2",
    separator: ":",
    designSystem: designSystem as never,
    editor: {
      folder: process.cwd(),
      getConfiguration: async () => settings,
      getDocumentSymbols: async () => [],
      readDirectory: async () => [],
    },
  });
  const dependencyStamps = await getDependencyStamps(dependencyPaths);

  return {
    dependencyStamps,
    state,
  };
}

async function validateFile(
  state: ReturnType<typeof createState>,
  candidate: CandidateInput,
): Promise<{ file: string; stamp: FileStamp; diagnostics: Diagnostic[] }> {
  const document = TextDocument.create(
    pathToFileURL(candidate.file).href,
    detectLanguageId(candidate.file),
    1,
    candidate.text,
  );
  const diagnostics = (await doValidate(state, document, [
    DiagnosticKind.SuggestCanonicalClasses,
  ])) as TailwindDiagnostic[];

  return {
    file: candidate.file,
    stamp: candidate.stamp,
    diagnostics: diagnostics.map((diagnostic) => ({
      file: path.relative(process.cwd(), candidate.file),
      line: diagnostic.range.start.line + 1,
      column: diagnostic.range.start.character + 1,
      severity: diagnostic.severity === 1 ? "error" : "warning",
      rule:
        typeof diagnostic.code === "string"
          ? diagnostic.code
          : "suggestCanonicalClasses",
      message: diagnostic.message,
    })),
  };
}

async function resolveCssEntry(cssEntry?: string): Promise<string> {
  if (cssEntry) {
    return path.resolve(cssEntry);
  }

  const candidates = await fg(DEFAULT_CSS_ENTRY_PATTERNS, {
    absolute: true,
    dot: false,
    onlyFiles: true,
    ignore: ["**/node_modules/**", "**/dist/**"],
  });

  for (const candidate of candidates) {
    const text = await readFile(candidate, "utf8");

    if (
      text.includes('@import "tailwindcss"') ||
      text.includes("@import 'tailwindcss'")
    ) {
      return candidate;
    }
  }

  throw new Error(
    "Could not find a Tailwind v4 CSS entry file. Pass one with --css-entry ./src/app.css.",
  );
}

async function loadDesignSystem(cssEntry: string) {
  const entryCss = await readFile(cssEntry, "utf8");
  const stylesheetCache = new Map<string, string>();
  const dependencyPaths = new Set<string>([cssEntry]);

  const designSystem = await __unstable__loadDesignSystem(entryCss, {
    base: path.dirname(cssEntry),
    from: cssEntry,
    loadStylesheet: async (id, base) => {
      if (id.startsWith(".") || id.startsWith("/")) {
        const stylesheetPath = path.resolve(base, id);
        dependencyPaths.add(stylesheetPath);

        return {
          path: stylesheetPath,
          base: path.dirname(stylesheetPath),
          content: await readStylesheet(stylesheetPath, stylesheetCache),
        };
      }

      const stylesheetPath = resolvePackageStylesheet(id);
      dependencyPaths.add(stylesheetPath);

      return {
        path: stylesheetPath,
        base: path.dirname(stylesheetPath),
        content: await readStylesheet(stylesheetPath, stylesheetCache),
      };
    },
  });

  return {
    dependencyPaths,
    designSystem,
  };
}

async function loadCache(): Promise<CacheData | null> {
  try {
    const text = await readFile(CACHE_PATH, "utf8");
    return JSON.parse(text) as CacheData;
  } catch {
    return null;
  }
}

async function saveCache(cache: CacheData): Promise<void> {
  await writeFile(CACHE_PATH, `${JSON.stringify(cache, null, 2)}\n`, "utf8");
}

async function isCacheFresh(
  cache: CacheData | null,
  cssEntry: string,
): Promise<boolean> {
  if (!cache) return false;
  if (cache.version !== CACHE_VERSION) return false;
  if (cache.cssEntry !== cssEntry) return false;

  for (const [dependency, stamp] of Object.entries(cache.dependencies)) {
    try {
      if (!sameStamp(stamp, await getFileStamp(dependency))) {
        return false;
      }
    } catch {
      return false;
    }
  }

  return true;
}

async function getDependencyStamps(
  dependencies: Set<string>,
): Promise<Record<string, FileStamp>> {
  const entries = await Promise.all(
    [...dependencies].map(
      async (dependency) =>
        [dependency, await getFileStamp(dependency)] as const,
    ),
  );

  return Object.fromEntries(entries);
}

async function getFileStamp(file: string): Promise<FileStamp> {
  const info = await stat(file);

  return {
    mtimeMs: info.mtimeMs,
    size: info.size,
  };
}

function sameStamp(a: FileStamp, b: FileStamp): boolean {
  return a.mtimeMs === b.mtimeMs && a.size === b.size;
}

async function readStylesheet(
  stylesheetPath: string,
  cache: Map<string, string>,
): Promise<string> {
  const cached = cache.get(stylesheetPath);

  if (cached !== undefined) {
    return cached;
  }

  const content = await readFile(stylesheetPath, "utf8");
  cache.set(stylesheetPath, content);
  return content;
}

function mightContainTailwindClasses(file: string, text: string): boolean {
  switch (path.extname(file)) {
    case ".css":
      return text.includes("@apply");
    case ".html":
    case ".astro":
    case ".vue":
    case ".svelte":
    case ".mdx":
      return (
        text.includes("class=") ||
        text.includes("class:") ||
        text.includes("className")
      );
    case ".js":
    case ".jsx":
    case ".ts":
    case ".tsx":
    case ".mjs":
    case ".cjs":
      return (
        text.includes("className") ||
        text.includes("class=") ||
        text.includes("clsx(") ||
        text.includes("cva(") ||
        text.includes("tw`") ||
        text.includes("tw.")
      );
    default:
      return false;
  }
}

function resolvePackageStylesheet(id: string): string {
  switch (id) {
    case "tailwindcss":
      return require.resolve("tailwindcss/index.css");
    case "tailwindcss/theme":
      return require.resolve("tailwindcss/theme.css");
    case "tailwindcss/preflight":
      return require.resolve("tailwindcss/preflight.css");
    case "tailwindcss/utilities":
      return require.resolve("tailwindcss/utilities.css");
    default:
      return require.resolve(id);
  }
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

function toGlobPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}
