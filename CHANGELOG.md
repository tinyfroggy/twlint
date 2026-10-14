# twlinter

## 0.8.2

### Patch Changes

- Publish with npm provenance through the trusted GitHub Actions publisher.

## 0.8.1

### Patch Changes

- 4318eda: Reduce dependencies from six to three and harden the supply chain: replace `fast-glob` with internal file discovery, replace `vscode-languageserver-textdocument` with an internal `TextDocument`, and drop the direct `@babel/types` dependency. Pin patched `postcss`, `postcss-selector-parser`, and `source-map-js` versions via `overrides`, add npm provenance publishing, automated dependency updates, and a Socket Security badge.

## 0.8.0

### Minor Changes

- fa12945: Warn about unknown or invalid rule ids in the CLI config, with a "did you mean"
  suggestion, and write `--fix` changes atomically (temp file + rename).

## 0.7.0

### Minor Changes

- c8d85bd: Unify every rule behind a shared registry with on/off and severity config for
  both the CLI and the Oxlint/ESLint plugin, add `twlinter --doctor`, `--explain`,
  and `--rules`, and expose all rules through the plugin.
