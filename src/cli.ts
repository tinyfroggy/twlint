#!/usr/bin/env node

import { createRequire } from "node:module";

import { lintProject } from "./core/lint-project.js";
import { listRules, runDoctor } from "./core/doctor.js";
import { renderPretty } from "./reporters/pretty.js";
import { renderJson } from "./reporters/json.js";
import { renderDoctor, renderRules } from "./reporters/doctor.js";
import { loadConfig } from "./rules/load-config.js";

const require = createRequire(import.meta.url);
const { version } = require("../package.json") as { version: string };

const HELP = `Usage: twlinter [.] [options]

Scan the current project for Tailwind CSS issues.

Options:
  --fix             Apply fixes for problems that can be fixed
  --json            Print the report as JSON
  --doctor          Report the detected project and which rules can run
  --rules           List every rule with its capability and default severity
  --explain         After a scan, list rules that ran, were off, or were skipped
  --config <path>   Use a specific config file
  --no-config       Ignore any config file and use rule defaults
  --all             Run every rule, ignoring the config (used by the plugin)
  -h, --help        Show this help
  -v, --version     Show the version`;

type CliOptions = {
  fix: boolean;
  json: boolean;
  doctor: boolean;
  rules: boolean;
  explain: boolean;
  all: boolean;
  noConfig: boolean;
  configPath?: string;
};

function parseArgs(args: string[]): CliOptions | "help" | "version" {
  const options: CliOptions = {
    fix: false,
    json: false,
    doctor: false,
    rules: false,
    explain: false,
    all: false,
    noConfig: false,
  };

  for (let i = 0; i < args.length; i++) {
    const arg = args[i];

    switch (arg) {
      case ".":
        break;
      case "--fix":
        options.fix = true;
        break;
      case "--json":
        options.json = true;
        break;
      case "--doctor":
        options.doctor = true;
        break;
      case "--rules":
        options.rules = true;
        break;
      case "--explain":
        options.explain = true;
        break;
      case "--all":
        options.all = true;
        break;
      case "--no-config":
        options.noConfig = true;
        break;
      case "--config": {
        const value = args[++i];
        if (!value) throw new Error(`--config requires a path.\n\n${HELP}`);
        options.configPath = value;
        break;
      }
      case "--help":
      case "-h":
        return "help";
      case "--version":
      case "-v":
        return "version";
      default:
        throw new Error(`Unknown option: ${arg}\n\n${HELP}`);
    }
  }

  return options;
}

async function main(args: string[]): Promise<void> {
  const parsed = parseArgs(args);

  if (parsed === "help") {
    console.log(HELP);
    return;
  }

  if (parsed === "version") {
    console.log(version);
    return;
  }

  const rootDir = process.cwd();
  const loaded =
    parsed.all || parsed.noConfig
      ? { config: null, path: null }
      : loadConfig(rootDir, parsed.configPath);
  const config = loaded.config;

  if (parsed.rules) {
    console.log(renderRules(listRules(config)));
    return;
  }

  if (parsed.doctor) {
    const report = await runDoctor(rootDir, config);
    console.log(parsed.json ? JSON.stringify(report, null, 2) : renderDoctor(report));
    return;
  }

  const result = await lintProject({ fix: parsed.fix, config: config ?? undefined });
  console.log(parsed.json ? renderJson(result) : renderPretty(result));

  if (parsed.explain) {
    console.error(renderExplain(result, config));
  }

  if (result.diagnostics.length > 0) {
    process.exitCode = 1;
  }
}

function renderExplain(
  result: Awaited<ReturnType<typeof lintProject>>,
  config: ReturnType<typeof loadConfig>["config"],
): string {
  const ran = new Set(result.ranRules);
  const skipped = new Map(result.skippedRules.map((rule) => [rule.id, rule]));
  const lines: string[] = ["Rule report:"];

  for (const rule of listRules(config)) {
    if (ran.has(rule.id)) {
      lines.push(`  ran     ${rule.id}`);
    } else if (skipped.has(rule.id)) {
      lines.push(`  skipped ${rule.id} — ${skipped.get(rule.id)!.reason}`);
    } else if (rule.status === "off") {
      lines.push(`  off     ${rule.id}`);
    } else {
      lines.push(`  idle    ${rule.id} — no findings`);
    }
  }

  return lines.join("\n");
}

main(process.argv.slice(2)).catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
});
