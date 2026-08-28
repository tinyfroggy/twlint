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

  it("ignores removed noisy rules", () => {
    expect(
      resolveRules([
        "canonical-class-order",
        "recommended-variant-order",
        "no-orphan-layout-utilities",
        "warn-ineffective-z-index",
        "require-display-for-sizing",
        "require-focus-visible-for-interactive",
      ]),
    ).toEqual([]);
  });

  it("accepts all known rule ids", () => {
    expect(
      resolveRules([
        "canonical-classes",
        "class-conflicts",
        "used-blocklisted-class",
        "shorthand-classes",
        "no-duplicate-utilities",
        "prefer-truncate-shorthand",
        "no-important-abuse",
        "no-sr-only-display-conflict",
        "consistent-negative-arbitrary-values",
        "prefer-logical-properties",
        "require-motion-reduce-for-animation",
        "require-flex-for-flex-utilities",
        "require-grid-for-grid-utilities",
        "warn-hover-on-disabled",
        "warn-incomplete-dark-color-pair",
        "prefer-theme-scale",
        "no-magic-spacing",
        "detect-conflicts-in-template-literals",
        "prefer-design-tokens",
      ]),
    ).toHaveLength(19);
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
  it("runs most known rules by default, excluding noisy opt-in rules", () => {
    expect(DEFAULT_RULES).toHaveLength(15);
    expect(DEFAULT_RULES).toContain("canonical-classes");
    expect(DEFAULT_RULES).toContain("class-conflicts");
    expect(DEFAULT_RULES).toContain("shorthand-classes");
    expect(DEFAULT_RULES).toContain("prefer-design-tokens");
    // Opt-in (too noisy or need parent-context analysis)
    expect(DEFAULT_RULES).not.toContain("prefer-logical-properties");
    expect(DEFAULT_RULES).not.toContain("require-motion-reduce-for-animation");
    expect(DEFAULT_RULES).not.toContain("warn-incomplete-dark-color-pair");
    expect(DEFAULT_RULES).not.toContain("require-grid-for-grid-utilities");
  });
});
