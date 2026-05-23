import { stat } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import { DEFAULT_GLOB, DEFAULT_IGNORE_PATTERNS, DEFAULT_PATTERNS } from "../constants.js";

export async function resolveProjectInputFiles(
  patterns: string[],
  extraIgnore?: string[],
): Promise<string[]> {
  const normalized = await normalizePatterns(patterns);

  return fg(normalized, {
    absolute: true,
    dot: false,
    onlyFiles: true,
    ignore: [...DEFAULT_IGNORE_PATTERNS, ...(extraIgnore ?? [])],
  });
}

export function resolveProjectRoot(patterns: string[]): string {
  for (const p of patterns) {
    if (p === ".") return process.cwd();
    try {
      const resolved = path.resolve(p);
      const fileInfo = statSync(resolved);
      let dir: string;
      if (fileInfo.isDirectory()) {
        dir = resolved;
      } else {
        dir = path.dirname(resolved);
      }
      // walk up until we find a package.json
      let current = dir;
      while (current !== path.dirname(current)) {
        try {
          statSync(path.join(current, "package.json"));
          return current;
        } catch {
          current = path.dirname(current);
        }
      }
      return dir;
    } catch {
      // not a valid path, skip
    }
  }
  return process.cwd();
}

import { statSync } from "node:fs";

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
      const relativeDirectory = path.relative(process.cwd(), path.resolve(pattern));

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

function toGlobPath(filePath: string): string {
  return filePath.split(path.sep).join("/");
}
