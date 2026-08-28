import { describe, it, expect, vi } from "vitest";
import { TextDocument } from "vscode-languageserver-textdocument";
import { getShorthandClassDiagnostics } from "../src/core/shorthand-classes.js";

describe("getShorthandClassDiagnostics", () => {
  const mockDesignSystem = {
    canonicalizeCandidates: vi.fn((candidates: string[]) => candidates),
  };

  it("detects w-10 h-10 -> size-10", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation((candidates: string[]) => {
      if (candidates.length === 2 && candidates[0] === "w-10" && candidates[1] === "h-10") {
        return ["size-10"];
      }
      return candidates;
    });

    const doc = TextDocument.create(
      "file:///test.tsx",
      "typescriptreact",
      1,
      '<div className="w-10 h-10" />',
    );
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.tsx");

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("size-10");
    expect(diags[0].rule).toBe("shorthand-classes");
    expect(diags[0].severity).toBe("warning");
  });

  it("ignores reorder-only canonicalization", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation((candidates: string[]) => {
      if (candidates.includes("pl-11")) {
        return [
          "pl-11",
          "font-bold",
          "border-border",
          "bg-background",
          "text-foreground",
          "transition-all",
          "shadow-sm",
          "placeholder:text-muted-foreground/50",
          "focus:border-border",
          "focus:ring-0",
        ];
      }
      return candidates;
    });

    const doc = TextDocument.create(
      "file:///test.tsx",
      "typescriptreact",
      1,
      '<input className="font-bold pl-11 bg-background border-border text-foreground transition-all shadow-sm placeholder:text-muted-foreground/50 focus:ring-0 focus:border-border" />',
    );
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.tsx");

    expect(diags).toHaveLength(0);
  });

  it("detects px-4 py-4 -> p-4", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation((candidates: string[]) => {
      if (candidates.length === 2 && candidates[0] === "px-4" && candidates[1] === "py-4") {
        return ["p-4"];
      }
      return candidates;
    });

    const doc = TextDocument.create(
      "file:///test.tsx",
      "typescriptreact",
      1,
      '<div className="px-4 py-4" />',
    );
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.tsx");

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("p-4");
  });

  it("detects pt-4 pb-4 -> py-4", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation((candidates: string[]) => {
      if (candidates.length === 2 && candidates[0] === "pt-4" && candidates[1] === "pb-4") {
        return ["py-4"];
      }
      return candidates;
    });

    const doc = TextDocument.create(
      "file:///test.tsx",
      "typescriptreact",
      1,
      '<div className="pt-4 pb-4" />',
    );
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.tsx");

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("py-4");
  });

  it("detects pl-6 pr-6 -> px-6", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation((candidates: string[]) => {
      if (candidates.length === 2 && candidates[0] === "pl-6" && candidates[1] === "pr-6") {
        return ["px-6"];
      }
      return candidates;
    });

    const doc = TextDocument.create(
      "file:///test.tsx",
      "typescriptreact",
      1,
      '<div className="pl-6 pr-6" />',
    );
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.tsx");

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("px-6");
  });

  it("detects mx-2 my-2 -> m-2", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation((candidates: string[]) => {
      if (candidates.length === 2 && candidates[0] === "mx-2" && candidates[1] === "my-2") {
        return ["m-2"];
      }
      return candidates;
    });

    const doc = TextDocument.create(
      "file:///test.tsx",
      "typescriptreact",
      1,
      '<div className="mx-2 my-2" />',
    );
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.tsx");

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("m-2");
  });

  it("detects border-t border-b -> border-y", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation((candidates: string[]) => {
      if (candidates.length === 2 && candidates[0] === "border-t" && candidates[1] === "border-b") {
        return ["border-y"];
      }
      return candidates;
    });

    const doc = TextDocument.create(
      "file:///test.tsx",
      "typescriptreact",
      1,
      '<div className="border-t border-b" />',
    );
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.tsx");

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("border-y");
  });

  it("detects border-l border-r -> border-x", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation((candidates: string[]) => {
      if (candidates.length === 2 && candidates[0] === "border-l" && candidates[1] === "border-r") {
        return ["border-x"];
      }
      return candidates;
    });

    const doc = TextDocument.create(
      "file:///test.tsx",
      "typescriptreact",
      1,
      '<div className="border-l border-r" />',
    );
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.tsx");

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("border-x");
  });

  it("detects top-0 right-0 bottom-0 left-0 -> inset-0", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation((candidates: string[]) => {
      if (
        candidates.length === 4 &&
        candidates[0] === "top-0" &&
        candidates[1] === "right-0" &&
        candidates[2] === "bottom-0" &&
        candidates[3] === "left-0"
      ) {
        return ["inset-0"];
      }
      return candidates;
    });

    const doc = TextDocument.create(
      "file:///test.tsx",
      "typescriptreact",
      1,
      '<div className="top-0 right-0 bottom-0 left-0" />',
    );
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.tsx");

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("inset-0");
  });

  it("detects left-0 right-0 -> inset-x-0", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation((candidates: string[]) => {
      if (candidates.length === 2 && candidates[0] === "left-0" && candidates[1] === "right-0") {
        return ["inset-x-0"];
      }
      return candidates;
    });

    const doc = TextDocument.create(
      "file:///test.tsx",
      "typescriptreact",
      1,
      '<div className="left-0 right-0" />',
    );
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.tsx");

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("inset-x-0");
  });

  it("detects top-0 bottom-0 -> inset-y-0", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation((candidates: string[]) => {
      if (candidates.length === 2 && candidates[0] === "top-0" && candidates[1] === "bottom-0") {
        return ["inset-y-0"];
      }
      return candidates;
    });

    const doc = TextDocument.create(
      "file:///test.tsx",
      "typescriptreact",
      1,
      '<div className="top-0 bottom-0" />',
    );
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.tsx");

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("inset-y-0");
  });

  it("detects gap-x-4 gap-y-4 -> gap-4", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation((candidates: string[]) => {
      if (candidates.length === 2 && candidates[0] === "gap-x-4" && candidates[1] === "gap-y-4") {
        return ["gap-4"];
      }
      return candidates;
    });

    const doc = TextDocument.create(
      "file:///test.tsx",
      "typescriptreact",
      1,
      '<div className="gap-x-4 gap-y-4" />',
    );
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.tsx");

    expect(diags).toHaveLength(1);
    expect(diags[0].message).toContain("gap-4");
  });

  it("ignores classes with different values that cannot be collapsed", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation(
      (candidates: string[]) => candidates,
    );

    const doc = TextDocument.create(
      "file:///test.tsx",
      "typescriptreact",
      1,
      '<div className="w-10 h-20" />',
    );
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.tsx");

    expect(diags).toHaveLength(0);
  });

  it("ignores single classes", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation(
      (candidates: string[]) => candidates,
    );

    const doc = TextDocument.create(
      "file:///test.tsx",
      "typescriptreact",
      1,
      '<div className="p-4" />',
    );
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.tsx");

    expect(diags).toHaveLength(0);
  });

  it("parses class attribute with single quotes", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation((candidates: string[]) => {
      if (candidates[0] === "w-10" && candidates[1] === "h-10") {
        return ["size-10"];
      }
      return candidates;
    });

    const doc = TextDocument.create("file:///test.html", "html", 1, "<div class='w-10 h-10' />");
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.html");

    expect(diags).toHaveLength(1);
  });

  it("parses JSX expression with single-quoted string", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation((candidates: string[]) => {
      if (candidates[0] === "w-10" && candidates[1] === "h-10") {
        return ["size-10"];
      }
      return candidates;
    });

    const doc = TextDocument.create(
      "file:///test.tsx",
      "typescriptreact",
      1,
      "<div className={'w-10 h-10'} />",
    );
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.tsx");

    expect(diags).toHaveLength(1);
  });

  it("parses JSX expression with double-quoted string", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation((candidates: string[]) => {
      if (candidates[0] === "w-10" && candidates[1] === "h-10") {
        return ["size-10"];
      }
      return candidates;
    });

    const doc = TextDocument.create(
      "file:///test.tsx",
      "typescriptreact",
      1,
      '<div className={"w-10 h-10"} />',
    );
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.tsx");

    expect(diags).toHaveLength(1);
  });

  it("parses @apply in CSS", () => {
    mockDesignSystem.canonicalizeCandidates.mockImplementation((candidates: string[]) => {
      if (candidates[0] === "w-10" && candidates[1] === "h-10") {
        return ["size-10"];
      }
      return candidates;
    });

    const doc = TextDocument.create("file:///test.css", "css", 1, ".foo { @apply w-10 h-10; }");
    const diags = getShorthandClassDiagnostics(mockDesignSystem, doc, "/test.css");

    expect(diags).toHaveLength(1);
  });
});
