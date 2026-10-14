import { readdir, stat } from "node:fs/promises";
import path from "node:path";

/**
 * Minimal glob/file discovery replacing `fast-glob`.
 *
 * Only the subset twlinter needs is supported:
 * - recursive double-star walks from a `cwd`,
 * - `*`, `?`, and `{a,b,c}` alternatives,
 * - exact file names (used for tailwind config lookup),
 * - ignore patterns for directory segments and file extensions,
 * - `dot: false` semantics (skip dotfiles/directories).
 *
 * Node 20 is the minimum supported version, so `node:fs` glob helpers
 * (stable only on newer Node) are intentionally avoided.
 */

export type FindFilesOptions = {
  cwd?: string;
  ignore?: string[];
  /** Skip dotfiles and dot-directories, matching `fast-glob` `dot: false`. */
  dot?: boolean;
};

const GLOB_MAGIC = /[*?{}[\]]/;

function toPosix(relativePath: string): string {
  return relativePath.split(path.sep).join("/");
}

function escapeRegExp(value: string): string {
  return value.replace(/[.+^${}()|[\]\\]/g, "\\$&");
}

/** Expand a single `{a,b}` group; only one level of nesting is needed. */
function expandBraces(pattern: string): string[] {
  const start = pattern.indexOf("{");
  const end = pattern.indexOf("}", start + 1);
  if (start === -1 || end === -1 || end < start) return [pattern];
  const head = pattern.slice(0, start);
  const tail = pattern.slice(end + 1);
  const options = pattern.slice(start + 1, end).split(",");
  return options.flatMap((option) => expandBraces(`${head}${option}${tail}`));
}

function segmentToRegExp(segment: string): string {
  let out = "";
  for (let i = 0; i < segment.length; i++) {
    const ch = segment[i];
    if (ch === "*") {
      out += "[^/]*";
    } else if (ch === "?") {
      out += "[^/]";
    } else if (ch === "[") {
      const close = segment.indexOf("]", i + 1);
      if (close === -1) {
        out += "\\[";
      } else {
        out += segment.slice(i, close + 1);
        i = close;
      }
    } else {
      out += escapeRegExp(ch);
    }
  }
  return out;
}

/**
 * Convert a glob pattern to a RegExp matched against a posix-style relative
 * path. Handles double-star (any depth, including zero) plus star, `?`,
 * and character classes.
 */
export function globToRegExp(pattern: string): RegExp {
  const normalized = pattern.replace(/\\/g, "/");
  const segments = normalized.split("/");
  let out = "^";
  for (let i = 0; i < segments.length; i++) {
    const segment = segments[i];
    if (segment === "**") {
      // A double-star segment matches zero or more directories; a trailing
      // one matches everything below.
      if (i === segments.length - 1) {
        out += "(?:.*)?";
      } else {
        out += "(?:.*/)?";
      }
      continue;
    }
    out += segmentToRegExp(segment);
    if (i < segments.length - 1) out += "/";
  }
  out += "$";
  return new RegExp(out);
}

function matchesAnyPattern(relativePosix: string, patterns: string[]): boolean {
  for (const pattern of patterns) {
    for (const expanded of expandBraces(pattern)) {
      if (globToRegExp(expanded).test(relativePosix)) return true;
      // A leading double-star also matches a top-level name, like fast-glob.
      if (expanded.startsWith("**/")) {
        const rest = expanded.slice(3);
        if (globToRegExp(rest).test(relativePosix)) return true;
      }
    }
  }
  return false;
}

function hasIgnoredSegment(
  absolutePath: string,
  cwd: string,
  ignoredSegments: Set<string>,
): boolean {
  const relative = path.relative(cwd, absolutePath);
  return relative.split(path.sep).some((segment) => ignoredSegments.has(segment));
}

function extractIgnoredSegments(ignore: string[]): Set<string> {
  const segments = new Set<string>();
  for (const pattern of ignore) {
    const normalized = pattern.replace(/\\/g, "/");
    const match = /^\*\*\/([^/*?{}[\]]+)\/\*\*$/.exec(normalized);
    if (match?.[1]) segments.add(match[1]);
  }
  return segments;
}

async function walk(
  dir: string,
  cwd: string,
  options: Required<Pick<FindFilesOptions, "dot">> & { ignore?: string[] },
  ignoredSegments: Set<string>,
  out: string[],
): Promise<void> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    const absolute = path.join(dir, entry.name);
    if (!options.dot && entry.name.startsWith(".")) continue;

    if (entry.isDirectory()) {
      if (ignoredSegments.has(entry.name)) continue;
      if (!options.dot && entry.name.startsWith(".")) continue;
      await walk(absolute, cwd, options, ignoredSegments, out);
    } else if (entry.isFile()) {
      if (ignoredSegments.has(entry.name)) continue;
      if (hasIgnoredSegment(absolute, cwd, ignoredSegments)) continue;
      const relativePosix = toPosix(path.relative(cwd, absolute));
      if (options.ignore && matchesAnyPattern(relativePosix, options.ignore)) continue;
      out.push(absolute);
    }
  }
}

/**
 * Find files under `cwd` matching `patterns` while respecting `ignore`.
 * Exact (non-magic) patterns resolve directly without a directory walk.
 */
export async function findFiles(
  patterns: string[],
  options: FindFilesOptions = {},
): Promise<string[]> {
  const cwd = path.resolve(options.cwd ?? process.cwd());
  const ignore = options.ignore ?? [];
  const dot = options.dot ?? false;
  const ignoredSegments = extractIgnoredSegments(ignore);

  const exact: string[] = [];
  const globs: string[] = [];
  for (const pattern of patterns) {
    if (GLOB_MAGIC.test(pattern)) {
      globs.push(pattern);
    } else {
      exact.push(pattern);
    }
  }

  const found = new Set<string>();

  for (const pattern of exact) {
    const absolute = path.isAbsolute(pattern) ? pattern : path.join(cwd, pattern);
    let isFile = false;
    try {
      isFile = (await stat(absolute)).isFile();
    } catch {
      continue;
    }
    if (!isFile) continue;
    if (hasIgnoredSegment(absolute, cwd, ignoredSegments)) continue;
    if (
      !dot &&
      toPosix(path.relative(cwd, absolute))
        .split("/")
        .some((s) => s.startsWith("."))
    ) {
      continue;
    }
    const relativePosix = toPosix(path.relative(cwd, absolute));
    if (matchesAnyPattern(relativePosix, ignore)) continue;
    found.add(absolute);
  }

  if (globs.length > 0) {
    const all: string[] = [];
    await walk(cwd, cwd, { dot, ignore }, ignoredSegments, all);
    for (const absolute of all) {
      const relativePosix = toPosix(path.relative(cwd, absolute));
      if (matchesAnyPattern(relativePosix, globs)) found.add(absolute);
    }
  }

  return [...found].sort();
}
