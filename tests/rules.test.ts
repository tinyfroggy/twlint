import { describe, it, expect } from "vitest";
import { resolveRules, DEFAULT_RULES } from "../src/core/rules.js";

describe("resolveRules", () => {
  it("returns default rules when none specified", () => {
    expect(resolveRules()).toEqual(["canonical-classes"]);
  });

  it("returns default rules when empty array", () => {
    expect(resolveRules([])).toEqual(["canonical-classes"]);
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
      ]),
    ).toHaveLength(5);
  });
});

describe("DEFAULT_RULES", () => {
  it("includes canonical-classes by default", () => {
    expect(DEFAULT_RULES).toEqual(["canonical-classes"]);
  });
});
