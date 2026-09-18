import { describe, it, expect } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { mkdir, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import { getUnknownClassDiagnostics } from "../src/core/unknown-classes.js";
import { loadDesignSystem } from "../src/adapters/tailwind-design-system.js";

function documentFor(text: string): TextDocument {
  return TextDocument.create("file:///test.tsx", "typescriptreact", 1, text);
}

function mockDesignSystem(known: string[]) {
  const names = new Set(known);
  return {
    candidatesToCss(classes: string[]) {
      return classes.map((className) => (names.has(className) ? ".x{}" : null));
    },
    getClassList() {
      return [...names].map((name) => [name, {}]);
    },
  };
}

describe("getUnknownClassDiagnostics", () => {
  it("reports a typo with a spelling suggestion", () => {
    const designSystem = mockDesignSystem(["flex", "flex-col", "p-4"]);

    const diagnostics = getUnknownClassDiagnostics(
      { v4: true },
      designSystem,
      documentFor('<div className="flex-cols p-4" />'),
      "/test.tsx",
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].rule).toBe("no-unknown-classes");
    expect(diagnostics[0].severity).toBe("warning");
    expect(diagnostics[0].message).toContain("flex-cols");
    expect(diagnostics[0].message).toContain("flex-col");
  });

  it("ignores known classes and marker classes", () => {
    const designSystem = mockDesignSystem(["flex", "p-4"]);

    const diagnostics = getUnknownClassDiagnostics(
      { v4: true },
      designSystem,
      documentFor('<div className="group peer group/row flex p-4" />'),
      "/test.tsx",
    );

    expect(diagnostics).toHaveLength(0);
  });

  it("describes an unknown variant when the utility exists", () => {
    const designSystem = mockDesignSystem(["flex"]);

    const diagnostics = getUnknownClassDiagnostics(
      { v4: true },
      designSystem,
      documentFor('<div className="hovr:flex" />'),
      "/test.tsx",
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("variant");
    expect(diagnostics[0].message).not.toContain("Did you mean");
  });

  it("reports a class with no close match without a suggestion", () => {
    const designSystem = mockDesignSystem(["flex"]);

    const diagnostics = getUnknownClassDiagnostics(
      { v4: true },
      designSystem,
      documentFor('<div className="rounded-huge" />'),
      "/test.tsx",
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("rounded-huge");
    expect(diagnostics[0].message).not.toContain("Did you mean");
  });

  it("reports unknown classes passed through cn()", () => {
    const designSystem = mockDesignSystem(["flex", "flex-col", "p-4"]);

    const diagnostics = getUnknownClassDiagnostics(
      { v4: true },
      designSystem,
      documentFor('const a = cn("flex", cond && "flex-cols");'),
      "/test.tsx",
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("flex-cols");
  });

  it("reports unknown classes in className={cn(...)} and object keys", () => {
    const designSystem = mockDesignSystem(["flex", "flex-col", "p-4"]);

    const diagnostics = getUnknownClassDiagnostics(
      { v4: true },
      designSystem,
      documentFor('<div className={clsx({ "flex-cols": active }, "p-4")} />'),
      "/test.tsx",
    );

    expect(diagnostics.map((d) => d.message).join("\n")).toContain("flex-cols");
  });

  it("reports unknown classes in template literal static segments", () => {
    const designSystem = mockDesignSystem(["flex", "flex-col", "p-4"]);

    const diagnostics = getUnknownClassDiagnostics(
      { v4: true },
      designSystem,
      documentFor("const a = cn(`flex flex-cols p-4 ${dynamic}`);"),
      "/test.tsx",
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("flex-cols");
  });

  it("ignores comparison operands inside cn()", () => {
    const designSystem = mockDesignSystem(["flex", "flex-col", "p-4"]);

    const diagnostics = getUnknownClassDiagnostics(
      { v4: true },
      designSystem,
      documentFor('const a = cn(tone === "destructive" && "flex-cols", "p-4");'),
      "/test.tsx",
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("flex-cols");
    expect(diagnostics[0].message).not.toContain("destructive");
  });

  it("ignores strings inside nested calls and non-helper functions", () => {
    const designSystem = mockDesignSystem(["flex", "flex-col"]);

    const diagnostics = getUnknownClassDiagnostics(
      { v4: true },
      designSystem,
      documentFor(
        'const a = cn(format("yyyy-MM-dd"), "flex-cols"); const b = foo("rounded-huge");',
      ),
      "/test.tsx",
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("flex-cols");
  });

  it("falls back to the v3 JIT context when no design system is present", () => {
    const jitContext = {
      getClassOrder(classes: string[]) {
        return classes.map((className) => [className, className === "flex" ? 1n : null]);
      },
      getClassList() {
        return ["flex", "flex-col", "p-4"];
      },
    };

    const diagnostics = getUnknownClassDiagnostics(
      { v4: false, jitContext },
      undefined,
      documentFor('<div className="flex flex-cols" />'),
      "/test.tsx",
    );

    expect(diagnostics).toHaveLength(1);
    expect(diagnostics[0].message).toContain("flex-cols");
    expect(diagnostics[0].message).toContain("flex-col");
  });
});

describe("getUnknownClassDiagnostics against a real design system", () => {
  const cssEntry = path.join(process.cwd(), "tests/fixtures/tw-v4-app/src/app.css");

  it("flags classes Tailwind cannot generate and passes real ones", async () => {
    const { designSystem } = await loadDesignSystem(cssEntry);

    const diagnostics = getUnknownClassDiagnostics(
      { v4: true },
      designSystem,
      documentFor('<div className="flex flex-col rounded-lg flex-cols rounded-huge hovr:flex" />'),
      cssEntry,
    );

    const messages = diagnostics.map((diagnostic) => diagnostic.message);
    expect(diagnostics).toHaveLength(3);
    expect(messages.some((message) => message.includes("flex-cols"))).toBe(true);
    expect(messages.some((message) => message.includes("rounded-huge"))).toBe(true);
    expect(messages.some((message) => message.includes("hovr:flex"))).toBe(true);
    expect(messages.some((message) => message.includes("flex-col "))).toBe(false);
  });

  it("accepts custom classes and @utility names from the project CSS", async () => {
    const dir = path.join(os.tmpdir(), `tw-unknown-css-${Math.random().toString(36).slice(2)}`);
    await mkdir(dir, { recursive: true });

    try {
      const cssEntry = path.join(dir, "app.css");
      await writeFile(
        cssEntry,
        [
          '@import "tailwindcss";',
          "@utility tap-target { min-height: 44px; }",
          ".legacy-card { border: 1px solid var(--color-border); }",
        ].join("\n"),
        "utf8",
      );

      const { designSystem, dependencyPaths } = await loadDesignSystem(cssEntry);

      const diagnostics = getUnknownClassDiagnostics(
        { v4: true },
        designSystem,
        documentFor('<div className="tap-target legacy-card flex-cols" />'),
        cssEntry,
        { dependencyPaths },
      );

      expect(diagnostics).toHaveLength(1);
      expect(diagnostics[0].message).toContain("flex-cols");
    } finally {
      await rm(dir, { recursive: true, force: true });
    }
  });
});
