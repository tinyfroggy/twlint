import { describe, it, expect } from "vitest";
import { runCustomRules as runAllCustomRules } from "../src/custom-rules/index.js";
import {
  extractClassLists,
  extractElementsWithClasses,
  parseClassName,
  stripVariants,
  extractElements,
  INLINE_TAGS,
} from "../src/custom-rules/utils.js";
import type { CustomRuleOptions } from "../src/custom-rules/index.js";
import type { Diagnostic } from "../src/types.js";

function runCustomRules(
  ruleIds: string[],
  text: string,
  filePath: string,
  options?: CustomRuleOptions,
): Diagnostic[] {
  return runAllCustomRules(text, filePath, options).filter((diagnostic) =>
    ruleIds.includes(diagnostic.rule),
  );
}

describe("utils", () => {
  describe("extractClassLists", () => {
    it('extracts from className="..."', () => {
      const result = extractClassLists('<div className="p-4 m-2" />');
      expect(result).toHaveLength(1);
      expect(result[0].classes).toEqual(["p-4", "m-2"]);
    });

    it("extracts from class='...'", () => {
      const result = extractClassLists("<div class='p-4 m-2' />");
      expect(result).toHaveLength(1);
      expect(result[0].classes).toEqual(["p-4", "m-2"]);
    });

    it("extracts from className={'...'}", () => {
      const result = extractClassLists("<div className={'p-4 m-2'} />");
      expect(result).toHaveLength(1);
      expect(result[0].classes).toEqual(["p-4", "m-2"]);
    });

    it('extracts from className={"..."}', () => {
      const result = extractClassLists('<div className={"p-4 m-2"} />');
      expect(result).toHaveLength(1);
      expect(result[0].classes).toEqual(["p-4", "m-2"]);
    });

    it("extracts from @apply", () => {
      const result = extractClassLists(".foo { @apply p-4 m-2; }");
      expect(result).toHaveLength(1);
      expect(result[0].classes).toEqual(["p-4", "m-2"]);
    });

    it("handles multiple class attributes", () => {
      const result = extractClassLists(`
        <div className="p-4" />
        <span class="m-2" />
      `);
      expect(result).toHaveLength(2);
    });
  });

  describe("extractElementsWithClasses", () => {
    it("extracts tag and classes from native element", () => {
      const result = extractElementsWithClasses('<div className="p-4 m-2" />');
      expect(result).toHaveLength(1);
      expect(result[0].tag).toBe("div");
      expect(result[0].classes).toEqual(["p-4", "m-2"]);
      expect(result[0].isComponent).toBe(false);
    });

    it("detects component elements by capitalized tag", () => {
      const result = extractElementsWithClasses('<DialogFooter className="flex-row" />');
      expect(result).toHaveLength(1);
      expect(result[0].tag).toBe("DialogFooter");
      expect(result[0].isComponent).toBe(true);
    });

    it("handles multiple class patterns", () => {
      const result = extractElementsWithClasses(`
        <div className="p-4" />
        <DialogFooter className="flex-row gap-2" />
      `);
      expect(result).toHaveLength(2);
      expect(result[0].tag).toBe("div");
      expect(result[1].tag).toBe("DialogFooter");
      expect(result[1].classes).toEqual(["flex-row", "gap-2"]);
    });

    it("extracts JSX member expression tags", () => {
      const result = extractElementsWithClasses('<Dialog.Footer className="flex-row" />');
      expect(result).toHaveLength(1);
      expect(result[0].tag).toBe("Dialog.Footer");
      expect(result[0].isComponent).toBe(true);
    });
  });

  describe("parseClassName", () => {
    it("parses simple class", () => {
      const p = parseClassName("bg-red-500");
      expect(p.base).toBe("bg-red-500");
      expect(p.variant).toBe("");
      expect(p.important).toBe(false);
    });

    it("parses variant", () => {
      const p = parseClassName("hover:bg-red-500");
      expect(p.variant).toBe("hover");
      expect(p.variants).toEqual(["hover"]);
      expect(p.base).toBe("bg-red-500");
    });

    it("tracks responsive scope separately from state variants", () => {
      const p = parseClassName("sm:hover:flex-row");
      expect(p.variant).toBe("sm:hover");
      expect(p.variants).toEqual(["sm", "hover"]);
      expect(p.responsive).toBe("sm");
      expect(p.base).toBe("flex-row");
    });

    it("parses chained variants", () => {
      const p = parseClassName("dark:hover:bg-red-500");
      expect(p.variant).toBe("dark:hover");
      expect(p.base).toBe("bg-red-500");
    });

    it("parses important", () => {
      const p = parseClassName("!p-4");
      expect(p.important).toBe(true);
      expect(p.base).toBe("p-4");
    });

    it("parses negative value", () => {
      const p = parseClassName("-mt-4");
      expect(p.negative).toBe(true);
      expect(p.base).toBe("mt-4");
    });

    it("parses arbitrary variant", () => {
      const p = parseClassName("[&>p]:mt-4");
      expect(p.variant).toBe("[&>p]");
      expect(p.base).toBe("mt-4");
    });
  });

  describe("stripVariants", () => {
    it("strips variant from class", () => {
      expect(stripVariants("hover:bg-red-500")).toBe("bg-red-500");
    });

    it("strips chained variants", () => {
      expect(stripVariants("dark:hover:bg-red-500")).toBe("bg-red-500");
    });

    it("returns base for simple class", () => {
      expect(stripVariants("p-4")).toBe("p-4");
    });
  });

  describe("extractElements", () => {
    it("extracts simple element", () => {
      const result = extractElements('<div class="p-4">');
      expect(result).toHaveLength(1);
      expect(result[0].tag).toBe("div");
    });

    it("extracts element attributes", () => {
      const result = extractElements('<button disabled class="p-4">');
      expect(result).toHaveLength(1);
      expect(result[0].tag).toBe("button");
      expect(result[0].attrs["disabled"]).toBe("");
    });
  });

  describe("INLINE_TAGS", () => {
    it("includes span", () => {
      expect(INLINE_TAGS.has("span")).toBe(true);
    });

    it("includes a", () => {
      expect(INLINE_TAGS.has("a")).toBe(true);
    });

    it("does not include div", () => {
      expect(INLINE_TAGS.has("div")).toBe(false);
    });
  });
});

