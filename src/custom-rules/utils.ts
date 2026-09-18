export type ExtractedClassList = {
  offset: number;
  classes: string[];
  raw: string;
};

export type ParsedClass = {
  original: string;
  variant: string;
  variants: string[];
  responsive: string;
  important: boolean;
  negative: boolean;
  base: string;
};

const RESPONSIVE_VARIANT_SET = new Set([
  "sm",
  "md",
  "lg",
  "xl",
  "2xl",
  "3xl",
  "4xl",
  "5xl",
  "6xl",
  "7xl",
  "max-sm",
  "max-md",
  "max-lg",
  "max-xl",
  "max-2xl",
  "max-3xl",
  "max-4xl",
  "max-5xl",
  "max-6xl",
  "max-7xl",
]);

function splitVariantParts(name: string): string[] {
  const parts: string[] = [];
  let current = "";
  let bracketDepth = 0;

  for (const ch of name) {
    if (ch === "[") bracketDepth++;
    if (ch === "]" && bracketDepth > 0) bracketDepth--;

    if (ch === ":" && bracketDepth === 0) {
      parts.push(current);
      current = "";
      continue;
    }

    current += ch;
  }

  parts.push(current);
  return parts;
}

function responsiveVariant(variants: string[]): string {
  return (
    variants.find(
      (v) => RESPONSIVE_VARIANT_SET.has(v) || v.startsWith("min-[") || v.startsWith("max-["),
    ) ?? ""
  );
}

const CLASS_PATTERNS = [
  /(?:className|class)\s*=\s*"([^"]*)"/g,
  /(?:className|class)\s*=\s*'([^']*)'/g,
  /(?:className|class)\s*=\s*\{'([^']*)'\}/g,
  /(?:className|class)\s*=\s*\{"([^"]*)"\}/g,
  /@apply\s+([^;]+)/g,
];

export function extractClassLists(text: string): ExtractedClassList[] {
  const results: ExtractedClassList[] = [];

  for (const pattern of CLASS_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const classStr = match[1];
      if (!classStr) continue;
      const trimmed = classStr.trim();
      if (!trimmed) continue;
      const classes = trimmed.split(/\s+/).filter(Boolean);
      results.push({ offset: match.index, classes, raw: trimmed });
    }
  }

  return results;
}

/**
 * Class-helper functions whose string arguments are class lists. `cva` and
 * `tv` are intentionally absent: their objects mix variant names and values,
 * so a text scan cannot tell a class from a variant name.
 */
const CLASS_HELPER_FUNCTIONS = new Set([
  "cn",
  "clsx",
  "cx",
  "classnames",
  "classNames",
  "twMerge",
  "twJoin",
  "tw",
]);

/**
 * Extract class lists from `cn("...")`-style helper calls. Collects string and
 * template-literal static segments at the helper's own argument level, and
 * skips literals nested inside other calls so `cn(format("yyyy-MM-dd"), "p-4")`
 * only yields class-looking strings.
 */
