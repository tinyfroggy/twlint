import type { Diagnostic, LintResult } from "../types.js";

/** Keep only error-severity diagnostics (used by --quiet). */
export function filterErrorsOnly(diagnostics: Diagnostic[]): Diagnostic[] {
  return diagnostics.filter((d) => d.severity === "error");
}

/** Apply --quiet filtering to a LintResult, returning a new result. */
export function applyQuiet(result: LintResult, quiet: boolean): LintResult {
  if (!quiet) return result;
  return { ...result, diagnostics: filterErrorsOnly(result.diagnostics) };
}

/**
 * Decide whether the process should exit with a failure code.
 *
 * Current behavior: ANY diagnostic causes a failure exit. --max-warnings adds
 * an explicit warning threshold knob: when set, the run also fails if the total
 * number of warnings exceeds the threshold (this is the documented CI gate even
 * though the default behavior already fails on any diagnostic).
 */
export function shouldFail(diagnostics: Diagnostic[], maxWarnings?: number): boolean {
  if (diagnostics.length > 0) return true;
  if (maxWarnings !== undefined) {
    const warnings = diagnostics.filter((d) => d.severity === "warning").length;
    if (warnings > maxWarnings) return true;
  }
  return false;
}
