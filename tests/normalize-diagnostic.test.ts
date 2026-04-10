import { describe, it, expect } from "vitest";
import { normalizeDiagnostic } from "../src/core/normalize-diagnostic.js";
import type { TailwindDiagnostic } from "../src/types.js";

function makeRawDiagnostic(overrides: Record<string, unknown> = {}): TailwindDiagnostic {
  return {
    message: 'Replace "flex-1" with "grow"',
    range: {
      start: { line: 4, character: 9 },
    },
    severity: 2,
    code: "suggestCanonicalClasses",
    ...overrides,
  } as TailwindDiagnostic;
}

describe("normalizeDiagnostic", () => {
  it("converts raw diagnostic to internal format", () => {
    const raw = makeRawDiagnostic();
    const result = normalizeDiagnostic(raw, "/project/src/app.tsx");
    expect(result.rule).toBe("suggestCanonicalClasses");
    expect(result.severity).toBe("warning");
    expect(result.line).toBe(5);
    expect(result.column).toBe(10);
    expect(result.source).toBe("tw");
  });

  it("maps severity 1 to error", () => {
    const raw = makeRawDiagnostic({ severity: 1 });
    const result = normalizeDiagnostic(raw, "/project/src/app.tsx");
    expect(result.severity).toBe("error");
  });

  it("defaults rule when code is numeric", () => {
    const raw = makeRawDiagnostic({ code: 42 });
    const result = normalizeDiagnostic(raw, "/project/src/app.tsx");
    expect(result.rule).toBe("suggestCanonicalClasses");
  });

  it("preserves string code as rule", () => {
    const raw = makeRawDiagnostic({ code: "cssConflict" });
    const result = normalizeDiagnostic(raw, "/project/src/app.tsx");
    expect(result.rule).toBe("cssConflict");
  });
});