export function extractHelperClassLists(text: string): ExtractedClassList[] {
  const results: ExtractedClassList[] = [];
  const callRe = /(?<![\w$.])([A-Za-z_$][\w$]*)\s*\(/g;
  let match: RegExpExecArray | null;

  while ((match = callRe.exec(text)) !== null) {
    if (!CLASS_HELPER_FUNCTIONS.has(match[1])) continue;

    const openParen = match.index + match[0].length - 1;
    const closeParen = findMatchingParen(text, openParen);
    if (closeParen === -1) continue;

    const classes = extractArgumentClasses(text, openParen + 1, closeParen);
    if (classes.length > 0) {
      results.push({ offset: match.index, classes, raw: classes.join(" ") });
    }

    // Resume just after the opening paren so nested helper calls are visited.
    callRe.lastIndex = openParen + 1;
  }

  return results;
}

function findMatchingParen(text: string, openParen: number): number {
  let depth = 0;

  for (let i = openParen; i < text.length; i++) {
    const char = text[i];

    if (char === '"' || char === "'") {
      i = readQuoted(text, i).next - 1;
      continue;
    }

    if (char === "`") {
      i = readTemplate(text, i).next - 1;
      continue;
    }

    if (char === "/" && text[i + 1] === "/") {
      i = skipLineComment(text, i) - 1;
      continue;
    }

    if (char === "/" && text[i + 1] === "*") {
      i = skipBlockComment(text, i) - 1;
      continue;
    }

    if (char === "(") {
      depth++;
    } else if (char === ")") {
      depth--;
      if (depth === 0) return i;
    }
  }

  return -1;
}

function extractArgumentClasses(text: string, start: number, end: number): string[] {
  const classes: string[] = [];
  const stack: string[] = [];
  let i = start;

  while (i < end) {
    const char = text[i];

    if (char === '"' || char === "'") {
      const literal = readQuoted(text, i, end);
      if (!stack.includes("(") && !isComparisonOperand(text, i)) pushTokens(classes, literal.value);
      i = literal.next;
      continue;
    }

    if (char === "`") {
      const literal = readTemplate(text, i, end);
      if (!stack.includes("(") && !isComparisonOperand(text, i)) pushTokens(classes, literal.value);
      i = literal.next;
      continue;
    }

    if (char === "/" && text[i + 1] === "/") {
      i = skipLineComment(text, i, end);
      continue;
    }

    if (char === "/" && text[i + 1] === "*") {
      i = skipBlockComment(text, i, end);
      continue;
    }

    if (char === "(" || char === "[" || char === "{") {
      stack.push(char);
      i++;
      continue;
    }

    if (char === ")" || char === "]" || char === "}") {
      stack.pop();
      i++;
      continue;
    }

    i++;
  }

  return classes;
}

/**
 * True when a literal is the right-hand side of a comparison, as in
 * `tone === "destructive"`, where the string is a value, not a class.
 */
function isComparisonOperand(text: string, start: number): boolean {
  let i = start - 1;
  while (i >= 0 && /\s/.test(text[i])) i--;

  let operator = "";
  while (i >= 0 && /[=!<>]/.test(text[i])) {
    operator = text[i] + operator;
    i--;
  }

  return operator === "==" || operator === "===" || operator === "!=" || operator === "!==";
}

function pushTokens(target: string[], value: string): void {
  for (const token of value.split(/\s+/)) {
    if (token) target.push(token);
  }
}

function readQuoted(
  text: string,
  start: number,
  end = text.length,
): { value: string; next: number } {
  const quote = text[start];
  let value = "";
  let i = start + 1;

  while (i < end) {
    const char = text[i];
    if (char === "\\") {
      value += text[i + 1] ?? "";
      i += 2;
      continue;
    }
    if (char === quote) return { value, next: i + 1 };
    value += char;
    i++;
  }

  return { value, next: i };
}

function readTemplate(
  text: string,
  start: number,
  end = text.length,
): { value: string; next: number } {
  let value = "";
  let i = start + 1;

  while (i < end) {
    const char = text[i];
    if (char === "\\") {
      value += text[i + 1] ?? "";
      i += 2;
      continue;
    }
    if (char === "`") return { value, next: i + 1 };

    if (char === "$" && text[i + 1] === "{") {
      value += " ";
      let depth = 1;
      i += 2;
      while (i < end && depth > 0) {
        const inner = text[i];
        if (inner === '"' || inner === "'") {
          i = readQuoted(text, i, end).next;
          continue;
        }
        if (inner === "`") {
          i = readTemplate(text, i, end).next;
          continue;
        }
        if (inner === "{") depth++;
        if (inner === "}") depth--;
        i++;
      }
      continue;
    }

    value += char;
    i++;
  }

  return { value, next: i };
}

function skipLineComment(text: string, start: number, end = text.length): number {
  let i = start;
  while (i < end && text[i] !== "\n") i++;
  return i;
}

function skipBlockComment(text: string, start: number, end = text.length): number {
  let i = start + 2;
  while (i < end && !(text[i] === "*" && text[i + 1] === "/")) i++;
  return Math.min(i + 2, end);
}

export function parseClassName(name: string): ParsedClass {
  let remaining = name;
  const important = remaining.startsWith("!");
  if (important) remaining = remaining.slice(1);

  const parts = splitVariantParts(remaining);
  const variants = parts.length > 1 ? parts.slice(0, -1) : [];
  const variant = variants.join(":");
  remaining = parts[parts.length - 1];

  const negative = remaining.startsWith("-");
  if (negative) remaining = remaining.slice(1);

  return {
    original: name,
    variant,
    variants,
    responsive: responsiveVariant(variants),
    important,
    negative,
    base: remaining,
  };
}

export function stripVariants(name: string): string {
  return parseClassName(name).base;
}

export type ExtractedElement = {
  tag: string;
  offset: number;
  attrs: Record<string, string>;
  selfClosing: boolean;
};

export function extractElements(text: string): ExtractedElement[] {
  const results: ExtractedElement[] = [];
  const re = /<([A-Za-z][\w]*(?:\.[A-Za-z][\w]*)*)((?:\s+[^>]*?)?)(\s*\/?\s*)>/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const tag = match[1];
    const attrStr = match[2];
    const closing = match[3];
    const selfClosing = closing.includes("/");

    const attrs: Record<string, string> = {};
    const attrRe = /(\w+)(?:\s*=\s*(?:"([^"]*)"|'([^']*)'|(\S+)))?/g;
    let attrMatch: RegExpExecArray | null;
    while ((attrMatch = attrRe.exec(attrStr)) !== null) {
      const value = attrMatch[2] ?? attrMatch[3] ?? attrMatch[4] ?? "";
      attrs[attrMatch[1]] = value;
    }

    results.push({ tag, offset: match.index, attrs, selfClosing });
  }
  return results;
}

