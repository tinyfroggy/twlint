import { describe, it, expect } from "vitest";
import { mightContainTailwindClasses } from "../src/discovery/file-relevance.js";

describe("mightContainTailwindClasses", () => {
  it("detects className in JSX files", () => {
    expect(mightContainTailwindClasses("app.tsx", 'className="flex"')).toBe(true);
  });

  it("detects className in JS files", () => {
    expect(mightContainTailwindClasses("app.jsx", 'className="grid"')).toBe(true);
  });

  it("detects class= in HTML files", () => {
    expect(mightContainTailwindClasses("index.html", '<div class="flex">')).toBe(true);
  });

  it("detects class: in Svelte files", () => {
    expect(mightContainTailwindClasses("App.svelte", "<div class:flex>")).toBe(true);
  });

  it("detects @apply in CSS files", () => {
    expect(mightContainTailwindClasses("app.css", ".btn { @apply flex; }")).toBe(true);
  });

  it("detects tw` in TS files", () => {
    expect(mightContainTailwindClasses("app.ts", "tw`flex grid`")).toBe(true);
  });

  it("detects clsx and cva calls", () => {
    expect(mightContainTailwindClasses("utils.ts", 'clsx("flex")')).toBe(true);
    expect(mightContainTailwindClasses("styles.ts", 'cva("grid")')).toBe(true);
  });

  it("returns false for irrelevant files", () => {
    expect(mightContainTailwindClasses("app.ts", "const x = 1")).toBe(false);
  });

  it("returns false for unknown extensions", () => {
    expect(mightContainTailwindClasses("data.yaml", "className: flex")).toBe(false);
  });

  it("detects className in Astro files", () => {
    expect(mightContainTailwindClasses("page.astro", 'className="flex"')).toBe(true);
  });

  it("detects class= in MDX files", () => {
    expect(mightContainTailwindClasses("doc.mdx", '<div class="grid">')).toBe(true);
  });
});
