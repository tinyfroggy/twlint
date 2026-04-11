import { describe, it, expect } from "vitest";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { loadDesignSystem } from "../src/adapters/tailwind-design-system.js";

async function withTempDir(fn: (dir: string) => Promise<void>) {
  const dir = path.join(
    os.tmpdir(),
    `tw-test-design-system-${Math.random().toString(36).slice(2)}`,
  );
  await mkdir(dir, { recursive: true });

  try {
    await fn(dir);
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

async function createFile(filePath: string, content: string) {
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

describe("loadDesignSystem", () => {
  it("resolves package stylesheet imports from the scanned project", async () => {
    await withTempDir(async (dir) => {
      const cssEntry = path.join(dir, "src", "app.css");
      const packageRoot = path.join(dir, "node_modules", "tw-animate-css");

      await createFile(
        cssEntry,
        ['@import "tailwindcss";', '@import "tw-animate-css";'].join("\n"),
      );
      await createFile(
        path.join(packageRoot, "package.json"),
        JSON.stringify({ name: "tw-animate-css", main: "./index.css" }),
      );
      await createFile(path.join(packageRoot, "index.css"), ".animate-in { opacity: 1; }\n");

      const result = await loadDesignSystem(cssEntry);

      expect(result.dependencyPaths.has(path.join(packageRoot, "index.css"))).toBe(true);
    });
  });
});
