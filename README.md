# luit

Open VS Code integrated terminals that speak legacy encodings — EUC-JP, Shift_JIS, Big5, KOI8-R and anything else [luit](https://invisible-island.net/luit/) supports.

`xterm.js`, which powers the VS Code integrated terminal, [only speaks UTF-8](https://xtermjs.org/docs/guides/encoding/#legacy-encodings) and recommends a transcoder such as `luit` for everything else. This extension runs that transcoder for you.

## Requirements

- The extension host must run on Linux — local Linux, Remote - SSH, WSL, or a Dev Container.
- `luit` must be installed **on the machine where the extension host runs**. Over Remote - SSH that is the remote host, not your laptop.

```bash
sudo apt install luit     # Debian / Ubuntu
sudo dnf install luit     # Fedora / RHEL
sudo pacman -S luit       # Arch Linux
```

## Usage

Run **luit: Open Terminal...** from the Command Palette, pick an encoding, and a terminal opens with that encoding translated to UTF-8.

The same thing is available as a terminal profile: click the dropdown arrow next to the terminal `+` button and choose **luit**.

Either way the extension launches the equivalent of:

```bash
luit -encoding eucJP -- bash --login
```

The encoding list is read from `luit -list` at runtime, so it always matches what your `luit` actually supports.

### The shell's locale has to match

`luit` translates whatever the shell writes, from the encoding you picked into UTF-8. It does **not** change the shell's locale — the shell has to already be emitting that encoding.

On a host whose `LANG` is `ja_JP.eucJP` this just works, which is the case this extension was built for. If your shell emits UTF-8 while `luit` is told to expect EUC-JP, everything comes out as mojibake. Set `LANG` for these terminals when that happens:

```jsonc
"luit.env": { "LANG": "ja_JP.eucJP" }
```

The locale has to exist on that machine (`locale -a` lists the installed ones).

## Settings

| Setting                     | Default       | Description                                                                                                                            |
| --------------------------- | ------------- | -------------------------------------------------------------------------------------------------------------------------------------- |
| `luit.luitPath`             | `""`          | Path to the `luit` executable. Empty searches `PATH`.                                                                                  |
| `luit.defaultEncoding`      | `""`          | Use this encoding without prompting. Empty asks every time. VS Code's spelling works too (`EUC-JP`, `Shift_JIS`, `Japanese (EUC-JP)`). |
| `luit.shellPath`            | `""`          | Shell to run inside `luit`. Empty uses `$SHELL`, then `bash`.                                                                          |
| `luit.shellArgs`            | `["--login"]` | Arguments passed to that shell.                                                                                                        |
| `luit.env`                  | `{}`          | Environment variables for the terminal. Use it to set `LANG` (see above).                                                              |
| `luit.rememberLastEncoding` | `true`        | Show the last used encoding at the top of the picker.                                                                                  |

All settings are `window` scoped, so they can be set in User settings and travel with Settings Sync, and can still be overridden per remote and per workspace — `luit`'s location and your shell depend on which machine you are connected to.

`luit.luitPath` and `luit.shellPath` are excluded from Settings Sync by default, since a path that exists on one machine may not exist on another. To sync them anyway, add `"-luit.luitPath"` to `settingsSync.ignoredSettings`.

`luit.luitPath`, `luit.shellPath`, `luit.shellArgs` and `luit.env` name a program to execute, so they are not read from workspace settings in an [untrusted workspace](https://code.visualstudio.com/docs/editing/workspaces/workspace-trust) — the same treatment VS Code gives `terminal.integrated.profiles.*`.

### Always using luit

To make every terminal go through `luit`, point the default profile at it **and** set an encoding — otherwise you get an encoding picker every time a terminal opens, including on window restore:

```jsonc
"terminal.integrated.defaultProfile.linux": "luit",
"luit.defaultEncoding": "eucJP"
```

`defaultProfile` matches contributed profiles by their displayed title, so this profile is deliberately named `luit` in every UI language — otherwise the value you have to type here would change with your display language.

## Known limitations

**Shell integration does not work.** VS Code decides whether to inject its shell integration script by matching the _executable's_ basename against `bash`, `fish`, `pwsh` and `zsh` ([`terminalEnvironment.ts`](https://github.com/microsoft/vscode/blob/main/src/vs/platform/terminal/node/terminalEnvironment.ts)). Here the executable is `luit`, so injection never happens and command decorations, command navigation, IntelliSense, Run Recent Command, cwd detection, sticky scroll and quick fixes are all unavailable. Sourcing the script manually from your shell's rc file may restore it, but that is untested and unsupported in this version:

```bash
[[ "$TERM_PROGRAM" == "vscode" ]] && . "$(code --locate-shell-integration-path bash)"
```

**Cancelling the picker.** Dismissing the encoding picker simply opens no terminal. VS Code has no clean way for a profile provider to say "the user cancelled" — see the comment on `SilentCancellation` in `src/terminalProfile.ts` for what it does instead and why.

**Encoding names are not validated.** The picker shows VS Code's spelling (`Japanese (EUC-JP)`) with `luit`'s own name next to it (`eucJP`), and either spelling is accepted in `luit.defaultEncoding`. But a name that resolves to nothing is passed through as-is; `luit`'s own error then appears in the terminal.

**No permanent profile is written.** This extension opens terminals; it never edits `terminal.integrated.profiles.*`. Use `luit.defaultEncoding` to pin an encoding.

**Linux extension hosts only.** There is no native Windows build of `luit`, and macOS availability is unverified.

**Tasks.** VS Code does not await the profile provider when a contributed profile is used for a task's custom execution ([microsoft/vscode#200558](https://github.com/microsoft/vscode/issues/200558)). Set `luit.defaultEncoding` so no picker is needed on that path.

## License

MIT. See [LICENSE](LICENSE).

`luit` itself is a separate program distributed under the MIT/X11 license; this extension does not bundle it.
