# Contributing

## Setup

```bash
npm install
```

This project publishes a Node CLI, so contributor workflows should work with standard npm tooling.

The project is fully open source. Contributions, experiments, and forks are all welcome.

## Common Commands

```bash
npm run dev -- --help
npm run dev -- . --verbose
npm run build
npm run test
npm run check
```

## Architecture

The CLI is a project scanner around Tailwind's language tooling plus a small custom rule engine.

```txt
src/
  cli.ts                         CLI entrypoint: argument parsing, command dispatch
  plugin.ts                      ESLint/Oxlint plugin entrypoint
  constants.ts                   Default globs, ignore patterns, class-helper names
  types.ts                       Shared diagnostic and result types
  core/lint-project.ts           File discovery, worker orchestration, result sorting
  core/validation-worker.ts      Parallel validation worker
  core/doctor.ts                 Project and rule status for --doctor and --rules
  core/apply-fixes.ts            Atomic --fix file writer
  core/class-kind.ts             Class classification and edit distance
  core/shorthand-classes.ts      Design-system shorthand checks
  core/theme-tokens.ts           Declared color-token reading
  core/unknown-classes.ts        Unknown-class detection and spelling suggestions
  rules/catalog.ts               Single source of truth for every rule
  rules/config.ts                Rule severity/option resolution and warnings
  rules/load-config.ts           Config file and package.json discovery
  rules/run.ts                   Per-file rule execution and capability gating
  custom-rules/index.ts          Rule registry and rule implementations
  custom-rules/utils.ts          Class parsing and source extraction
  custom-rules/js-sites.ts       JS/TS class sites in helpers and template literals
  custom-rules/color-data.ts     Color utility parsing tables
  custom-rules/color-values.ts   Color distance and nearest-token helpers
  discovery/                     Input, CSS-entry, and Tailwind project resolution
  adapters/                      Tailwind language service, v3 state, design system
  reporters/                     Pretty, JSON, and doctor renderers
  plugin/context-delegate.ts     Plugin-to-CLI bridge for design-system rules
```

## Rule Flow

Custom rules should follow this flow:

1. Extract class-bearing sources with helpers from `custom-rules/utils.ts`
   (`extractClassLists`, `extractHelperClassLists`,
   `extractElementsWithClasses`, `extractApplyBlocks`).
2. Parse class tokens with `parseClassName` instead of hand-splitting variants.
3. For element-aware rules, iterate `extractElementsWithClasses` and skip
   component tags.
4. Emit diagnostics with the local `diag` helper.
5. Register the check in `CUSTOM_RULES` and add its metadata to `RULE_CATALOG`.

## Element-Aware Rules

Some rules depend on the element a class list sits on. `require-flex-for-flex-utilities`,
for example, needs a `flex` or `inline-flex` base to act on.

twlinter has no component registry, so it cannot know a component's base classes.
Element-aware rules therefore skip component tags and reason only about native
elements. `extractElementsWithClasses` marks component tags with
`ElementClassList.isComponent`; rules should `continue` on those.

Do not read shared state from mutable globals inside rules. Pass data through
`RuleContext`; workers receive the same context as the single-threaded path.

## Responsive Scope

Do not strip all variants for dependency rules.

Correct examples:

```tsx
<div className="flex sm:flex-row" />
<div className="sm:flex sm:flex-row flex-col" /> // base flex-col should warn
```

Use `ParsedClass.responsive` and `hasBaseInScope` when checking whether a dependency exists. Base display utilities apply to responsive utilities, but responsive display utilities do not apply backward to base utilities.

## Adding A Rule

1. Add the rule implementation in `src/custom-rules/index.ts`, or a focused helper module if the rule needs shared logic.
2. Register the check in the `CUSTOM_RULES` registry in `src/custom-rules/index.ts`.
3. Add its metadata (id, description, default severity, capability) to `RULE_CATALOG` in `src/rules/catalog.ts`. This is the single source of truth: the CLI only runs catalogued rules, and `src/plugin.ts` exposes each entry to ESLint/Oxlint automatically.
4. Add tests in `tests/custom-rules.test.ts`, and cover the plugin adapter in `tests/plugin.test.ts` when the shape changes.

For element-aware rules, prefer `extractElementsWithClasses` over raw regexes. It supports native tags, component tags, and JSX member tags such as `Dialog.Footer`.

## Testing Expectations

Behavior changes need focused tests. Cover:

1. The positive case that should be reported.
2. The near-miss that should stay clean.
3. Variant and responsive scope edge cases.
4. Component tags being skipped by element-aware rules.

Before opening a PR, run:

```bash
npm run check
```

## Pull Requests

1. Make the smallest correct change.
2. Add or update tests when behavior changes.
3. Run `npm run check` before opening a PR.
4. Include a short summary of the user-visible change and why it matters.

## Pre-commit Hooks

This repo uses Husky. After `npm install`, Git hooks are installed automatically through the `prepare` script.

Current pre-commit behavior:

```bash
npm run check
```

## Releases

Releases are manual, using [Changesets](https://github.com/changesets/changesets).
Nothing bumps the version or publishes to npm on its own; you run each step when
you decide to release.

1. Add a changeset in your PR:

   ```bash
   npx changeset
   ```

   Choose `patch`, `minor`, or `major`, and write a short summary. The changeset
   file is committed with the PR.

2. When you are ready to release, apply the pending changesets locally:

   ```bash
   npx changeset version
   ```

   This bumps `version` in `package.json` and updates `CHANGELOG.md`. Commit the
   result and merge it like any other change.

3. Publish to npm from the updated `main`:

   ```bash
   npm login
   npm run release
   ```

   `npm run release` builds `dist/` and runs `changeset publish`. To publish
   with provenance, set `NPM_CONFIG_PROVENANCE=true` and run it from a CI job
   that has `id-token: write` and a configured `NODE_AUTH_TOKEN`.

Preview a release locally at any time:

```bash
npm run check
npm pack
```

`prepack` rebuilds a clean `dist/` directory so the published CLI matches `src/`.
