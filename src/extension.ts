import * as vscode from "vscode";
import { registerCommands } from "./commands";
import { TERMINAL_PROFILE_ID } from "./contributions";
import { createDiagnostics } from "./diagnostics";
import { createEncodingListCache } from "./luitEncodingList";
import { createState } from "./state";
import {
  LuitTerminalProfileProvider,
  TerminalProfileDeps,
} from "./terminalProfile";

export { TERMINAL_PROFILE_ID };

export function activate(context: vscode.ExtensionContext): void {
  const output = vscode.window.createOutputChannel("luit");
  const diagnostics = createDiagnostics(output);

  const encodingCache = createEncodingListCache();
  const deps: TerminalProfileDeps = {
    encodingCache,
    state: createState(context.globalState),
    diagnostics,
  };

  context.subscriptions.push(
    output,
    ...registerCommands(deps),
    vscode.window.registerTerminalProfileProvider(
      TERMINAL_PROFILE_ID,
      new LuitTerminalProfileProvider(deps),
    ),
    // luitを差し替えたらエンコーディング一覧も取り直す。
    // 別のluitが別の一覧を持っている可能性があるため
    vscode.workspace.onDidChangeConfiguration((event) => {
      if (event.affectsConfiguration("luit.luitPath")) {
        encodingCache.invalidate();
      }
    }),
  );
}

export function deactivate(): void {
  // context.subscriptionsに登録したものはVS Codeが破棄するため、ここでは何もしない
}
