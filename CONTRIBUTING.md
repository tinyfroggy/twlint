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
  cli.ts                         Commander entrypoint
  core/lint-project.ts           File discovery, worker orchestration, result sorting
  core/validation-worker.ts      Parallel validation worker
  adapters/                      Tailwind language service and design-system adapters
  custom-rules/index.ts          Rule registry and rule implementations
  custom-rules/context.ts        Rule context, component resolution, scoped class helpers
  custom-rules/utils.ts          Class parsing and source extraction
  component-registry.ts          Built-in/user component registry helpers
  presets/shadcn.ts              Built-in shadcn/ui component base classes
```

## Rule Flow

Custom rules should follow this flow:

1. Extract class-bearing sources with helpers from `custom-rules/utils.ts`.
2. Parse class tokens with `parseClassName` instead of hand-splitting variants.
3. For element-aware rules, call `resolveElementClasses` from `custom-rules/context.ts`.
4. Check `effectiveClasses`, not only the user-provided class list, when component base classes matter.
5. Emit diagnostics with the local `diag` helper.

## Component-Aware Rules

Dependency rules such as `require-flex-for-flex-utilities` must be component-aware.

The resolver classifies elements as:

| Kind | Meaning | Diagnostic confidence |
| ---- | ------- | --------------------- |
| `native` | Lowercase HTML/SVG element | High |
| `known-component` | Component found in built-in presets or user config | High |
| `unknown-component` | Capitalized or member component without known base classes | Low |

Unknown components should not emit hard warnings by default. Use `strict: true` to emit low-confidence warnings.

Do not read component config from mutable globals inside rules. Pass data through `RuleContext`; workers receive the same context as the single-threaded path.

## Responsive Scope

Do not strip all variants for dependency rules.

Correct examples:

```tsx
<div className="flex sm:flex-row" />
<div className="sm:flex sm:flex-row flex-col" /> // base flex-col should warn
```

Use `ParsedClass.responsive` and `hasBaseInScope` when checking whether a dependency exists. Base display utilities apply to responsive utilities, but responsive display utilities do not apply backward to base utilities.

## Adding A Rule

1. Add the rule implementation in `src/custom-rules/index.ts` or a focused helper module if the rule needs shared logic.
2. Register it in `ALL_RULES`.
3. Add the rule id to `src/core/rules.ts` if it should be selectable from config/CLI.
4. Add tests in `tests/custom-rules.test.ts`.
5. Update the README rule table if the rule is user-facing.

For element-aware rules, prefer `extractElementsWithClasses` over raw regexes. It supports native tags, component tags, and JSX member tags such as `Dialog.Footer`.

## Adding Component Presets

Built-in presets live in `src/presets/shadcn.ts`.

Add the component's always-present classes only. Conditional variant classes can be added later when the rule engine models conditional branches; dependency rules should only treat always-present base classes as reliable.

Flat named exports such as `DialogFooter` can point to compound names such as `Dialog.Footer` through the alias map at the bottom of the preset file.

## Testing Expectations

Behavior changes need focused tests. For component-aware rules, include:

1. Native element warning.
2. Known component pass.
3. Known component warning when base classes do not provide the dependency.
4. Unknown component skipped by default.
5. Unknown component warning in strict mode.
6. Responsive scope edge cases.

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

## Release Notes

Before publishing to npm:

```bash
npm run check
npm pack
```

`prepack` rebuilds a clean `dist/` directory so the published CLI matches `src/`.
