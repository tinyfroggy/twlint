# tw

A Tailwind CSS diagnostic CLI for project-wide canonical class checks. Supports Tailwind v4.

## Install

```bash
bun install
```

## Quickstart

```bash
# Scan current directory (CSS entry is auto-detected)
tw lint .

# Scan a specific directory
tw lint src

# Scan with a glob pattern
tw lint "src/**/*.{tsx,html}"

# Verbose output with project details
tw lint . --verbose
```

## Development

```bash
bun install
bun run dev --help
bun run dev lint .
bun run build
bun run test
bun run check
```

After building, link the CLI globally:

```bash
bun run build
bun link
tw lint .
```

## Commands

### `tw lint [patterns...]`

Lint files for canonical Tailwind classes. This is the primary command.

Aliases: `tw l`, `tw` (when run without a subcommand)

| Option      | Default | Description                            |
| ----------- | ------- | -------------------------------------- |
| `--verbose` | Off     | Show per-file details and project info |

## CSS Entrypoint Discovery

`tw` auto-discovers your CSS entry by searching for files that import `tailwindcss`. It prefers conventional paths like `src/app.css`, `app/globals.css`, and `styles/globals.css`. If multiple candidates are found, it exits with an error.

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

`tw` detects monorepo layouts (npm, pnpm, yarn, nx) and handles them correctly. Run from a package root to scope the scan:

```bash
tw lint apps/web
```

## Programmatic API

```ts
import { lintProject } from "cli-tw";

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
