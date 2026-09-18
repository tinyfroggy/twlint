import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { createRequire } from "node:module";
import { mkdir, rm, symlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";

import {
  createValidationState,
  validateCandidate,
} from "../src/adapters/tailwind-language-service.js";
import {
  resolveInstalledTailwind,
  resolveTailwindProject,
} from "../src/discovery/resolve-tailwind-project.js";

const require = createRequire(import.meta.url);
const TAILWIND_V3_DIR = path.dirname(require.resolve("tailwindcss-v3/package.json"));

let projectDir: string;

async function createProjectFile(relativePath: string, content: string) {
  const filePath = path.join(projectDir, relativePath);
  await mkdir(path.dirname(filePath), { recursive: true });
  await writeFile(filePath, content, "utf8");
}

beforeAll(async () => {
  projectDir = path.join(os.tmpdir(), `tw-test-v3-${Math.random().toString(36).slice(2)}`);
  await mkdir(path.join(projectDir, "node_modules"), { recursive: true });
  await symlink(TAILWIND_V3_DIR, path.join(projectDir, "node_modules", "tailwindcss"), "dir");

  await createProjectFile(
    "package.json",
    JSON.stringify({
      name: "tw-v3-app",
      private: true,
      devDependencies: { tailwindcss: "^3.4.0" },
    }),
  );
  await createProjectFile(
    "tailwind.config.js",
    [
      "module.exports = {",
      '  content: ["./src/**/*.{ts,tsx}"],',
      "  theme: { extend: { colors: { brand: '#123456' } } },",
      "  plugins: [],",
      "};",
    ].join("\n"),
  );
  await createProjectFile(
    "src/app.css",
    "@tailwind base;\n@tailwind components;\n@tailwind utilities;",
  );
});

afterAll(async () => {
  await rm(projectDir, { recursive: true, force: true });
});

describe("resolveInstalledTailwind", () => {
  it("detects the project's Tailwind v3 install", () => {
    const installed = resolveInstalledTailwind(projectDir);
    expect(installed?.major).toBe(3);
    expect(installed?.version.startsWith("3.")).toBe(true);
  });
});

describe("resolveTailwindProject", () => {
  it("returns a v3 project with its config path instead of a CSS entry", async () => {
    const project = await resolveTailwindProject(projectDir);
    expect(project.version).toBe(3);
    if (project.version !== 3) throw new Error("expected v3 project");
    expect(project.configPath).toBe(path.join(projectDir, "tailwind.config.js"));
    expect(project.tailwindDir).toBe(TAILWIND_V3_DIR);
  });
});

describe("Tailwind v3 validation", () => {
  it("reports css conflicts through the v3 JIT context", async () => {
    const project = await resolveTailwindProject(projectDir);
    const { state, designSystem } = await createValidationState(project);

    const diagnostics = await validateCandidate(state, designSystem, {
      file: path.join(projectDir, "src", "component.tsx"),
      text: `const x = <div className="flex block" />;`,
    });

    expect(diagnostics.some((d) => d.rule === "cssConflict")).toBe(true);
  });

  it("runs custom rules against v3 projects", async () => {
    const project = await resolveTailwindProject(projectDir);
    const { state, designSystem } = await createValidationState(project);

    const diagnostics = await validateCandidate(state, designSystem, {
      file: path.join(projectDir, "src", "component.tsx"),
      text: `const x = <div className="flex flex" />;`,
    });

    expect(diagnostics.some((d) => d.rule === "no-duplicate-utilities")).toBe(true);
  });

  it("reports unknown classes through the v3 JIT context", async () => {
    const project = await resolveTailwindProject(projectDir);
    const { state, designSystem } = await createValidationState(project);

    const diagnostics = await validateCandidate(state, designSystem, {
      file: path.join(projectDir, "src", "component.tsx"),
      text: `const x = <div className="flex flex-cols rounded-huge" />;`,
    });

    const messages = diagnostics
      .filter((d) => d.rule === "no-unknown-classes")
      .map((d) => d.message)
      .join("\n");
    expect(messages).toContain("flex-cols");
    expect(messages).toContain("rounded-huge");
  });

  it("does not suggest v4-only dynamic spacing values", async () => {
    const project = await resolveTailwindProject(projectDir);
    const { state, designSystem } = await createValidationState(project);

    const diagnostics = await validateCandidate(state, designSystem, {
      file: path.join(projectDir, "src", "component.tsx"),
      text: `const x = <div className="w-[350px] mt-[16px]" />;`,
    });

    const scale = diagnostics.filter((d) => d.rule === "prefer-theme-scale");
    expect(scale).toHaveLength(1);
    expect(scale[0].message).toContain("mt-4");
  });
});
