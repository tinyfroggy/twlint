import { describe, it, expect } from "vitest";
import { detectMonorepo } from "../src/discovery/detect-monorepo.js";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

async function withTempDir(fn: (dir: string) => Promise<void>) {
  const dir = path.join(os.tmpdir(), `tw-test-mono-${Math.random().toString(36).slice(2)}`);
  await mkdir(dir, { recursive: true });
  const originalCwd = process.cwd();
  process.chdir(dir);
  try {
    await fn(dir);
  } finally {
    process.chdir(originalCwd);
    await rm(dir, { recursive: true, force: true });
  }
}

describe("detectMonorepo", () => {
  it("returns false for a plain single-package project", async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, "package.json"), JSON.stringify({ name: "single-app" }));
      const result = await detectMonorepo(dir);
      expect(result.isMonorepo).toBe(false);
    });
  });

  it("detects npm workspaces monorepo", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, "package.json"),
        JSON.stringify({ name: "mono", workspaces: ["packages/*"] }),
      );
      await writeFile(path.join(dir, "package-lock.json"), "{}");
      const result = await detectMonorepo(dir);
      expect(result.isMonorepo).toBe(true);
      expect(result.tool).toBe("npm");
    });
  });

  it("detects pnpm workspace from pnpm-workspace.yaml", async () => {
    await withTempDir(async (dir) => {
      await writeFile(path.join(dir, "pnpm-workspace.yaml"), "packages:\n  - 'packages/*'");
      const result = await detectMonorepo(dir);
      expect(result.isMonorepo).toBe(true);
      expect(result.tool).toBe("pnpm");
    });
  });

  it("detects yarn workspaces", async () => {
    await withTempDir(async (dir) => {
      await writeFile(
        path.join(dir, "package.json"),
        JSON.stringify({ name: "mono", workspaces: ["apps/*"] }),
      );
      await writeFile(path.join(dir, "yarn.lock"), "");
      const result = await detectMonorepo(dir);
      expect(result.isMonorepo).toBe(true);
      expect(result.tool).toBe("yarn");
    });
  });
});
