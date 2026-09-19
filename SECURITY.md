# Security Policy

## Supported versions

The latest published minor of `twlinter` receives security fixes.

## Reporting a vulnerability

Please do not report security vulnerabilities through public GitHub issues.

Report them privately through
[GitHub Security Advisories](https://github.com/tinyfroggy/twlint/security/advisories/new).

Please include:

- a description of the issue and its impact;
- steps to reproduce, or a proof of concept;
- the affected version and platform.

We will acknowledge reports as soon as reasonably possible and investigate
confirmed vulnerabilities promptly. We will keep you updated on the fix and
credit you in the advisory unless you prefer otherwise.

## Scope

Because `twlinter` reads and, with `--fix`, writes files in the project it runs
against, the most relevant areas are:

- the CLI and the `--fix` file writer;
- the published npm package (`twlinter`);
- the bundled GitHub Action (`tinyfroggy/twlint`);
- the ESLint/Oxlint plugin, including its CLI delegate.
