# twlinter

A zero-config Tailwind CSS linter for v3 and v4 projects.

[![npm version](https://img.shields.io/npm/v/twlinter?style=flat&colorA=000000&colorB=0f766e)](https://www.npmjs.com/package/twlinter)
[![npm downloads](https://img.shields.io/npm/dt/twlinter?style=flat&colorA=000000&colorB=0f766e)](https://www.npmjs.com/package/twlinter)
[![license](https://img.shields.io/npm/l/twlinter?style=flat&colorA=000000&colorB=0f766e)](./LICENSE)

Your Tailwind classes are not canonical. twlinter finds every one, then fixes
them.

One command scans a project and reports non-canonical Tailwind classes with
source locations and concrete replacements:

```text
  ⚠ The class `h-[350px]` can be written as `h-87.5`
    src/app.tsx:12

Found 1 warning. Scanned 18 files in 45ms.
```

Every custom rule also ships as an Oxlint/ESLint plugin, so the same checks run
inside your editor and in CI.

## Table of contents

- [Quickstart](#quickstart)
- [Usage](#usage)
- [Commands](#commands)
- [Configuration](#configuration)
- [Rules](#rules)
- [How rules run](#how-rules-run)
- [Oxlint and ESLint plugin](#oxlint-and-eslint-plugin)
- [Output](#output)
- [Continuous integration](#continuous-integration)
- [Credits](#credits)
- [Development](#development)

## Quickstart

Give your coding agent this prompt:

```text
Read https://github.com/tinyfroggy/twlint/blob/main/SETUP.md
and set up twlinter in this project.
```

Or just run it yourself:

```bash
npx twlinter@latest
```

![twlinter scanning a file, reporting non-canonical classes, and applying --fix](./assets/twlinter-demo.gif)

Once installed, [choose your rules](#rules) or leave the defaults. Prefer to
wire it up by hand? See [Usage](#usage) and the
[plugin](#oxlint-and-eslint-plugin).

## Usage

Run it from the root of your project:

```bash
npx twlinter@latest
```

That scans the current project and prints the default terminal report. For the
same report as structured JSON:

```bash
npx twlinter@latest --json
```

For problems with a concrete replacement, apply the fixes in place:

```bash
npx twlinter@latest --fix
```

twlinter detects the Tailwind CSS version from the project's installed
`tailwindcss` package.

- **v4** projects are read from a CSS entry that imports `tailwindcss`.
- **v3** projects are read from `tailwind.config.*`, or the v3 defaults when
  there is no config file.

## Commands

| Command | What it does |
| --- | --- |
| `twlinter` | Scan and print the report. |
| `twlinter --json` | Same report as JSON. |
| `twlinter --fix` | Apply machine-applicable fixes, then re-scan. |
| `twlinter --doctor` | Report the detected project and which rules can run. |
| `twlinter --explain` | After a scan, list rules that ran, were off, or were skipped. |
| `twlinter --rules` | List every rule, its capability, and default severity. |
| `twlinter --config <path>` | Use a specific config file. |
| `twlinter --no-config` | Ignore any config file and use rule defaults. |

`--doctor` is the "what's missing" view: it prints the Tailwind version and CSS
entry, how many theme colors were read, and a per-rule status — `active`, `off`,
or `skipped` with the reason. `--explain` does the same for a real scan, so a
rule that produced nothing tells you whether it ran, was disabled, or was
skipped.

```text
$ twlinter --doctor
Tailwind      v4.3.3   entry: src/index.css
Design system loaded   theme colors: 42   dependencies: 5

  no-raw-colors              text                 active
  no-unknown-classes         design-system-or-v3  active
  usedBlocklistedClass       design-system-or-v3  skipped  no blocklist in config
```

## Configuration

twlinter is zero-config: with no config file every rule runs at its default
severity. To change that, add `twlinter.config.json`, `.twlintrc.json`,
`.twlintrc`, or a `twlinter` key in `package.json`:

```json
{
  "rules": {
    "no-magic-spacing": "off",
    "no-raw-colors": ["error", { "allow": ["*-amber-100"] }],
    "no-unknown-classes": "warn"
  }
}
```

A rule accepts `"off" | "warn" | "error"`, `false`, or
`["warn" | "error", options]`. Rules you omit keep their default; set `"off"` to
disable one. The same ids are used by the [plugin](#oxlint-and-eslint-plugin),
so `"no-magic-spacing": "off"` and `"twlinter/no-magic-spacing": "off"` mean the
same thing.

## Rules

twlinter has two groups of rules. Every rule is registered with the same id in
both the CLI and the [Oxlint/ESLint plugin](#oxlint-and-eslint-plugin), and can
be turned on or off in either. The custom rules check the file text; the
language-service rules need Tailwind's design system, which the plugin can only
reach where it can run the CLI as a subprocess (see the
[plugin](#oxlint-and-eslint-plugin) notes).

### Custom rules

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
| `no-raw-colors` | Raw Tailwind palette colors such as `bg-pink-500` or `fill="#ec4899"` instead of a theme token. |

### Language-service rules

The CLI also runs Tailwind's language service, which needs the design system:

| Rule | What it catches |
| --- | --- |
| `suggestCanonicalClasses` | Classes with a simpler canonical form, e.g. `w-[350px]` → `w-87.5`. |
| `shorthand-classes` | Class lists that collapse to fewer utilities, e.g. the `truncate` set. |
| `cssConflict` | Conflicting utilities such as `block` and `hidden`. |
| `usedBlocklistedClass` | Classes blocked by the Tailwind configuration. |
| `no-unknown-classes` | Classes Tailwind cannot generate, such as `rounded-huge`, with spelling suggestions. |

## How rules run

### Version support

- **Every custom rule** runs on Tailwind v3 and v4.
- `cssConflict` and `no-unknown-classes` run on both v3 and v4.
- `suggestCanonicalClasses`, `shorthand-classes`, and `usedBlocklistedClass`
  rely on the v4 design system and are skipped on v3.
- On v3, the spacing-scale rules only suggest class names that exist on the v3
  scale; the plugin keeps v4 behavior unless it delegates to the CLI.

### Where classes are found

`no-unknown-classes` reads classes on elements and in `cn`-style helpers (`cn`,
`clsx`, `cx`, `classnames`, `twMerge`, `twJoin`, `tw`). It accepts Tailwind
utilities, `@utility` names, and plain class selectors from the theme's CSS
import graph, and reports anything else with a spelling suggestion when one is
close.

### Theme awareness

The CLI reads the project's declared `--color-*` tokens and passes them to
`no-raw-colors`.

- A palette color the theme overrides is allowed, and the message can name the
  project's colors.
- With a readable theme, `no-raw-colors` also suggests the nearest theme color,
  reports undeclared color tokens such as `bg-brand` with spelling corrections,
  and names the nearest token for literal SVG colors.
- Undeclared color tokens are reported by `no-raw-colors` rather than
  `no-unknown-classes`, which keeps its suggestion for typos of other
  utilities.
- The [plugin](#oxlint-and-eslint-plugin) has no project context, so it checks
  the built-in palette only.

## Oxlint and ESLint plugin

Every rule is published as an ESLint/Oxlint-compatible plugin rule. Install it
and register it under `jsPlugins`:

```bash
npm install -D twlinter oxlint
```

```json
{
  "jsPlugins": ["twlinter"],
  "rules": {
    "twlinter/no-duplicate-utilities": "error",
    "twlinter/no-important-abuse": "warn",
    "twlinter/no-unknown-classes": "error"
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

Rule ids match the `rule` field in the CLI report (`no-magic-spacing`,
`prefer-theme-scale`, and so on).

### Language-service rules in the plugin

The custom rules run entirely in-process. The language-service rules need the
compiled Tailwind design system, which is asynchronous — ESLint/Oxlint rules are
synchronous. The plugin bridges this by running the twlinter CLI once per
process and answering those rules from its report.

That bridge needs to spawn a subprocess, which some hosts block:

- **Node / ESLint**: works.
- **Oxlint**: the embedded runtime blocks `spawnSync`, so the language-service
  rules report nothing from the plugin. Enable them there via the CLI
  (`twlinter --json`) or by running twlinter in CI.

Set `TWLINTER_DELEGATE=0` to disable the bridge entirely.

`no-raw-colors` accepts `allow` and `deny` class patterns, a custom `message`
(placeholders `{{className}}`, `{{file}}`, `{{tokens}}`, `{{suggestions}}`),
`scanAllStrings`, extra `mergeFunctions`/`variantFunctions`, and component
`contracts`. It is fixable, so `oxlint --fix` can apply the replacement:

```json
{
  "jsPlugins": ["twlinter"],
  "rules": {
    "twlinter/no-raw-colors": [
      "error",
      {
        "allow": ["*-amber-100"],
        "contracts": [{ "pattern": "^Badge$", "allow": ["*-amber-500"] }]
      }
    ]
  }
}
```

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

## Continuous integration

Run the CLI in a workflow. It exits with code `1` when it finds issues:

```yaml
- uses: actions/setup-node@v4
  with:
    node-version: 20
- run: npx twlinter@latest
```

Or use the bundled action:

```yaml
- uses: tinyfroggy/twlint@v1
```

## Credits

twlinter stands on other people's work.

- The canonical-class, shorthand, blocklist, and CSS-conflict checks run on the
  [Tailwind CSS language service](https://github.com/tailwindlabs/tailwindcss/tree/main/packages/tailwindcss-language-service)
  (`@tailwindcss/language-service`).
- `no-raw-colors` and `no-unknown-classes` are inspired by
  [@shadcn/lint](https://github.com/shadcn-ui/lint).
- The idea of a deterministic, agent-first, zero-config linter is inspired by
  [React Doctor](https://github.com/millionco/react-doctor).

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

Releases are automated with [Changesets](https://github.com/changesets/changesets):
add a changeset in a PR, and the release workflow opens a version PR and
publishes to npm when it merges. See [CONTRIBUTING.md](./CONTRIBUTING.md).

twlinter is open source under the MIT license.
