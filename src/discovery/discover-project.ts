import { readFile } from "node:fs/promises";
import path from "node:path";

import type { ProjectInfo } from "../types.js";
import { detectMonorepo } from "./detect-monorepo.js";

const SOURCE_EXTENSIONS = [
  ".html",
  ".js",
  ".jsx",
  ".ts",
  ".tsx",
  ".mjs",
  ".cjs",
  ".astro",
  ".vue",
  ".svelte",
  ".mdx",
  ".css",
];

async function readPackageJson(directory: string): Promise<Record<string, unknown> | null> {
  try {
    const content = await readFile(path.join(directory, "package.json"), "utf8");
    const parsed = JSON.parse(content);
    if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
      return parsed as Record<string, unknown>;
    }
    return null;
  } catch {
    return null;
  }
}

function extractTailwindVersion(packageJson: Record<string, unknown>): string | null {
  const deps = packageJson.dependencies as Record<string, string> | undefined;
  const devDeps = packageJson.devDependencies as Record<string, string> | undefined;
  const version = deps?.tailwindcss ?? devDeps?.tailwindcss;

  if (!version) return null;

  const cleaned = version.replace(/^[\^~>=<]*/, "");
  return cleaned.length > 0 ? cleaned : null;
}

function isTailwindV4(version: string): boolean {
  return version.startsWith("4");
}

export async function discoverProject(cssEntryPath: string | null): Promise<ProjectInfo> {
  const rootDirectory = process.cwd();
  const packageJson = await readPackageJson(rootDirectory);
  let tailwindVersion: string | null = null;
  let supported = false;

  if (packageJson) {
    const version = extractTailwindVersion(packageJson);
    if (version) {
      tailwindVersion = version;
      supported = isTailwindV4(version);
    }
  }

  if (cssEntryPath === null) {
    supported = false;
  }

  const monorepo = await detectMonorepo(rootDirectory);

  return {
    rootDirectory,
    cssEntryPath,
    tailwindVersion,
    supported,
    sourceExtensions: SOURCE_EXTENSIONS,
    isMonorepo: monorepo.isMonorepo,
    monorepoTool: monorepo.tool,
    workspacePackages: monorepo.workspacePackages,
  };
}

export function resolveProjectRelativePath(filePath: string): string {
  return path.relative(process.cwd(), filePath);
}
