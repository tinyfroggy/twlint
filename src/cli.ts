#!/usr/bin/env node

import { createRequire } from "node:module";

import { Command } from "commander";

import { lintProject } from "./index.js";
import { renderPretty } from "./reporters/pretty.js";
import { renderJson } from "./reporters/json.js";
import { renderSarif } from "./reporters/sarif.js";
import { applyQuiet, shouldFail } from "./reporters/filter.js";
import { loadConfig } from "./config/load-config.js";

import type { LintOptions } from "./types.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

type OutputFormat = "pretty" | "json" | "sarif";

type CliOptions = {
  verbose?: boolean;
  config?: string;
  rules?: string;
  cssEntry?: string;
  format?: string;
  quiet?: boolean;
  maxWarnings?: string;
};

function parseFormat(value: string | undefined): OutputFormat {
  if (value === "json" || value === "sarif" || value === "pretty") return value;
  if (value === undefined) return "pretty";
  throw new Error(`Invalid --format "${value}". Expected one of: pretty, json, sarif.`);
}

function parseMaxWarnings(value: string | undefined): number | undefined {
  if (value === undefined) return undefined;
  const parsed = Number(value);
  if (!Number.isInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid --max-warnings "${value}". Expected a non-negative integer.`);
  }
  return parsed;
}

async function runLint(patterns: string[], opts: CliOptions): Promise<void> {
  const format = parseFormat(opts.format);
  const maxWarnings = parseMaxWarnings(opts.maxWarnings);
  const machine = format === "json" || format === "sarif";

  const config = await loadConfig(opts.config);

  const rules = opts.rules
    ? opts.rules
        .split(",")
        .map((r) => r.trim())
        .filter(Boolean)
    : config?.rules;

  const options: LintOptions = {
    verbose: opts.verbose ?? false,
    ignorePatterns: config?.ignorePatterns,
    classIgnorePatterns: config?.classIgnorePatterns,
    maxFileSize: config?.maxFileSize,
    rules,
    cssEntry: opts.cssEntry || config?.cssEntry,
    components: config?.components,
    strict: config?.strict,
  };

  const rawResult = await lintProject(patterns, options);

  if (rawResult.matchedFiles === 0 && !machine) {
    console.log("No files matched.");
    return;
  }

  const result = applyQuiet(rawResult, opts.quiet ?? false);

  if (machine) {
    console.log(format === "json" ? renderJson(result) : renderSarif(result));
  } else {
    if (options.verbose) {
      console.log("Configuration:");
      console.log(`  Project root: ${result.project.rootDirectory}`);
      console.log(`  CSS entry:    ${result.project.cssEntryPath ?? "(none)"}`);
      console.log(
        `  Tailwind:     ${result.project.tailwindVersion ?? "not found"}${result.project.supported ? "" : " (unsupported)"}`,
      );
      console.log();
    }

    console.log(renderPretty(result, options.verbose ?? false));
  }

  if (shouldFail(result.diagnostics, maxWarnings)) {
    process.exitCode = 1;
  }
}

const program = new Command();

program
  .name("twlinter")
  .description(
    [
      "Print Tailwind canonical class suggestions in the terminal.",
      "",
      "Examples:",
      "  twlinter lint .",
      "  twlinter lint apps/web",
      '  twlinter lint "src/**/*.{tsx,html}"',
    ].join("\n"),
  )
  .version(version, "-v, --version", "display the version number")
  .option("--verbose", "Show file details per rule and configuration info")
  .option("-c, --config <path>", "Path to config file")
  .option("--rules <rules>", "Comma-separated rule names (overrides config)")
  .option("--cssEntry <path>", "Tailwind CSS entry file (overrides auto-detection)")
  .option("--format <pretty|json|sarif>", "Output format", "pretty")
  .option("--quiet", "Only report errors (suppress warnings)")
  .option("--max-warnings <n>", "Fail when the number of warnings exceeds this threshold")
  .argument("[patterns...]", "Files or glob patterns to scan")
  .action((patterns: string[], opts) => runLint(patterns, opts));

program
  .command("lint")
  .alias("l")
  .description("Lint files for canonical Tailwind classes")
  .option("--verbose", "Show file details per rule and configuration info")
  .option("-c, --config <path>", "Path to config file")
  .option("--rules <rules>", "Comma-separated rule names (overrides config)")
  .option("--cssEntry <path>", "Tailwind CSS entry file (overrides auto-detection)")
  .option("--format <pretty|json|sarif>", "Output format", "pretty")
  .option("--quiet", "Only report errors (suppress warnings)")
  .option("--max-warnings <n>", "Fail when the number of warnings exceeds this threshold")
  .argument("[patterns...]", "Files or glob patterns to scan")
  .action((patterns: string[], opts) => runLint(patterns, opts));

program.parseAsync(process.argv);
