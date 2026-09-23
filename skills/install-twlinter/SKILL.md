---
name: install-twlinter
description: Install and run twlinter, the zero-config Tailwind CSS linter, in a project. Use when adding twlinter or fixing reported non-canonical Tailwind classes.
---

# Install and run twlinter

twlinter is zero-config: there is no ruleset to choose and no config file to
create. Keep the setup small and let the reported findings drive the work.

## Inspect the project

Detect the package manager from the lockfile and project metadata. Confirm the
project uses Tailwind CSS v3 or v4:

- v4: `tailwindcss` v4 is a dependency and the CSS entry imports Tailwind
  (`@import "tailwindcss"`).
- v3: `tailwindcss` v3 is a dependency, with `tailwind.config.*` or the v3
  defaults when no config exists.

Note the source directories and the CSS entry or config file; twlinter finds
these on its own. If `tailwindcss` is older than v3, stop and tell the user
that twlinter supports Tailwind CSS v3 and v4 only.

Complete when the package manager, Tailwind version, and source layout are
known.

## Run the scan

From the project root:

```bash
npx twlinter@latest
```

It prints a grouped report with source locations and exits with code `1` when
it finds issues. Apply the machine-applicable fixes in place, then re-scan:

```bash
npx twlinter@latest --fix
```

Review the diff after `--fix`: some findings (omitted fields, which side of a
conflict to keep) need a human decision and are not auto-fixed. For a
machine-readable report use `--json`. When a rule reports nothing, `--doctor`
and `--explain` show whether it ran, was turned off, or was skipped — for
example the v4-only rules on Tailwind v3.

Complete when the scan is clean or every remaining finding has been fixed or
explained.

## Verify and hand off

Run the CLI to confirm it loads and reports, and separate configuration errors
from real lint findings.

Tell the user:

- What was run, and which files changed.
- How to re-run the check.
- Where the rule list lives:
  https://github.com/tinyfroggy/twlint#rules
