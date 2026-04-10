import fg from "fast-glob";
import path from "node:path";

import type { Diagnostic } from "./formatter.js";

const DEFAULT_PATTERNS = ["**/*.{html,js,jsx,ts,tsx,css}"];

export async function scan(patterns: string[]): Promise<Diagnostic[]> {
  const entries = await fg(patterns.length > 0 ? patterns : DEFAULT_PATTERNS, {
    dot: false,
    onlyFiles: true,
    ignore: ["**/node_modules/**", "**/dist/**"],
  });

  return entries.map((file) => ({
    file: path.relative(process.cwd(), file),
    line: 1,
    column: 1,
    severity: "warning",
    rule: "suggestCanonicalClasses",
    message:
      "Placeholder diagnostic: Tailwind canonical-class detection not wired yet.",
  }));
}
