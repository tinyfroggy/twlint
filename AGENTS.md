# AGENTS.md

Instructions for coding agents working in this repository.

`twlinter` is a zero-config Tailwind CSS linter. It scans projects and reports
non-canonical classes, and it also publishes the custom rules as an
Oxlint/ESLint plugin.

## Commands

```bash
npm install        # install dependencies
npm run dev        # run the source CLI with tsx
npm run check      # typecheck + lint + format check + tests
npm run build      # compile to dist/
npm run test       # vitest, once
```

Run `npm run check` before finishing any change. It must pass.

## Rules for changes

- Keep the CLI zero-config. Do not add a required config file.
- A behavior change needs a test. See `tests/`.
- Adding a rule: implement it in `src/custom-rules/index.ts`, register it in
  `CUSTOM_RULES`, and add tests. The plugin picks it up automatically.
- Prefer the helpers in `src/custom-rules/utils.ts` and
  `src/custom-rules/context.ts` over ad-hoc parsing.
- Do not bump `version` or edit `CHANGELOG.md` by hand. Releases use
  [Changesets](./.changeset/README.md); add a changeset with `npx changeset`.

## Docs

- [README.md](./README.md) — usage, rules, credits.
- [SETUP.md](./SETUP.md) — the agent-facing setup prompt.
- [CONTRIBUTING.md](./CONTRIBUTING.md) — architecture, rule flow, releases.
