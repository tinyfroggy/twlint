import { describe, it, expect } from "vitest";
import { runCustomRules } from "../src/custom-rules/index.js";
import {
  extractClassLists,
  parseClassName,
  stripVariants,
  extractElements,
  INLINE_TAGS,
} from "../src/custom-rules/utils.js";

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
      expect(p.base).toBe("bg-red-500");
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

  describe("canonical-class-order", () => {
    it("warns on variant out of order", () => {
      const diags = runCustomRules(
        ["canonical-class-order"],
        '<div className="md:p-4 p-2" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("p-2");
    });

    it("passes on correct order", () => {
      const diags = runCustomRules(
        ["canonical-class-order"],
        '<div className="p-2 md:p-4 lg:p-8" />',
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

  describe("prefer-logical-properties", () => {
    it("detects pl-4", () => {
      const diags = runCustomRules(
        ["prefer-logical-properties"],
        '<div className="pl-4" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("ps-4");
    });

    it("detects border-l", () => {
      const diags = runCustomRules(
        ["prefer-logical-properties"],
        '<div className="border-l-2" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
      expect(diags[0].message).toContain("border-s-2");
    });

    it("passes on logical properties", () => {
      const diags = runCustomRules(
        ["prefer-logical-properties"],
        '<div className="ps-4 pe-2" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });
  });

  describe("require-motion-reduce-for-animation", () => {
    it("detects animation without motion-reduce", () => {
      const diags = runCustomRules(
        ["require-motion-reduce-for-animation"],
        '<div className="animate-spin" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
    });

    it("passes with motion-reduce variant", () => {
      const diags = runCustomRules(
        ["require-motion-reduce-for-animation"],
        '<div className="animate-spin motion-reduce:animate-none" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });
  });

  describe("no-orphan-layout-utilities", () => {
    it("detects orphan items-center", () => {
      const diags = runCustomRules(
        ["no-orphan-layout-utilities"],
        '<div className="items-center justify-center" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(2);
    });

    it("passes with flex present", () => {
      const diags = runCustomRules(
        ["no-orphan-layout-utilities"],
        '<div className="flex items-center justify-center" />',
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
  });

  describe("require-grid-for-grid-utilities", () => {
    it("detects grid-cols-3 without grid", () => {
      const diags = runCustomRules(
        ["require-grid-for-grid-utilities"],
        '<div className="grid-cols-3" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
    });

    it("passes with grid present", () => {
      const diags = runCustomRules(
        ["require-grid-for-grid-utilities"],
        '<div className="grid grid-cols-3" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });
  });

  describe("warn-ineffective-z-index", () => {
    it("detects z-50 without positioning", () => {
      const diags = runCustomRules(
        ["warn-ineffective-z-index"],
        '<div className="z-50" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
    });

    it("passes with relative", () => {
      const diags = runCustomRules(
        ["warn-ineffective-z-index"],
        '<div className="relative z-50" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });
  });

  describe("require-display-for-sizing", () => {
    it("detects sizing on span without block display", () => {
      const diags = runCustomRules(
        ["require-display-for-sizing"],
        '<span className="w-4 h-4" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
    });

    it("passes on span with inline-block", () => {
      const diags = runCustomRules(
        ["require-display-for-sizing"],
        '<span className="inline-block size-4" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });

    it("passes on div with sizing", () => {
      const diags = runCustomRules(
        ["require-display-for-sizing"],
        '<div className="w-4 h-4" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });
  });

  describe("warn-hover-on-disabled", () => {
    it("detects hover on disabled button", () => {
      const diags = runCustomRules(
        ["warn-hover-on-disabled"],
        '<button disabled className="hover:bg-blue-600" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
    });

    it("passes on enabled button with hover", () => {
      const diags = runCustomRules(
        ["warn-hover-on-disabled"],
        '<button className="hover:bg-blue-600" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });
  });

  describe("require-focus-visible-for-interactive", () => {
    it("detects hover without focus-visible on button", () => {
      const diags = runCustomRules(
        ["require-focus-visible-for-interactive"],
        '<button className="hover:bg-blue-600" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
    });

    it("passes with focus-visible present", () => {
      const diags = runCustomRules(
        ["require-focus-visible-for-interactive"],
        '<button className="hover:bg-blue-600 focus-visible:ring-2" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });
  });

  describe("warn-incomplete-dark-color-pair", () => {
    it("detects text-* without dark:text-*", () => {
      const diags = runCustomRules(
        ["warn-incomplete-dark-color-pair"],
        '<div className="text-gray-900 dark:bg-black" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
    });

    it("passes with complete dark pair", () => {
      const diags = runCustomRules(
        ["warn-incomplete-dark-color-pair"],
        '<div className="text-gray-900 dark:text-gray-100" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(0);
    });
  });

  describe("prefer-theme-scale", () => {
    it("detects arbitrary value in px", () => {
      const diags = runCustomRules(
        ["prefer-theme-scale"],
        '<div className="mt-[16px]" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
    });

    it("passes on theme value", () => {
      const diags = runCustomRules(["prefer-theme-scale"], '<div className="mt-4" />', "/test.tsx");
      expect(diags).toHaveLength(0);
    });
  });

  describe("no-magic-spacing", () => {
    it("detects magic spacing value", () => {
      const diags = runCustomRules(
        ["no-magic-spacing"],
        '<div className="mt-[37px]" />',
        "/test.tsx",
      );
      expect(diags).toHaveLength(1);
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
