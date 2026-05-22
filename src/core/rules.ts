export type RuleId =
  | "canonical-classes"
  | "class-conflicts"
  | "recommended-variant-order"
  | "used-blocklisted-class"
  | "shorthand-classes";

export const DEFAULT_RULES: RuleId[] = ["canonical-classes"];

export function resolveRules(requested?: string[]): RuleId[] {
  if (!requested || requested.length === 0) {
    return DEFAULT_RULES;
  }

  const known = new Set<string>([
    "canonical-classes",
    "class-conflicts",
    "recommended-variant-order",
    "used-blocklisted-class",
    "shorthand-classes",
  ]);
  return requested.filter((r) => known.has(r)) as RuleId[];
}
