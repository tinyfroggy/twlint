import path from "node:path";

export function mightContainTailwindClasses(file: string, text: string): boolean {
  switch (path.extname(file)) {
    case ".css":
      return text.includes("@apply");
    case ".html":
    case ".astro":
    case ".vue":
    case ".svelte":
    case ".mdx":
      return text.includes("class=") || text.includes("class:") || text.includes("className");
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
        text.includes("tw.")
      );
    default:
      return false;
  }
}
