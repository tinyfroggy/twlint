import { describe, it, expect } from "vitest";
import { renderJson } from "../src/reporters/json.js";
import type { LintResult, Diagnostic } from "../src/types.js";

function makeDiagnostic(overrides: Partial<Diagnostic> = {}): Diagnostic {
  return {
    file: "src/app.tsx",
    line: 5,
    column: 10,
    rule: "suggestCanonicalClasses",
    severity: "warning",
    message: 'Replace "flex-1" with "grow"',
    source: "tw",
    ...overrides,
  };
}

function makeResult(diagnostics: Diagnostic[] = []): LintResult {
  return {
    matchedFiles: 10,
    scannedFiles: 8,
    elapsedMilliseconds: 123,
    diagnostics,
  };
}

describe("renderJson", () => {
  it("emits valid, pretty-printed JSON", () => {
    const output = renderJson(makeResult([makeDiagnostic()]));
    expect(() => JSON.parse(output)).not.toThrow();
    expect(output).toContain("\n  "); // 2-space indentation
  });

  it("includes a summary with counts", () => {
    const output = JSON.parse(renderJson(makeResult([makeDiagnostic(), makeDiagnostic()])));
    expect(output.summary).toEqual({
      matchedFiles: 10,
      scannedFiles: 8,
      elapsedMilliseconds: 123,
      warningCount: 2,
    });
  });

  it("maps each diagnostic into the diagnostics array", () => {
    const output = JSON.parse(renderJson(makeResult([makeDiagnostic()])));
    expect(output.diagnostics).toHaveLength(1);
    expect(output.diagnostics[0]).toMatchObject({
      file: "src/app.tsx",
      line: 5,
      column: 10,
      severity: "warning",
      rule: "suggestCanonicalClasses",
      source: "tw",
    });
  });
});
