import { describe, it, expect } from "vitest";

import { collectJsClassSites, isJsFile } from "../src/custom-rules/js-sites.js";

function classes(source: string): string[] {
  return collectJsClassSites(source)
    .flatMap((site) => site.classes)
    .sort();
}

describe("isJsFile", () => {
  it("matches JS and TS extensions", () => {
    expect(isJsFile("a.tsx")).toBe(true);
    expect(isJsFile("a.ts")).toBe(true);
    expect(isJsFile("a.mjs")).toBe(true);
    expect(isJsFile("a.css")).toBe(false);
    expect(isJsFile("a.vue")).toBe(false);
  });
});

describe("collectJsClassSites", () => {
  it("reads string and expression class attributes", () => {
    expect(classes('<div className="p-4 bg-red-500" />')).toEqual(["bg-red-500", "p-4"]);
    expect(classes('<div className={"flex gap-2"} />')).toEqual(["flex", "gap-2"]);
    expect(classes("<div className={'grid'} />")).toEqual(["grid"]);
  });

  it("resolves variable references once", () => {
    const source = [
      'const c = "bg-pink-500";',
      "export const A = () => (",
      "  <>",
      "    <div className={c} />",
      "    <div className={c} />",
      "  </>",
      ");",
    ].join("\n");

    expect(classes(source)).toEqual(["bg-pink-500"]);
  });

  it("unions both branches of conditionals and logical operators", () => {
    expect(
      classes('const c = "bg-pink-500"; const x = <div className={on ? c : "flex"} />;'),
    ).toEqual(["bg-pink-500", "flex"]);
    expect(classes('const c = "bg-pink-500"; const x = <div className={c || "grid"} />;')).toEqual([
      "bg-pink-500",
      "grid",
    ]);
    expect(
      classes('const c = "bg-pink-500"; const x = <div className={c && "hidden"} />;'),
    ).toEqual(["bg-pink-500", "hidden"]);
  });

  it("reads inline cva base and variant values", () => {
    expect(
      classes('const v = cva("base", { variants: { tone: { hot: "bg-pink-500" } } });'),
    ).toEqual(["base", "bg-pink-500"]);
  });

  it("resolves cva variants passed by variable", () => {
    const nested = [
      'const variants = { tone: { hot: "bg-pink-500" } };',
      'export const v = cva("mt-4", { variants });',
    ].join("\n");
    expect(classes(nested)).toEqual(["bg-pink-500", "mt-4"]);

    const shorthand = [
      'const tone = { hot: "bg-pink-500" };',
      'export const v = cva("mt-4", { variants: { tone } });',
    ].join("\n");
    expect(classes(shorthand)).toEqual(["bg-pink-500", "mt-4"]);
  });

  it("reads spreads and classNames objects", () => {
    expect(classes('<div {...{ className: "bg-pink-500" }} />')).toEqual(["bg-pink-500"]);
    expect(classes('<Button classNames={{ day: "bg-pink-500" }} />')).toEqual(["bg-pink-500"]);
    expect(classes('classnames({ "bg-pink-500": isActive })')).toEqual(["bg-pink-500"]);
  });

  it("reads template literal segments", () => {
    expect(classes("const x = <div className={`flex ${x} bg-red-500`} />;")).toEqual([
      "bg-red-500",
      "flex",
    ]);
  });

  it("does not descend into unrelated calls", () => {
    expect(classes('const x = <div className={format("yyyy-MM-dd")} />;')).toEqual([]);
  });

  it("returns no sites for a file it cannot parse", () => {
    expect(collectJsClassSites("{{{ not valid &&&")).toEqual([]);
  });
});
