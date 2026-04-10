# cli-tw

Small TypeScript CLI for experimenting with Tailwind CSS linting in the terminal.

## Commands

- `bun install`
- `bun run dev --help`
- `bun run dev "src/**/*.{html,tsx,css}"`
- `bun run build`

## Current status

The CLI scaffolding is set up and currently prints placeholder diagnostics. The next step is wiring it to Tailwind IntelliSense diagnostics and filtering `suggestCanonicalClasses`.
