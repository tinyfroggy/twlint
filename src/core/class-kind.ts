const COLOR_CSS_RE =
  /(?:^|[;{\s])(?:color|background-color|border(?:-[a-z]+)?-color|outline-color|fill|stroke|text-decoration-color|caret-color|accent-color|--tw-ring-color|--tw-ring-offset-color|--tw-shadow-color|--tw-text-shadow-color|--tw-inset-shadow-color|--tw-inset-ring-color|--tw-gradient[a-z-]*)\s*:/;

export type ClassKind = "color" | "other" | "unknown-color";

/** Whether generated CSS sets a color property. */
export function isColorCss(css: string | null | undefined): boolean {
  return typeof css === "string" && COLOR_CSS_RE.test(css);
}

function namesFromClassList(list: unknown): Set<string> {
  const names = new Set<string>();
  if (!Array.isArray(list)) return names;
  for (const entry of list) {
    if (typeof entry === "string") names.add(entry);
    else if (Array.isArray(entry) && typeof entry[0] === "string") names.add(entry[0]);
  }
  return names;
}

/**
 * Build a class classifier from a function that returns a class's generated
 * CSS (`null` when Tailwind cannot generate it) and a lazy source of known
 * class names, used to tell a color typo from a typo of another utility.
 */
function buildClassKind(
  cssOfRaw: (className: string) => string | null,
  knownClasses: () => Set<string> | null,
): (className: string) => ClassKind {
  const cssCache = new Map<string, string | null>();
  const cssOf = (className: string): string | null => {
    const cached = cssCache.get(className);
    if (cached !== undefined) return cached;
    let css: string | null;
    try {
      css = cssOfRaw(className);
    } catch {
      css = null;
    }
    cssCache.set(className, css);
    return css;
  };

  let known: Set<string> | null | undefined;
  const getKnown = (): Set<string> | null => {
    if (known !== undefined) return known;
    try {
      known = knownClasses();
    } catch {
      known = null;
    }
    return known;
  };

  const nearest = (className: string): string | null => {
    const set = getKnown();
    if (!set) return null;

    const maxDistance = Math.max(1, Math.min(3, Math.floor(className.length / 3) + 1));
    const first = className[0];
    let best: string | null = null;
    let bestDistance = maxDistance + 1;

    for (const candidate of set) {
      if (candidate.length === 0 || candidate[0] !== first) continue;
      if (Math.abs(candidate.length - className.length) >= bestDistance) continue;

      const distance = boundedEditDistance(className, candidate, bestDistance - 1);
      if (distance < bestDistance) {
        best = candidate;
        bestDistance = distance;
      }
    }

    return best !== null && bestDistance <= maxDistance ? best : null;
  };

  return (className: string): ClassKind => {
    const css = cssOf(className);
    if (css) return isColorCss(css) ? "color" : "other";

    const near = nearest(className);
    if (near) {
      const nearCss = cssOf(near);
      if (nearCss && !isColorCss(nearCss)) return "other";
    }

    return "unknown-color";
  };
}

/**
 * Tailwind v4 classifier. Returns `undefined` when no design system is
 * available, so callers can skip checks that need classification.
 */
export function createClassKind(
  designSystem: unknown,
): ((className: string) => ClassKind) | undefined {
  const design = designSystem as
    | {
        candidatesToCss?: (classes: string[]) => (string | null)[];
        getClassList?: () => unknown;
      }
    | undefined;

  if (!design || typeof design.candidatesToCss !== "function") return undefined;
  const candidatesToCss = design.candidatesToCss.bind(design);

  return buildClassKind(
    (className) => candidatesToCss([className])[0] ?? null,
    typeof design.getClassList === "function"
      ? () => namesFromClassList(design.getClassList!())
      : () => null,
  );
}

/**
 * Tailwind v3 classifier. Uses the JIT context to generate a class's CSS and
 * its known-class list to disambiguate typos.
 */
export function createV3ClassKind(state: unknown): ((className: string) => ClassKind) | undefined {
  const value = state as
    | {
        jitContext?: { getClassList?: () => unknown };
        modules?: { jit?: { generateRules?: { module?: unknown } } };
      }
    | undefined;

  const jit = value?.jitContext;
  const generateRules = value?.modules?.jit?.generateRules?.module;
  if (!jit || typeof generateRules !== "function") return undefined;

  const rules = generateRules as (candidates: Set<string>, context: unknown) => unknown;

  return buildClassKind(
    (className) => {
      const output = rules(new Set([className]), jit);
      const css = cssFromRules(output);
      return css.trim() === "" ? null : css;
    },
    typeof jit.getClassList === "function"
      ? () => namesFromClassList(jit.getClassList!())
      : () => null,
  );
}

function cssFromRules(output: unknown): string {
  if (!Array.isArray(output)) return "";
  return output
    .map((entry) => {
      const rule = Array.isArray(entry) ? entry[1] : entry;
      try {
        return rule && typeof (rule as { toString?: unknown }).toString === "function"
          ? String(rule)
          : "";
      } catch {
        return "";
      }
    })
    .join("\n");
}

/** Levenshtein distance, abandoned once the best possible row exceeds `max`. */
export function boundedEditDistance(a: string, b: string, max: number): number {
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
