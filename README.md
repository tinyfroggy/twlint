# twlinter

A zero-config Tailwind CSS linter for Tailwind v4 projects.

## Usage

Run it from the root of your project:

```bash
npx twlinter@latest
```

That scans the current project and prints the default terminal report. For the same report as structured JSON:

```bash
npx twlinter@latest --json
```

There is no config file and no rule setup. twlinter discovers the Tailwind CSS entry point, scans relevant source files, ignores generated output, and runs its default checks automatically.

The process exits with code `1` when it finds diagnostics and `0` when the project is clean.

## Output

The default report groups findings and includes their source locations:

```text
  ⚠ The class `h-[350px]` can be written as `h-87.5`
    src/app.tsx:12

Found 1 warning. Scanned 18 files in 45ms.
```

`--json` prints a summary and the same diagnostics:

```json
{
  "summary": {
    "matchedFiles": 18,
    "scannedFiles": 18,
    "elapsedMilliseconds": 45,
    "warningCount": 1
  },
  "diagnostics": [
    {
      "file": "src/app.tsx",
      "line": 12,
      "column": 8,
      "severity": "warning",
      "rule": "canonical-classes",
      "message": "The class `h-[350px]` can be written as `h-87.5`",
      "source": "tw"
    }
  ]
}
```

## Development

```bash
npm install
npm run check
```

Run the source CLI locally with:

```bash
npm run dev
npm run dev -- --json
```

Build the publishable package with `npm run build`.

twlinter is open source under the MIT license.
