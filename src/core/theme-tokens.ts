import { readFileSync } from "node:fs";
import path from "node:path";

const NODE_MODULES_SEGMENT = `${path.sep}node_modules${path.sep}`;

const COLOR_DECLARATION_RE = /^\s*--color-([\w-]+|\*)\s*:\s*([\s\S]+?)\s*$/;

/**
 * Theme color token names (`--color-<name>`) declared by the project's own
 * CSS. Defaults shipped inside packages are ignored: Tailwind's palette lives
 * in `node_modules/tailwindcss/theme.css`, so counting it would let every raw
 * palette color pass.
 */
export function readDeclaredColorTokens(dependencyPaths: Iterable<string>): Set<string> {
  const tokens = new Set<string>();

  for (const filePath of dependencyPaths) {
    if (!filePath.endsWith(".css")) continue;
    if (filePath.includes(NODE_MODULES_SEGMENT)) continue;

    let css: string;
    try {
      css = readFileSync(filePath, "utf8");
    } catch {
      continue;
    }

    applyColorDeclarations(css, tokens);
  }

  return tokens;
}

/**
 * Scan `@theme` blocks for `--color-*` declarations. Declarations are applied
 * in source order so `initial` resets work like the CSS cascade.
 */
function applyColorDeclarations(css: string, tokens: Set<string>): void {
  const stripped = css.replace(/\/\*[\s\S]*?\*\//g, "");
  const themeStack: boolean[] = [];
  let statementStart = 0;

  for (let i = 0; i < stripped.length; i++) {
    const char = stripped[i];

    if (char === "{") {
      const prelude = stripped.slice(statementStart, i).trim();
      const parentIsTheme = themeStack.at(-1) ?? false;
      themeStack.push(parentIsTheme || /^@theme\b/.test(prelude));
      statementStart = i + 1;
      continue;
    }

    if (char === "}" || char === ";") {
      if (themeStack.at(-1) ?? false) {
        recordColorDeclaration(stripped.slice(statementStart, i), tokens);
      }
      if (char === "}") themeStack.pop();
      statementStart = i + 1;
    }
  }
}

function recordColorDeclaration(statement: string, tokens: Set<string>): void {
  const match = COLOR_DECLARATION_RE.exec(statement);
  if (!match) return;

  const name = match[1];
  const reset = match[2].trim() === "initial";

  if (name === "*") {
    if (reset) tokens.clear();
    return;
  }

  if (reset) {
    tokens.delete(name);
  } else {
    tokens.add(name);
  }
}

/**
 * Flatten a Tailwind v3 `theme.colors` object into token names, e.g.
 * `{ primary: { DEFAULT: "#111", foreground: "#fff" }, red: { 500: "#f00" } }`
 * becomes `primary`, `primary-foreground`, `red-500`. Non-string values
 * (nested scales aside, and functions) are skipped.
 */
export function flattenColorScale(
  scale: unknown,
  prefix = "",
  out = new Map<string, string>(),
): Map<string, string> {
  if (typeof scale !== "object" || scale === null) return out;

  for (const [key, value] of Object.entries(scale)) {
    if (key === "DEFAULT") {
      if (typeof value === "string" && prefix) out.set(prefix, value);
      else if (typeof value === "object") flattenColorScale(value, prefix, out);
      continue;
    }

    const name = prefix ? `${prefix}-${key}` : key;
    if (typeof value === "string") {
      out.set(name, value);
    } else if (typeof value === "object" && value !== null) {
      flattenColorScale(value, name, out);
    }
  }

  return out;
}
