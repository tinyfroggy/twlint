import { readFileSync, existsSync } from "node:fs";
import path from "node:path";

import type { TwlinterConfig } from "./config.js";

const CONFIG_FILE_NAMES = ["twlinter.config.json", ".twlintrc.json", ".twlintrc", "twlinter.json"];

export type LoadedConfig = {
  config: TwlinterConfig | null;
  /** Absolute path of the file the config came from, if any. */
  path: string | null;
};

function parseConfig(text: string, sourcePath: string): TwlinterConfig {
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch (error) {
    throw new Error(
      `twlinter: could not parse ${sourcePath}: ${error instanceof Error ? error.message : error}`,
    );
  }

  if (typeof parsed !== "object" || parsed === null || Array.isArray(parsed)) {
    throw new Error(`twlinter: ${sourcePath} must contain a JSON object.`);
  }

  return parsed as TwlinterConfig;
}

function readPackageConfig(rootDir: string): LoadedConfig | null {
  const packagePath = path.join(rootDir, "package.json");
  if (!existsSync(packagePath)) return null;

  try {
    const manifest = JSON.parse(readFileSync(packagePath, "utf8")) as Record<string, unknown>;
    const config = manifest.twlinter;
    if (typeof config === "object" && config !== null && !Array.isArray(config)) {
      return { config: config as TwlinterConfig, path: packagePath };
    }
  } catch {
    // A malformed package.json is not our problem to report here.
  }

  return null;
}

/**
 * Load the twlint config. An explicit `configPath` wins; otherwise the first
 * config file found in the project root, then `package.json#twlinter`.
 */
export function loadConfig(rootDir: string, configPath?: string): LoadedConfig {
  if (configPath) {
    const resolved = path.resolve(rootDir, configPath);
    if (!existsSync(resolved)) {
      throw new Error(`twlinter: config file not found: ${resolved}`);
    }
    return { config: parseConfig(readFileSync(resolved, "utf8"), resolved), path: resolved };
  }

  for (const name of CONFIG_FILE_NAMES) {
    const candidate = path.join(rootDir, name);
    if (existsSync(candidate)) {
      return { config: parseConfig(readFileSync(candidate, "utf8"), candidate), path: candidate };
    }
  }

  return readPackageConfig(rootDir) ?? { config: null, path: null };
}
