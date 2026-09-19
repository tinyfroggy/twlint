import path from "node:path";

/**
 * SVG/JSX color attributes that can carry a literal color even when the file
 * has no class attributes. `no-raw-colors` checks these, so such files must
 * not be filtered out before the rules run.
 */
const COLOR_ATTRIBUTE_MARKERS = ["fill=", "stroke=", "stopColor=", "floodColor=", "lightingColor="];

function hasColorAttribute(text: string): boolean {
  return COLOR_ATTRIBUTE_MARKERS.some((marker) => text.includes(marker));
}

export function mightContainTailwindClasses(file: string, text: string): boolean {
  switch (path.extname(file)) {
    case ".css":
      return text.includes("@apply");
    case ".html":
    case ".astro":
    case ".vue":
    case ".svelte":
    case ".mdx":
      return (
        text.includes("class=") ||
        text.includes("class:") ||
        text.includes("className") ||
        hasColorAttribute(text)
      );
    case ".js":
    case ".jsx":
    case ".ts":
    case ".tsx":
    case ".mjs":
    case ".cjs":
      return (
        text.includes("className") ||
        text.includes("class=") ||
        text.includes("clsx(") ||
        text.includes("cva(") ||
        text.includes("tw`") ||
        text.includes("tw.") ||
        hasColorAttribute(text)
      );
    default:
      return false;
  }
}
