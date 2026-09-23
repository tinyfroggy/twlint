# twlinter

**The Tailwind CSS linter that finds every non-canonical class and tells you
exactly what to replace it with.**

```text
h-[350px]                                      →  h-87.5
text-sm leading-5                              →  text-sm/5
overflow-hidden text-ellipsis whitespace-nowrap →  truncate
```

Zero config. Tailwind v3 + v4. CLI + ESLint + Oxlint.

```bash
npx twlinter@latest
```

[![npm version](https://img.shields.io/npm/v/twlinter?style=flat&colorA=000000&colorB=0f766e)](https://www.npmjs.com/package/twlinter)
[![npm downloads](https://img.shields.io/npm/dt/twlinter?style=flat&colorA=000000&colorB=0f766e)](https://www.npmjs.com/package/twlinter)
[![license](https://img.shields.io/npm/l/twlinter?style=flat&colorA=000000&colorB=0f766e)](./LICENSE)
[![skills.sh](https://skills.sh/b/tinyfroggy/twlint)](https://skills.sh/tinyfroggy/twlint)

![twlinter scanning a file, reporting non-canonical classes, and applying --fix](./assets/twlinter-demo.gif)

[Watch the full-quality video (MP4)](./assets/twlinter-demo.mp4)

> Repository: [`twlint`](https://github.com/tinyfroggy/twlint) · npm package:
> [`twlinter`](https://www.npmjs.com/package/twlinter) · CLI: `twlinter`

## Install with an agent skill

```bash
npx skills add tinyfroggy/twlint --skill install-twlinter
```

Then ask your coding agent to set up twlinter in the current repository. The
skill inspects the project, detects the Tailwind version, runs the scan, and
fixes the reported classes. See [For coding agents](#for-coding-agents) for the
prompt-only path.

## Why twlinter?

Tailwind has many ways to write the same thing. twlinter finds the
non-canonical ones, reports each with a source location, and names the exact
replacement — then can apply the fixes in place.

### Canonical classes

```text
h-[350px]  →  h-87.5
```

Classes with a simpler form on the theme scale are rewritten as the canonical
utility.

### Shorthand

```text
overflow-hidden text-ellipsis whitespace-nowrap  →  truncate
```

Class lists that collapse to fewer utilities are reported as one suggestion.

### Design tokens

```text
bg-[#121212]  →  bg-background
bg-pink-500   →  bg-primary
```

Raw hex values and built-in palette colors are flagged in favor of the theme
tokens the project actually declares.

### Unknown classes

```text
rounded-huge  →  did you mean `rounded-full`?
```

Classes Tailwind cannot generate are reported with a spelling suggestion, so
silent no-op CSS does not ship.

### Duplicates, conflicts, and magic values

```text
p-4 p-4            →  p-4
block hidden       →  pick one
top-[-5px]         →  -top-[5px]
w-[13px]           →  w-3.25
```

### Auto-fix

Every fixable finding can be written back to your files:

```bash
npx twlinter@latest --fix
```

### The same rules in your editor

Every rule ships as an ESLint/Oxlint plugin, so the checks run in your editor
and in CI, not just on the command line. See
[the plugin](#oxlint-and-eslint-plugin).

## Compatibility

| Check | Tailwind v3 | Tailwind v4 |
| --- | :---: | :---: |
| Custom rules (11) | ✅ | ✅ |
| `no-unknown-classes` | ✅ | ✅ |
| `cssConflict` | ✅ | ✅ |
| `suggestCanonicalClasses` | ✅ | ✅ |
| `usedBlocklistedClass` | ✅ | ✅ |
| `shorthand-classes` | — | ✅ |

twlinter detects the Tailwind version from your installed `tailwindcss`
package. On v3 it reads `tailwind.config.*` (or the v3 defaults); on v4 it
reads the CSS entry that imports `tailwindcss`.

## Table of contents

- [Quickstart](#quickstart)
- [Install with an agent skill](#install-with-an-agent-skill)
- [Usage](#usage)
- [Commands](#commands)
- [Configuration](#configuration)
- [Rules](#rules)
- [How rules run](#how-rules-run)
- [Oxlint and ESLint plugin](#oxlint-and-eslint-plugin)
- [Output](#output)
- [Continuous integration](#continuous-integration)
- [For coding agents](#for-coding-agents)
- [Credits](#credits)
- [Development](#development)

## Quickstart

Run it from the root of your project:

```bash
npx twlinter@latest
```

Once installed, [choose your rules](#rules) or leave the defaults. Prefer to
wire it up by hand? See [Usage](#usage) and the
[plugin](#oxlint-and-eslint-plugin).

## Usage

That command scans the current project and prints the default terminal report.
For the same report as structured JSON:

```bash
npx twlinter@latest --json
```

For problems with a concrete replacement, apply the fixes in place (each file
is written atomically):

```bash
npx twlinter@latest --fix
```

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

`--explain` writes to **stderr**, so machine-readable output stays clean:

```bash
twlinter --json --explain > result.json   # result.json is valid JSON
```

```text
$ twlinter --doctor
twlinter doctor

Project        .
Tailwind       v4.3.3   entry: src/index.css
Design system  loaded   theme colors: 42   dependencies: 5

  no-raw-colors              text                 active
  no-unknown-classes         design-system-or-v3  active
  usedBlocklistedClass       design-system-or-v3  active
```

## Configuration

twlinter is zero-config: with no config file every rule runs at its default
severity. To change that, add `twlinter.config.json`, `.twlintrc.json`,
`.twlintrc`, `twlinter.json`, or a `twlinter` key in `package.json`:

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

A rule id that does not exist (usually a typo) is reported with a suggestion on
stderr, and an invalid severity is called out instead of being ignored:

```text
twlinter: Unknown rule "no-magic-spcing". Did you mean "no-magic-spacing"?
twlinter: Invalid setting for rule "no-raw-colors". Use "off", "warn", "error", false, or ["warn"|"error", options].
```

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

See the [compatibility table](#compatibility) for the summary.

- **Every custom rule** runs on Tailwind v3 and v4.
- `suggestCanonicalClasses`, `cssConflict`, `usedBlocklistedClass`, and
  `no-unknown-classes` run on both v3 and v4.
- `shorthand-classes` relies on the v4 design system and is skipped on v3.
- On v3, the spacing-scale rules only suggest class names that exist on the v3
  scale; the plugin keeps v4 behavior unless it delegates to the CLI.

### Where classes are found

`no-unknown-classes` reads classes on elements and in `cn`-style helpers (`cn`,
`clsx`, `cx`, `classnames`, `classNames`, `cva`, `tv`, `twMerge`, `twJoin`,
`tw`). It accepts Tailwind
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

Or use the bundled action. It runs a pinned twlinter version by default for
reproducible results; pass `version: latest` to follow releases:

```yaml
- uses: tinyfroggy/twlint@v0.8.0
  with:
    version: latest
```

## For coding agents

Install the bundled skill, or give your coding agent this prompt:

```bash
npx skills add tinyfroggy/twlint --skill install-twlinter
```

```text
Read https://github.com/tinyfroggy/twlint/blob/main/SETUP.md
and set up twlinter in this project.
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

Releases are manual, using [Changesets](https://github.com/changesets/changesets):
add a changeset in a PR, then run the version and publish steps yourself when
you want to ship. See [CONTRIBUTING.md](./CONTRIBUTING.md).

twlinter is open source under the MIT license.
