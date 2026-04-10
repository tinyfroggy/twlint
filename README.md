# twlint

A fully open source Tailwind CSS diagnostic CLI for project-wide canonical class checks. It is designed to scan a full codebase from the terminal, similar to the `react-doctor` workflow, and currently supports Tailwind v4 projects.

Anyone can contribute to it, fork it, or build their own variant on top of it.

## Use It Like `react-doctor`

Once published, developers should be able to run the package directly with `npx`:

```bash
npx -y twlint@latest . --verbose
```

The CLI also supports the explicit `lint` command:

```bash
npx -y twlint@latest lint .
npx -y twlint@latest lint "src/**/*.{tsx,html}" --verbose
```

## Local Development

```bash
npm install
npm run dev -- --help
npm run dev -- .
npm run build
npm run test
npm run check
```

To try the built CLI locally:

```bash
npm run build
node dist/cli.js . --verbose
```

## Commands

### `twlint [patterns...]`

When run without a subcommand, `twlint` scans the provided paths or glob patterns.

### `twlint lint [patterns...]`

Lint files for canonical Tailwind classes. This is the primary command.

Alias behavior: `twlint` can be run with or without the `lint` subcommand.

| Option      | Default | Description                            |
| ----------- | ------- | -------------------------------------- |
| `--verbose` | Off     | Show per-file details and project info |

## CSS Entrypoint Discovery

`twlint` auto-discovers your CSS entry by searching for files that import `tailwindcss`. It prefers conventional paths like `src/app.css`, `app/globals.css`, and `styles/globals.css`. If multiple candidates are found, it exits with an error.

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

`twlint` detects monorepo layouts (npm, pnpm, yarn, nx) and handles them correctly. Run from a package root to scope the scan:

```bash
twlint lint apps/web
```

## Programmatic API

```ts
import { lintProject } from "twlint";

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

| Field     | Type      | Default | Description           |
| --------- | --------- | ------- | --------------------- |
| `verbose` | `boolean` | `false` | Show per-file details |

## Rules

| Rule                | Default | Description                                                  |
| ------------------- | ------- | ------------------------------------------------------------ |
| `canonical-classes` | On      | Suggests canonical Tailwind class names for arbitrary values |

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
  core/
    lint-project.ts   Scan orchestration
    normalize-diagnostic.ts
    rules.ts          Rule registry
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

1. Set the final npm package `name` in `package.json`.
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
