export const DEFAULT_GLOB = "**/*.{html,jsx,tsx,astro,vue,svelte,mdx,css}";
export const DEFAULT_PATTERNS = [DEFAULT_GLOB];
export const DEFAULT_CSS_ENTRY_PATTERNS = ["**/*.css"];
export const DEFAULT_IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/vendor/**",
  "**/.next/**",
  "**/.nuxt/**",
  "**/build/**",
  "**/coverage/**",
  "**/*.min.js",
  "**/*.min.css",
  "**/*.map",
  "**/*.lock",
  "**/bun.lock",
  "**/package-lock.json",
  "**/yarn.lock",
];
export const MAX_FILE_SIZE_BYTES = 512 * 1024;
