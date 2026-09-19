import { describe, it, expect } from "vitest";
import plugin, { plugin as namedPlugin, rules } from "../src/plugin.js";
import { CUSTOM_RULES } from "../src/custom-rules/index.js";
import { RULE_IDS } from "../src/rules/catalog.js";
import type { RuleContext, RuleModule } from "../src/plugin.js";

type CapturedReport = {
  message: string;
  line: number;
  column: number;
};

function runRule(rule: RuleModule, code: string, filename = "/test.tsx"): CapturedReport[] {
  const reports: CapturedReport[] = [];
  const context: RuleContext = {
    sourceCode: { getText: () => code },
    filename,
    report(descriptor) {
      reports.push({
        message: descriptor.message,
        line: descriptor.loc.line,
        column: descriptor.loc.column,
      });
    },
  };

  rule.create(context).Program();
  return reports;
}

describe("plugin", () => {
  it("namespaces the plugin as twlinter", () => {
    expect(plugin.meta.name).toBe("twlinter");
  });

  it("is the default export", () => {
    expect(namedPlugin).toBe(plugin);
  });

  it("exposes an ESLint/Oxlint rule for every catalog rule", () => {
    expect(Object.keys(rules).sort()).toEqual([...RULE_IDS].sort());
  });

  it("covers every built-in custom rule", () => {
    for (const id of Object.keys(CUSTOM_RULES)) {
      expect(rules[id], `missing plugin rule for ${id}`).toBeDefined();
    }
  });

  it("gives every rule documentation and schema metadata", () => {
    for (const [name, rule] of Object.entries(rules)) {
      expect(rule.meta.type).toBeTruthy();
      expect(rule.meta.docs.description.length).toBeGreaterThan(0);
      expect(rule.meta.schema).toBeInstanceOf(Array);
      expect(typeof rule.create).toBe("function");
      expect(name.length).toBeGreaterThan(0);
    }
  });

  it("reports a diagnostic at its source location", () => {
    const reports = runRule(rules["no-duplicate-utilities"], '<div className="p-4 p-4" />');
    expect(reports).toHaveLength(1);
    expect(reports[0].message).toContain("p-4");
    expect(reports[0].line).toBe(1);
    expect(reports[0].column).toBeGreaterThanOrEqual(0);
  });

  it("reports nothing for clean source", () => {
    expect(runRule(rules["no-duplicate-utilities"], '<div className="p-4" />')).toEqual([]);
  });

  it("passes rule options through to the check", () => {
    const reports: CapturedReport[] = [];
    const context: RuleContext = {
      sourceCode: { getText: () => '<div className="bg-amber-100 bg-pink-500" />' },
      filename: "/test.tsx",
      options: [{ allow: ["bg-amber-100"] }],
      report(descriptor) {
        reports.push({
          message: descriptor.message,
          line: descriptor.loc.line,
          column: descriptor.loc.column,
        });
      },
    };

    rules["no-raw-colors"].create(context).Program();
    expect(reports).toHaveLength(1);
    expect(reports[0].message).toContain("bg-pink-500");
  });

  it("uses a 0-based column for the reported location", () => {
    const [report] = runRule(rules["no-magic-spacing"], '\n<div className="ms-[17px]" />');
    expect(report.line).toBe(2);
    expect(report.column).toBe(5);
  });

  it("supports the legacy getSourceCode and getFilename accessors", () => {
    const reports: CapturedReport[] = [];
    const context: RuleContext = {
      getSourceCode: () => ({ getText: () => '<div className="p-4 p-4" />' }),
      getFilename: () => "/test.tsx",
      report(descriptor) {
        reports.push({
          message: descriptor.message,
          line: descriptor.loc.line,
          column: descriptor.loc.column,
        });
      },
    };

    rules["no-duplicate-utilities"].create(context).Program();
    expect(reports).toHaveLength(1);
  });

  it("does not throw on an empty document", () => {
    expect(() => runRule(rules["no-magic-spacing"], "")).not.toThrow();
    expect(runRule(rules["no-magic-spacing"], "")).toEqual([]);
  });
});
