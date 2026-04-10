# Phase 1: Product Shape

## Goal

Define exactly what `tw` is as a product before adding more code.

## Product statement

`tw` is a fast Tailwind-focused diagnostic CLI for project-wide canonicalization and class-quality checks, optimized for terminal and CI workflows.

Near-term scope:

- Tailwind v4 support first
- project-wide scanning via `tw lint .`
- canonical-class diagnostics from Tailwind language service
- stable terminal output
- stable exit codes

Not in near-term scope:

- autofix
- editor integration
- watch mode
- Tailwind v3 support unless explicitly designed
- interactive prompts

## Main commands to support

Primary:

- `tw lint .`
- `tw lint src`
- `tw lint "src/**/*.{tsx,html}"`

Supported options:

- `--verbose`

## Diagnostic contract

Every finding in `tw` should normalize into one internal shape even if the source changes later.

Recommended internal fields:

- `file`
- `line`
- `column`
- `severity`
- `rule`
- `message`
- `source`

This follows the same spirit as `react-doctor`: the product owns the user-facing diagnostic model.

## UX rules

- default command should feel project-first
- output should be short by default
- failures should be deterministic
- unsupported project states should fail with actionable messages

## Success criteria

- `tw lint .` works on a normal Tailwind v4 project without additional glob arguments
- output is readable in local terminal and CI logs
- API and CLI can evolve independently
