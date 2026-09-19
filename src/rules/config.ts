import { RULE_CATALOG, RULE_BY_ID, RULE_IDS } from "./catalog.js";

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

/**
 * Human-readable warnings for rules the user configured that twlinter could
 * not apply: unknown ids (usually typos) and invalid severities. Surfaced by
 * the CLI on stderr so `--json` output stays machine-readable.
 */
export function configWarnings(resolved: ResolvedConfig): string[] {
  const warnings: string[] = [];

  for (const id of resolved.unknownRules) {
    const suggestion = nearestRuleId(id);
    warnings.push(
      suggestion
        ? `Unknown rule "${id}". Did you mean "${suggestion}"?`
        : `Unknown rule "${id}". Run \`twlinter --rules\` to list valid rules.`,
    );
  }

  for (const id of resolved.invalidRules) {
    warnings.push(
      `Invalid setting for rule "${id}". Use "off", "warn", "error", false, or ["warn"|"error", options].`,
    );
  }

  return warnings;
}

/** Closest catalog rule id to a typo, or `null` when nothing is close. */
function nearestRuleId(id: string): string | null {
  const maxDistance = Math.max(1, Math.min(3, Math.floor(id.length / 3) + 1));
  let best: string | null = null;
  let bestDistance = maxDistance + 1;

  for (const candidate of RULE_IDS) {
    if (Math.abs(candidate.length - id.length) >= bestDistance) continue;
    const distance = editDistance(id, candidate, bestDistance - 1);
    if (distance < bestDistance) {
      best = candidate;
      bestDistance = distance;
    }
  }

  return bestDistance <= maxDistance ? best : null;
}

/** Levenshtein distance, abandoned once a row exceeds `max`. */
function editDistance(a: string, b: string, max: number): number {
  if (max < 0) return max + 1;
  if (Math.abs(a.length - b.length) > max) return max + 1;

  let previous = Array.from({ length: b.length + 1 }, (_, index) => index);
  let current = Array.from({ length: b.length + 1 }, () => 0);

  for (let i = 1; i <= a.length; i++) {
    current[0] = i;
    let rowMinimum = current[0];

    for (let j = 1; j <= b.length; j++) {
      const substitution = a[i - 1] === b[j - 1] ? 0 : 1;
      current[j] = Math.min(previous[j] + 1, current[j - 1] + 1, previous[j - 1] + substitution);
      if (current[j] < rowMinimum) rowMinimum = current[j];
    }

    if (rowMinimum > max) return max + 1;
    [previous, current] = [current, previous];
  }

  return previous[b.length];
}
