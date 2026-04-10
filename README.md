# tw

A fast Tailwind CSS diagnostic CLI for project-wide canonicalization and class-quality checks. Optimized for terminal and CI workflows. Supports Tailwind v4.

## Install

```bash
bun install
```

## Quickstart

```bash
# Scan current directory
tw lint . -c ./src/app.css

# Scan a specific directory
tw lint src -c ./src/app.css

# Scan with a glob pattern
tw lint "src/**/*.{tsx,html}" -c ./src/app.css

# Verbose output with project details
tw lint . --verbose
```

## Development

```bash
bun install
bun run dev --help
bun run dev lint . -c ./example/app.css
bun run build
bun run test
```

After building, link the CLI globally:

```bash
bun run build
bun link
tw lint . -c ./src/app.css
```

## Commands

### `tw lint [patterns...]`

Lint files for canonical Tailwind classes. This is the primary command.

Aliases: `tw l`, `tw` (when run without a subcommand)

| Option                    | Default                | Description                                     |
| ------------------------- | ---------------------- | ----------------------------------------------- |
| `-c, --css-entry <file>`  | Auto-detected          | Tailwind v4 CSS entry file                      |
| `--format <format>`       | `pretty`               | Output format: `pretty`, `compact`, `json`      |
| `--fail-on <level>`       | `none`                 | Exit with code 1 on: `error`, `warning`, `none` |
| `--config <file>`         | Auto-detected          | Path to `tw.config.json`                        |
| `--include <patterns...>` | Default glob           | Additional glob patterns to include             |
| `--exclude <patterns...>` | `node_modules`, `dist` | Glob patterns to exclude                        |
| `--verbose`               | Off                    | Show per-file details and configuration info    |

## Configuration

Configuration is loaded with the following precedence (highest first):

1. CLI flags
2. `tw.config.json`
3. `"tw"` key in `package.json`

### `tw.config.json`

```json
{
  "cssEntry": "./src/app.css",
  "include": ["src/**/*.{tsx,ts,jsx,js,html}"],
  "exclude": ["**/*.test.tsx", "src/generated/**"],
  "format": "pretty",
  "failOn": "warning"
}
```

### `package.json`

```json
{
  "tw": {
    "cssEntry": "./src/app.css",
    "exclude": ["**/*.test.tsx"]
  }
}
```

## CSS Entrypoint Discovery

When `--css-entry` is not provided and no config file specifies one, `tw` auto-discovers your CSS entry by searching for files that import `tailwindcss`. It prefers conventional paths like `src/app.css`, `app/globals.css`, and `styles/globals.css`. If multiple candidates are found, it exits with an error message asking you to specify one explicitly.

## Output Formats

### Pretty (default)

Groups diagnostics by rule with a summary footer:

```
canonical-classes (3)
  The class `h-[350px]` can be written as `h-87.5`
  - src/app.tsx:12:5, 13:7

Found 3 diagnostic(s).
Scanned 18 file(s) in 45ms.
```

With `--verbose`, adds per-file line:column details and project configuration info.

### Compact

One diagnostic per line, grep-friendly:

```
src/app.tsx:12:5 canonical-classes The class `h-[350px]` can be written as `h-87.5`
Found 3 diagnostic(s). Scanned 18 file(s) in 45ms.
```

### JSON

Full `LintResult` object as JSON. Useful for tooling and CI integrations:

```bash
tw lint . -c ./src/app.css --format json
```

## Exit Codes

The exit code is controlled by `--fail-on`:

| Level     | Behavior                                        |
| --------- | ----------------------------------------------- |
| `none`    | Always exit 0                                   |
| `warning` | Exit 1 if any diagnostics found                 |
| `error`   | Exit 1 only if error-severity diagnostics found |

Default is `none`. Use `--fail-on warning` in CI to catch all diagnostics.

## Monorepo Support

`tw` detects monorepo layouts (npm, pnpm, yarn, nx) and handles them correctly. Run from a package root to scope the scan:

```bash
tw lint apps/web -c ./apps/web/src/app.css
```

## Programmatic API

```ts
import { lintProject } from "cli-tw";

const result = await lintProject(["."], {
  cssEntry: "./src/app.css",
  format: "json",
  failOn: "warning",
});

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

## Rules

| Rule                | Default | Description                                                  |
| ------------------- | ------- | ------------------------------------------------------------ |
| `canonical-classes` | On      | Suggests canonical Tailwind class names for arbitrary values |

Additional rules are prepared for future activation: `class-conflicts`, `recommended-variant-order`, `used-blocklisted-class`.

## Architecture

```
src/
  cli.ts              CLI entry (commander)
  index.ts            Programmatic API
  types.ts            Shared types
  constants.ts        Default globs and patterns
  formatter.ts        Line-level diagnostic formatting
  commands/
    lint.ts           Lint command handler
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
  config/
    load-config.ts
    defaults.ts
  adapters/
    tailwind-language-service.ts
    tailwind-design-system.ts
  reporters/
    pretty.ts
    compact.ts
    json.ts
    index.ts
```

Key principles:

- CLI is orchestration only; all logic lives in `core/` and `discovery/`
- Adapters isolate vendor code (language service, design system) from the rest
- Reporters consume normalized `LintResult` only
- Discovery runs before heavy validation work

## License

MIT
