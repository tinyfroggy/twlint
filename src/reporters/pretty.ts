import path from "node:path";

import type { Diagnostic, LintResult } from "../types.js";

const SEVERITY_ICON: Record<string, string> = {
  warning: "\u26A0",
  error: "\u2716",
};

export function renderPretty(result: LintResult, verbose: boolean): string {
  if (result.diagnostics.length === 0) {
    return "No issues found.";
  }

  const lines: string[] = [];
  const groups = groupDiagnostics(result.diagnostics);

  for (const group of groups) {
    renderGroup(group, verbose, lines);
    lines.push("");
  }

  const warnings = result.diagnostics.filter((d) => d.severity === "warning").length;
  const errors = result.diagnostics.length - warnings;

  const parts: string[] = [];
  if (errors > 0) parts.push(`${errors} error${errors !== 1 ? "s" : ""}`);
  if (warnings > 0) parts.push(`${warnings} warning${warnings !== 1 ? "s" : ""}`);

  lines.push(
    `Found ${parts.join(", ")}. Scanned ${result.scannedFiles} file(s) in ${Math.round(result.elapsedMilliseconds)}ms.`,
  );

  return lines.join("\n");
}

type DiagnosticGroup = {
  rule: string;
  message: string;
  severity: string;
  locations: { file: string; line: number }[];
};

function groupDiagnostics(diagnostics: Diagnostic[]): DiagnosticGroup[] {
  const map = new Map<string, DiagnosticGroup>();

  for (const d of diagnostics) {
    const key = `${d.severity}\0${d.rule}\0${d.message}`;
    let group = map.get(key);
    if (!group) {
      group = {
        rule: d.rule,
        message: d.message,
        severity: d.severity,
        locations: [],
      };
      map.set(key, group);
    }
    group.locations.push({ file: d.file, line: d.line });
  }

  return [...map.values()];
}

function renderGroup(group: DiagnosticGroup, verbose: boolean, lines: string[]): void {
  const icon = SEVERITY_ICON[group.severity] ?? "\u26A0";
  const count = group.locations.length;
  const countSuffix = count > 1 ? ` (${count})` : "";

  lines.push(`  ${icon} ${group.message}${countSuffix}`);

  for (const loc of group.locations) {
    if (verbose) {
      lines.push(`    ${loc.file}:${loc.line}`);
    } else {
      lines.push(`    ${relPath(loc.file)}:${loc.line}`);
    }
  }
}

function relPath(filePath: string): string {
  try {
    return path.relative(process.cwd(), filePath);
  } catch {
    return filePath;
  }
}
