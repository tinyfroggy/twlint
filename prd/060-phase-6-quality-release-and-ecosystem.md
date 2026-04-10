# Phase 6: Quality, Release, And Ecosystem

## Goal

Make `tw` reliable enough to use repeatedly and publish later.

## Reference ideas

From `react-doctor`:

- published binary and export map in `package.json`
- distinct API entrypoint
- enough structure to support growth

## Quality plan

### 1. Test layers

Add tests for:

- config loading precedence
- input normalization for `.`, directories, files, and globs
- CSS entry auto-discovery
- normalized diagnostic output
- pretty and JSON reporters

### 2. Fixture projects

Create small fixture repos covering:

- single-package Tailwind v4 app
- monorepo with multiple CSS entrypoints
- unsupported project
- mixed framework file types

### 3. Benchmark harness

Measure:

- cold run time
- number of files matched vs validated

### 4. Packaging

Eventually publish with:

- `bin.tw`
- optional exports for API usage

Recommended export direction:

- `tw`
- `tw/api`

### 5. Ecosystem choices

Possible later integrations:

- GitHub Action
- editor command wrapper
- autofix mode once safe
- CI annotations

### 6. Documentation

Need docs for:

- quickstart
- config
- CI usage
- monorepo usage
- performance and behavior
- troubleshooting unsupported Tailwind setups

## Recommended order after PRD

1. architecture split: CLI vs API vs adapters
2. config system and project discovery
3. output formats and fail-on behavior
4. tests and fixtures
5. package polish and publish readiness

## Final product criteria

`tw` should feel like a real CLI product when all phases are complete:

- one obvious main command
- strong defaults
- fast repeated runs
- stable machine-readable output
- architecture that supports more Tailwind rules without collapse
