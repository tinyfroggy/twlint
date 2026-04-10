import { describe, it, expect } from "vitest";
import { resolveProjectInputFiles } from "../src/discovery/resolve-inputs.js";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

async function withTempDir(fn: (dir: string) => Promise<void>) {
  const dir = path.join(os.tmpdir(), `tw-test-${Math.random().toString(36).slice(2)}`);
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

async function createFile(dir: string, relPath: string, content: string) {
  const filePath = path.join(dir, relPath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

describe("resolveProjectInputFiles", () => {
  it("uses default patterns when no patterns provided", async () => {
    await withTempDir(async (dir) => {
      await createFile(
        dir,
        "src/app.tsx",
        'export default function App() { return <div className="flex" /> }',
      );
      const files = await resolveProjectInputFiles([]);
      expect(files.length).toBeGreaterThanOrEqual(1);
      expect(files.some((f) => f.endsWith("app.tsx"))).toBe(true);
    });
  });

  it("finds files matching a glob pattern", async () => {
    await withTempDir(async (dir) => {
      await createFile(dir, "src/app.tsx", "");
      await createFile(dir, "src/utils.ts", "");
      const files = await resolveProjectInputFiles(["src/**/*.tsx"]);
      expect(files.some((f) => f.endsWith("app.tsx"))).toBe(true);
      expect(files.some((f) => f.endsWith("utils.ts"))).toBe(false);
    });
  });

  it("finds files in a directory", async () => {
    await withTempDir(async (dir) => {
      await createFile(dir, "src/app.tsx", "");
      const files = await resolveProjectInputFiles(["src"]);
      expect(files.some((f) => f.endsWith("app.tsx"))).toBe(true);
    });
  });

  it("resolves dot as current directory", async () => {
    await withTempDir(async (dir) => {
      await createFile(dir, "app.tsx", "");
      const files = await resolveProjectInputFiles(["."]);
      expect(files.some((f) => f.endsWith("app.tsx"))).toBe(true);
    });
  });
});
