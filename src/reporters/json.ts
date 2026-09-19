import type { Diagnostic, LintResult } from "../types.js";

export function renderJson(result: LintResult): string {
  const errors = result.diagnostics.filter((d) => d.severity === "error").length;

  const payload = {
    summary: {
      matchedFiles: result.matchedFiles,
      scannedFiles: result.scannedFiles,
      elapsedMilliseconds: result.elapsedMilliseconds,
      errorCount: errors,
      warningCount: result.diagnostics.length - errors,
    },
    rules: {
      ran: result.ranRules ?? [],
      skipped: result.skippedRules ?? [],
    },
    diagnostics: result.diagnostics.map((d: Diagnostic) => ({
      file: d.file,
      line: d.line,
      column: d.column,
      severity: d.severity,
      rule: d.rule,
      message: d.message,
      source: d.source,
      ...(d.fix ? { fix: d.fix } : {}),
      ...(d.suggestions ? { suggestions: d.suggestions } : {}),
    })),
  };

  return JSON.stringify(payload, null, 2);
}
