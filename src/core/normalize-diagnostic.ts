import path from "node:path";

import type { Diagnostic, TailwindDiagnostic } from "../types.js";

export function normalizeDiagnostic(raw: TailwindDiagnostic, filePath: string): Diagnostic {
  return {
    file: path.relative(process.cwd(), filePath),
    line: raw.range.start.line + 1,
    column: raw.range.start.character + 1,
    severity: raw.severity === 1 ? "error" : "warning",
    rule: typeof raw.code === "string" ? raw.code : "suggestCanonicalClasses",
    message: raw.message,
    source: "tw",
  };
}
