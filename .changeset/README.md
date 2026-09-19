# Changesets

This folder is managed by [Changesets](https://github.com/changesets/changesets).

Add a changeset to any PR that changes the published package:

```bash
npx changeset
```

Pick a bump type (`patch`, `minor`, `major`) and write a short summary. The
release workflow collects the pending changesets, opens a version PR, and
publishes to npm when that PR merges.
