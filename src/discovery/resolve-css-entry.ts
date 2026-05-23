import { readFile } from "node:fs/promises";
import path from "node:path";

import fg from "fast-glob";

import { DEFAULT_CSS_ENTRY_PATTERNS, DEFAULT_IGNORE_PATTERNS } from "../constants.js";

const PREFERRED_CSS_ENTRY_NAMES = [
  "src/app.css",
  "app/globals.css",
  "src/globals.css",
  "styles/globals.css",
  "app.css",
  "global.css",
  "globals.css",
];

export async function resolveCssEntry(rootDir?: string): Promise<string> {
  const cwd = rootDir || process.cwd();
  const candidates = await fg(DEFAULT_CSS_ENTRY_PATTERNS, {
    absolute: true,
    dot: false,
    onlyFiles: true,
    ignore: DEFAULT_IGNORE_PATTERNS,
    cwd,
  });

  const tailwindEntries: string[] = [];

  for (const candidate of candidates) {
    const text = await readFile(candidate, "utf8");

    if (text.includes('@import "tailwindcss"') || text.includes("@import 'tailwindcss'")) {
      tailwindEntries.push(candidate);
    }
  }

  if (tailwindEntries.length === 0) {
    throw new Error(
      "Could not find a Tailwind v4 CSS entry file. Make sure a CSS file imports tailwindcss.",
    );
  }

  if (tailwindEntries.length === 1) {
    return tailwindEntries[0];
  }

  const preferred = PREFERRED_CSS_ENTRY_NAMES.find((name) =>
    tailwindEntries.some((entry) => entry.endsWith(path.sep + name) || entry.endsWith("/" + name)),
  );

  if (preferred) {
    return tailwindEntries.find(
      (entry) => entry.endsWith(path.sep + preferred) || entry.endsWith("/" + preferred),
    )!;
  }

  const relativePaths = tailwindEntries.map((e) => path.relative(cwd, e));
  throw new Error(
    `Multiple Tailwind v4 CSS entry files found:\n${relativePaths.map((p) => `  ${p}`).join("\n")}\n\nCould not determine which one to use.`,
  );
}
