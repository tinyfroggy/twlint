import { readFile } from "node:fs/promises";
import path from "node:path";

import type { TwlinterConfig } from "./types.js";

const CONFIG_FILE = ".twlinter.json";

export async function loadConfig(configPath?: string): Promise<TwlinterConfig | null> {
  const searchDir = process.cwd();

  if (configPath) {
    return loadConfigFile(path.resolve(searchDir, configPath));
  }

  const candidate = path.join(searchDir, CONFIG_FILE);
  try {
    return await loadConfigFile(candidate);
  } catch {
    // no config file found
  }

  try {
    const pkgPath = path.join(searchDir, "package.json");
    const pkgContent = await readFile(pkgPath, "utf8");
    const pkg = JSON.parse(pkgContent);
    if (pkg.twlinter && typeof pkg.twlinter === "object") {
      return pkg.twlinter as TwlinterConfig;
    }
  } catch {
    // no package.json or no twlinter key
  }

  return null;
}

async function loadConfigFile(filePath: string): Promise<TwlinterConfig> {
  const content = await readFile(filePath, "utf8");
  return JSON.parse(content) as TwlinterConfig;
}
