import { describe, it, expect } from "vitest";
import { renderPretty } from "../src/reporters/pretty.js";
import type { LintResult, Diagnostic } from "../src/types.js";

function makeDiagnostic(overrides: Record<string, unknown> = {}): Diagnostic {
  return {
    file: "src/app.tsx",
    line: 5,
    column: 10,
    rule: "suggestCanonicalClasses",
    severity: "warning",
    message: 'Replace "flex-1" with "grow"',
    source: "tw",
    ...overrides,
  } as Diagnostic;
}

function makeResult(diagnostics: Diagnostic[] = []): LintResult {
  return {
    matchedFiles: 10,
    scannedFiles: 8,
    elapsedMilliseconds: 123,
    diagnostics,
  };
}

describe("renderPretty", () => {
  it("renders no issues message", () => {
    const output = renderPretty(makeResult());
    expect(output).toContain("No issues found");
  });

  it("renders diagnostics grouped by message", () => {
    const output = renderPretty(
      makeResult([
        makeDiagnostic({
          rule: "suggestCanonicalClasses",
          message: 'Replace "flex-1" with "grow"',
        }),
        makeDiagnostic({
          rule: "classConflict",
          message: "Contradictory classes",
        }),
      ]),
    );
    expect(output).toContain("Replace");
    expect(output).toContain("Contradictory");
  });

  it("shows file positions with line numbers", () => {
    const output = renderPretty(makeResult([makeDiagnostic()]));
    expect(output).toContain("src/app.tsx");
  });

  it("shows warning count in summary", () => {
    const output = renderPretty(makeResult([makeDiagnostic()]));
    expect(output).toContain("1 warning");
  });

  it("shows count suffix for grouped diagnostics", () => {
    const output = renderPretty(
      makeResult([makeDiagnostic(), makeDiagnostic({ file: "src/other.tsx", line: 10 })]),
    );
    expect(output).toContain("(2)");
  });
});
