import path from "node:path";

import fg from "fast-glob";

import {
  DEFAULT_IGNORED_PATH_SEGMENTS,
  DEFAULT_IGNORE_PATTERNS,
  DEFAULT_PATTERNS,
} from "../constants.js";

export async function resolveProjectInputFiles(): Promise<string[]> {
  const files = await fg(DEFAULT_PATTERNS, {
    absolute: true,
    dot: false,
    onlyFiles: true,
    ignore: DEFAULT_IGNORE_PATTERNS,
  });

  return files.filter((file) => !hasIgnoredPathSegment(file));
}

const IGNORED_PATH_SEGMENTS = new Set(DEFAULT_IGNORED_PATH_SEGMENTS);

function hasIgnoredPathSegment(filePath: string): boolean {
  return filePath.split(path.sep).some((segment) => IGNORED_PATH_SEGMENTS.has(segment));
}
