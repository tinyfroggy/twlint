import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { mkdtempSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import {
  createValidationState,
  validateCandidate,
} from "../src/adapters/tailwind-language-service.js";
import type { Diagnostic } from "../src/types.js";

let root: string;
let cssEntry: string;
let validation: Awaited<ReturnType<typeof createValidationState>>;

beforeAll(async () => {
  root = mkdtempSync(path.join(os.tmpdir(), "twlinter-raw-colors-"));
  cssEntry = path.join(root, "app.css");
  writeFileSync(
    cssEntry,
    [
      '@import "tailwindcss";',
      "@theme {",
      "  --color-primary: oklch(0.6 0.2 250);",
      "  --color-red-500: #111111;",
      "  --color-muted-foreground: #71717a;",
      "}",
    ].join("\n"),
  );

  validation = await createValidationState({ version: 4, rootDir: root, cssEntry });
}, 60000);

afterAll(() => {
  if (root) rmSync(root, { recursive: true, force: true });
});

async function lint(text: string): Promise<Diagnostic[]> {
  return validateCandidate(
    validation.state,
    validation.designSystem,
    { file: path.join(root, "component.tsx"), text },
    validation.dependencyPaths,
    validation.theme,
  );
}

describe("no-raw-colors in the CLI pipeline", () => {
  it("reads the project's declared theme colors", () => {
    expect(validation.theme?.colors.has("primary")).toBe(true);
    expect(validation.theme?.colors.has("red-500")).toBe(true);
    expect(validation.theme?.file).toBe(path.relative(process.cwd(), cssEntry));
  });

  it("reports raw palette colors and allows declared tokens", async () => {
    const diagnostics = await lint(
      '<div className="bg-pink-500 bg-red-500 bg-primary text-muted-foreground" />',
    );
    const raw = diagnostics.filter((d) => d.rule === "no-raw-colors");

    expect(raw).toHaveLength(1);
    expect(raw[0].message).toContain("bg-pink-500");
  });

  it("suggests the nearest theme color", async () => {
    const diagnostics = await lint('<div className="text-zinc-500" />');
    const [raw] = diagnostics.filter((d) => d.rule === "no-raw-colors");

    expect(raw.message).toContain("text-muted-foreground");
  });

  it("reports undeclared theme colors with a spelling suggestion", async () => {
    const diagnostics = await lint('<div className="bg-primry" />');
    const messages = diagnostics.filter((d) => d.rule === "no-raw-colors").map((d) => d.message);

    expect(messages).toHaveLength(1);
    expect(messages[0]).toContain("not a declared theme color");
    expect(messages[0]).toContain("bg-primary");
  });

  it("leaves undeclared color tokens to this rule, not no-unknown-classes", async () => {
    const diagnostics = await lint('<div className="bg-brand" />');

    expect(diagnostics.filter((d) => d.rule === "no-raw-colors")).toHaveLength(1);
    expect(diagnostics.filter((d) => d.rule === "no-unknown-classes")).toHaveLength(0);
  });

  it("keeps typos of non-color utilities in no-unknown-classes", async () => {
    const diagnostics = await lint('<div className="bg-covr" />');

    expect(diagnostics.filter((d) => d.rule === "no-raw-colors")).toHaveLength(0);
    expect(diagnostics.filter((d) => d.rule === "no-unknown-classes")).toHaveLength(1);
  });

  it("names the nearest theme token for SVG attributes", async () => {
    const diagnostics = await lint('<svg fill="#71717a" />');
    const [raw] = diagnostics.filter((d) => d.rule === "no-raw-colors");

    expect(raw.message).toContain("var(--color-muted-foreground)");
  });
});
