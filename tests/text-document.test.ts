import { describe, expect, it } from "vitest";

import { TextDocument } from "../src/core/text-document.js";

describe("TextDocument", () => {
  it("creates a document and returns its text", () => {
    const doc = TextDocument.create("file:///app.tsx", "typescriptreact", 1, "hello");
    expect(doc.getText()).toBe("hello");
    expect(doc.uri).toBe("file:///app.tsx");
  });

  it("maps offsets to line/character positions", () => {
    const doc = TextDocument.create("file:///a.css", "css", 1, "a\nbc\ndef");
    expect(doc.positionAt(0)).toEqual({ line: 0, character: 0 });
    expect(doc.positionAt(2)).toEqual({ line: 1, character: 0 });
    expect(doc.positionAt(3)).toEqual({ line: 1, character: 1 });
  });

  it("maps positions back to offsets", () => {
    const doc = TextDocument.create("file:///a.css", "css", 1, "a\nbc\ndef");
    expect(doc.offsetAt({ line: 1, character: 1 })).toBe(3);
    expect(doc.offsetAt({ line: 2, character: 0 })).toBe(5);
  });

  it("handles CRLF line endings", () => {
    const doc = TextDocument.create("file:///a.css", "css", 1, "a\r\nbc");
    expect(doc.positionAt(3)).toEqual({ line: 1, character: 0 });
    expect(doc.lineCount).toBe(2);
  });
});
