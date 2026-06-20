import { describe, it, expect, beforeAll } from "vitest";
import path from "node:path";

import {
  createValidationState,
  validateCandidate,
} from "../src/adapters/tailwind-language-service.js";
import type { Diagnostic } from "../src/types.js";

const CSS_ENTRY = path.resolve(import.meta.dirname, "fixtures", "tw-v4-app", "src", "app.css");

// `w-[100%]` canonicalizes to `w-full`, so the `canonical-classes` rule fires
// on it. We use it as a probe: if the diagnostic appears, the class string was
// successfully extracted from whatever wrapper we placed it in.
const NON_CANONICAL = "w-[100%]";
const CANONICAL = "w-full";

let state: Awaited<ReturnType<typeof createValidationState>>["state"];
let designSystem: Awaited<ReturnType<typeof createValidationState>>["designSystem"];

beforeAll(async () => {
  ({ state, designSystem } = await createValidationState(CSS_ENTRY));
});

async function lint(text: string): Promise<Diagnostic[]> {
  return validateCandidate(state, designSystem, { file: "/virtual/component.tsx", text }, [
    "canonical-classes",
  ]);
}

function flagsNonCanonical(diagnostics: Diagnostic[]): boolean {
  return diagnostics.some(
    (d) => d.message.includes(NON_CANONICAL) && d.message.includes(CANONICAL),
  );
}

describe("class extraction inside wrapper helpers", () => {
  it("still detects classes in className attributes (baseline)", async () => {
    const diagnostics = await lint(`const x = <div className="${NON_CANONICAL}" />;`);
    expect(flagsNonCanonical(diagnostics)).toBe(true);
  });

  it("detects classes in clsx string arguments", async () => {
    const diagnostics = await lint(`const a = clsx("flex", "${NON_CANONICAL}");`);
    expect(flagsNonCanonical(diagnostics)).toBe(true);
  });

  it("detects classes in cn string arguments", async () => {
    const diagnostics = await lint(`const a = cn("flex", cond && "${NON_CANONICAL}");`);
    expect(flagsNonCanonical(diagnostics)).toBe(true);
  });

  it("detects classes in classnames object keys", async () => {
    const diagnostics = await lint(`const a = classnames({ "${NON_CANONICAL}": isActive });`);
    expect(flagsNonCanonical(diagnostics)).toBe(true);
  });

  it("detects classes in clsx object keys", async () => {
    const diagnostics = await lint(
      `const a = clsx({ "${NON_CANONICAL}": isActive, "p-2": other });`,
    );
    expect(flagsNonCanonical(diagnostics)).toBe(true);
  });

  it("detects classes in template literal static segments", async () => {
    const diagnostics = await lint(`const a = clsx(\`flex ${NON_CANONICAL} \${dynamic}\`);`);
    expect(flagsNonCanonical(diagnostics)).toBe(true);
  });

  it("detects classes in cva base argument", async () => {
    const diagnostics = await lint(`const a = cva("${NON_CANONICAL}", { variants: {} });`);
    expect(flagsNonCanonical(diagnostics)).toBe(true);
  });

  it("detects classes in cva variant values", async () => {
    const diagnostics = await lint(
      `const a = cva("flex", { variants: { size: { lg: "${NON_CANONICAL}" } } });`,
    );
    expect(flagsNonCanonical(diagnostics)).toBe(true);
  });

  it("detects classes in tv (tailwind-variants) arguments", async () => {
    const diagnostics = await lint(`const a = tv({ base: "${NON_CANONICAL}" });`);
    expect(flagsNonCanonical(diagnostics)).toBe(true);
  });

  it("detects classes in twMerge arguments", async () => {
    const diagnostics = await lint(`const a = twMerge("flex", "${NON_CANONICAL}");`);
    expect(flagsNonCanonical(diagnostics)).toBe(true);
  });

  it("works in plain .ts modules without JSX", async () => {
    const diagnostics = await validateCandidate(
      state,
      designSystem,
      { file: "/virtual/styles.ts", text: `export const styles = cn("${NON_CANONICAL}");` },
      ["canonical-classes"],
    );
    expect(flagsNonCanonical(diagnostics)).toBe(true);
  });

  it("reports an accurate offset pointing at the extracted class", async () => {
    const text = `const a = clsx("${NON_CANONICAL}");`;
    const diagnostics = await lint(text);
    const diagnostic = diagnostics.find((d) => d.message.includes(NON_CANONICAL));
    expect(diagnostic).toBeDefined();

    // Diagnostics are 1-based; column should land on the first char of the class.
    const expectedColumn = text.indexOf(NON_CANONICAL) + 1;
    expect(diagnostic?.line).toBe(1);
    expect(diagnostic?.column).toBe(expectedColumn);
  });

  it("does not invent diagnostics for unrelated function calls", async () => {
    const diagnostics = await lint(`const a = doSomething("${NON_CANONICAL}");`);
    expect(flagsNonCanonical(diagnostics)).toBe(false);
  });
});
