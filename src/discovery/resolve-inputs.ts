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
