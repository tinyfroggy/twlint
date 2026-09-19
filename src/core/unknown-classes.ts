import { readFileSync } from "node:fs";
import path from "node:path";
import { TextDocument } from "vscode-languageserver-textdocument";

import {
  extractClassLists,
  extractHelperClassLists,
  parseClassName,
} from "../custom-rules/utils.js";

import type { Diagnostic } from "../types.js";

/**
 * `group`, `peer`, and their named forms are markers: they generate no CSS but
 * are required by `group-*` / `peer-*` variants, so they are never unknown.
 */
const MARKER_CLASS_RE = /^(?:group|peer)(?:\/[\w-]+)?$/;

type CssJudge = (classes: string[]) => (string | null)[];

const knownClassesCache = new WeakMap<object, Set<string>>();
const cssClassesCache = new WeakMap<object, Set<string>>();

export type UnknownClassOptions = {
  /** CSS files the project's Tailwind theme imports. */
  dependencyPaths?: Iterable<string>;
  /**
   * Tokens another rule owns, so this rule stays quiet. `no-raw-colors`
   * reports undeclared color tokens with color-specific guidance.
   */
  ownsColorToken?: (token: string) => boolean;
};

/**
 * Flag class names the project's Tailwind cannot generate, so they silently
 * produce no CSS. Uses the already-loaded design system when available (v4)
 * and the v3 JIT context otherwise.
 */
export function getUnknownClassDiagnostics(
  state: unknown,
  designSystem: unknown,
  document: TextDocument,
  filePath: string,
  options: UnknownClassOptions = {},
): Diagnostic[] {
  const judge = createJudge(state, designSystem);
  if (!judge) return [];

  const text = document.getText();
  const diagnostics: Diagnostic[] = [];
  const cssClasses = getCssDefinedClasses(options.dependencyPaths);
  // Classes directly on elements plus classes passed through `cn(...)`-style helpers.
  const classLists = [...extractClassLists(text), ...extractHelperClassLists(text)];

  for (const { offset, classes } of classLists) {
    const candidates = classes.filter((className) => !MARKER_CLASS_RE.test(className));
    if (candidates.length === 0) continue;

    const results = judge(candidates);
    const unknown = candidates.filter(
      (token, index) =>
        results[index] === null &&
        !isDefinedInCss(token, cssClasses) &&
        !options.ownsColorToken?.(token),
    );
    if (unknown.length === 0) continue;

    const known = getKnownClasses(state, designSystem);
    const position = document.positionAt(offset);

    for (const token of unknown) {
      const suggestion = known ? nearestClass(token, known) : null;
      const parsed = parseClassName(token);
      const isUnknownVariant =
        suggestion === null &&
        parsed.variant !== "" &&
        isKnownCandidate(judge, parsed.base, parsed.negative);

      diagnostics.push({
        file: path.relative(process.cwd(), filePath),
        line: position.line + 1,
        column: position.character + 1,
        severity: "warning",
        rule: "no-unknown-classes",
        message:
          suggestion !== null
            ? `\`${token}\` is not a class Tailwind can generate. Did you mean \`${suggestion}\`?`
            : isUnknownVariant
              ? `\`${token}\` uses a variant Tailwind does not know, so no CSS is generated.`
              : `\`${token}\` is not a class Tailwind can generate, so no CSS is generated.`,
        source: "tw",
      });
    }
  }

  return diagnostics;
}

/**
 * A function that maps candidates to generated CSS, or `null` when Tailwind
 * cannot generate anything for them. Prefers the v4 design system and falls
 * back to the v3 JIT context.
 */
function createJudge(state: unknown, designSystem: unknown): CssJudge | null {
  const design = designSystem as { candidatesToCss?: unknown } | undefined;
  if (design && typeof design.candidatesToCss === "function") {
    const candidatesToCss = design.candidatesToCss as (classes: string[]) => (string | null)[];
    return (classes) => {
      try {
        return candidatesToCss.call(design, classes);
      } catch {
        return classes.map((className) => singleVerdict(candidatesToCss, design, className));
      }
    };
  }

  const jit = (state as { jitContext?: { getClassOrder?: unknown } } | undefined)?.jitContext;
  if (jit && typeof jit.getClassOrder === "function") {
    const getClassOrder = jit.getClassOrder as (
      classes: string[],
    ) => [string, bigint | null | undefined][];
    return (classes) => {
      try {
        return getClassOrder
          .call(jit, classes)
          .map(([, order]) => (order === null || order === undefined ? null : ""));
      } catch {
        return classes.map(() => "");
      }
    };
  }

  return null;
}

