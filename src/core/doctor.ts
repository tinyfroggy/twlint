import { createValidationState, type ThemeContext } from "../adapters/tailwind-language-service.js";
import {
  resolveInstalledTailwind,
  resolveTailwindProject,
} from "../discovery/resolve-tailwind-project.js";
import { resolveConfig } from "../rules/config.js";

import type { RuleCapability } from "../rules/catalog.js";
import type { RuleSeverity, TwlinterConfig } from "../rules/config.js";
import type { TailwindProject } from "../discovery/resolve-tailwind-project.js";

export type DoctorRule = {
  id: string;
  description: string;
  capability: RuleCapability;
  severity: RuleSeverity;
  status: "active" | "off" | "skipped";
  reason?: string;
};

export type DoctorReport = {
  rootDir: string;
  tailwind: {
    version: string;
    major: number;
    entry: string | null;
  } | null;
  designSystem: {
    loaded: boolean;
    v3: boolean;
    themeColors: number;
    dependencies: number;
    themeFile: string | null;
    error: string | null;
  };
  rules: DoctorRule[];
  warnings: string[];
};

/**
 * Report what twlint can and cannot check in this project — the "what's
 * missing" view. Never throws for a missing/broken Tailwind setup; it records
 * the reason instead so it can be shown to the user.
 */
export async function runDoctor(
  rootDir: string,
  config?: TwlinterConfig | null,
): Promise<DoctorReport> {
  const resolved = resolveConfig(config);
  const warnings: string[] = [];
  const installed = resolveInstalledTailwind(rootDir);

  let project: TailwindProject | null = null;
  try {
    project = await resolveTailwindProject(rootDir);
  } catch (error) {
    warnings.push(error instanceof Error ? error.message : String(error));
  }

  let designSystemLoaded = false;
  let v3 = project?.version === 3;
  let theme: ThemeContext | undefined;
  let dependencies = 0;
  let designError: string | null = null;

  if (project) {
    try {
      const validation = await createValidationState(project);
      designSystemLoaded = Boolean(validation.designSystem);
      v3 = project.version === 3;
      theme = validation.theme;
      dependencies = countDependencies(validation.dependencyPaths);
    } catch (error) {
      designError = error instanceof Error ? error.message : String(error);
      warnings.push(`Could not load the Tailwind design system: ${designError}`);
    }
  }

  const hasContext = designSystemLoaded || v3;

  const rules: DoctorRule[] = resolved.all.map((rule) => {
    const base = {
      id: rule.meta.id,
      description: rule.meta.description,
      capability: rule.meta.capability,
      severity: rule.severity,
    };

    if (rule.severity === "off") {
      return { ...base, status: "off" as const, reason: "disabled in config" };
    }

    const capability = describeCapability(rule.meta.capability, {
      designSystemLoaded,
      v3,
      hasContext,
    });

    return capability.ok
      ? { ...base, status: "active" as const }
      : { ...base, status: "skipped" as const, reason: capability.reason };
  });

  return {
    rootDir,
    tailwind: installed
      ? {
          version: installed.version,
          major: installed.major,
          entry: project?.version === 4 ? project.cssEntry : (project?.configPath ?? null),
        }
      : null,
    designSystem: {
      loaded: designSystemLoaded,
      v3,
      themeColors: theme?.colors.size ?? 0,
      dependencies,
      themeFile: theme?.file ?? null,
      error: designError,
    },
    rules,
    warnings,
  };
}

function describeCapability(
  capability: RuleCapability,
  state: { designSystemLoaded: boolean; v3: boolean; hasContext: boolean },
): { ok: true } | { ok: false; reason: string } {
  switch (capability) {
    case "text":
      return { ok: true };
    case "design-system":
      if (state.designSystemLoaded) return { ok: true };
      return {
        ok: false,
        reason: state.v3
          ? "needs the Tailwind v4 design system (project uses v3)"
          : "no dynamic Tailwind design system (v4) available",
      };
    case "design-system-or-v3":
      if (state.hasContext) return { ok: true };
      return { ok: false, reason: "no Tailwind design system or v3 context available" };
    default:
      return { ok: false, reason: "unknown capability" };
  }
}

function countDependencies(dependencyPaths: Iterable<string> | undefined): number {
  if (!dependencyPaths) return 0;
  let count = 0;
  for (const _ of dependencyPaths) count++;
  return count;
}

/** Rule ids in the catalog, for `twlinter --rules`. */
export function listRules(config?: TwlinterConfig | null): DoctorRule[] {
  return resolveConfig(config).all.map((rule) => ({
    id: rule.meta.id,
    description: rule.meta.description,
    capability: rule.meta.capability,
    severity: rule.severity,
    status: rule.severity === "off" ? "off" : "active",
  }));
}
