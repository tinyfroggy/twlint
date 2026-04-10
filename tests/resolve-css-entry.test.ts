import { describe, it, expect } from "vitest";
import { resolveCssEntry } from "../src/discovery/resolve-css-entry.js";
import { mkdir, writeFile, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

async function withTempDir(fn: () => Promise<void>) {
  const dir = path.join(os.tmpdir(), `tw-test-css-${Math.random().toString(36).slice(2)}`);
  await mkdir(dir, { recursive: true });
  const originalCwd = process.cwd();
  process.chdir(dir);
  try {
    await fn();
  } finally {
    process.chdir(originalCwd);
    await rm(dir, { recursive: true, force: true });
  }
}

async function createFile(relPath: string, content: string) {
  const filePath = path.resolve(relPath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

describe("resolveCssEntry", () => {
  it("auto-discovers CSS file with @import tailwindcss (double quotes)", async () => {
    await withTempDir(async () => {
      await createFile("src/app.css", '@import "tailwindcss";');
      const result = await resolveCssEntry();
      expect(result).toContain(path.join("src", "app.css"));
    });
  });

  it("auto-discovers CSS file with @import tailwindcss (single quotes)", async () => {
    await withTempDir(async () => {
      await createFile("styles/global.css", "@import 'tailwindcss';");
      const result = await resolveCssEntry();
      expect(result).toContain(path.join("styles", "global.css"));
    });
  });

  it("throws when no tailwindcss import found", async () => {
    await withTempDir(async () => {
      await createFile("src/app.css", "body { color: red; }");
      await expect(resolveCssEntry()).rejects.toThrow(
        "Could not find a Tailwind v4 CSS entry file",
      );
    });
  });

  it("throws when multiple CSS entries exist and none is preferred", async () => {
    await withTempDir(async () => {
      await createFile("a.css", '@import "tailwindcss";');
      await createFile("b.css", '@import "tailwindcss";');
      await expect(resolveCssEntry()).rejects.toThrow("Multiple Tailwind v4 CSS entry files found");
    });
  });

  it("picks preferred entry when multiple exist", async () => {
    await withTempDir(async () => {
      await createFile("src/app.css", '@import "tailwindcss";');
      await createFile("other.css", '@import "tailwindcss";');
      const result = await resolveCssEntry();
      expect(result).toContain(path.join("src", "app.css"));
    });
  });
});
