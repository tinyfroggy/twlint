export const DEFAULT_GLOB = "**/*.{html,js,jsx,ts,tsx,astro,vue,svelte,mdx,css}";
export const DEFAULT_PATTERNS = [DEFAULT_GLOB];
export const DEFAULT_CSS_ENTRY_PATTERNS = ["**/*.css"];
export const DEFAULT_IGNORE_PATTERNS = [
  "**/node_modules/**",
  "**/dist/**",
  "**/vendor/**",
  "**/.next/**",
  "**/.nuxt/**",
  "**/.svelte-kit/**",
  "**/.astro/**",
  "**/.tanstack/**",
  "**/.vinxi/**",
  "**/.vite/**",
  "**/.vercel/**",
  "**/.netlify/**",
  "**/.output/**",
  "**/.nitro/**",
  "**/.cache/**",
  "**/.parcel-cache/**",
  "**/.turbo/**",
  "**/build/**",
  "**/coverage/**",
  "**/out/**",
  "**/public/build/**",
  "**/storybook-static/**",
  "**/playwright-report/**",
  "**/test-results/**",
  "**/*.min.js",
  "**/*.min.css",
  "**/*.map",
  "**/*.lock",
  "**/bun.lock",
  "**/package-lock.json",
  "**/yarn.lock",
];
export const DEFAULT_IGNORED_PATH_SEGMENTS = [
  "node_modules",
  "dist",
  "vendor",
  ".next",
  ".nuxt",
  ".svelte-kit",
  ".astro",
  ".tanstack",
  ".vinxi",
  ".vite",
  ".vercel",
  ".netlify",
  ".output",
  ".nitro",
  ".cache",
  ".parcel-cache",
  ".turbo",
  "build",
  "coverage",
  "out",
  "storybook-static",
  "playwright-report",
  "test-results",
];
export const MAX_FILE_SIZE_BYTES = 512 * 1024;

/**
 * Helper functions whose string-literal, template-literal-static, and
 * object-key arguments should be scanned for Tailwind classes.
 *
 * These are fed to the Tailwind language service `classFunctions` setting,
 * which matches each name as a regex alternative (anchored `^(NAMES)$`) and
 * uses its built-in argument lexer to pull class strings out of:
 *   - plain string literals:        clsx("a b", cond && "c d")
 *   - template-literal statics:     clsx(`a b ${x} c d`)  -> "a b ", " c d"
 *   - object keys:                  clsx({ "p-4": cond, "flex gap-2": other })
 *   - cva base + variant strings:   cva("base", { variants: { ... } })
 *
 * Keeping this list here means every rule benefits automatically without any
 * AST parser dependency.
 */
export const DEFAULT_CLASS_FUNCTIONS = [
  "clsx",
  "cn",
  "classnames",
  "classNames",
  "cva",
  "cx",
  "tv",
  "twMerge",
  "twJoin",
  "tw",
];
