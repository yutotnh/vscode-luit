import * as vscode from "vscode";
import { LuitResolutionError } from "./luitPath";

/** ログ出力とユーザーへの通知をまとめて扱う */
export interface Diagnostics {
  /** 詳細ログ。通知には出さない情報(実行したコマンドやstderr全文)はこちらへ */
  log(message: string): void;
  /** luitを使えなかったことをユーザーに伝え、復帰手段を案内する */
  reportResolutionError(error: LuitResolutionError): void;
  dispose(): void;
}

/** ディストリビューションごとのインストール方法。v1では自動判別せず全部並べる */
const INSTALL_COMMANDS = [
  "Debian / Ubuntu:  sudo apt install luit",
  "Fedora / RHEL:    sudo dnf install luit",
  "Arch Linux:       sudo pacman -S luit",
].join("\n");

/**
 * 出力チャネルと通知を扱うヘルパーを作る
 *
 * @param output 詳細ログの出力先
 */
export function createDiagnostics(output: vscode.OutputChannel): Diagnostics {
  return {
    log(message) {
      output.appendLine(`[${new Date().toISOString()}] ${message}`);
    },

    reportResolutionError(error) {
      switch (error.kind) {
        case "unsupportedHost":
          this.log(`Unsupported extension host platform: ${error.platform}`);
          void vscode.window.showErrorMessage(
            vscode.l10n.t(
              "luit only works when the extension host runs on Linux (local Linux, Remote - SSH, WSL, or a Dev Container). Detected: {0}",
              error.platform,
            ),
          );
          return;

        case "settingInvalid":
          this.log(
            `Configured luit.luitPath '${error.configuredPath}' failed: ${error.reason}`,
          );
          void showWithSettingsButton(
            vscode.l10n.t(
              "Could not run the luit specified by luit.luitPath ('{0}').",
              error.configuredPath,
            ),
          );
          return;

        case "notFoundOnPath":
          this.log(`luit not found on PATH: ${error.reason}`);
          void showNotFound();
          return;
      }
    },

    dispose() {
      output.dispose();
    },
  };

  /** 設定を開くボタン付きでエラーを出す */
  async function showWithSettingsButton(message: string): Promise<void> {
    const openSettings = vscode.l10n.t("Open Settings");
    const selected = await vscode.window.showErrorMessage(
      message,
      openSettings,
    );
    if (selected === openSettings) {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "luit.luitPath",
      );
    }
  }

  /** luitが見つからないときの案内。インストール手順と設定への導線を出す */
  async function showNotFound(): Promise<void> {
    const showInstall = vscode.l10n.t("Show Install Instructions");
    const openSettings = vscode.l10n.t("Open Settings");
    const selected = await vscode.window.showErrorMessage(
      vscode.l10n.t("luit was not found on PATH."),
      showInstall,
      openSettings,
    );

    if (selected === showInstall) {
      output.appendLine("");
      output.appendLine(
        vscode.l10n.t("Install luit with your package manager:"),
      );
      output.appendLine(INSTALL_COMMANDS);
      output.show(true);
      return;
    }

    if (selected === openSettings) {
      await vscode.commands.executeCommand(
        "workbench.action.openSettings",
        "luit.luitPath",
      );
    }
  }
}
