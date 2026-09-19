import { describe, it, expect, afterEach } from "vitest";
import { mkdtempSync, readFileSync, writeFileSync, rmSync } from "node:fs";
import os from "node:os";
import path from "node:path";

import { applyFixes } from "../src/core/apply-fixes.js";
import type { Diagnostic } from "../src/types.js";

const dirs: string[] = [];

function tempFile(content: string): string {
  const dir = mkdtempSync(path.join(os.tmpdir(), "twlinter-fix-"));
  dirs.push(dir);
  const file = path.join(dir, "sample.tsx");
  writeFileSync(file, content);
  return file;
}

function diagnostic(file: string, start: number, end: number, text: string): Diagnostic {
  return {
    file,
    line: 1,
    column: start + 1,
    rule: "no-raw-colors",
    severity: "warning",
    message: "",
    source: "tw",
    fix: { range: [start, end], text },
  };
}

afterEach(() => {
  for (const dir of dirs.splice(0)) rmSync(dir, { recursive: true, force: true });
});

describe("applyFixes", () => {
  it("applies non-overlapping fixes left to right", () => {
    const file = tempFile("a bg-red-500 b text-blue-500 c");

    return applyFixes([
      diagnostic(file, 2, 12, "bg-primary"),
      diagnostic(file, 15, 28, "text-secondary"),
    ]).then((changed) => {
      expect(changed).toBe(1);
      expect(readFileSync(file, "utf8")).toBe("a bg-primary b text-secondary c");
    });
  });

  it("skips overlapping fixes and duplicate ranges", async () => {
    const file = tempFile("bg-red-500");

    const changed = await applyFixes([
      diagnostic(file, 0, 10, "bg-primary"),
      diagnostic(file, 0, 10, "bg-other"),
      diagnostic(file, 4, 8, "XXXX"),
    ]);

    expect(changed).toBe(1);
    expect(readFileSync(file, "utf8")).toBe("bg-primary");
  });

  it("does nothing when there are no fixes", async () => {
    const file = tempFile("bg-red-500");
    const changed = await applyFixes([{ ...diagnostic(file, 0, 11, "x"), fix: undefined }]);

    expect(changed).toBe(0);
    expect(readFileSync(file, "utf8")).toBe("bg-red-500");
  });
});
