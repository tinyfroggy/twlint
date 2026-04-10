#!/usr/bin/env node

import { Command } from "commander";

import { formatDiagnostic } from "./formatter.js";
import { scan } from "./scan.js";

const program = new Command();

program
  .name("cli-tw")
  .description("Print Tailwind canonical class suggestions in the terminal")
  .argument("[patterns...]", "Files or glob patterns to scan")
  .action(async (patterns: string[]) => {
    const diagnostics = await scan(patterns);

    if (diagnostics.length === 0) {
      console.log("No files matched.");
      return;
    }

    for (const diagnostic of diagnostics) {
      console.log(formatDiagnostic(diagnostic));
    }

    console.log(`\nFound ${diagnostics.length} diagnostic(s).`);
  });

program.parseAsync(process.argv);
