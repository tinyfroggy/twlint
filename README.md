# cli-tw

Small TypeScript CLI for experimenting with Tailwind CSS linting in the terminal.

## Commands

- `bun install`
- `bun run dev --help`
- `bun run dev lint -c ./example/app.css "example/**/*.{html,css}"`
- `bun run build`

## Short Commands

Build and link the CLI once:

```bash
bun run build
bun link
```

Then you can run either:

```bash
tw lint . -c ./example/app.css
tw lint -c ./example/app.css "example/**/*.{html,css}"
tw-lint -c ./example/app.css "example/**/*.{html,css}"
```

## Example

Use a Tailwind v4 CSS entry file so the CLI can load the design system:

```bash
tw lint . -c ./src/app.css
tw lint -c ./example/app.css "example/**/*.{html,css}"
```

The CLI uses Tailwind's v4 design-system loader together with `@tailwindcss/language-service`, caches unchanged files in `.tw-lint-cache.json`, and only prints `suggestCanonicalClasses` diagnostics.

Directory arguments are supported:

```bash
tw lint . -c ./src/app.css
tw lint src -c ./src/app.css
tw lint apps/web -c ./apps/web/src/app.css
```
