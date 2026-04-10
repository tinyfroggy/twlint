import { readFile } from "node:fs/promises";
import path from "node:path";
import fg from "fast-glob";

export type MonorepoInfo = {
  isMonorepo: boolean;
  rootDirectory: string | null;
  workspacePackages: string[];
  tool: "npm" | "pnpm" | "yarn" | "nx" | null;
};

export async function detectMonorepo(
  startDirectory: string = process.cwd(),
): Promise<MonorepoInfo> {
  const root = await findMonorepoRoot(startDirectory);

  if (!root) {
    return {
      isMonorepo: false,
      rootDirectory: null,
      workspacePackages: [],
      tool: null,
    };
  }

  const tool = await detectMonorepoTool(root);
  const workspacePackages = await resolveWorkspacePackages(root, tool);

  return {
    isMonorepo: true,
    rootDirectory: root,
    workspacePackages,
    tool,
  };
}

async function findMonorepoRoot(startDirectory: string): Promise<string | null> {
  let current = startDirectory;

  while (current !== path.dirname(current)) {
    if (await isMonorepoRoot(current)) {
      return current;
    }
    current = path.dirname(current);
  }

  return null;
}

async function isMonorepoRoot(directory: string): Promise<boolean> {
  const pnpmWorkspace = path.join(directory, "pnpm-workspace.yaml");
  if (await fileExists(pnpmWorkspace)) return true;

  const nxConfig = path.join(directory, "nx.json");
  if (await fileExists(nxConfig)) return true;

  const packageJsonPath = path.join(directory, "package.json");
  try {
    const content = await readFile(packageJsonPath, "utf8");
    const parsed = JSON.parse(content) as Record<string, unknown>;
    if (Array.isArray(parsed.workspaces)) return true;
    if (
      typeof parsed.workspaces === "object" &&
      parsed.workspaces !== null &&
      Array.isArray((parsed.workspaces as Record<string, unknown>).packages)
    ) {
      return true;
    }
  } catch {
    return false;
  }

  return false;
}

async function detectMonorepoTool(
  rootDirectory: string,
): Promise<"npm" | "pnpm" | "yarn" | "nx" | null> {
  if (await fileExists(path.join(rootDirectory, "pnpm-workspace.yaml"))) {
    return "pnpm";
  }

  if (await fileExists(path.join(rootDirectory, "nx.json"))) {
    return "nx";
  }

  if (await fileExists(path.join(rootDirectory, "yarn.lock"))) {
    return "yarn";
  }

  if (await fileExists(path.join(rootDirectory, "package-lock.json"))) {
    return "npm";
  }

  return null;
}

async function resolveWorkspacePackages(
  rootDirectory: string,
  _tool: "npm" | "pnpm" | "yarn" | "nx" | null,
): Promise<string[]> {
  try {
    const content = await readFile(path.join(rootDirectory, "package.json"), "utf8");
    const parsed = JSON.parse(content) as Record<string, unknown>;
    const workspaces = extractWorkspaces(parsed);

    if (!workspaces || workspaces.length === 0) return [];

    const resolved = await fg(workspaces, {
      cwd: rootDirectory,
      onlyDirectories: true,
      absolute: true,
    });

    return resolved;
  } catch {
    return [];
  }
}

function extractWorkspaces(packageJson: Record<string, unknown>): string[] | null {
  if (Array.isArray(packageJson.workspaces)) {
    return packageJson.workspaces as string[];
  }

  if (
    typeof packageJson.workspaces === "object" &&
    packageJson.workspaces !== null &&
    Array.isArray((packageJson.workspaces as Record<string, unknown>).packages)
  ) {
    return (packageJson.workspaces as Record<string, unknown>).packages as string[];
  }

  return null;
}

async function fileExists(filePath: string): Promise<boolean> {
  try {
    const { stat } = await import("node:fs/promises");
    await stat(filePath);
    return true;
  } catch {
    return false;
  }
}
