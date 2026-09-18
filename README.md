# twlinter

A zero-config Tailwind CSS linter for Tailwind v4 projects.

## Quickstart

Give your coding agent this prompt:

```text
Read https://github.com/tinyfroggy/twlint/blob/main/SETUP.md
and set up twlinter in this project.
```

Once installed, [choose your rules](#rules) or leave the defaults. Prefer to run it yourself? See [Usage](#usage).

## Usage

Run it from the root of your project:

```bash
npx twlinter@latest
```

That scans the current project and prints the default terminal report. For the same report as structured JSON:

```bash
npx twlinter@latest --json
```

## Rules

Custom rules run in both the CLI and the [Oxlint/ESLint plugin](#oxlint-plugin):

| Rule | What it catches |
| --- | --- |
| `no-duplicate-utilities` | The same utility appearing more than once in one class list. |
| `prefer-truncate-shorthand` | `overflow-hidden text-ellipsis whitespace-nowrap` where `truncate` would do. |
| `no-important-abuse` | Stacking many `!` important utilities in one class list. |
| `no-sr-only-display-conflict` | `sr-only` combined with a display utility that overrides it. |
| `consistent-negative-arbitrary-values` | `top-[-5px]` instead of `-top-[5px]`. |
| `require-flex-for-flex-utilities` | `flex-row`/`flex-col`/`flex-wrap` without `flex` or `inline-flex` to act on. |
| `prefer-theme-scale` | Arbitrary spacing and font-size values that match the theme scale. |
| `no-magic-spacing` | Arbitrary spacing values that land off the 4px scale. |
| `detect-conflicts-in-template-literals` | The same utility across parts of a template literal. |
| `prefer-design-tokens` | Raw hex colors such as `bg-[#121212]` instead of a theme token. |

The CLI also runs Tailwind's language service, which needs the design system:

| Rule | What it catches |
| --- | --- |
| `suggestCanonicalClasses` | Classes with a simpler canonical form, e.g. `w-[350px]` → `w-87.5`. |
| `shorthand-classes` | Class lists that collapse to fewer utilities, e.g. the `truncate` set. |
| `cssConflict` | Conflicting utilities such as `block` and `hidden`. |
| `usedBlocklistedClass` | Classes blocked by the Tailwind configuration. |

## Oxlint plugin

The same custom rules are published as an ESLint/Oxlint-compatible plugin. Install it and register it under `jsPlugins`:

```bash
npm install -D twlinter oxlint
```

```json
{
  "jsPlugins": ["twlinter"],
  "rules": {
    "twlinter/no-duplicate-utilities": "error",
    "twlinter/no-important-abuse": "warn"
  }
}
```

For ESLint, import the plugin and register it the same way:

```js
import twlinter from "twlinter";

export default [
  {
    plugins: { twlinter },
    rules: {
      "twlinter/no-duplicate-utilities": "error",
    },
  },
];
```

Rule ids match the `rule` field in the CLI report (`no-magic-spacing`, `prefer-theme-scale`, and so on). Run the CLI, the plugin, or both.

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
      "rule": "suggestCanonicalClasses",
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
