export type Diagnostic = {
  file: string;
  line: number;
  column: number;
  rule: string;
  severity: "warning" | "error";
  message: string;
};

export function formatDiagnostic(diagnostic: Diagnostic): string {
  return `${diagnostic.file}:${diagnostic.line}:${diagnostic.column}  ${diagnostic.severity}  ${diagnostic.message}  (${diagnostic.rule})`;
}
