import { describe, it, expect } from "vitest";
import { createRequire } from "node:module";

import {
  RULE_REGISTRY,
  KNOWN_RULES,
  DEFAULT_RULES,
  LS_RULES,
  CUSTOM_RULE_IDS,
  RULE_TO_DIAGNOSTIC_KIND,
} from "../src/core/rules.js";
import { ALL_RULES } from "../src/custom-rules/index.js";

const require = createRequire(import.meta.url);

describe("rule registry single source of truth", () => {
  it("derives KNOWN_RULES and DEFAULT_RULES from the registry in order", () => {
    const ids = RULE_REGISTRY.map((r) => r.id);
    expect(KNOWN_RULES).toEqual(ids);
    expect(DEFAULT_RULES).toEqual(ids);
  });

  it("has all 25 rules", () => {
    expect(DEFAULT_RULES).toHaveLength(25);
  });

  it("custom rules in the registry exactly match the check functions in ALL_RULES", () => {
    const registryCustom: ReadonlySet<string> = CUSTOM_RULE_IDS;
    const checkIds = new Set(ALL_RULES.map((r) => r.id));

    // Every custom rule in the registry has a matching check.
    for (const id of registryCustom) {
      expect(checkIds.has(id)).toBe(true);
    }
    // Every check function corresponds to a registry custom rule.
    for (const id of checkIds) {
      expect(registryCustom.has(id)).toBe(true);
    }
    expect(registryCustom.size).toBe(checkIds.size);
  });

  it("every ls rule has a diagnosticKind and only ls rules have one", () => {
    for (const rule of RULE_REGISTRY) {
      if (rule.bucket === "ls") {
        expect(typeof rule.diagnosticKind).toBe("string");
        expect(rule.diagnosticKind).toBeTruthy();
      } else {
        expect(rule.diagnosticKind).toBeUndefined();
      }
    }
  });

  it("LS_RULES set matches the ls bucket", () => {
    const lsIds = RULE_REGISTRY.filter((r) => r.bucket === "ls").map((r) => r.id);
    expect([...LS_RULES].sort()).toEqual([...lsIds].sort());
    expect(Object.keys(RULE_TO_DIAGNOSTIC_KIND).sort()).toEqual([...lsIds].sort());
  });

  it("diagnostic kinds are among those exposed by the installed language-service", () => {
    const ls = require("@tailwindcss/language-service") as Record<string, unknown>;
    const exposed = new Set(Object.values(ls.DiagnosticKind as Record<string, string>));

    for (const kind of Object.values(RULE_TO_DIAGNOSTIC_KIND)) {
      expect(exposed.has(kind)).toBe(true);
    }
  });

  it("maps the previously-broken rules to the correct diagnostic kinds", () => {
    expect(RULE_TO_DIAGNOSTIC_KIND["recommended-variant-order"]).toBe("recommendedVariantOrder");
    expect(RULE_TO_DIAGNOSTIC_KIND["used-blocklisted-class"]).toBe("usedBlocklistedClass");
  });
});
