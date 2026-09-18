import { createRequire } from "node:module";
import path from "node:path";
import { pathToFileURL } from "node:url";

import { createState, getDefaultTailwindSettings } from "./tailwind-language-service-api.js";
import { DEFAULT_CLASS_FUNCTIONS } from "../constants.js";

const require = createRequire(import.meta.url);

export type TailwindV3Project = {
  rootDir: string;
  tailwindDir: string;
  configPath: string | null;
};

export async function createV3ValidationState(project: TailwindV3Project) {
  const { rootDir, tailwindDir, configPath } = project;
  const projectRequire = createRequire(path.join(rootDir, "__twlinter__.js"));
  const tailwindRequire = createRequire(path.join(tailwindDir, "index.js"));

  const tailwindPackagePath = projectRequire.resolve("tailwindcss/package.json");
  const version = projectRequire(tailwindPackagePath).version as string;

  const tailwind = projectRequire("tailwindcss");
  const postcss = require(resolveDependency(tailwindRequire, "postcss"));
  const postcssSelectorParser = require(
    resolveDependency(tailwindRequire, "postcss-selector-parser"),
  );

  const resolveConfig = projectRequire("tailwindcss/resolveConfig");
  const loadConfig = tryRequire(projectRequire, "tailwindcss/loadConfig");
  const transformThemeValue = loadDefaultExport(tailwindDir, "lib/util/transformThemeValue.js");

  const setupContextUtils = require(path.join(tailwindDir, "lib/lib/setupContextUtils.js"));
  const generateRules = require(path.join(tailwindDir, "lib/lib/generateRules.js"));
  const expandApplyAtRules = loadDefaultExport(tailwindDir, "lib/lib/expandApplyAtRules.js");
  const evaluateTailwindFunctions = loadDefaultExport(
    tailwindDir,
    "lib/lib/evaluateTailwindFunctions.js",
  );

  const originalConfig = await loadProjectConfig({ projectRequire, loadConfig, configPath });
  const resolvedConfig = resolveConfig(originalConfig);

  const settings = getDefaultTailwindSettings();
  settings.tailwindCSS.classFunctions = [
    ...(settings.tailwindCSS.classFunctions ?? []),
    ...DEFAULT_CLASS_FUNCTIONS,
  ];

  const state = createState({
    v4: false,
    version,
    separator: typeof resolvedConfig.separator === "string" ? resolvedConfig.separator : ":",
    configPath: configPath ?? undefined,
    config: resolvedConfig,
    jit: true,
    blocklist: Array.isArray(resolvedConfig.blocklist) ? resolvedConfig.blocklist : [],
    featureFlags: { future: [], experimental: [] },
    variants: [],
    modules: {
      tailwindcss: { version, module: tailwind },
      postcss: { version: null, module: postcss },
      postcssSelectorParser: { module: postcssSelectorParser },
      resolveConfig: { module: resolveConfig },
      loadConfig: { module: loadConfig },
      transformThemeValue: { module: transformThemeValue },
      jit: {
        generateRules: { module: generateRules.generateRules },
        createContext: {
          module: (partial: { config: unknown }) => setupContextUtils.createContext(partial.config),
        },
        expandApplyAtRules: { module: expandApplyAtRules },
        evaluateTailwindFunctions: { module: evaluateTailwindFunctions },
      },
    },
    editor: {
      folder: rootDir,
      getConfiguration: async () => settings,
      getDocumentSymbols: async () => [],
      readDirectory: async () => [],
    },
  });

  state.jitContext = state.modules.jit.createContext.module(state);
  state.jitContext.tailwindConfig.separator = state.separator;
  state.enabled = true;

  const dependencyPaths = new Set<string>();
  if (configPath) {
    dependencyPaths.add(configPath);
  }

  return { state, dependencyPaths };
}

async function loadProjectConfig(options: {
  projectRequire: NodeJS.Require;
  loadConfig: unknown;
  configPath: string | null;
}): Promise<Record<string, unknown>> {
  const { projectRequire, loadConfig, configPath } = options;

  if (!configPath) {
    return {};
  }

  if (typeof loadConfig === "function") {
    const loaded = await (loadConfig as (path: string) => unknown)(configPath);
    return unwrapDefault(loaded);
  }

  try {
    return unwrapDefault(projectRequire(configPath));
  } catch {
    return unwrapDefault(await import(pathToFileURL(configPath).href));
  }
}

function unwrapDefault(value: unknown): Record<string, unknown> {
  if (typeof value === "object" && value !== null && "default" in value) {
    const fallback = (value as { default: unknown }).default;
    if (typeof fallback === "object" && fallback !== null) {
      return fallback as Record<string, unknown>;
    }
  }

  return (value ?? {}) as Record<string, unknown>;
}

function resolveDependency(tailwindRequire: NodeJS.Require, request: string): string {
  try {
    return tailwindRequire.resolve(request);
  } catch {
    return require.resolve(request);
  }
}

function tryRequire(projectRequire: NodeJS.Require, request: string): unknown {
  try {
    return projectRequire(request);
  } catch {
    return null;
  }
}

function loadDefaultExport(directory: string, relativePath: string): unknown {
  const loaded = require(path.join(directory, relativePath));
  return loaded?.default ?? loaded;
}