describe("custom rules", () => {
  describe("no-duplicate-utilities", () => {
    it("detects duplicate utility", () => {
      const diags = runCustomRules(
        ["no-duplicate-utilities"],
        '<div className="p-4 p-4" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("p-4");
    });

    it("ignores same utility with different variants", () => {
      const diags = runCustomRules(
        ["no-duplicate-utilities"],
        '<div className="p-4 md:p-4" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });

    it("ignores different utilities", () => {
      const diags = runCustomRules(
        ["no-duplicate-utilities"],
        '<div className="p-4 m-4" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });
  });

  describe("prefer-truncate-shorthand", () => {
    it("detects truncate replacement", () => {
      const diags = runCustomRules(
        ["prefer-truncate-shorthand"],
        '<div className="overflow-hidden text-ellipsis whitespace-nowrap" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("truncate");
    });
  });

  describe("no-important-abuse", () => {
    it("warns on too many important classes", () => {
      const diags = runCustomRules(
        ["no-important-abuse"],
        '<div className="!p-4 !m-4 !text-red-500" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
    });

    it("passes on one important class", () => {
      const diags = runCustomRules(
        ["no-important-abuse"],
        '<div className="!p-4 m-4" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });
  });

  describe("no-sr-only-display-conflict", () => {
    it("detects sr-only with block", () => {
      const diags = runCustomRules(
        ["no-sr-only-display-conflict"],
        '<div className="sr-only block" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
    });

    it("passes on sr-only alone", () => {
      const diags = runCustomRules(
        ["no-sr-only-display-conflict"],
        '<div className="sr-only" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });
  });

  describe("consistent-negative-arbitrary-values", () => {
    it("detects inline negative value", () => {
      const diags = runCustomRules(
        ["consistent-negative-arbitrary-values"],
        '<div className="top-[-5px]" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("-top-[5px]");
    });

    it("passes on standard negative value", () => {
      const diags = runCustomRules(
        ["consistent-negative-arbitrary-values"],
        '<div className="-top-[5px]" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });
  });

  describe("require-flex-for-flex-utilities", () => {
    it("detects flex-col without flex", () => {
      const diags = runCustomRules(
        ["require-flex-for-flex-utilities"],
        '<div className="flex-col" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
    });

    it("passes with flex present", () => {
      const diags = runCustomRules(
        ["require-flex-for-flex-utilities"],
        '<div className="flex flex-col" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });

    it("skips custom components whose internal display is unknown", () => {
      const diags = runCustomRules(
        ["require-flex-for-flex-utilities"],
        '<DialogFooter className="flex-row gap-2" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });

    it("passes on known JSX member component that provides flex internally", () => {
      const diags = runCustomRules(
        ["require-flex-for-flex-utilities"],
        '<Dialog.Footer className="flex-row gap-2" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });

    it("allows base flex to satisfy responsive flex direction", () => {
      const diags = runCustomRules(
        ["require-flex-for-flex-utilities"],
        '<div className="flex sm:flex-row" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });

    it("warns when flex only exists in a later responsive scope", () => {
      const diags = runCustomRules(
        ["require-flex-for-flex-utilities"],
        '<div className="sm:flex sm:flex-row flex-col" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("flex-col");
    });

    it("skips unknown components", () => {
      const diags = runCustomRules(
        ["require-flex-for-flex-utilities"],
        '<Unknown className="flex-row" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });

    it("skips components that may provide inline-flex internally", () => {
      const diags = runCustomRules(
        ["require-flex-for-flex-utilities"],
        '<Toolbar className="flex-row" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });
  });

  describe("prefer-theme-scale", () => {
    it("converts px to scale index (÷4)", () => {
      const diags = runCustomRules(
        ["prefer-theme-scale"],
        '<div className="mt-[16px]" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("mt-4");
    });

    it("converts px to scale index for width (÷4)", () => {
      const diags = runCustomRules(
        ["prefer-theme-scale"],
        '<div className="w-[220px]" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("w-55");
    });

    it("converts rem to scale index (×4)", () => {
      const diags = runCustomRules(
        ["prefer-theme-scale"],
        '<div className="max-h-[28rem]" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("max-h-112");
    });

    it("uses a built-in font-size token when available", () => {
      const diags = runCustomRules(
        ["prefer-theme-scale"],
        '<div className="text-[14px]" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("matches built-in `text-sm` (14px)");
    });

    it("shows the nearest size and exact custom-token option", () => {
      const diags = runCustomRules(
        ["prefer-theme-scale"],
        '<div className="text-[13px]" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("nearest is `text-sm` (14px, 1px larger)");
      expect(diags[0].message).toContain("@theme { --text-13: 13px; }");
      expect(diags[0].message).toContain("use `text-13`");
    });

    it("handles font sizes behind variants", () => {
      const diags = runCustomRules(
        ["prefer-theme-scale"],
        '<div className="sm:text-[10px]" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("@theme { --text-10: 10px; }");
    });

    it("does not apply the spacing scale to unrelated utilities", () => {
      const diags = runCustomRules(
        ["prefer-theme-scale"],
        '<div className="rounded-[10px]" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });

    it("passes on theme value", () => {
      const diags = runCustomRules(["prefer-theme-scale"], '<div className="mt-4" />', "/test.tsx");
      expect(diags).toHaveLength(0);
    });

    it("skips off-scale suggestions for Tailwind v3", () => {
      const diags = runCustomRules(
        ["prefer-theme-scale"],
        '<div className="w-[350px] mt-[16px]" />',
        "/test.tsx",
        { tailwindVersion: 3 },
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("mt-4");
    });

    it("skips the v4 custom-token advice for Tailwind v3", () => {
      const diags = runCustomRules(
        ["prefer-theme-scale"],
        '<div className="text-[13px]" />',
        "/test.tsx",
        { tailwindVersion: 3 },
      );
      expect(diags).toHaveLength(0);
    });
  });

  describe("no-magic-spacing", () => {
    it("shows the exact Tailwind class replacement", () => {
      const diags = runCustomRules(
        ["no-magic-spacing"],
        '<div className="ms-[17px]" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toBe("Class `ms-[17px]` can be written as `ms-4.25`.");
    });

    it("passes on grid-aligned value", () => {
      const diags = runCustomRules(
        ["no-magic-spacing"],
        '<div className="mt-[16px]" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });

    it("only suggests steps that exist on the v3 scale", () => {
      const offScale = runCustomRules(
        ["no-magic-spacing"],
        '<div className="ms-[17px]" />',
        "/test.tsx",
        { tailwindVersion: 3 },
      );
      expect(offScale).toHaveLength(0);

      const onScale = runCustomRules(
        ["no-magic-spacing"],
        '<div className="p-[6px]" />',
        "/test.tsx",
        { tailwindVersion: 3 },
      );
      expect(onScale).toHaveLength(1);
      expect(onScale[0].message).toBe("Class `p-[6px]` can be written as `p-1.5`.");
    });
  });

  describe("detect-conflicts-in-template-literals", () => {
    it("detects duplicate utility across template parts", () => {
      const diags = runCustomRules(
        ["detect-conflicts-in-template-literals"],
        "<div className={`p-4 ${condition} p-4`} />",
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
    });

    it("passes on clean template", () => {
      const diags = runCustomRules(
        ["detect-conflicts-in-template-literals"],
        '<div className={`p-4 ${active ? "bg-blue-500" : "bg-gray-500"}`} />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });
  });

  describe("prefer-design-tokens", () => {
    it("detects raw hex color", () => {
      const diags = runCustomRules(
        ["prefer-design-tokens"],
        '<div className="bg-[#121212]" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("@theme { --color-custom: #121212; }");
      expect(diags[0].message).toContain("use `bg-custom`");
    });

    it("passes on design token", () => {
      const diags = runCustomRules(
        ["prefer-design-tokens"],
        '<div className="bg-background" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });
  });

  describe("no-raw-colors", () => {
    it("detects a raw palette class", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<div className="bg-pink-500" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("raw Tailwind palette color");
      expect(diags[0].message).toContain("bg-custom");
    });

    it("detects palette colors behind variants and opacity", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<div className="hover:text-zinc-100/50" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("hover:text-zinc-100/50");
    });

    it("detects important palette colors", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<div className="!bg-red-500 text-blue-500!" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(2);
    });

    it("detects palette colors inside class helpers", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        'cn("flex", cond && "border-red-500")',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("border-red-500");
    });

    it("detects palette colors in cva base and variant values", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        'const v = cva("bg-pink-500", { variants: { tone: { hot: "text-rose-600" } } })',
        "/test.tsx",
      );
      expect(diags).toHaveLength(2);
    });

    it("resolves palette colors held in variables and cva configs", () => {
      const viaVariable = runCustomRules(
        ["no-raw-colors"],
        'const c = "bg-pink-500";\nexport const A = () => <div className={c} />;',
        "/test.tsx",
      );
      expect(viaVariable).toHaveLength(1);
      expect(viaVariable[0].message).toContain("bg-pink-500");

      const viaCva = runCustomRules(
        ["no-raw-colors"],
        'const tone = { hot: "bg-pink-500" };\nexport const v = cva("mt-4", { variants: { tone } });',
        "/test.tsx",
      );
      expect(viaCva).toHaveLength(1);
      expect(viaCva[0].message).toContain("bg-pink-500");
    });

    it("reads palette colors from spreads and classNames objects", () => {
      const spread = runCustomRules(
        ["no-raw-colors"],
        '<div {...{ className: "bg-pink-500" }} />',
        "/test.tsx",
      );
      expect(spread).toHaveLength(1);

      const named = runCustomRules(
        ["no-raw-colors"],
        '<Button classNames={{ day: "bg-pink-500" }}>Go</Button>',
        "/test.tsx",
      );
      expect(named).toHaveLength(1);
    });

    it("reads wrapperClassName and custom helper functions", () => {
      const wrapper = runCustomRules(
        ["no-raw-colors"],
        '<Thing wrapperClassName="bg-pink-500" />',
        "/test.tsx",
      );
      expect(wrapper).toHaveLength(1);

      const customMerge = runCustomRules(
        ["no-raw-colors"],
        'const x = customMerge("bg-pink-500");',
        "/test.tsx",
        { noRawColors: { mergeFunctions: ["customMerge"] } },
      );
      expect(customMerge).toHaveLength(1);

      const customVariants = runCustomRules(
        ["no-raw-colors"],
        'const x = myVariants({ base: "bg-pink-500" });',
        "/test.tsx",
        { noRawColors: { variantFunctions: ["myVariants"] } },
      );
      expect(customVariants).toHaveLength(1);
    });

    it("keeps arbitrary values out of this rule", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<div className="bg-[#121212] text-[rgb(1,2,3)]" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });

    it("accepts named keywords and theme tokens", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<div className="bg-white text-black border-transparent bg-primary text-muted-foreground" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });

    it("does not mistake non-color utilities for palette colors", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<div className="text-sm bg-cover shadow-lg border-2 ring-2 outline-2 decoration-2" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });

    it("allows a palette color the project declares as a token", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<div className="bg-red-500" />',
        "/test.tsx",
        { themeColors: new Set(["red-500"]) },
      );
      expect(diags).toHaveLength(0);
    });

    it("lists declared theme colors in the message", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<div className="bg-pink-500" />',
        "/test.tsx",
        { themeColors: new Set(["primary", "muted-foreground"]), themeFile: "src/app.css" },
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("`muted-foreground`");
      expect(diags[0].message).toContain("`primary`");
      expect(diags[0].message).toContain("src/app.css");
    });

    it("detects literal color attributes on intrinsic elements", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<svg><path fill="#ec4899" stroke="red" /></svg>',
        "/test.tsx",
      );
      expect(diags).toHaveLength(2);
      expect(diags[0].message).toContain('fill="#ec4899"');
      expect(diags[1].message).toContain('stroke="red"');
    });

    it("detects colors in JSX expression attributes", () => {
      const diags = runCustomRules(["no-raw-colors"], '<svg fill={"#ec4899"} />', "/test.tsx");
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain('fill="#ec4899"');
    });

    it("leaves cascade and token attribute values alone", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<svg fill="currentColor" stroke="none" color="inherit" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });

    it("accepts var() references in attributes", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<svg fill="var(--color-primary)" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });

    it("treats color props on components as enums, not literals", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<Button color="red" fill="currentColor" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });

    it("scopes exceptions to a component with contracts", () => {
      const policy = {
        noRawColors: {
          contracts: [{ pattern: "^Badge$", allow: ["*-amber-500"] }],
        },
      };

      const allowed = runCustomRules(
        ["no-raw-colors"],
        '<Badge className="bg-amber-500">Pending</Badge>',
        "/test.tsx",
        policy,
      );
      expect(allowed).toHaveLength(0);

      const reported = runCustomRules(
        ["no-raw-colors"],
        '<div className="bg-amber-500">Pending</div>',
        "/test.tsx",
        policy,
      );
      expect(reported).toHaveLength(1);
      expect(reported[0].message).toContain("bg-amber-500");
    });

    it("applies a contract message", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<Badge className="bg-pink-500">Pending</Badge>',
        "/test.tsx",
        {
          noRawColors: {
            contracts: [{ pattern: "^Badge$", message: "Badge color: {{className}}" }],
          },
        },
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toBe("Badge color: bg-pink-500");
    });

    it("detects the newer palette utilities", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<div className="mask-linear-from-red-500 scrollbar-thumb-zinc-500 inset-shadow-emerald-500" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(3);
    });

    it("detects functional color values in attributes", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<svg fill="oklch(0.5 0.1 20)" stroke="rgb(1, 2, 3)" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(2);
    });

    it("honors allow patterns", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<div className="bg-amber-100 bg-pink-500" />',
        "/test.tsx",
        { noRawColors: { allow: ["bg-amber-100"] } },
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("bg-pink-500");
    });

    it("checks only denied classes when deny is set alone", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<div className="bg-amber-500 bg-pink-500" />',
        "/test.tsx",
        { noRawColors: { deny: ["bg-amber-500"] } },
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("bg-amber-500");
    });

    it("uses a custom message", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<div className="bg-pink-500" />',
        "/test.tsx",
        { noRawColors: { message: "Use a token for {{className}}." } },
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toBe("Use a token for bg-pink-500.");
    });

    it("fills message placeholders", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<div className="bg-pink-500" />',
        "/test.tsx",
        {
          themeColors: new Set(["primary"]),
          themeFile: "src/app.css",
          resolveColor: (name) => (name === "pink-500" || name === "primary" ? "#ec4899" : null),
          noRawColors: {
            message: "Use {{suggestions}} from {{file}} ({{tokens}}) not {{className}}.",
          },
        },
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("Use bg-primary from src/app.css");
      expect(diags[0].message).toContain("`primary`");
      expect(diags[0].message).toContain("not bg-pink-500");
    });

    it("scans every string literal when scanAllStrings is set", () => {
      const source = 'const plain = "bg-pink-500";';
      expect(runCustomRules(["no-raw-colors"], source, "/test.tsx")).toHaveLength(0);
      expect(
        runCustomRules(["no-raw-colors"], source, "/test.tsx", {
          noRawColors: { scanAllStrings: true },
        }),
      ).toHaveLength(1);
    });

    it("suggests the nearest theme color when values resolve", () => {
      const diags = runCustomRules(
        ["no-raw-colors"],
        '<div className="text-zinc-500" />',
        "/test.tsx",
        {
          themeColors: new Set(["muted", "primary"]),
          resolveColor: (name) =>
            name === "zinc-500" ? "#71717a" : name === "muted" ? "#71717a" : null,
        },
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("`text-muted`");
    });

    it("reports undeclared theme colors and corrects typos", () => {
      const options = {
        themeColors: new Set(["primary"]),
        classifyClass: (className: string) =>
          className === "text-primry" || className === "bg-brand"
            ? ("unknown-color" as const)
            : ("other" as const),
      };

      const typo = runCustomRules(
        ["no-raw-colors"],
        '<div className="text-primry" />',
        "/test.tsx",
        options,
      );
      expect(typo).toHaveLength(1);
      expect(typo[0].message).toContain("Did you mean `text-primary`");

      const undeclared = runCustomRules(
        ["no-raw-colors"],
        '<div className="bg-brand" />',
        "/test.tsx",
        options,
      );
      expect(undeclared).toHaveLength(1);
      expect(undeclared[0].message).toContain("not a declared theme color");

      const other = runCustomRules(
        ["no-raw-colors"],
        '<div className="text-sm" />',
        "/test.tsx",
        options,
      );
      expect(other).toHaveLength(0);
    });
  });
});