function singleVerdict(
  candidatesToCss: (classes: string[]) => (string | null)[],
  design: object,
  className: string,
): string | null {
  try {
    return candidatesToCss.call(design, [className])[0] ?? null;
  } catch {
    // A class that throws is reported as known to avoid false positives.
    return "";
  }
}

function isKnownCandidate(judge: CssJudge, base: string, negative: boolean): boolean {
  const candidate = negative ? `-${base}` : base;
  try {
    return judge([candidate])[0] !== null;
  } catch {
    return false;
  }
}

function getKnownClasses(state: unknown, designSystem: unknown): Set<string> | null {
  const design = designSystem as { getClassList?: () => unknown } | undefined;
  const source: object | undefined =
    design && typeof design.getClassList === "function"
      ? design
      : (state as { jitContext?: object } | undefined)?.jitContext;

  if (!source) return null;

  const cached = knownClassesCache.get(source);
  if (cached) return cached;

  const getClassList = (source as { getClassList?: () => unknown }).getClassList;
  if (typeof getClassList !== "function") return null;

  let names: Set<string>;
  try {
    names = new Set(extractNames(getClassList.call(source)));
  } catch {
    return null;
  }

  knownClassesCache.set(source, names);
  return names;
}

function extractNames(list: unknown): string[] {
  if (!Array.isArray(list)) return [];

  const names: string[] = [];
  for (const entry of list) {
    if (typeof entry === "string") {
      names.push(entry);
    } else if (Array.isArray(entry) && typeof entry[0] === "string") {
      names.push(entry[0]);
    }
  }
  return names;
}

/**
 * Plain class selectors (`.legacy-card`) in the theme's CSS import graph are
 * valid classes even though Tailwind does not generate them. Collect them so
 * they are not reported as unknown.
 */
function getCssDefinedClasses(dependencyPaths?: Iterable<string>): Set<string> | null {
  if (!dependencyPaths || typeof dependencyPaths !== "object") return null;

  const cached = cssClassesCache.get(dependencyPaths);
  if (cached) return cached;

  const classes = new Set<string>();
  for (const filePath of dependencyPaths) {
    if (path.extname(filePath) !== ".css") continue;

    let css: string;
    try {
      css = readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    const withoutComments = css.replace(/\/\*[\s\S]*?\*\//g, "").replace(/url\([^)]*\)/g, "");
    for (const match of withoutComments.matchAll(/\.(-?[_a-zA-Z][\w-]*)/g)) {
      classes.add(match[1]);
    }
  }

  cssClassesCache.set(dependencyPaths, classes);
  return classes;
}

function isDefinedInCss(token: string, cssClasses: Set<string> | null): boolean {
  if (!cssClasses || cssClasses.size === 0) return false;
  if (cssClasses.has(token)) return true;

  const parsed = parseClassName(token);
  const prefix = parsed.variant !== "" ? `${parsed.variant}:` : "";
  return cssClasses.has(token.slice(prefix.length));
}

/**
 * Nearest known class name for a typo, with the token's variant prefix
 * preserved. Returns `null` when nothing is close enough.
 */
function nearestClass(token: string, known: Set<string>): string | null {
  const parsed = parseClassName(token);
  const prefix = parsed.variant !== "" ? `${parsed.variant}:` : "";
  const leaf = token.slice(prefix.length);
  if (known.has(leaf)) return null;

  const maxDistance = Math.max(1, Math.min(3, Math.floor(leaf.length / 3) + 1));
  const first = leaf[0];

  let best: string | null = null;
  let bestDistance = maxDistance + 1;

  for (const candidate of known) {
    if (candidate.length === 0 || candidate[0] !== first) continue;
    if (Math.abs(candidate.length - leaf.length) >= bestDistance) continue;

    const distance = boundedEditDistance(leaf, candidate, bestDistance - 1);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  if (best === null || bestDistance > maxDistance) return null;
  return `${prefix}${best}`;
}

/** Levenshtein distance, abandoned once the best possible row exceeds `max`. */
function boundedEditDistance(a: string, b: string, max: number): number {
  if (max < 0) return max + 1;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  let current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    let rowMinimum = current[0];

    for (let j = 1; j <= b.length; j++) {
      const substitution = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + substitution);
      if (current[j] < rowMinimum) rowMinimum = current[j];
    }

    if (rowMinimum > max) return max + 1;
    [previous, current] = [current, previous];
  }

  return previous[b.length];
}
