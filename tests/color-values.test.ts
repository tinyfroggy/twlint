import { describe, it, expect } from "vitest";

import {
  colorDistance,
  nearestColorTokens,
  parseColor,
  roleOf,
  isNamedColor,
} from "../src/custom-rules/color-values.js";
import { isColorCss } from "../src/core/class-kind.js";

describe("parseColor", () => {
  it("parses hex in every length", () => {
    expect(parseColor("#fff")).not.toBeNull();
    expect(parseColor("#ffffff")).toEqual(parseColor("#fff"));
    expect(parseColor("#ffffffff")).not.toBeNull();
    expect(parseColor("#xyz")).toBeNull();
  });

  it("parses rgb, hsl, and oklch", () => {
    expect(parseColor("rgb(255, 0, 0)")).toEqual(parseColor("#ff0000"));
    expect(parseColor("rgb(255 0 0 / 0.5)")).toEqual(parseColor("#ff0000"));
    expect(parseColor("hsl(0, 100%, 50%)")).toEqual(parseColor("#ff0000"));
    expect(parseColor("oklch(0.5 0.1 20)")).not.toBeNull();
  });

  it("parses named colors", () => {
    expect(parseColor("red")).toEqual(parseColor("#ff0000"));
    expect(isNamedColor("hotpink")).toBe(true);
    expect(isNamedColor("notacolor")).toBe(false);
  });

  it("returns null for non-literal values", () => {
    expect(parseColor("var(--color-primary)")).toBeNull();
    expect(parseColor("currentColor")).toBeNull();
    expect(parseColor("color-mix(in oklab, red, blue)")).toBeNull();
    expect(parseColor("")).toBeNull();
  });
});

describe("colorDistance", () => {
  it("is zero for identical colors and grows with difference", () => {
    const red = parseColor("#ff0000")!;
    const nearRed = parseColor("#fe0000")!;
    const blue = parseColor("#0000ff")!;

    expect(colorDistance(red, red)).toBe(0);
    expect(colorDistance(red, nearRed)).toBeLessThan(0.01);
    expect(colorDistance(red, blue)).toBeGreaterThan(0.1);
  });
});

describe("nearestColorTokens", () => {
  const gray = parseColor("#71717a")!;
  const tokens = new Map([
    ["muted", gray],
    ["muted-foreground", gray],
    ["primary", parseColor("#ff0000")!],
  ]);

  it("prefers foreground tokens for text", () => {
    expect(nearestColorTokens(gray, tokens, "text")).toEqual(["muted-foreground"]);
  });

  it("avoids foreground tokens for surfaces", () => {
    expect(nearestColorTokens(gray, tokens, "surface")).toEqual(["muted"]);
  });

  it("returns nothing for a far color", () => {
    expect(nearestColorTokens(parseColor("#00ff00")!, tokens, "surface")).toEqual([]);
  });
});

describe("roleOf", () => {
  it("treats text-ish utilities as text and others as surface", () => {
    expect(roleOf("text")).toBe("text");
    expect(roleOf("fill")).toBe("text");
    expect(roleOf("bg")).toBe("surface");
    expect(roleOf("border")).toBe("surface");
  });
});

describe("isColorCss", () => {
  it("recognizes color properties and ignores others", () => {
    expect(isColorCss(".bg-red-500 {\n  background-color: red;\n}")).toBe(true);
    expect(isColorCss(".from-red-500 { --tw-gradient-from: red; }")).toBe(true);
    expect(isColorCss(".text-sm { font-size: 14px; }")).toBe(false);
    expect(isColorCss(".bg-cover { background-size: cover; }")).toBe(false);
    expect(isColorCss(null)).toBe(false);
  });
});
