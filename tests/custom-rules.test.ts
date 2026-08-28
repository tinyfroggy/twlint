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
import type { Diagnostic } from "../src/types.js";

function runCustomRules(ruleIds: string[], text: string, filePath: string): Diagnostic[] {
  return runAllCustomRules(text, filePath).filter((diagnostic) =>
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
});
