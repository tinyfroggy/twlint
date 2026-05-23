import { describe, it, expect } from "vitest";
import { resolveRules, DEFAULT_RULES } from "../src/core/rules.js";

const ALL_DEFAULT = DEFAULT_RULES;

describe("resolveRules", () => {
  it("returns default rules when none specified", () => {
    expect(resolveRules()).toEqual(ALL_DEFAULT);
  });

  it("returns default rules when empty array", () => {
    expect(resolveRules([])).toEqual(ALL_DEFAULT);
  });

  it("filters to known rules", () => {
    expect(resolveRules(["canonical-classes", "unknown-rule"])).toEqual(["canonical-classes"]);
  });

  it("accepts all known rule ids", () => {
    expect(
      resolveRules([
        "canonical-classes",
        "class-conflicts",
        "recommended-variant-order",
        "used-blocklisted-class",
        "shorthand-classes",
        "no-duplicate-utilities",
        "canonical-class-order",
        "prefer-truncate-shorthand",
        "no-important-abuse",
        "no-sr-only-display-conflict",
        "consistent-negative-arbitrary-values",
        "prefer-logical-properties",
        "require-motion-reduce-for-animation",
        "no-orphan-layout-utilities",
        "require-flex-for-flex-utilities",
        "require-grid-for-grid-utilities",
        "warn-ineffective-z-index",
        "require-display-for-sizing",
        "warn-hover-on-disabled",
        "require-focus-visible-for-interactive",
        "warn-incomplete-dark-color-pair",
        "prefer-theme-scale",
        "no-magic-spacing",
        "detect-conflicts-in-template-literals",
        "suggest-reusable-patterns",
        "prefer-design-tokens",
      ]),
    ).toHaveLength(25);
  });

  it("resolves prefer-shorthand alias to shorthand-classes", () => {
    expect(resolveRules(["prefer-shorthand"])).toEqual(["shorthand-classes"]);
  });

  it("resolves no-conflicting-utilities alias to class-conflicts", () => {
    expect(resolveRules(["no-conflicting-utilities"])).toEqual(["class-conflicts"]);
  });

  it("resolves aliases alongside known rules", () => {
    expect(
      resolveRules(["prefer-shorthand", "canonical-classes", "no-conflicting-utilities"]),
    ).toEqual(["shorthand-classes", "canonical-classes", "class-conflicts"]);
  });
});

describe("DEFAULT_RULES", () => {
  it("uses a conservative correctness-focused default profile", () => {
    expect(DEFAULT_RULES).toContain("class-conflicts");
    expect(DEFAULT_RULES).toContain("require-flex-for-flex-utilities");
    expect(DEFAULT_RULES).not.toContain("canonical-classes");
    expect(DEFAULT_RULES).not.toContain("warn-incomplete-dark-color-pair");
  });
});
