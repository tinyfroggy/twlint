---
"twlinter": patch
---

Reduce dependencies from six to three and harden the supply chain: replace `fast-glob` with internal file discovery, replace `vscode-languageserver-textdocument` with an internal `TextDocument`, and drop the direct `@babel/types` dependency. Pin patched `postcss`, `postcss-selector-parser`, and `source-map-js` versions via `overrides`, add npm provenance publishing, automated dependency updates, and a Socket Security badge.
