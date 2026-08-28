import { describe, it, expect } from "vitest";
import { renderPretty } from "../src/reporters/pretty.js";
import type { LintResult, Diagnostic, ProjectInfo } from "../src/types.js";

const projectInfo: ProjectInfo = {
  rootDirectory: "/test",
  cssEntryPath: "/test/src/app.css",
  tailwindVersion: "4.2.2",
  supported: true,
  sourceExtensions: [".tsx"],
  isMonorepo: false,
  monorepoTool: null,
  workspacePackages: [],
};

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
    project: projectInfo,
  };
}

describe("renderPretty", () => {
  it("renders no issues message", () => {
    const output = renderPretty(makeResult(), false);
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
          severity: "error",
          message: "Contradictory classes",
        }),
      ]),
      false,
    );
    expect(output).toContain("Replace");
    expect(output).toContain("Contradictory");
  });

  it("shows file positions with line numbers in verbose mode", () => {
    const output = renderPretty(makeResult([makeDiagnostic()]), true);
    expect(output).toContain("src/app.tsx:5");
  });

  it("shows file positions even in non-verbose mode", () => {
    const output = renderPretty(makeResult([makeDiagnostic()]), false);
    expect(output).toContain("src/app.tsx");
  });

  it("shows warning count in summary", () => {
    const output = renderPretty(makeResult([makeDiagnostic()]), false);
    expect(output).toContain("1 warning");
  });

  it("shows error count in summary", () => {
    const output = renderPretty(makeResult([makeDiagnostic({ severity: "error" })]), false);
    expect(output).toContain("1 error");
  });

  it("shows count suffix for grouped diagnostics", () => {
    const output = renderPretty(
      makeResult([makeDiagnostic(), makeDiagnostic({ file: "src/other.tsx", line: 10 })]),
      false,
    );
    expect(output).toContain("(2)");
  });
});
