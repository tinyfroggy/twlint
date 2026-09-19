import path from "node:path";

import type { DoctorReport, DoctorRule } from "../core/doctor.js";

const ANSI = {
  reset: "\x1b[0m",
  bold: "\x1b[1m",
  dim: "\x1b[2m",
  red: "\x1b[31m",
  yellow: "\x1b[33m",
  green: "\x1b[32m",
  gray: "\x1b[90m",
} as const;

function statusLabel(rule: DoctorRule): string {
  switch (rule.status) {
    case "active":
      return `${ANSI.green}active${ANSI.reset}`;
    case "off":
      return `${ANSI.dim}off${ANSI.reset}`;
    case "skipped":
      return `${ANSI.yellow}skipped${ANSI.reset}`;
  }
}

function rel(value: string | null): string {
  if (!value) return "-";
  try {
    return path.relative(process.cwd(), value) || ".";
  } catch {
    return value;
  }
}

export function renderDoctor(report: DoctorReport): string {
  const lines: string[] = [];
  lines.push(`${ANSI.bold}twlinter doctor${ANSI.reset}`);
  lines.push("");

  lines.push(`${ANSI.dim}Project${ANSI.reset}        ${rel(report.rootDir)}`);
  if (report.tailwind) {
    lines.push(
      `${ANSI.dim}Tailwind${ANSI.reset}      v${report.tailwind.version}   ${ANSI.dim}${report.tailwind.major >= 4 ? "entry" : "config"}:${ANSI.reset} ${rel(report.tailwind.entry)}`,
    );
  } else {
    lines.push(`${ANSI.dim}Tailwind${ANSI.reset}      ${ANSI.yellow}not found${ANSI.reset}`);
  }

  const ds = report.designSystem;
  lines.push(
    `${ANSI.dim}Design system${ANSI.reset} ${ds.loaded ? `${ANSI.green}loaded${ANSI.reset}` : ds.v3 ? `${ANSI.yellow}v3 JIT${ANSI.reset}` : `${ANSI.yellow}unavailable${ANSI.reset}`}   ${ANSI.dim}theme colors:${ANSI.reset} ${ds.themeColors}   ${ANSI.dim}dependencies:${ANSI.reset} ${ds.dependencies}`,
  );
  if (ds.themeFile) {
    lines.push(`${ANSI.dim}Theme file${ANSI.reset}    ${rel(ds.themeFile)}`);
  }
  if (ds.error) {
    lines.push(`${ANSI.dim}Load error${ANSI.reset}    ${ANSI.red}${ds.error}${ANSI.reset}`);
  }
  lines.push("");

  const width = Math.max(...report.rules.map((rule) => rule.id.length), 4);
  const capWidth = Math.max(...report.rules.map((rule) => rule.capability.length), 10);

  for (const rule of report.rules) {
    const reason = rule.reason ? `  ${ANSI.dim}${rule.reason}${ANSI.reset}` : "";
    lines.push(
      `  ${rule.id.padEnd(width)}  ${ANSI.gray}${rule.capability.padEnd(capWidth)}${ANSI.reset}  ${statusLabel(rule)}${reason}`,
    );
  }

  if (report.warnings.length > 0) {
    lines.push("");
    for (const warning of report.warnings) {
      lines.push(`  ${ANSI.yellow}!${ANSI.reset} ${warning}`);
    }
  }

  return lines.join("\n");
}

export function renderRules(rules: DoctorRule[]): string {
  const lines: string[] = [];
  const width = Math.max(...rules.map((rule) => rule.id.length), 4);
  const capWidth = Math.max(...rules.map((rule) => rule.capability.length), 10);

  for (const rule of rules) {
    lines.push(
      `  ${rule.id.padEnd(width)}  ${ANSI.gray}${rule.capability.padEnd(capWidth)}${ANSI.reset}  ${ANSI.dim}default: ${rule.severity}${ANSI.reset}`,
    );
    lines.push(`    ${ANSI.dim}${rule.description}${ANSI.reset}`);
  }

  return lines.join("\n");
}
