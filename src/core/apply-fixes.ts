import { chmod, readFile, rename, stat, unlink, writeFile } from "node:fs/promises";
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
      await writeFileAtomically(file, result);
      changed++;
    }
  }

  return changed;
}

/**
 * Replace a file by writing a sibling temp file and renaming it into place, so
 * a crash mid-write cannot leave a truncated source file behind. The original
 * file's permissions are preserved.
 */
async function writeFileAtomically(file: string, contents: string): Promise<void> {
  const directory = path.dirname(file);
  const temp = path.join(
    directory,
    `.${path.basename(file)}.twlinter-${process.pid}-${Date.now()}.tmp`,
  );

  try {
    const mode = (await stat(file)).mode;
    await writeFile(temp, contents);
    await chmod(temp, mode);
    await rename(temp, file);
  } catch (error) {
    await unlink(temp).catch(() => {});
    throw error;
  }
}
