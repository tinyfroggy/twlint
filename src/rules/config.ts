import { RULE_CATALOG, RULE_BY_ID } from "./catalog.js";

import type { RuleDefaultSeverity, RuleMeta } from "./catalog.js";

export type RuleSeverity = "off" | "warn" | "error";

/** A rule setting: `"error"`, `["warn", options]`, or `false` to disable. */
export type RuleSetting = RuleSeverity | boolean | [RuleSeverity, unknown];

export type TwlinterRulesConfig = Record<string, RuleSetting>;

/** The user-facing config shape, shared by the CLI and the plugin. */
export type TwlinterConfig = {
  rules?: TwlinterRulesConfig;
  /** Extra glob(s) to ignore, relative to the project root. */
  ignore?: string[];
  /** Restrict the scan to these glob(s). */
  files?: string[];
};

export type ResolvedRule = {
  meta: RuleMeta;
  /** `"off"` when disabled. */
  severity: RuleSeverity;
  options?: unknown;
  /** True when the user explicitly configured this rule. */
  explicit: boolean;
};

export type ResolvedConfig = {
  all: ResolvedRule[];
  enabled: ResolvedRule[];
  unknownRules: string[];
  invalidRules: string[];
};

function normalizeSeverity(value: unknown): RuleSeverity | null {
  if (value === false) return "off";
  if (value === true) return null;
  if (value === "off" || value === "warn" || value === "error") return value;
  return null;
}

function normalizeSetting(
  id: string,
  setting: RuleSetting,
  invalid: string[],
): { severity: RuleSeverity; options?: unknown } | null {
  if (Array.isArray(setting)) {
    const [severity, options] = setting;
    const normalized = normalizeSeverity(severity);
    if (normalized === null) {
      invalid.push(id);
      return null;
    }
    return { severity: normalized, options };
  }

  const normalized = normalizeSeverity(setting);
  if (normalized === null) {
    invalid.push(id);
    return null;
  }
  return { severity: normalized };
}

function defaultSeverity(meta: RuleMeta): RuleSeverity {
  return meta.defaultSeverity satisfies RuleDefaultSeverity;
}

/**
 * Merge a user config over the catalog defaults. Unlisted rules keep their
 * default severity (so enabling a project means opting out with `"off"`),
 * matching the zero-config CLI behaviour.
 */
export function resolveConfig(config?: TwlinterConfig | null): ResolvedConfig {
  const raw = config?.rules ?? {};
  const invalidRules: string[] = [];
  const unknownRules: string[] = [];
  const all: ResolvedRule[] = [];

  for (const meta of RULE_CATALOG) {
    const setting = raw[meta.id];
    if (setting === undefined) {
      all.push({ meta, severity: defaultSeverity(meta), explicit: false });
      continue;
    }

    const normalized = normalizeSetting(meta.id, setting, invalidRules);
    if (normalized === null) {
      all.push({ meta, severity: defaultSeverity(meta), explicit: false });
      continue;
    }

    all.push({
      meta,
      severity: normalized.severity,
      options: normalized.options,
      explicit: true,
    });
  }

  for (const id of Object.keys(raw)) {
    if (!RULE_BY_ID.has(id)) unknownRules.push(id);
  }

  return {
    all,
    enabled: all.filter((rule) => rule.severity !== "off"),
    unknownRules,
    invalidRules,
  };
}

export function isSeverity(value: unknown): value is RuleSeverity {
  return value === "off" || value === "warn" || value === "error";
}
