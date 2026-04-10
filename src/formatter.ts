import type { Diagnostic } from "./types.js";

const SEVERITY_LABEL: Record<string, string> = {
  warning: "warn",
  error: "error",
};

export function formatDiagnostic(diagnostic: Diagnostic): string {
  const severity = SEVERITY_LABEL[diagnostic.severity] ?? diagnostic.severity;
  return `${diagnostic.file}:${diagnostic.line}:${diagnostic.column} ${severity} ${diagnostic.rule} ${diagnostic.message}`;
}
