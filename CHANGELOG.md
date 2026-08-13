# Changelog

All notable changes to this project are documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

Entries are added for user-visible changes (feat / fix / perf / behavior changes).
Dependency bumps and internal-only changes are out of scope.

## [Unreleased]

### Added

- Open a terminal through `luit` from the Command Palette (`luit: Open Terminal...`).
- Contribute a terminal profile so the same thing is available from the terminal dropdown.
- Read the encoding list from `luit -list` at runtime instead of hard-coding one.
- Settings for the `luit` path, default encoding, wrapped shell and its arguments.
- `luit.env` for setting environment variables (notably `LANG`) on these terminals: `luit` does not change the shell's locale, so the shell must already emit the selected encoding.
- Japanese localization.
- Show encodings the way VS Code spells them. The picker lists `Japanese (EUC-JP)` with `luit`'s own name (`eucJP`) beside it, both are searchable, and terminals are named `bash (EUC-JP via luit)`.
- Accept VS Code's spelling in `luit.defaultEncoding`. `EUC-JP`, `Shift_JIS` and `Japanese (EUC-JP)` all resolve to the name `luit` expects.
