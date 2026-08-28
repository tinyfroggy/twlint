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
