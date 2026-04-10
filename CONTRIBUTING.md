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
