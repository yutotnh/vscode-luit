import * as assert from "assert";
import * as vscode from "vscode";
import {
  OPEN_TERMINAL_COMMAND,
  REFRESH_ENCODINGS_COMMAND,
} from "../../commands";
import { TERMINAL_PROFILE_ID } from "../../extension";
import { detectHostPlatform } from "../../platform";

const EXTENSION_ID = "yutotnh.luit";

suite("extension", () => {
  test("拡張機能を有効化できる", async () => {
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension, `${EXTENSION_ID} が見つからない`);

    await extension.activate();

    assert.ok(extension.isActive);
  });

  test("コマンドが登録されている", async () => {
    await vscode.extensions.getExtension(EXTENSION_ID)?.activate();
    const commands = await vscode.commands.getCommands(true);

    assert.ok(commands.includes(OPEN_TERMINAL_COMMAND));
    assert.ok(commands.includes(REFRESH_ENCODINGS_COMMAND));
  });

  test("プロファイルのidがpackage.jsonの宣言と一致する", () => {
    // registerTerminalProfileProviderに渡すidがcontributes側とずれると、
    // ドロップダウンから選んでもproviderが呼ばれない
    const extension = vscode.extensions.getExtension(EXTENSION_ID);
    assert.ok(extension);

    const contributed = (
      extension.packageJSON as {
        contributes: { terminal: { profiles: { id: string }[] } };
      }
    ).contributes.terminal.profiles;

    assert.deepStrictEqual(
      contributed.map((profile) => profile.id),
      [TERMINAL_PROFILE_ID],
    );
  });

  test("非Linuxでは早期に打ち切り、例外を投げない", async function () {
    // Linuxかつluitがある環境でこのコマンドを実行するとQuickPickが開き、
    // 応答する人がいないのでCIがハングする
    if (process.platform === "linux") {
      this.skip();
    }

    // 打ち切りの理由をここで固定する。これが無いと、luitが見つからないだけでも、
    // 通知の経路が壊れて黙って返っていても、同じように通ってしまう。
    // ターミナルが増えていないことでは、この2つを区別できない
    assert.strictEqual(detectHostPlatform(), "unsupported");

    // executeCommandがrejectしなければ「例外を投げない」は成立する。
    // reportResolutionErrorのunsupportedHost分岐はshowErrorMessageを
    // voidで投げっぱなしにしているので、通知の応答も待たない
    await vscode.commands.executeCommand(OPEN_TERMINAL_COMMAND);
  });

  test("設定の既定値が宣言どおり読める", () => {
    const config = vscode.workspace.getConfiguration("luit");

    assert.strictEqual(config.get("luitPath"), "");
    assert.strictEqual(config.get("defaultEncoding"), "");
    assert.strictEqual(config.get("shellPath"), "");
    assert.deepStrictEqual(config.get("shellArgs"), ["--login"]);
    assert.strictEqual(config.get("rememberLastEncoding"), true);
  });
});
