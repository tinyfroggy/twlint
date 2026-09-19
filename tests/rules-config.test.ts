import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";

import { RULE_CATALOG, RULE_IDS } from "../src/rules/catalog.js";
import { resolveConfig } from "../src/rules/config.js";
import { runRules } from "../src/rules/run.js";

describe("rule catalog", () => {
  it("has unique ids", () => {
    expect(new Set(RULE_IDS).size).toBe(RULE_IDS.length);
  });

  it("describes every rule", () => {
    for (const rule of RULE_CATALOG) {
      expect(rule.description.length).toBeGreaterThan(0);
      expect(rule.defaultSeverity).toMatch(/^(warn|error)$/);
    }
  });
});

describe("resolveConfig", () => {
  it("enables every rule at its default severity with no config", () => {
    const resolved = resolveConfig();
    expect(resolved.enabled).toHaveLength(RULE_CATALOG.length);
    expect(resolved.enabled.every((rule) => rule.severity !== "off")).toBe(true);
  });

  it("turns a rule off", () => {
    const resolved = resolveConfig({ rules: { "no-raw-colors": "off" } });
    const rule = resolved.all.find((entry) => entry.meta.id === "no-raw-colors");
    expect(rule?.severity).toBe("off");
    expect(resolved.enabled.some((entry) => entry.meta.id === "no-raw-colors")).toBe(false);
  });

  it("accepts error severity with options", () => {
    const resolved = resolveConfig({
      rules: { "no-raw-colors": ["error", { allow: ["bg-amber-100"] }] },
    });
    const rule = resolved.all.find((entry) => entry.meta.id === "no-raw-colors");
    expect(rule?.severity).toBe("error");
    expect(rule?.options).toEqual({ allow: ["bg-amber-100"] });
    expect(rule?.explicit).toBe(true);
  });

  it("reports unknown and invalid rules", () => {
    const resolved = resolveConfig({
      rules: {
        "not-a-rule": "warn",
        // @ts-expect-error deliberately invalid severity
        "no-raw-colors": "loud",
      },
    });
    expect(resolved.unknownRules).toContain("not-a-rule");
    expect(resolved.invalidRules).toContain("no-raw-colors");
  });
});

describe("runRules", () => {
  const document = TextDocument.create("file:///test.tsx", "typescriptreact", 1, "x");

  it("skips design-system rules when no design system is available", async () => {
    const result = await runRules(
      {
        file: "/test.tsx",
        text: "x",
        document,
        state: undefined,
        designSystem: undefined,
        tailwindVersion: 4,
      },
      { rules: { suggestCanonicalClasses: "warn" } },
    );

    expect(result.ran).not.toContain("suggestCanonicalClasses");
    expect(result.skipped.map((rule) => rule.id)).toContain("suggestCanonicalClasses");
  });

  it("runs text rules without any design system", async () => {
    const result = await runRules(
      {
        file: "/test.tsx",
        text: '<div className="p-4 p-4" />',
        document,
        state: undefined,
        designSystem: undefined,
        tailwindVersion: 4,
      },
      { rules: { "no-duplicate-utilities": "error" } },
    );

    expect(result.ran).toContain("no-duplicate-utilities");
    expect(result.diagnostics).toHaveLength(1);
    expect(result.diagnostics[0]?.severity).toBe("error");
  });
});
