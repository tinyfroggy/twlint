import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, mkdirSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { readDeclaredColorTokens, flattenColorScale } from "../src/core/theme-tokens.js";

const tempDirs: string[] = [];

function writeCss(name: string, css: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "twlinter-theme-"));
  tempDirs.push(dir);
  const file = path.join(dir, name);
  writeFileSync(file, css);
  return file;
}

afterEach(() => {
  for (const dir of tempDirs.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

describe("readDeclaredColorTokens", () => {
  it("collects --color-* tokens from @theme blocks", () => {
    const file = writeCss(
      "app.css",
      [
        '@import "tailwindcss";',
        "@theme {",
        "  --color-primary: oklch(0.6 0.2 250);",
        "  --color-muted-foreground: #666;",
        "}",
      ].join("\n"),
    );

    expect([...readDeclaredColorTokens([file])].sort()).toEqual(["muted-foreground", "primary"]);
  });

  it("ignores declarations outside @theme", () => {
    const file = writeCss(
      "app.css",
      ":root { --color-primary: #000; } @theme { --color-brand: #111; }",
    );

    expect([...readDeclaredColorTokens([file])]).toEqual(["brand"]);
  });

  it("honors `initial` resets in cascade order", () => {
    const file = writeCss(
      "app.css",
      "@theme { --color-brand: #111; --color-brand: initial; --color-keep: #222; }",
    );

    expect([...readDeclaredColorTokens([file])]).toEqual(["keep"]);
  });

  it("clears every token on `--color-*: initial`", () => {
    const file = writeCss(
      "app.css",
      "@theme { --color-brand: #111; --color-*: initial; --color-primary: #222; }",
    );

    expect([...readDeclaredColorTokens([file])]).toEqual(["primary"]);
  });

  it("ignores tokens declared inside packages", () => {
    const root = mkdtempSync(path.join(os.tmpdir(), "twlinter-pkg-"));
    tempDirs.push(root);
    const packageDir = path.join(root, "node_modules", "tailwindcss");
    mkdirSync(packageDir, { recursive: true });
    const file = path.join(packageDir, "theme.css");
    writeFileSync(file, "@theme { --color-red-500: #ef4444; }");

    expect(readDeclaredColorTokens([file]).size).toBe(0);
  });

  it("skips non-CSS entries", () => {
    expect(readDeclaredColorTokens(["/tmp/tailwind.config.js"]).size).toBe(0);
  });
});

describe("flattenColorScale", () => {
  it("flattens nested scales and DEFAULT", () => {
    const colors = flattenColorScale({
      primary: { DEFAULT: "#111", foreground: "#fff" },
      red: { 500: "#f00" },
      brand: "#123456",
      scale: () => "#000",
    });

    expect([...colors.keys()].sort()).toEqual([
      "brand",
      "primary",
      "primary-foreground",
      "red-500",
    ]);
    expect(colors.get("primary")).toBe("#111");
  });
});
