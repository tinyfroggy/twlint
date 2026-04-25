#!/usr/bin/env node

import { Command } from "commander";

import { lintProject } from "./index.js";
import { renderPretty } from "./reporters/pretty.js";
import { loadConfig } from "./config/load-config.js";

import type { LintOptions } from "./types.js";

async function runLint(
  patterns: string[],
  opts: { verbose?: boolean; config?: string },
): Promise<void> {
  const config = await loadConfig(opts.config);

  const options: LintOptions = {
    verbose: opts.verbose ?? false,
    ignorePatterns: config?.ignorePatterns,
    classIgnorePatterns: config?.classIgnorePatterns,
    maxFileSize: config?.maxFileSize,
    rules: config?.rules,
    cssEntry: config?.cssEntry,
  };

  const result = await lintProject(patterns, options);

  if (result.matchedFiles === 0) {
    console.log("No files matched.");
    return;
  }

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

  if (result.diagnostics.length > 0) {
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
  .version("0.1.2", "-v, --version", "display the version number")
  .option("--verbose", "Show file details per rule and configuration info")
  .option("-c, --config <path>", "Path to config file")
  .argument("[patterns...]", "Files or glob patterns to scan")
  .action((patterns: string[], opts) => runLint(patterns, opts));

program
  .command("lint")
  .alias("l")
  .description("Lint files for canonical Tailwind classes")
  .option("--verbose", "Show file details per rule and configuration info")
  .option("-c, --config <path>", "Path to config file")
  .argument("[patterns...]", "Files or glob patterns to scan")
  .action((patterns: string[], opts) => runLint(patterns, opts));

program.parseAsync(process.argv);
