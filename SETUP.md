# Set up twlinter

Install and run `twlinter` in the user's project. `twlinter` is zero-config:
there are no rules to choose and no config file to create. Keep the setup
small, and let the reported issues drive the work.

Read the [README](https://github.com/tinyfroggy/twlint#readme) before making
changes.

## Inspect the project

- Detect the package manager from the project metadata and lockfile.
- Confirm this is a Tailwind v4 project: `tailwindcss` v4 is a dependency,
  and the CSS entry point imports Tailwind (`@import "tailwindcss"`).
- Note the source directories and the CSS entry point. `twlinter` finds both
  on its own.

If the project uses Tailwind v3 or an older setup, stop and tell the user that
`twlinter` targets Tailwind v4.

## Run twlinter

Run it from the root of the project:

```bash
npx twlinter@latest
```

It prints a grouped report with source locations and exits with code `1` when
it finds issues. Fix the reported classes, then run it again until the project
is clean.

For a machine-readable report, use `--json`.

## Optional: run it as an Oxlint or ESLint plugin

The custom rules are also published as a plugin. Register it where the project
already lints UI files. For Oxlint, add it under `jsPlugins`:

```json
{
  "jsPlugins": ["twlinter"],
  "rules": {
    "twlinter/no-duplicate-utilities": "error",
    "twlinter/no-important-abuse": "warn"
  }
}
```

For ESLint, import the plugin and register it the same way. Use the package
manager that owns the lint config, and preserve existing rules, parsers, and
ignores.

The plugin covers the custom rules. The CLI also runs Tailwind's language
service for canonical-class and CSS-conflict checks. Those need the design
system, so keep `npx twlinter@latest` in the workflow when they matter.

## Optional: keep it in the project

- Add a script, for example `"lint:tailwind": "twlinter"`, to `package.json`
  after installing `twlinter` as a dev dependency.
- Add the command to CI so new classes are checked.
- Put this in `AGENTS.md`: after making changes, run `npx twlinter@latest`
  and fix all errors.
- Configure rules only if the project needs to customize the plugin rules.

## Verify and hand off

Run the CLI (and the plugin, if configured) to confirm they load and report.
Separate configuration errors from real lint findings.

Tell the user:

- What was run or installed, and which files changed.
- How to run the check, including any script or CI entry that was added.
- Where to read the [available rules](https://github.com/tinyfroggy/twlint#rules).
- That the plugin makes the custom rules optional to configure, and that the
  CLI remains the way to get the language-service checks.
