# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

Add a changeset to any PR that changes the published package:

```bash
npx changeset
```

Pick a bump type (`patch`, `minor`, `major`) and write a short summary. Nothing
runs automatically: when you are ready to release, apply the pending changesets
with `npx changeset version`, commit the result, then publish with
`npm run release`.
