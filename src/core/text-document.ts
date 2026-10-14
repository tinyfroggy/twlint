/**
 * Minimal `TextDocument` replacing `vscode-languageserver-textdocument`.
 *
 * Only the surface twlinter uses is implemented: `create`, `getText`,
 * `positionAt`, and `offsetAt`, with LSP-style zero-based positions.
 * Offsets are UTF-16 code units, matching the language-service contract.
 */

export type Position = {
  line: number;
  character: number;
};

export class TextDocument {
  private readonly content: string;
  private lineOffsets: number[] | undefined;

  private constructor(
    public readonly uri: string,
    public readonly languageId: string,
    public readonly version: number,
    content: string,
  ) {
    this.content = content;
  }

  static create(uri: string, languageId: string, version: number, content: string): TextDocument {
    return new TextDocument(uri, languageId, version, content);
  }

  getText(): string {
    return this.content;
  }

  get lineCount(): number {
    return this.getLineOffsets().length;
  }

  positionAt(offset: number): Position {
    const clamped = Math.max(0, Math.min(offset, this.content.length));
    const lineOffsets = this.getLineOffsets();
    let low = 0;
    let high = lineOffsets.length;
    while (low < high) {
      const mid = Math.floor((low + high) / 2);
      if (lineOffsets[mid] > clamped) {
        high = mid;
      } else {
        low = mid + 1;
      }
    }
    const line = low - 1;
    return { line, character: clamped - lineOffsets[line] };
  }

  offsetAt(position: Position): number {
    const lineOffsets = this.getLineOffsets();
    const line = Math.max(0, Math.min(position.line, lineOffsets.length - 1));
    const lineOffset = lineOffsets[line];
    const nextLineOffset =
      line + 1 < lineOffsets.length ? lineOffsets[line + 1] : this.content.length;
    return Math.max(
      lineOffset,
      Math.min(lineOffset + Math.max(0, position.character), nextLineOffset),
    );
  }

  private getLineOffsets(): number[] {
    if (this.lineOffsets) return this.lineOffsets;
    const offsets = [0];
    const text = this.content;
    for (let i = 0; i < text.length; i++) {
      const ch = text.charAt(i);
      if (ch === "\r") {
        if (text.charAt(i + 1) === "\n") i++;
        offsets.push(i + 1);
      } else if (ch === "\n") {
        offsets.push(i + 1);
      }
    }
    this.lineOffsets = offsets;
    return offsets;
  }
}
