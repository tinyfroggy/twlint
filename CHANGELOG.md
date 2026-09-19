# twlinter

## 0.8.0

### Minor Changes

- fa12945: Warn about unknown or invalid rule ids in the CLI config, with a "did you mean"
  suggestion, and write `--fix` changes atomically (temp file + rename).

## 0.7.0

### Minor Changes

- c8d85bd: Unify every rule behind a shared registry with on/off and severity config for
  both the CLI and the Oxlint/ESLint plugin, add `twlinter --doctor`, `--explain`,
  and `--rules`, and expose all rules through the plugin.
