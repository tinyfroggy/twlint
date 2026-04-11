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
      return resolvePackageImport(resolver, id, base);
  }
}

function resolveFromProjectOrFallback(resolver: NodeJS.Require, request: string): string {
  try {
    return resolver.resolve(request);
  } catch {
    return require.resolve(request);
  }
}

function resolvePackageImport(resolver: NodeJS.Require, request: string, base: string): string {
  try {
    return resolveFromProjectOrFallback(resolver, request);
  } catch {
    const { packageName, subpath } = splitPackageRequest(request);
    const packageDirectory = findPackageDirectory(base, packageName);
    const manifest = readPackageManifest(path.join(packageDirectory, "package.json"));
    const manifestTarget = resolveManifestTarget(manifest, subpath);

    if (manifestTarget !== null) {
      return path.join(packageDirectory, manifestTarget);
    }

    if (subpath !== null) {
      return path.join(packageDirectory, subpath);
    }

    throw new Error(`Could not resolve stylesheet package import \`${request}\`.`);
  }
}

function splitPackageRequest(request: string): { packageName: string; subpath: string | null } {
  if (request.startsWith("@")) {
    const parts = request.split("/");
    return {
      packageName: parts.slice(0, 2).join("/"),
      subpath: parts.length > 2 ? parts.slice(2).join("/") : null,
    };
  }

  const [packageName, ...rest] = request.split("/");
  return {
    packageName,
    subpath: rest.length > 0 ? rest.join("/") : null,
  };
}

function findPackageDirectory(base: string, packageName: string): string {
  let current = base;

  while (true) {
    const candidate = path.join(current, "node_modules", packageName);

    try {
      require.resolve(path.join(candidate, "package.json"));
      return candidate;
    } catch {}

    const parent = path.dirname(current);
    if (parent === current) {
      break;
    }

    current = parent;
  }

  throw new Error(`Could not find package \`${packageName}\` from \`${base}\`.`);
}

function readPackageManifest(filePath: string): Record<string, unknown> {
  const manifest = require(filePath);

  if (typeof manifest === "object" && manifest !== null && !Array.isArray(manifest)) {
    return manifest as Record<string, unknown>;
  }

  throw new Error(`Invalid package manifest at \`${filePath}\`.`);
}

function resolveManifestTarget(
  manifest: Record<string, unknown>,
  subpath: string | null,
): string | null {
  const exportsField = manifest.exports;
  const key = subpath === null ? "." : `./${subpath}`;

  if (typeof exportsField === "object" && exportsField !== null && !Array.isArray(exportsField)) {
    const target = readStyleTarget((exportsField as Record<string, unknown>)[key]);
    if (target !== null) {
      return target;
    }
  }

  if (subpath === null) {
    const style = manifest.style;
    if (typeof style === "string") {
      return style;
    }

    const main = manifest.main;
    if (typeof main === "string" && main.endsWith(".css")) {
      return main;
    }
  }

  return null;
}

function readStyleTarget(value: unknown): string | null {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  const style = (value as Record<string, unknown>).style;
  return typeof style === "string" ? style : null;
}
