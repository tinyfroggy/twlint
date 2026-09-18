import { afterAll, describe, expect, it } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { resolveTailwindProject } from "../src/discovery/resolve-tailwind-project.js";

const V4_FIXTURE = path.resolve(import.meta.dirname, "fixtures", "tw-v4-app");

const tempDirs: string[] = [];

async function createTempDir(): Promise<string> {
  const dir = path.join(os.tmpdir(), `tw-test-resolve-${Math.random().toString(36).slice(2)}`);
  await mkdir(dir, { recursive: true });
  tempDirs.push(dir);
  return dir;
}

async function createFile(rootDir: string, relativePath: string, content: string) {
  const filePath = path.join(rootDir, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

afterAll(async () => {
  await Promise.all(tempDirs.map((dir) => rm(dir, { recursive: true, force: true })));
});

describe("resolveTailwindProject", () => {
  it("detects a v4 project and resolves its CSS entry", async () => {
    const project = await resolveTailwindProject(V4_FIXTURE);
    expect(project.version).toBe(4);
    if (project.version !== 4) throw new Error("expected v4 project");
    expect(project.cssEntry.endsWith(path.join("src", "app.css"))).toBe(true);
  });

  it("rejects unsupported Tailwind versions", async () => {
    const dir = await createTempDir();
    await createFile(
      dir,
      "node_modules/tailwindcss/package.json",
      JSON.stringify({ name: "tailwindcss", version: "2.2.19", main: "index.js" }),
    );
    await createFile(dir, "node_modules/tailwindcss/index.js", "module.exports = {};");

    await expect(resolveTailwindProject(dir)).rejects.toThrow(
      "Unsupported Tailwind CSS version: 2.2.19",
    );
  });

  it("explains that a config needs Tailwind installed", async () => {
    const dir = await createTempDir();
    await createFile(dir, "tailwind.config.js", "module.exports = {};");

    await expect(resolveTailwindProject(dir)).rejects.toThrow(
      "Found a Tailwind CSS config but `tailwindcss` is not installed",
    );
  });
});
