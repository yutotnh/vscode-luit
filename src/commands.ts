import * as vscode from "vscode";
import { resolveLuitPath } from "./luitPath";
import { detectHostPlatform } from "./platform";
import { prepareLuitTerminal, TerminalProfileDeps } from "./terminalProfile";

/** コマンドID。`package.json`の`contributes.commands`と対応させる */
export const OPEN_TERMINAL_COMMAND = "luit.openTerminal";
export const REFRESH_ENCODINGS_COMMAND = "luit.refreshEncodings";

/**
 * コマンドパレット向けのコマンドを登録する
 *
 * ターミナルプロファイルだけでは、コマンドパレットやキーバインドから
 * 直接ターミナルを開けない。`workbench.action.terminal.newWithProfile`の
 * `profileName`は`terminal.integrated.profiles.*`由来のプロファイルしか
 * 検索対象にせず、拡張機能が提供するプロファイルは別のリストで管理されている
 * (microsoft/vscode#152635)。そのため独自のコマンドを用意している
 *
 * @returns 登録したコマンドのDisposable
 */
export function registerCommands(
  deps: TerminalProfileDeps,
): vscode.Disposable[] {
  return [
    vscode.commands.registerCommand(OPEN_TERMINAL_COMMAND, async () => {
      const result = await prepareLuitTerminal(deps);
      if (result.kind !== "ok") {
        return;
      }
      vscode.window.createTerminal(result.options).show();
    }),

    vscode.commands.registerCommand(REFRESH_ENCODINGS_COMMAND, async () => {
      deps.encodingCache.invalidate();

      const config = vscode.workspace.getConfiguration("luit");
      const resolution = await resolveLuitPath(
        config.get<string>("luitPath", ""),
        detectHostPlatform(),
      );
      if (!resolution.ok) {
        deps.diagnostics.reportResolutionError(resolution.error);
        return;
      }

      const list = await deps.encodingCache.get(resolution.location.path);
      if (!list.ok) {
        deps.diagnostics.log(`Could not list encodings: ${list.reason}`);
        void vscode.window.showErrorMessage(
          vscode.l10n.t("Could not read the encoding list from luit."),
        );
        return;
      }

      void vscode.window.showInformationMessage(
        vscode.l10n.t("luit reported {0} encodings.", list.encodings.length),
      );
    }),
  ];
}
