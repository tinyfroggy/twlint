import { describe, it, expect } from "vitest";
import path from "node:path";
import { discoverProject } from "../src/discovery/discover-project.js";

const FIXTURES = path.resolve(import.meta.dirname, "fixtures");

describe("fixture: tw-v4-app", () => {
  it("discovers a supported v4 project", async () => {
    process.chdir(path.join(FIXTURES, "tw-v4-app"));
    const css = path.join(FIXTURES, "tw-v4-app", "src", "app.css");
    const project = await discoverProject(css);
    expect(project.supported).toBe(true);
    expect(project.tailwindVersion).toMatch(/^4/);
    expect(project.cssEntryPath).toBe(css);
  });
});

describe("fixture: unsupported-tw-v3", () => {
  it("discovers an unsupported v3 project", async () => {
    process.chdir(path.join(FIXTURES, "unsupported-tw-v3"));
    const project = await discoverProject(null);
    expect(project.supported).toBe(false);
    expect(project.tailwindVersion).toMatch(/^3/);
  });
});

describe("fixture: no-tailwind-app", () => {
  it("reports tailwindcss not found", async () => {
    process.chdir(path.join(FIXTURES, "no-tailwind-app"));
    const project = await discoverProject(null);
    expect(project.tailwindVersion).toBeNull();
    expect(project.supported).toBe(false);
  });
});
