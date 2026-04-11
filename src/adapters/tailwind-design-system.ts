import { readFile } from "node:fs/promises";
import { createRequire } from "node:module";
import path from "node:path";

import { __unstable__loadDesignSystem } from "tailwindcss";

const require = createRequire(import.meta.url);

export type LoadedDesignSystem = {
  dependencyPaths: Set<string>;
  designSystem: unknown;
};

export async function loadDesignSystem(cssEntry: string): Promise<LoadedDesignSystem> {
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

      const stylesheetPath = resolvePackageStylesheet(id, base);
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

async function readStylesheet(stylesheetPath: string, cache: Map<string, string>): Promise<string> {
  const cached = cache.get(stylesheetPath);

  if (cached !== undefined) {
    return cached;
  }

  const content = await readFile(stylesheetPath, "utf8");
  cache.set(stylesheetPath, content);
  return content;
}

function resolvePackageStylesheet(id: string, base: string): string {
  const resolver = createRequire(path.join(base, "__twlinter__.js"));

  switch (id) {
    case "tailwindcss":
      return resolveFromProjectOrFallback(resolver, "tailwindcss/index.css");
    case "tailwindcss/theme":
      return resolveFromProjectOrFallback(resolver, "tailwindcss/theme.css");
    case "tailwindcss/preflight":
      return resolveFromProjectOrFallback(resolver, "tailwindcss/preflight.css");
    case "tailwindcss/utilities":
      return resolveFromProjectOrFallback(resolver, "tailwindcss/utilities.css");
    default:
      return resolveFromProjectOrFallback(resolver, id);
  }
}

function resolveFromProjectOrFallback(resolver: NodeJS.Require, request: string): string {
  try {
    return resolver.resolve(request);
  } catch {
    return require.resolve(request);
  }
}
