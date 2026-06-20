import { describe, it, expect } from "vitest";
import { renderJson } from "../src/reporters/json.js";
import { renderSarif } from "../src/reporters/sarif.js";
import { applyQuiet, filterErrorsOnly, shouldFail } from "../src/reporters/filter.js";
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
    project: projectInfo,
  };
}

describe("renderJson", () => {
  it("emits valid, pretty-printed JSON", () => {
    const output = renderJson(makeResult([makeDiagnostic()]));
    expect(() => JSON.parse(output)).not.toThrow();
    expect(output).toContain("\n  "); // 2-space indentation
  });

  it("includes a summary with counts", () => {
    const output = JSON.parse(
      renderJson(makeResult([makeDiagnostic(), makeDiagnostic({ severity: "error" })])),
    );
    expect(output.summary).toEqual({
      matchedFiles: 10,
      scannedFiles: 8,
      elapsedMilliseconds: 123,
      errorCount: 1,
      warningCount: 1,
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

describe("renderSarif", () => {
  it("emits valid SARIF 2.1.0", () => {
    const sarif = JSON.parse(renderSarif(makeResult([makeDiagnostic()])));
    expect(sarif.version).toBe("2.1.0");
    expect(sarif.$schema).toContain("sarif");
    expect(sarif.runs).toHaveLength(1);
    expect(sarif.runs[0].tool.driver.name).toBe("twlinter");
    expect(sarif.runs[0].tool.driver.informationUri).toBeTruthy();
  });

  it("derives unique rules from diagnostics", () => {
    const sarif = JSON.parse(
      renderSarif(
        makeResult([
          makeDiagnostic({ rule: "ruleA" }),
          makeDiagnostic({ rule: "ruleA" }),
          makeDiagnostic({ rule: "ruleB" }),
        ]),
      ),
    );
    const ids = sarif.runs[0].tool.driver.rules.map((r: { id: string }) => r.id);
    expect(ids).toEqual(["ruleA", "ruleB"]);
  });

  it("produces one result per diagnostic with correct levels and locations", () => {
    const sarif = JSON.parse(
      renderSarif(
        makeResult([
          makeDiagnostic({ severity: "warning" }),
          makeDiagnostic({ severity: "error", file: "src/other.tsx", line: 7, column: 3 }),
        ]),
      ),
    );
    const results = sarif.runs[0].results;
    expect(results).toHaveLength(2);
    expect(results[0].level).toBe("warning");
    expect(results[1].level).toBe("error");

    const loc = results[1].locations[0].physicalLocation;
    expect(loc.artifactLocation.uri).toBe("src/other.tsx");
    expect(loc.region.startLine).toBe(7);
    expect(loc.region.startColumn).toBe(3);
    expect(results[1].message.text).toBe('Replace "flex-1" with "grow"');
  });
});

describe("--quiet filtering", () => {
  it("filterErrorsOnly keeps only error-severity diagnostics", () => {
    const filtered = filterErrorsOnly([
      makeDiagnostic({ severity: "warning" }),
      makeDiagnostic({ severity: "error" }),
    ]);
    expect(filtered).toHaveLength(1);
    expect(filtered[0].severity).toBe("error");
  });

  it("applyQuiet drops warnings when enabled", () => {
    const result = applyQuiet(
      makeResult([makeDiagnostic({ severity: "warning" }), makeDiagnostic({ severity: "error" })]),
      true,
    );
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0].severity).toBe("error");
  });

  it("applyQuiet is a no-op when disabled", () => {
    const input = makeResult([makeDiagnostic()]);
    expect(applyQuiet(input, false)).toBe(input);
  });
});

describe("--max-warnings exit logic", () => {
  it("fails when any diagnostic exists (default behavior)", () => {
    expect(shouldFail([makeDiagnostic()])).toBe(true);
  });

  it("does not fail when there are no diagnostics", () => {
    expect(shouldFail([])).toBe(false);
  });

  it("does not fail at or below the warning threshold with no diagnostics", () => {
    expect(shouldFail([], 0)).toBe(false);
    expect(shouldFail([], 5)).toBe(false);
  });

  it("still fails on diagnostics even when threshold is high", () => {
    expect(shouldFail([makeDiagnostic(), makeDiagnostic()], 10)).toBe(true);
  });
});
