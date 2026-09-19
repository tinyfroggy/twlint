import path from "node:path";
import type { TextDocument } from "vscode-languageserver-textdocument";

import { CUSTOM_RULES } from "../custom-rules/index.js";
import { doValidate } from "../adapters/tailwind-language-service-api.js";
import { getShorthandClassDiagnostics } from "../core/shorthand-classes.js";
import { getUnknownClassDiagnostics } from "../core/unknown-classes.js";
import { isUndeclaredColorToken } from "../custom-rules/index.js";

import { resolveConfig } from "./config.js";

import type { CustomRuleOptions, NoRawColorsPolicy } from "../custom-rules/index.js";
import type { Diagnostic, SkippedRule } from "../types.js";
import type { ResolvedConfig, ResolvedRule, TwlinterConfig } from "./config.js";
import type { ThemeContext } from "../adapters/tailwind-language-service.js";

export type RuleRunContext = {
  /** Absolute path of the file being checked. */
  file: string;
  text: string;
  document: TextDocument;
  state: unknown;
  designSystem: unknown;
  dependencyPaths?: Iterable<string>;
  theme?: ThemeContext;
  tailwindVersion: 3 | 4;
};

export type RunResult = {
  diagnostics: Diagnostic[];
  ran: string[];
  skipped: SkippedRule[];
};

const LANGUAGE_SERVICE_RULES = new Set([
  "suggestCanonicalClasses",
  "cssConflict",
  "usedBlocklistedClass",
]);

/**
 * Run every enabled rule against one file. Rules whose capability the context
 * cannot satisfy are skipped and reported, so the CLI can explain exactly what
 * is missing instead of silently producing fewer diagnostics.
 */
export async function runRules(
  ctx: RuleRunContext,
  config?: TwlinterConfig | null,
): Promise<RunResult> {
  const resolved = resolveConfig(config);
  return runResolvedRules(ctx, resolved);
}

export async function runResolvedRules(
  ctx: RuleRunContext,
  resolved: ResolvedConfig,
): Promise<RunResult> {
  const diagnostics: Diagnostic[] = [];
  const ran: string[] = [];
  const skipped: SkippedRule[] = [];

  for (const rule of resolved.enabled) {
    const capability = capabilityFor(rule, ctx);
    if (!capability.ok) {
      skipped.push({
        id: rule.meta.id,
        severity: rule.severity === "error" ? "error" : "warn",
        reason: capability.reason,
      });
      continue;
    }

    let produced: Diagnostic[];
    try {
      produced = await runRule(rule, ctx);
    } catch {
      continue;
    }

    ran.push(rule.meta.id);
    for (const diagnostic of produced) {
      diagnostics.push({
        ...diagnostic,
        severity: rule.severity === "error" ? "error" : "warning",
      });
    }
  }

  return { diagnostics, ran, skipped };
}

async function runRule(rule: ResolvedRule, ctx: RuleRunContext): Promise<Diagnostic[]> {
  const { id } = rule.meta;

  if (rule.meta.capability === "text") {
    const check = CUSTOM_RULES[id];
    if (!check) return [];
    return check(ctx.text, ctx.file, buildCustomOptions(id, rule, ctx));
  }

  if (LANGUAGE_SERVICE_RULES.has(id)) {
    return runLanguageServiceRule(id, ctx);
  }

  switch (id) {
    case "shorthand-classes":
      return getShorthandClassDiagnostics(ctx.designSystem, ctx.document, ctx.file);
    case "no-unknown-classes":
      return getUnknownClassDiagnostics(ctx.state, ctx.designSystem, ctx.document, ctx.file, {
        dependencyPaths: ctx.dependencyPaths,
        ownsColorToken: (token) => isUndeclaredColorToken(token, buildCustomOptions(id, rule, ctx)),
      });
    default:
      return [];
  }
}

async function runLanguageServiceRule(id: string, ctx: RuleRunContext): Promise<Diagnostic[]> {
  const raw = (await doValidate(ctx.state, ctx.document, [id])) as Array<{
    message: string;
    range: { start: { line: number; character: number } };
    code?: string;
  }>;

  return raw.map((diagnostic) => ({
    file: path.relative(process.cwd(), ctx.file),
    line: diagnostic.range.start.line + 1,
    column: diagnostic.range.start.character + 1,
    severity: "warning" as const,
    rule: typeof diagnostic.code === "string" ? diagnostic.code : id,
    message: diagnostic.message,
    source: "tw",
  }));
}

function buildCustomOptions(
  id: string,
  rule: ResolvedRule,
  ctx: RuleRunContext,
): CustomRuleOptions {
  const options: CustomRuleOptions = {
    tailwindVersion: ctx.tailwindVersion,
    themeColors: ctx.theme?.colors,
    themeFile: ctx.theme?.file,
    resolveColor: ctx.theme?.resolveColor,
    classifyClass: ctx.theme?.classifyClass,
  };

  if (id === "no-raw-colors" && rule.options !== undefined) {
    options.noRawColors = rule.options as NoRawColorsPolicy;
  }

  return options;
}

function capabilityFor(
  rule: ResolvedRule,
  ctx: RuleRunContext,
): { ok: true } | { ok: false; reason: string } {
  switch (rule.meta.capability) {
    case "text":
      return { ok: true };
    case "design-system":
      if (ctx.designSystem) return { ok: true };
      return {
        ok: false,
        reason:
          ctx.tailwindVersion === 3
            ? "needs the Tailwind v4 design system (project uses v3)"
            : "no Tailwind design system available",
      };
    case "design-system-or-v3":
      if (ctx.designSystem || ctx.state) return { ok: true };
      return { ok: false, reason: "no Tailwind design system or v3 context available" };
    default:
      return { ok: false, reason: "unknown capability" };
  }
}
