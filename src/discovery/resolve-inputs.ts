import path from "node:path";

import fg from "fast-glob";

import {
  DEFAULT_IGNORED_PATH_SEGMENTS,
  DEFAULT_IGNORE_PATTERNS,
  DEFAULT_PATTERNS,
} from "../constants.js";

export async function resolveProjectInputFiles(
  files?: string[],
  ignore?: string[],
): Promise<string[]> {
  const patterns = files && files.length > 0 ? files : DEFAULT_PATTERNS;
  const ignorePatterns = [...DEFAULT_IGNORE_PATTERNS, ...(ignore ?? [])];

  const matched = await fg(patterns, {
    absolute: true,
    dot: false,
    onlyFiles: true,
    ignore: ignorePatterns,
  });

  return matched.filter((file) => !hasIgnoredPathSegment(file));
}

const IGNORED_PATH_SEGMENTS = new Set(DEFAULT_IGNORED_PATH_SEGMENTS);

function hasIgnoredPathSegment(filePath: string): boolean {
  return filePath.split(path.sep).some((segment) => IGNORED_PATH_SEGMENTS.has(segment));
}
