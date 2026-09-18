import { createRequire } from "node:module";
import path from "node:path";

import fg from "fast-glob";

import { resolveCssEntry } from "./resolve-css-entry.js";

const CONFIG_FILE_NAMES = [
  "tailwind.config.ts",
  "tailwind.config.mts",
  "tailwind.config.cts",
  "tailwind.config.js",
  "tailwind.config.mjs",
  "tailwind.config.cjs",
];

export type TailwindProject =
  | { version: 4; rootDir: string; cssEntry: string }
  | { version: 3; rootDir: string; tailwindDir: string; configPath: string | null };

export type InstalledTailwind = {
  version: string;
  major: number;
  directory: string;
};

export async function resolveTailwindProject(rootDir: string): Promise<TailwindProject> {
  const installed = resolveInstalledTailwind(rootDir);

  if (installed) {
    if (installed.major >= 4) {
      return { version: 4, rootDir, cssEntry: await resolveCssEntry(rootDir) };
    }

    if (installed.major === 3) {
      return {
        version: 3,
        rootDir,
        tailwindDir: installed.directory,
        configPath: await resolveTailwindConfig(rootDir),
      };
    }

    throw new Error(
      `Unsupported Tailwind CSS version: ${installed.version}. twlinter supports Tailwind CSS v3 and v4.`,
    );
  }

  try {
    return { version: 4, rootDir, cssEntry: await resolveCssEntry(rootDir) };
  } catch (error) {
    if (await resolveTailwindConfig(rootDir)) {
      throw new Error(
        "Found a Tailwind CSS config but `tailwindcss` is not installed. Install Tailwind CSS v3 to lint this project.",
      );
    }

    throw error;
  }
}

export function resolveInstalledTailwind(rootDir: string): InstalledTailwind | null {
  const projectRequire = createRequire(path.join(rootDir, "__twlinter__.js"));

  try {
    const packagePath = projectRequire.resolve("tailwindcss/package.json");
    const { version } = projectRequire(packagePath) as { version?: string };

    if (typeof version !== "string") {
      return null;
    }

    const major = Number.parseInt(version.split(".")[0] ?? "", 10);
    if (!Number.isInteger(major)) {
      return null;
    }

    return { version, major, directory: path.dirname(packagePath) };
  } catch {
    return null;
  }
}

export async function resolveTailwindConfig(rootDir: string): Promise<string | null> {
  const candidates = await fg(CONFIG_FILE_NAMES, {
    absolute: true,
    dot: false,
    onlyFiles: true,
    cwd: rootDir,
  });

  if (candidates.length === 0) {
    return null;
  }

  for (const name of CONFIG_FILE_NAMES) {
    const preferred = candidates.find((candidate) => path.basename(candidate) === name);
    if (preferred) {
      return preferred;
    }
  }

  return candidates[0];
}
