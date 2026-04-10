export type RuleId =
  | "canonical-classes"
  | "class-conflicts"
  | "recommended-variant-order"
  | "used-blocklisted-class";

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
  ]);
  return requested.filter((r) => known.has(r)) as RuleId[];
}
