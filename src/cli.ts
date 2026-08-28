#!/usr/bin/env node

import { createRequire } from "node:module";

import { lintProject } from "./core/lint-project.js";
import { renderPretty } from "./reporters/pretty.js";
import { renderJson } from "./reporters/json.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const HELP = `Usage: twlinter [.] [--json]

Scan the current project for Tailwind CSS issues.

Options:
  --json        Print the report as JSON
  -h, --help    Show this help
  -v, --version Show the version`;

async function main(args: string[]): Promise<void> {
  if (args.includes("--help") || args.includes("-h")) {
    console.log(HELP);
    return;
  }

  if (args.includes("--version") || args.includes("-v")) {
    console.log(version);
    return;
  }

  const unknown = args.find((arg) => arg !== "." && arg !== "--json");
  if (unknown) {
    throw new Error(`Unknown option: ${unknown}\n\n${HELP}`);
  }

  const result = await lintProject();
  console.log(args.includes("--json") ? renderJson(result) : renderPretty(result));

  if (result.diagnostics.length > 0) {
    process.exitCode = 1;
  }
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
