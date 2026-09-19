import path from "node:path";

import type { Diagnostic, LintResult } from "../types.js";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  cyan: "\x1b[36m",
  gray: "\x1b[90m",
} as const;

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function severityMark(severity: Diagnostic["severity"]): string {
  return severity === "error" ? `${ANSI.red}\u2716` : `${ANSI.yellow}\u26A0`;
}

export function renderPretty(result: LintResult): string {
  const skippedRules = result.skippedRules ?? [];

  if (result.diagnostics.length === 0) {
    const base = `No issues found. Scanned ${result.scannedFiles} file(s) in ${formatDuration(result.elapsedMilliseconds)}.`;
    return skippedRules.length > 0 ? `${base}\n${renderSkipped(skippedRules)}` : base;
  }

  const lines: string[] = [];
  const groups = groupDiagnostics(result.diagnostics);

  for (const group of groups) {
    renderGroup(group, lines);
    lines.push("");
  }

  const errors = result.diagnostics.filter((d) => d.severity === "error").length;
  const warnings = result.diagnostics.length - errors;
  const parts: string[] = [];
  if (errors > 0) parts.push(`${ANSI.red}${errors} error${errors !== 1 ? "s" : ""}${ANSI.reset}`);
  if (warnings > 0)
    parts.push(`${ANSI.yellow}${warnings} warning${warnings !== 1 ? "s" : ""}${ANSI.reset}`);

  lines.push(
    `${ANSI.bold}Found ${parts.join(` ${ANSI.bold}+ `)}${ANSI.bold}.${ANSI.reset} Scanned ${result.scannedFiles} file(s) in ${ANSI.cyan}${formatDuration(result.elapsedMilliseconds)}${ANSI.reset}.`,
  );

  if (skippedRules.length > 0) {
    lines.push(renderSkipped(skippedRules));
  }

  return lines.join("\n");
}

export function renderSkipped(skipped: LintResult["skippedRules"]): string {
  const lines = [`${ANSI.dim}Skipped rules:${ANSI.reset}`];
  for (const rule of skipped) {
    lines.push(`  ${ANSI.dim}- ${rule.id}: ${rule.reason}${ANSI.reset}`);
  }
  return lines.join("\n");
}

type DiagnosticGroup = {
  rule: string;
  message: string;
  severity: Diagnostic["severity"];
  locations: { file: string; line: number; detail?: string }[];
};

function groupDiagnostics(diagnostics: Diagnostic[]): DiagnosticGroup[] {
  const map = new Map<string, DiagnosticGroup>();

  for (const d of diagnostics) {
    const message = summarizeMessage(d);
    const key = `${d.rule}\0${message}`;
    let group = map.get(key);
    if (!group) {
      group = {
        rule: d.rule,
        message,
        severity: d.severity,
        locations: [],
      };
      map.set(key, group);
    }
    group.locations.push({
      file: d.file,
      line: d.line,
      detail: d.message !== message ? d.message : undefined,
    });
  }

  return [...map.values()];
}

function renderGroup(group: DiagnosticGroup, lines: string[]): void {
  const count = group.locations.length;
  const countSuffix = count > 1 ? ` (${count})` : "";

  lines.push(
    `  ${severityMark(group.severity)} ${group.message}${countSuffix}${ANSI.reset} ${ANSI.dim}${group.rule}${ANSI.reset}`,
  );

  for (const location of group.locations) {
    lines.push(`    ${ANSI.gray}${relPath(location.file)}:${location.line}${ANSI.reset}`);
    if (location.detail) {
      lines.push(`      ${ANSI.dim}${location.detail}${ANSI.reset}`);
    }
  }
}

function summarizeMessage(diagnostic: Diagnostic): string {
  if (diagnostic.message.length > 140) {
    return `${diagnostic.message.slice(0, 137).trimEnd()}...`;
  }

  return diagnostic.message;
}

function relPath(filePath: string): string {
  try {
    return path.relative(process.cwd(), filePath);
  } catch {
    return filePath;
  }
}
