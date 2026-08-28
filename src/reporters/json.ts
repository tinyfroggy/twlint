import type { Diagnostic, LintResult } from "../types.js";

export function renderJson(result: LintResult): string {
  const payload = {
    summary: {
      matchedFiles: result.matchedFiles,
      scannedFiles: result.scannedFiles,
      elapsedMilliseconds: result.elapsedMilliseconds,
      warningCount: result.diagnostics.length,
    },
    diagnostics: result.diagnostics.map((d: Diagnostic) => ({
      file: d.file,
      line: d.line,
      column: d.column,
      severity: d.severity,
      rule: d.rule,
      message: d.message,
      source: d.source,
    })),
  };

  return JSON.stringify(payload, null, 2);
}
