import { describe, expect, it } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { findFiles, globToRegExp } from "../src/discovery/glob.js";

async function withTempDir(fn: (dir: string) => Promise<void>) {
  const dir = path.join(os.tmpdir(), `tw-test-glob-${Math.random().toString(36).slice(2)}`);
  await mkdir(dir, { recursive: true });
  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function createFile(dir: string, relPath: string, content = "") {
  const filePath = path.join(dir, relPath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

describe("globToRegExp", () => {
  it("matches recursive extensions", () => {
    const re = globToRegExp("**/*.css");
    expect(re.test("src/app.css")).toBe(true);
    expect(re.test("app.css")).toBe(true);
    expect(re.test("src/app.tsx")).toBe(false);
  });

  it("expands brace alternatives via findFiles matching", async () => {
    await withTempDir(async (dir) => {
      await createFile(dir, "src/app.tsx", "");
      await createFile(dir, "src/app.css", "");
      await createFile(dir, "src/notes.txt", "");
      const files = await findFiles(["**/*.{tsx,css}"], { cwd: dir });
      expect(files.some((f) => f.endsWith("app.tsx"))).toBe(true);
      expect(files.some((f) => f.endsWith("app.css"))).toBe(true);
      expect(files.some((f) => f.endsWith("notes.txt"))).toBe(false);
    });
  });
});

describe("findFiles", () => {
  it("finds nested files and skips ignored segments", async () => {
    await withTempDir(async (dir) => {
      await createFile(dir, "src/app.tsx", "");
      await createFile(dir, "node_modules/pkg/index.tsx", "");
      await createFile(dir, ".next/server/app.tsx", "");
      const files = await findFiles(["**/*.tsx"], {
        cwd: dir,
        ignore: ["**/node_modules/**", "**/.next/**"],
      });
      expect(files.some((f) => f.endsWith("src/app.tsx"))).toBe(true);
      expect(files.some((f) => f.includes("node_modules"))).toBe(false);
      expect(files.some((f) => f.includes(".next"))).toBe(false);
    });
  });

  it("resolves exact file names without a walk", async () => {
    await withTempDir(async (dir) => {
      await createFile(dir, "tailwind.config.js", "module.exports = {};");
      const files = await findFiles(["tailwind.config.js", "tailwind.config.ts"], {
        cwd: dir,
      });
      expect(files).toHaveLength(1);
      expect(files[0].endsWith("tailwind.config.js")).toBe(true);
    });
  });

  it("skips dotfiles when dot is false", async () => {
    await withTempDir(async (dir) => {
      await createFile(dir, ".hidden/app.tsx", "");
      await createFile(dir, "src/app.tsx", "");
      const files = await findFiles(["**/*.tsx"], { cwd: dir, dot: false });
      expect(files.some((f) => f.endsWith("src/app.tsx"))).toBe(true);
      expect(files.some((f) => f.includes(".hidden"))).toBe(false);
    });
  });
});
