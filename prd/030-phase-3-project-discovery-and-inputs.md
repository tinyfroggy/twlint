# Phase 3: Project Discovery And Inputs

## Goal

Make `tw` feel project-aware the way `react-doctor` does.

## Reference ideas

From `react-doctor`:

- `discover-project.ts` determines framework and project shape
- `resolve-lint-include-paths.ts` separates file listing from lint execution
- CLI uses a directory argument as the main entrypoint

## What `tw` should discover

### 1. Tailwind version and support status

Detect:

- `tailwindcss` installed or not
- v4 project or not
- likely unsupported cases

Required user-facing errors:

- Tailwind missing
- Tailwind present but no CSS entry found
- CSS entry provided but unreadable
- non-v4 project if we choose to keep v4-only behavior

### 2. CSS entrypoint selection

CSS entry is always auto-discovered:

- search for CSS files containing `@import "tailwindcss"`
- prefer conventional paths like `src/app.css`, `app/globals.css`, `styles/globals.css`
- if multiple candidates exist, error with a helpful message

### 3. Project root and workspace shape

Detect:

- single-package repo
- monorepo root
- package-local scan target

Desired behavior:

- `tw lint .` scans current package sensibly
- if run from monorepo root, allow explicit package paths and later package selection support

### 4. Input resolution model

Support these forms:

- directory input
- file input
- glob input

Normalize all of them into one include-path array before scanning.

### 5. Extension policy

Default relevant source extensions should be configurable.

Initial list:

- `.html`
- `.js`
- `.jsx`
- `.ts`
- `.tsx`
- `.mjs`
- `.cjs`
- `.astro`
- `.vue`
- `.svelte`
- `.mdx`
- `.css`

Planned config support:

- `includeExtensions`
- `includeGlobs`
- `excludeGlobs`

## Config design

No config file support currently. All behavior is convention-based:

- CSS entry is auto-discovered
- file patterns use default globs
- output is always pretty format

## Success criteria

- users can run `tw lint .` in the common case
- ambiguous CSS entrypoint situations are explained clearly
- file selection behavior is deterministic and configurable
