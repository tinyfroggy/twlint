import { execFileSync } from "node:child_process";
import { existsSync } from "node:fs";
import { fileURLToPath } from "node:url";
import path from "node:path";

import type { Diagnostic } from "../types.js";

/**
 * The design-system rules need an async Tailwind compile, but ESLint/Oxlint
 * rules are synchronous. So the plugin delegates those rules to the twlinter
 * CLI once per process (`twlinter --json --all`), then answers each rule from
 * the cached report. Text rules still run in-process.
 *
 * Set `TWLINTER_DELEGATE=0` to disable delegation (the context rules then
 * report nothing in the plugin and are only available via the CLI).
 */

const CONTEXT_RULE_IDS = new Set([
  "suggestCanonicalClasses",
  "cssConflict",
  "usedBlocklistedClass",
  "shorthand-classes",
  "no-unknown-classes",
]);

type DiagnosticsByFile = Map<string, Map<string, Diagnostic[]>>;

let cache: DiagnosticsByFile | null | undefined;

function relativeToCwd(file: string): string {
  try {
    return path.relative(process.cwd(), file);
  } catch {
    return file;
  }
}

function resolveCliPath(): string | null {
  const candidates = [
    fileURLToPath(new URL("../cli.js", import.meta.url)),
    fileURLToPath(new URL("./cli.js", import.meta.url)),
  ];
  return candidates.find((candidate) => existsSync(candidate)) ?? null;
}

function loadDelegate(): DiagnosticsByFile | null {
  if (cache !== undefined) return cache;

  if (process.env.TWLINTER_DELEGATE === "0") {
    cache = null;
    return cache;
  }

  const cliPath = resolveCliPath();
  if (!cliPath) {
    cache = null;
    return cache;
  }

  let stdout: string;
  try {
    stdout = execFileSync(process.execPath, [cliPath, "--json", "--all"], {
      cwd: process.cwd(),
      encoding: "utf8",
      maxBuffer: 64 * 1024 * 1024,
      stdio: ["ignore", "pipe", "ignore"],
    });
  } catch (error) {
    // The CLI exits non-zero when it reports findings; its JSON still lands on
    // stdout, so read it from the error rather than giving up.
    const captured = (error as { stdout?: string }).stdout;
    if (typeof captured !== "string" || captured.trim() === "") {
      cache = null;
      return cache;
    }
    stdout = captured;
  }

  try {
    const payload = JSON.parse(stdout) as { diagnostics?: Diagnostic[] };
    const byFile: DiagnosticsByFile = new Map();

    for (const diagnostic of payload.diagnostics ?? []) {
      if (!CONTEXT_RULE_IDS.has(diagnostic.rule)) continue;
      let rules = byFile.get(diagnostic.file);
      if (!rules) {
        rules = new Map();
        byFile.set(diagnostic.file, rules);
      }
      const list = rules.get(diagnostic.rule) ?? [];
      list.push(diagnostic);
      rules.set(diagnostic.rule, list);
    }

    cache = byFile;
  } catch {
    cache = null;
  }

  return cache;
}

/** Diagnostics for one rule and file, or an empty list when unavailable. */
export function getDelegatedDiagnostics(file: string, ruleId: string): Diagnostic[] {
  const byFile = loadDelegate();
  if (!byFile) return [];
  return byFile.get(relativeToCwd(file))?.get(ruleId) ?? [];
}

/** Force the delegate to load (used by tests). */
export function resetDelegateForTesting(): void {
  cache = undefined;
}
