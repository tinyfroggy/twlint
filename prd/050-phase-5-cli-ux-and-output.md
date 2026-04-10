# Phase 5: CLI UX And Output

## Goal

Make `tw` feel polished and predictable in the terminal, while keeping it simpler than `react-doctor`.

## Reference ideas

From `react-doctor`:

- clear top-level command
- helpful defaults
- stable exit code behavior
- optional verbose output
- polished but readable presentation

## CLI improvements to adopt

### 1. Single clear primary command

Recommended primary shape:

```bash
tw lint .
```

Keep aliases, but document only one primary command strongly.

### 2. Output style

Pretty output grouped by diagnostic message with file locations:

```
  ⚠ The class `h-[350px]` can be written as `h-87.5` (2)
    example/index.html:1
    example/react.jsx:6

Found 2 warnings. Scanned 18 file(s) in 45ms.
```

### 3. Grouping and summaries

Like `react-doctor`, group findings by rule in pretty mode.

Suggested summary footer:

- warnings count
- files affected
- elapsed time

### 4. Verbose mode

`--verbose` should print:

- file list per rule
- applied config source
- chosen CSS entry
- project root
- timing details

### 5. Exit code policy

Exit 1 when any diagnostics are found. Exit 0 for clean runs.

### 6. Help text quality

The help output should show project-first examples:

```bash
tw lint .
tw lint apps/web
tw lint "src/**/*.{tsx,html}"
```

## Reporting model

Normalized `LintResult` should contain enough metadata that different reporters can render the same scan cleanly.

Recommended reporter interface:

- input: `LintResult`
- output: string or streamed writes

## Success criteria

- local developer output is pleasant by default
- CI output is configurable and deterministic
- docs emphasize one main command path
