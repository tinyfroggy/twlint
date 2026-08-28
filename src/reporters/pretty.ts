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

const SEVERITY_ICON: Record<string, string> = {
  warning: "\u26A0",
  error: "\u2716",
};

const SEVERITY_COLOR: Record<string, string> = {
  warning: ANSI.yellow,
  error: ANSI.red,
};

function formatDuration(ms: number): string {
  if (ms < 1000) return `${Math.round(ms)}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

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
  if (errors > 0) parts.push(`${ANSI.red}${errors} error${errors !== 1 ? "s" : ""}${ANSI.reset}`);
  if (warnings > 0)
    parts.push(`${ANSI.yellow}${warnings} warning${warnings !== 1 ? "s" : ""}${ANSI.reset}`);

  lines.push(
    `${ANSI.bold}Found ${parts.join(", ")}${ANSI.reset}${ANSI.bold}.${ANSI.reset} Scanned ${result.scannedFiles} file(s) in ${ANSI.cyan}${formatDuration(result.elapsedMilliseconds)}${ANSI.reset}.`,
  );

  return lines.join("\n");
}

type DiagnosticGroup = {
  rule: string;
  message: string;
  severity: string;
  details: string[];
  locations: { file: string; line: number; detail?: string }[];
};

const MAX_DEFAULT_LOCATIONS = 8;

function groupDiagnostics(diagnostics: Diagnostic[]): DiagnosticGroup[] {
  const map = new Map<string, DiagnosticGroup>();

  for (const d of diagnostics) {
    const message = summarizeMessage(d);
    const key = `${d.severity}\0${d.rule}\0${message}`;
    let group = map.get(key);
    if (!group) {
      group = {
        rule: d.rule,
        message,
        severity: d.severity,
        details: [],
        locations: [],
      };
      map.set(key, group);
    }
    if (d.message !== message && !group.details.includes(d.message)) {
      group.details.push(d.message);
    }
    group.locations.push({
      file: d.file,
      line: d.line,
      detail: d.message !== message ? d.message : undefined,
    });
  }

  return [...map.values()];
}

function renderGroup(group: DiagnosticGroup, verbose: boolean, lines: string[]): void {
  const color = SEVERITY_COLOR[group.severity] ?? ANSI.yellow;
  const icon = SEVERITY_ICON[group.severity] ?? "\u26A0";
  const count = group.locations.length;
  const countSuffix = count > 1 ? ` (${count})` : "";

  lines.push(
    `  ${color}${icon} ${group.message}${countSuffix}${ANSI.reset} ${ANSI.dim}${group.rule}${ANSI.reset}`,
  );

  const shownLocations = verbose
    ? group.locations
    : group.locations.slice(0, MAX_DEFAULT_LOCATIONS);
  for (const loc of shownLocations) {
    const display = verbose ? loc.file : relPath(loc.file);
    lines.push(`    ${ANSI.gray}${display}:${loc.line}${ANSI.reset}`);
    if (verbose && loc.detail) {
      lines.push(`      ${ANSI.dim}${loc.detail}${ANSI.reset}`);
    }
  }

  if (!verbose && group.locations.length > shownLocations.length) {
    lines.push(
      `    ${ANSI.gray}...and ${group.locations.length - shownLocations.length} more location(s). Use --verbose to show all.${ANSI.reset}`,
    );
  }

  if (!verbose && group.details.length > 0) {
    lines.push(`    ${ANSI.gray}Use --verbose to show the full suggestion text.${ANSI.reset}`);
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
