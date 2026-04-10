# Phase 2: Core Architecture

## Goal

Reshape the codebase so it resembles the clean separation used by `react-doctor`.

## Target structure

Recommended future structure:

```text
src/
  cli.ts
  index.ts
  types.ts
  constants.ts
  commands/
    lint.ts
  core/
    lint-project.ts
    lint-files.ts
    normalize-diagnostic.ts
discovery/
    discover-project.ts
    resolve-css-entry.ts
    resolve-inputs.ts
    resolve-include-paths.ts
  config/
    defaults.ts
  cache/
    read-cache.ts
    write-cache.ts
    cache-keys.ts
  adapters/
    tailwind-language-service.ts
    tailwind-design-system.ts
  reporters/
    pretty.ts
    json.ts
    compact.ts
```

## Why this structure

This mirrors the strongest `react-doctor` idea:

- CLI is orchestration
- core scan module is reusable
- utilities are focused by concern
- vendor adapters are isolated

## Required changes

### 1. Add `src/index.ts`

Expose a stable API such as:

```ts
lintProject(directory, options);
lintPaths(paths, options);
```

### 2. Move current scanning responsibilities apart

Current scanning code is doing too much at once:

- pattern normalization
- project selection
- design system loading
- language-service invocation
- diagnostic normalization

Split those responsibilities.

### 3. Introduce a `TwProject` model

Suggested shape:

- `rootDirectory`
- `cssEntryPath`
- `tailwindVersion`
- `supported`
- `sourceExtensions`
- `includePaths`

This is the `tw` equivalent of `react-doctor`'s `ProjectInfo`.

### 4. Introduce a `TwLintResult` model

Suggested fields:

- `diagnostics`
- `elapsedMilliseconds`
- `matchedFiles`
- `scannedFiles`
- `project`

## Implementation rules

- no vendor-specific types should leak into reporter code
- no terminal formatting inside scan core
- no direct `doValidate` calls outside the adapter layer

## Success criteria

- CLI imports one core function, not internal scan details
- reporters consume normalized results only
- adapter internals can change without rewriting CLI logic
