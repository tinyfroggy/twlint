# twlinter

A fully open source Tailwind CSS diagnostic CLI for project-wide canonical class checks. It is designed to scan a full codebase from the terminal, similar to the `react-doctor` workflow, and currently supports Tailwind v4 projects.

We were inspired by [react-doctor](https://github.com/millionco/react-doctor/tree/main) and [Tailwind CSS IntelliSense](https://github.com/tailwindlabs/tailwindcss-intellisense).

Anyone can contribute to it, fork it, or build their own variant on top of it.

## Use It Like `react-doctor`

Once published, developers should be able to run the package directly with `npx`:

```bash
npx -y twlinter@latest . --verbose
```

The CLI also supports the explicit `lint` command:

```bash
npx -y twlinter@latest lint .
npx -y twlinter@latest lint "src/**/*.{tsx,html}" --verbose
```

The npm package and installed CLI command are both `twlinter`.

## Local Development

```bash
git clone <repo-url>
cd twlint
npm install
```

### Running on a test project

Use the built-in fixture to verify the CLI works:

```bash
# List all rules
npm run dev -- --help

# Scan the test fixture
npm run dev -- tests/fixtures/tw-v4-app/src

# Or scan the whole repo (excluding node_modules)
npm run dev -- .

# Enable extra rules
npm run dev -- . --rules canonical-classes,shorthand-classes
```

### Running against your own project

```bash
# Point to your project directory
npm run dev -- /path/to/your/project

# With verbose output and custom rules
npm run dev -- /path/to/your/project --verbose --rules canonical-classes,shorthand-classes

# Override CSS entry point if auto-detection fails
npm run dev -- /path/to/your/project --css-entry /path/to/your/project/src/globals.css
```

### Building and running the compiled CLI

```bash
npm run build
node dist/cli.js tests/fixtures/tw-v4-app/src --verbose
```

### Development scripts

| Command               | Description                            |
| --------------------- | -------------------------------------- |
| `npm run dev -- ...`  | Run the CLI directly via `tsx` (no build needed) |
| `npm run build`       | Compile TypeScript to `dist/`          |
| `npm run test`        | Run all tests (Vitest)                 |
| `npm run test:watch`  | Run tests in watch mode                |
| `npm run typecheck`   | TypeScript type checking (`tsc --noEmit`) |
| `npm run lint`        | Lint source code (oxlint)             |
| `npm run format`      | Format source code (oxfmt)            |
| `npm run format:check`| Check formatting without writing       |
| `npm run check`       | Run all checks: typecheck + lint + format + test |

## Commands

### `twlinter [patterns...]`

When run without a subcommand, `twlinter` scans the provided paths or glob patterns.

### `twlinter lint [patterns...]`

Lint files for canonical Tailwind classes. This is the primary command.

Alias behavior: `twlinter` can be run with or without the `lint` subcommand.

| Option      | Default | Description                            |
| ----------- | ------- | -------------------------------------- |
| `--verbose` | Off     | Show per-file details and project info |
| `-c, --config <path>` | Auto    | Path to config file (default: `.twlinter.json` in project root) |

## CSS Entrypoint Discovery

`twlinter` auto-discovers your CSS entry by searching for files that import `tailwindcss`. It prefers conventional paths like `src/app.css`, `app/globals.css`, and `styles/globals.css`. If multiple candidates are found, it exits with an error.

## Output

Diagnostics are grouped by message with severity icons:

```
  ⚠ The class `h-[350px]` can be written as `h-87.5` (2)
    app.tsx:12
    app.tsx:15

Found 2 warning(s). Scanned 18 file(s) in 45ms.
```

With `--verbose`, shows full file paths and project configuration details.

## Exit Codes

Exit code 1 if any diagnostics are found, 0 otherwise.

## Monorepo Support

`twlinter` detects monorepo layouts (npm, pnpm, yarn, nx) and handles them correctly. Run from a package root to scope the scan:

```bash
twlinter lint apps/web
```

## Programmatic API

```ts
import { lintProject } from "twlinter";

const result = await lintProject(["."]);

console.log(result.diagnostics);
console.log(
  `Scanned ${result.scannedFiles} files in ${result.elapsedMilliseconds}ms`,
);
```

### `LintResult`

| Field                 | Type           | Description                           |
| --------------------- | -------------- | ------------------------------------- |
| `matchedFiles`        | `number`       | Files matched by glob patterns        |
| `scannedFiles`        | `number`       | Files passed through relevance filter |
| `elapsedMilliseconds` | `number`       | Total scan duration                   |
| `diagnostics`         | `Diagnostic[]` | All findings                          |
| `project`             | `ProjectInfo`  | Discovered project metadata           |

### `Diagnostic`

| Field      | Type                   | Description            |
| ---------- | ---------------------- | ---------------------- |
| `file`     | `string`               | File path              |
| `line`     | `number`               | Line number            |
| `column`   | `number`               | Column number          |
| `rule`     | `string`               | Rule identifier        |
| `severity` | `"warning" \| "error"` | Severity level         |
| `message`  | `string`               | Human-readable message |
| `source`   | `string`               | Diagnostic source      |

### `LintOptions`

| Field                | Type       | Default | Description                                         |
| -------------------- | ---------- | ------- | --------------------------------------------------- |
| `verbose`            | `boolean`  | `false` | Show per-file details                               |
| `config`             | `string`   | —       | Path to config file                                 |
| `ignorePatterns`     | `string[]` | —       | Additional glob patterns to skip (merged with defaults) |
| `classIgnorePatterns` | `string[]` | —       | Regex patterns for class names to suppress          |
| `maxFileSize`        | `number`   | 524288  | Maximum file size in bytes to scan                  |
| `rules`              | `string[]` | —       | Rules to enable (default: `["canonical-classes"]`)  |
| `cssEntry`           | `string`   | Auto    | Override the CSS entry point detection              |

## Rules

| Rule                                    | Default | Description                                                          |
| --------------------------------------- | ------- | -------------------------------------------------------------------- |
| `canonical-classes`                     | On      | Suggests canonical Tailwind class names for arbitrary values         |
| `class-conflicts` / `no-conflicting-utilities` | Off     | Detect CSS class conflicts on the same element                      |
| `recommended-variant-order`             | Off     | Check variant ordering follows Tailwind conventions                  |
| `used-blocklisted-class`                | Off     | Detect usage of blocklisted or legacy classes                        |
| `shorthand-classes` / `prefer-shorthand` | Off     | Suggest shorthand classes (e.g. `w-10 h-10` → `size-10`)            |
| `no-duplicate-utilities`                | Off     | Detect repeated identical utilities (e.g. `p-4 p-4`)                |
| `canonical-class-order`                 | Off     | Enforce deterministic utility ordering (base → sm → md → lg → xl)   |
| `prefer-truncate-shorthand`             | Off     | Suggest `truncate` over `overflow-hidden text-ellipsis whitespace-nowrap` |
| `no-important-abuse`                    | Off     | Warn when `!important` is overused (>2 per class list)               |
| `max-classname-length`                  | Off     | Warn on class lists exceeding 120 characters                         |
| `no-sr-only-display-conflict`           | Off     | Detect `sr-only` combined with display utilities                     |
| `consistent-negative-arbitrary-values`  | Off     | Enforce `-top-[5px]` over `top-[-5px]` syntax                       |
| `prefer-logical-properties`             | Off     | Encourage `ps-*`/`pe-*` over `pl-*`/`pr-*` for RTL support          |
| `require-motion-reduce-for-animation`   | Off     | Require `motion-reduce:animate-none` for animations                  |
| `no-orphan-layout-utilities`            | Off     | Detect `items-center`/`justify-center` without `flex`/`grid`        |
| `require-flex-for-flex-utilities`       | Off     | Detect `flex-col`/`flex-wrap` without `flex`                         |
| `require-grid-for-grid-utilities`       | Off     | Detect `grid-cols-*`/`grid-rows-*` without `grid`                    |
| `warn-ineffective-z-index`              | Off     | Detect `z-*` without `relative`/`absolute`/`fixed`/`sticky`          |
| `require-display-for-sizing`            | Off     | Detect sizing on inline elements without `inline-block`              |
| `warn-hover-on-disabled`                | Off     | Detect `hover:*` on disabled elements                                |
| `require-focus-visible-for-interactive` | Off     | Require `focus-visible:*` on interactive elements with `hover:*`     |
| `warn-incomplete-dark-color-pair`       | Off     | Detect light-mode colors without `dark:*` counterparts               |
| `prefer-theme-scale`                    | Off     | Prefer Tailwind design scale over arbitrary values                   |
| `no-magic-spacing`                      | Off     | Detect spacing values not aligned to the 4px design grid             |
| `detect-conflicts-in-template-literals` | Off     | Detect duplicate utilities in template literal class names           |
| `suggest-reusable-patterns`             | Off     | Suggest `@utility` extraction for repeated class patterns            |
| `prefer-design-tokens`                  | Off     | Prefer design tokens over raw hex colors                             |

Specify rules in `.twlinter.json` or programmatically via `LintOptions.rules`. Use comma-separated names with `--rules` on the CLI.

**Aliases:** `prefer-shorthand` → `shorthand-classes`, `no-conflicting-utilities` → `class-conflicts`. Both names work interchangeably.

## Configuration

Create a `.twlinter.json` file in your project root:

```json
{
  "ignorePatterns": ["**/*.stories.*", "**/test/**"],
  "classIgnorePatterns": ["w-\\[\\d+px\\]", "h-\\[\\d+px\\]"],
  "rules": ["canonical-classes", "class-conflicts"],
  "maxFileSize": 100000,
  "cssEntry": "src/custom.css"
}
```

| Field                | Type       | Description                                            |
| -------------------- | ---------- | ------------------------------------------------------ |
| `ignorePatterns`     | `string[]` | Glob patterns to skip (merged with built-in defaults) |
| `classIgnorePatterns` | `string[]` | Regex patterns matched against each diagnostic's class name |
| `rules`              | `string[]` | Rules to enable                                       |
| `maxFileSize`        | `number`   | Maximum file size in bytes                            |
| `cssEntry`           | `string`   | Override auto-discovered CSS entry point              |

Config can also be placed in `package.json` under the `"twlinter"` key.

### Ignoring files

`ignorePatterns` are glob patterns merged into the built-in ignores (`node_modules/`, `dist/`, `build/`, etc.):

```json
{
  "ignorePatterns": ["**/*.stories.*", "**/generated/**", "**/test/**"]
}
```

### Ignoring specific class patterns

`classIgnorePatterns` are **regex patterns** tested against each diagnostic's class name. Diagnostics whose class matches any pattern are silently dropped:

```json
{
  "classIgnorePatterns": [
    "w-\\[\\d+px\\]",
    "h-\\[\\d+px\\]",
    "min-h-\\[\\d+px\\]",
    "max-w-\\[\\d+(?:px|rem)\\]"
  ]
}
```

This suppresses all suggestions for `w-[100px]`, `h-[350px]`, `sm:w-[260px]`, `max-w-[12rem]`, etc. The patterns support variants — `sm:w-[260px]` matches `w-\[\d+px\]` because the class name contains the token.

## Why We Use These Dependencies

This CLI is not a separate Tailwind parser with a completely different rule engine. It reuses Tailwind's existing language tooling and adapts it for terminal-based project scans.

### `@tailwindcss/language-service`

This package provides the Tailwind analysis engine. It is the part that understands Tailwind syntax, project configuration, and class diagnostics.

### `vscode-languageserver-textdocument`

This package provides the document model that the language service expects as input. In the editor, Tailwind diagnostics run against open text documents. In this CLI, we create those documents ourselves from files on disk and pass them into the Tailwind language service.

### Why both are needed

They solve different problems:

1. `@tailwindcss/language-service` does the Tailwind-aware analysis.
2. `vscode-languageserver-textdocument` represents file contents in the language-server format.

So this project is effectively a CLI wrapper around the Tailwind language tooling, not a second unrelated linter.

## Architecture

```
src/
  cli.ts              CLI entry (commander)
  index.ts            Programmatic API
  types.ts            Shared types
  constants.ts        Default globs and patterns
  formatter.ts        Line-level diagnostic formatting
  config/
    types.ts          Config type definitions
    load-config.ts    Config file loader (.twlinter.json / package.json)
  core/
    lint-project.ts   Scan orchestration
    validation-worker.ts  Worker thread for parallel validation
    normalize-diagnostic.ts
    rules.ts          Rule registry
    shorthand-classes.ts  Shorthand detection via canonicalizeCandidates
  custom-rules/
    index.ts          22 static-analysis rules from ruls.md
    utils.ts          Shared class extraction, variant/element parsing
  discovery/
    discover-project.ts
    resolve-css-entry.ts
    resolve-inputs.ts
    detect-monorepo.ts
    file-relevance.ts
  adapters/
    tailwind-language-service.ts
    tailwind-design-system.ts
  reporters/
    pretty.ts
```

## License

MIT

## Publishing Checklist

Before the first npm publish:

```bash
npm run check
npm pack
```

Recommended final package metadata before publishing:

1. Confirm the npm package `name` in `package.json`.
2. Add `repository`, `homepage`, and `bugs` URLs in `package.json`.
3. Publish with `npm publish`.

## Contributing

See `CONTRIBUTING.md` for local setup, validation commands, and the preferred pull request flow.

## Open Source

This repository is intended to be easy to contribute to:

1. Standard npm-based setup.
2. CI runs the same checks contributors run locally.
3. Husky can run checks before commit.
4. The codebase stays small and focused so new contributors can understand it quickly.
