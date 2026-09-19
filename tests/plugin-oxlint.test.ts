import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync, rmSync, existsSync, symlinkSync, unlinkSync } from "node:fs";
import os from "node:os";
import path from "node:path";

const root = process.cwd();
const oxlintBin = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "oxlint.cmd" : "oxlint",
);
const tscBin = path.join(
  root,
  "node_modules",
  ".bin",
  process.platform === "win32" ? "tsc.cmd" : "tsc",
);

let tmpDir: string;
let pluginPath: string;
let nodeModulesLink: string;

function run(command: string, args: string[], cwd: string): string {
  try {
    return execFileSync(command, args, {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
  } catch (error) {
    const stdout = (error as { stdout?: string }).stdout ?? "";
    const stderr = (error as { stderr?: string }).stderr ?? "";
    return `${stdout}${stderr}`;
  }
}

describe("plugin in oxlint", () => {
  beforeAll(() => {
    tmpDir = mkdtempSync(path.join(os.tmpdir(), "twlinter-plugin-"));
    const outDir = path.join(tmpDir, "dist");

    // The compiled plugin imports its runtime dependencies, so let oxlint
    // resolve them from the workspace install.
    nodeModulesLink = path.join(tmpDir, "node_modules");
    symlinkSync(path.join(root, "node_modules"), nodeModulesLink, "dir");

    const build = run(tscBin, ["-p", "tsconfig.json", "--outDir", outDir], root);
    expect(existsSync(path.join(outDir, "plugin.js")), build).toBe(true);
    pluginPath = path.join(outDir, "plugin.js");
  }, 60_000);

  afterAll(() => {
    // Unlink the symlink first so the recursive remove cannot touch the
    // workspace install.
    try {
      unlinkSync(nodeModulesLink);
    } catch {
      // Already gone.
    }
    if (tmpDir) rmSync(tmpDir, { recursive: true, force: true });
  });

  it("loads the plugin and reports twlinter rules", () => {
    writeFileSync(
      path.join(tmpDir, ".oxlintrc.json"),
      JSON.stringify(
        {
          jsPlugins: [pluginPath],
          rules: {
            "twlinter/no-duplicate-utilities": "error",
            "twlinter/no-magic-spacing": "warn",
            "twlinter/require-flex-for-flex-utilities": "error",
            "twlinter/no-raw-colors": ["error", { allow: ["bg-amber-100"] }],
          },
        },
        null,
        2,
      ),
    );
    writeFileSync(
      path.join(tmpDir, "sample.tsx"),
      [
        "export function Card() {",
        '  return <div className="flex-col p-4 p-4 ms-[17px] bg-pink-500 bg-amber-100" />;',
        "}",
        "",
      ].join("\n"),
    );

    const output = run(oxlintBin, ["sample.tsx"], tmpDir);

    expect(output).toContain("twlinter(no-duplicate-utilities)");
    expect(output).toContain("twlinter(no-magic-spacing)");
    expect(output).toContain("twlinter(require-flex-for-flex-utilities)");
    expect(output).toContain("twlinter(no-raw-colors)");
    expect(output).toContain("bg-pink-500");
  });
});
