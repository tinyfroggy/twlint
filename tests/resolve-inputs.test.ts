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
      const files = await resolveProjectInputFiles();
      expect(files.length).toBeGreaterThanOrEqual(1);
      expect(files.some((f) => f.endsWith("app.tsx"))).toBe(true);
    });
  });

  it("hard-filters dependency and build directories", async () => {
    await withTempDir(async (dir) => {
      await createFile(dir, "src/app.tsx", "");
      await createFile(dir, "node_modules/pkg/index.tsx", "");
      await createFile(dir, ".next/server/app.tsx", "");
      const files = await resolveProjectInputFiles();
      expect(files.some((f) => f.endsWith("src/app.tsx"))).toBe(true);
      expect(files.some((f) => f.includes("node_modules"))).toBe(false);
      expect(files.some((f) => f.includes(".next"))).toBe(false);
    });
  });

  it("ignores generated output from popular React frameworks", async () => {
    await withTempDir(async (dir) => {
      await createFile(dir, "app/routes/index.tsx", "");
      await createFile(dir, ".tanstack/start/server/index.tsx", "");
      await createFile(dir, ".vinxi/build/client/index.tsx", "");
      await createFile(dir, ".output/public/index.html", "");
      await createFile(dir, ".vercel/output/static/index.html", "");
      await createFile(dir, ".netlify/edge-functions/index.tsx", "");
      await createFile(dir, "public/build/manifest.tsx", "");
      await createFile(dir, "storybook-static/index.html", "");

      const files = await resolveProjectInputFiles();

      expect(files.some((f) => f.endsWith("app/routes/index.tsx"))).toBe(true);
      expect(files.some((f) => f.includes(".tanstack"))).toBe(false);
      expect(files.some((f) => f.includes(".vinxi"))).toBe(false);
      expect(files.some((f) => f.includes(".output"))).toBe(false);
      expect(files.some((f) => f.includes(".vercel"))).toBe(false);
      expect(files.some((f) => f.includes(".netlify"))).toBe(false);
      expect(files.some((f) => f.includes(`${path.sep}public${path.sep}build${path.sep}`))).toBe(
        false,
      );
      expect(files.some((f) => f.includes("storybook-static"))).toBe(false);
    });
  });
});
