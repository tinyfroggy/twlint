import path from "node:path";
import { TextDocument } from "vscode-languageserver-textdocument";

import type { Diagnostic } from "../types.js";

const CLASS_PATTERNS = [
  /(?:className|class)\s*=\s*"([^"]*)"/g,
  /(?:className|class)\s*=\s*'([^']*)'/g,
  /(?:className|class)\s*=\s*\{'([^']*)'\}/g,
  /(?:className|class)\s*=\s*\{"([^"]*)"\}/g,
  /@apply\s+([^;]+)/g,
];

type ClassList = {
  offset: number;
  classes: string[];
};

function extractClassLists(text: string): ClassList[] {
  const results: ClassList[] = [];

  for (const pattern of CLASS_PATTERNS) {
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = pattern.exec(text)) !== null) {
      const classStr = match[1];
      if (!classStr) continue;
      const trimmed = classStr.trim();
      if (!trimmed) continue;
      const classes = trimmed.split(/\s+/).filter(Boolean);
      if (classes.length >= 2) {
        results.push({ offset: match.index, classes });
      }
    }
  }

  return results;
}

export function getShorthandClassDiagnostics(
  designSystem: unknown,
  document: TextDocument,
  filePath: string,
): Diagnostic[] {
  const text = document.getText();
  const classLists = extractClassLists(text);
  const diagnostics: Diagnostic[] = [];

  const canonicalize = (designSystem as Record<string, unknown>).canonicalizeCandidates as
    | ((candidates: string[], options?: Record<string, unknown>) => string[])
    | undefined;

  if (typeof canonicalize !== "function") {
    return diagnostics;
  }

  for (const { offset, classes } of classLists) {
    const canonicalized = canonicalize.call(designSystem as Record<string, unknown>, classes, {
      collapse: true,
      logicalToPhysical: true,
    });

    if (!canonicalized || canonicalized.length === 0) continue;
    if (canonicalized.length === classes.length && canonicalized.every((c, i) => c === classes[i]))
      continue;

    const pos = document.positionAt(offset);
    diagnostics.push({
      file: path.relative(process.cwd(), filePath),
      line: pos.line + 1,
      column: pos.character + 1,
      severity: "warning",
      rule: "shorthand-classes",
      message: `These classes can be replaced with: ${canonicalized.map((c) => `\`${c}\``).join(", ")}`,
      source: "tw",
    });
  }

  return diagnostics;
}
