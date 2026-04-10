#!/usr/bin/env node

import { Command } from "commander";

import { formatDiagnostic } from "./formatter.js";
import { scan } from "./scan.js";

const program = new Command();

function configureLintCommand(command: Command): Command {
  return command
    .option(
      "-c, --css-entry <file>",
      "Tailwind v4 CSS entry file, for example ./src/app.css",
    )
    .option("--no-cache", "Disable the persistent cache")
    .argument("[patterns...]", "Files or glob patterns to scan")
    .action(runLint);
}

async function runLint(
  patterns: string[],
  options: { cssEntry?: string; cache?: boolean },
) {
  const result = await scan(patterns, {
    cssEntry: options.cssEntry,
    useCache: options.cache,
  });
  const diagnostics = result.diagnostics;

  if (result.matchedFiles === 0) {
    console.log("No files matched.");
    return;
  }

  if (diagnostics.length === 0) {
    console.log("No canonical class suggestions found.");
    return;
  }

  for (const diagnostic of diagnostics) {
    console.log(formatDiagnostic(diagnostic));
  }

  console.log(`\nFound ${diagnostics.length} diagnostic(s).`);
}

program
  .name("tw")
  .description("Print Tailwind canonical class suggestions in the terminal");

configureLintCommand(program);

configureLintCommand(
  program
    .command("lint")
    .alias("l")
    .description("Lint files for canonical Tailwind classes"),
);

program.parseAsync(process.argv);
