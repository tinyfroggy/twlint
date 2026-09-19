import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";

import type { Diagnostic } from "../types.js";

type AppliedFix = { start: number; end: number; text: string };

/**
 * Write every diagnostic fix back to its file. Fixes are applied left to
 * right, and overlapping or duplicate ranges are skipped. Returns the number
 * of files changed.
 */
export async function applyFixes(diagnostics: Diagnostic[]): Promise<number> {
  const byFile = new Map<string, AppliedFix[]>();

  for (const diagnostic of diagnostics) {
    if (!diagnostic.fix) continue;
    const file = path.resolve(process.cwd(), diagnostic.file);
    const fixes = byFile.get(file) ?? [];
    fixes.push({
      start: diagnostic.fix.range[0],
      end: diagnostic.fix.range[1],
      text: diagnostic.fix.text,
    });
    byFile.set(file, fixes);
  }

  let changed = 0;

  for (const [file, fixes] of byFile) {
    let original: string;
    try {
      original = await readFile(file, "utf8");
    } catch {
      continue;
    }

    fixes.sort((a, b) => a.start - b.start || a.end - b.end);

    let result = "";
    let cursor = 0;

    for (const fix of fixes) {
      if (fix.start < cursor) continue;
      if (fix.start < 0 || fix.end > original.length || fix.start > fix.end) continue;

      result += original.slice(cursor, fix.start) + fix.text;
      cursor = fix.end;
    }

    result += original.slice(cursor);

    if (result !== original) {
      await writeFile(file, result);
      changed++;
    }
  }

  return changed;
}
