#!/usr/bin/env node

import { Command } from "commander";

import { lintProject } from "./index.js";
import { renderPretty } from "./reporters/pretty.js";

import type { LintOptions } from "./types.js";

async function runLint(patterns: string[], opts: { verbose?: boolean }): Promise<void> {
  const options: LintOptions = {
    verbose: opts.verbose ?? false,
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
  .name("tw")
  .description(
    [
      "Print Tailwind canonical class suggestions in the terminal.",
      "",
      "Examples:",
      "  tw lint .",
      "  tw lint apps/web",
      '  tw lint "src/**/*.{tsx,html}"',
    ].join("\n"),
  )
  .version("0.1.0", "-v, --version", "display the version number")
  .option("--verbose", "Show file details per rule and configuration info")
  .argument("[patterns...]", "Files or glob patterns to scan")
  .action((patterns: string[], opts) => runLint(patterns, opts));

program
  .command("lint")
  .alias("l")
  .description("Lint files for canonical Tailwind classes")
  .option("--verbose", "Show file details per rule and configuration info")
  .argument("[patterns...]", "Files or glob patterns to scan")
  .action((patterns: string[], opts) => runLint(patterns, opts));

program.addHelpText("after", "\nLearn more: https://github.com/user/tw");

program.parseAsync(process.argv);