export const INLINE_TAGS = new Set([
  "a",
  "abbr",
  "acronym",
  "b",
  "bdo",
  "big",
  "br",
  "button",
  "cite",
  "code",
  "dfn",
  "em",
  "i",
  "img",
  "input",
  "kbd",
  "label",
  "map",
  "object",
  "q",
  "samp",
  "script",
  "select",
  "small",
  "span",
  "strong",
  "sub",
  "sup",
  "textarea",
  "time",
  "tt",
  "u",
  "var",
]);

export type ElementClassList = {
  tag: string;
  offset: number;
  classes: string[];
  raw: string;
  isComponent: boolean;
};

const ELEMENT_CLASS_PATTERNS = [
  /<([A-Za-z][\w]*(?:\.[A-Za-z][\w]*)*)[^>]*?(?:className|class)\s*=\s*"([^"]*)"/g,
  /<([A-Za-z][\w]*(?:\.[A-Za-z][\w]*)*)[^>]*?(?:className|class)\s*=\s*'([^']*)'/g,
  /<([A-Za-z][\w]*(?:\.[A-Za-z][\w]*)*)[^>]*?(?:className|class)\s*=\s*\{'([^']*)'\}/g,
  /<([A-Za-z][\w]*(?:\.[A-Za-z][\w]*)*)[^>]*?(?:className|class)\s*=\s*\{"([^"]*)"\}/g,
];

export function extractElementsWithClasses(text: string): ElementClassList[] {
  const results: ElementClassList[] = [];
  const seen = new Set<number>();
  for (const pattern of ELEMENT_CLASS_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      if (seen.has(match.index)) continue;
      seen.add(match.index);
      const tag = match[1];
      const classStr = match[2] ?? match[3] ?? match[4] ?? "";
      if (!classStr) continue;
      const trimmed = classStr.trim();
      if (!trimmed) continue;
      const classes = trimmed.split(/\s+/).filter(Boolean);
      results.push({
        tag,
        offset: match.index,
        classes,
        raw: trimmed,
        isComponent: /^[A-Z]/.test(tag) || tag.includes("."),
      });
    }
  }
  return results;
}

export function extractApplyBlocks(text: string): ExtractedClassList[] {
  const results: ExtractedClassList[] = [];
  const re = /@apply\s+([^;]+)/g;
  let match: RegExpExecArray | null;
  while ((match = re.exec(text)) !== null) {
    const classStr = match[1];
    if (!classStr) continue;
    const trimmed = classStr.trim();
    if (!trimmed) continue;
    const classes = trimmed.split(/\s+/).filter(Boolean);
    results.push({ offset: match.index, classes, raw: trimmed });
  }
  return results;
}
