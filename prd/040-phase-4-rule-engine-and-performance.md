# Phase 4: Rule Engine And Performance

## Goal

Turn the current direct language-service call into a proper rule engine with measurable performance behavior.

## Reference ideas

From `react-doctor`:

- `run-oxlint.ts` isolates vendor invocation and output normalization
- `index.ts` runs independent analysis passes in parallel
- scan logic tracks elapsed time and combines results centrally

## Adapter architecture for `tw`

### Current state

`tw` directly calls:

- Tailwind design-system loading
- Tailwind language-service validation

### Target state

Wrap that behind an adapter module:

- `adapters/tailwind-language-service.ts`
- `adapters/tailwind-design-system.ts`

Responsibilities of the adapter:

- load design system
- build language-service state
- request desired diagnostics
- convert raw diagnostics into internal format

## Rule selection model

Today `tw` only uses:

- `suggestCanonicalClasses`

Future-ready rule model should still exist now:

- `canonical-classes`
- `class-conflicts`
- `recommended-variant-order`
- `used-blocklisted-class`

The CLI can still default to just canonical classes, but the engine should not hard-code that assumption in too many places.

## Performance strategy

### 1. File selection before validation

Keep improving the relevance filter. It should happen before language-service validation.

Potential heuristics by file type:

- markup attributes like `class=` and `className=`
- tagged templates and helper functions
- framework-specific syntax like Vue and Svelte class bindings
- CSS `@apply`

### 2. Batch metrics

Track:

- matched files
- relevant files
- validated files
- elapsed time

### 5. Optional external tool leverage

The user suggested `oxlint` and `oxfmt`.

Practical uses:

- `oxlint` can help with fast source file discovery or JS/TS parsing if we later add deeper syntax-aware extraction
- `oxfmt` is not directly useful for lint execution, but could be useful later for generated fixes or snapshots

Do not adopt them yet unless they solve a specific bottleneck.

## Proposed milestones

1. move Tailwind integration into adapter modules
2. prepare multi-rule support behind the same engine
3. benchmark on medium-sized repos

## Success criteria

- second run on unchanged repo is fast due to efficient file selection
- core scan path is measurable and benchmarkable
- adapter code is isolated from CLI/reporting code
