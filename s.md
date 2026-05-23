# Component-Aware Tailwind Linting — Implementation Summary

## Problem

`require-flex-for-flex-utilities` (and similar rules) produced false positives when components like `DialogFooter` provide `flex` internally but only `flex-row` is passed in the user's `className`. The linter had no awareness of component internals.

## Solution: 10 files changed

### New Files

| File | Purpose |
|------|---------|
| `src/component-registry.ts` | Singleton registry: `initRegistry()`, `getComponentInfo()`, `isComponentElement()`, `getStrictMode()`. |
| `src/presets/shadcn.ts` | Built-in shadcn/ui component presets (~150 components). Auto-merged with user config; user entries override presets. |

### Modified Files

| File | Change |
|------|--------|
| `src/config/types.ts` | Added `ComponentInfo`, `components`, and `strict` fields to `TwlinterConfig`. |
| `src/custom-rules/utils.ts` | Added `extractElementsWithClasses()` (tag-aware class extraction with separate regex, no overlap with `extractClassLists`) and `extractApplyBlocks()` (for `@apply` fallback). |
| `src/custom-rules/index.ts` | Updated `RuleCheck` → `(text, filePath, context?)`, updated `runCustomRules`. Rewrote **3 rules** with component-aware logic. |
| `src/adapters/tailwind-language-service.ts` | `validateCandidate` accepts `RuleContext`, passes it to `runCustomRules`. |
| `src/core/validation-worker.ts` | Threads `strict` flag through worker data. |
| `src/core/lint-project.ts` | Calls `initRegistry()` from config, passes `strict` through validation chain. |
| `src/types.ts` | Added `components` and `strict` to `LintOptions`. |
| `src/cli.ts` | Passes `config.components` and `config.strict` to `lintProject`. |

### Rule Logic (3 rewritten rules)

Each rule now uses `extractElementsWithClasses()` to get tag + classes per element:

1. **Native element** (lowercase tag) → warn with high confidence (unchanged)
2. **Known component** (in registry) → merge baseClasses + userClasses; warn only if merged set still lacks the dependency
3. **Unknown component** (capitalized tag, not in registry) → skip silently unless `strict: true`, then emit low-confidence warning

## Config Usage

```jsonc
// .twlinter.json
{
  "strict": true,
  "components": {
    "DialogFooter": {
      "baseClasses": "flex flex-col-reverse gap-2 px-6 sm:flex-row sm:justify-end"
    }
  }
}
```

## Test Coverage

All 146 tests pass (11 files). New test cases:

- `extractElementsWithClasses` — tag detection, native vs component
- `component-registry` — init, lookup, isComponentElement, user-over-preset merge
- Flex rule: known component with/without flex, unknown component with/without strict
- Grid rule: same scenarios
- Orphan layout rule: same scenarios

## Key Design Decisions

- **Separate regex for `extractElementsWithClasses`** — avoids duplication with `extractClassLists` (which still works unchanged for other rules)
- **`extractApplyBlocks`** for `@apply` fallback — only non-element class sources need the old behavior
- **Presets auto-merged** — shadcn presets are always loaded; user config overrides them
- **`RuleContext`** — lightweight object `{strict?: boolean}` passed through the call chain
