# React Doctor Reference Study

## Why this repo is the right reference

`react-doctor` is a good reference for `tw` because it is not only a CLI. It is a productized diagnostic tool with clear boundaries between:

- command-line entrypoints
- scan orchestration
- project discovery
- config loading
- external tool adapters
- diagnostic shaping
- output formatting

That is the same set of problems `tw` will grow into if it becomes more than a small script.

## Reference patterns to copy directly

### 1. Thin CLI, thicker scan API

Reference files:

- `react-doctor/packages/react-doctor/src/cli.ts`
- `react-doctor/packages/react-doctor/src/index.ts`

Key idea:

- `cli.ts` handles flags, prompts, environment behavior, exit codes, and output flow.
- `index.ts` exposes a programmatic API.
- the actual scan work lives below that layer.

What `tw` should copy:

- keep a clear `cli.ts`
- add a real core API entrypoint that can be imported by tests or other tools
- move scanning logic behind an explicit function like `lintProject(directory, options)`

Why it matters:

- cleaner testing
- easier future editor integration
- easier future GitHub Action or CI wrapper

### 2. Project-first input model

Reference files:

- `react-doctor/packages/react-doctor/src/cli.ts`
- `react-doctor/packages/react-doctor/src/utils/resolve-lint-include-paths.ts`

Key idea:

- default input is a directory, not a raw file glob
- include paths are derived from project state
- file selection is a separate concern from lint execution

What `tw` should copy:

- `tw lint .` should be the main path
- raw globs should still work, but as an advanced input form
- project scanning and targeted scanning should share one normalized include-path layer

### 3. Project discovery before heavy work

Reference file:

- `react-doctor/packages/react-doctor/src/utils/discover-project.ts`

Key idea:

- inspect the workspace before deciding which behaviors apply
- determine framework and project shape once

What `tw` should copy:

- discover whether the project is Tailwind v4 or unsupported
- discover likely CSS entrypoints
- discover monorepo layout
- discover relevant source directories
- discover likely markup-bearing extensions

### 4. Config loading with precedence rules

Reference file:

- `react-doctor/packages/react-doctor/src/utils/load-config.ts`

Key idea:

- explicit config file first
- embedded package.json config second
- CLI flags override config

What `tw` should copy:

- support `tw.config.json`
- support `package.json` key like `twLint` or `tw`
- define exact precedence rules

### 5. External tools behind adapters

Reference file:

- `react-doctor/packages/react-doctor/src/utils/run-oxlint.ts`

Key idea:

- one file owns how a third-party tool is invoked and normalized
- raw tool output is transformed into the product's own diagnostic model

What `tw` should copy:

- one adapter for `@tailwindcss/language-service`
- optional later adapter for `oxlint`-style file filtering or formatting assistance
- own diagnostic shape that is independent from vendor internals

### 6. Orchestration with performance awareness

Reference files:

- `react-doctor/packages/react-doctor/src/index.ts`
- `react-doctor/packages/react-doctor/src/scan.ts`

Key idea:

- discover once
- compute include paths once
- run independent work in parallel
- combine normalized diagnostics at the end

What `tw` should copy:

- load design system once per project scan
- compute candidate file list once
- separate scan stages clearly

## Things not to copy directly

### 1. Product scoring

`react-doctor` uses a score and branding layer. `tw` does not need a score right now.

### 2. Prompt-heavy flow

`react-doctor` has prompt logic, Ami integration, and interactive project selection. `tw` should stay mostly non-interactive.

### 3. Multi-tool rule categories too early

`react-doctor` has many rule groups and tool runners. `tw` currently has one primary rule family and should not over-abstract too soon.

## Current gaps in `tw` compared to the reference

- no dedicated core API module
- no explicit project discovery layer
- no explicit config loading layer
- no stable internal diagnostic model beyond terminal formatting
- no elapsed-time reporting
- no formal rule-engine abstraction
- no separation between file selection and validation logic

## Design conclusion

`tw` should become a small diagnostic platform, not just a script. The architecture should stay smaller than `react-doctor`, but the shape should rhyme with it:

- thin CLI
- core scan API
- discovery utilities
- config utilities
- adapter-based lint engine
- normalized diagnostics
- polished reporter
