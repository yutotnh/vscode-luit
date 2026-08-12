import * as assert from "assert";
import * as vscode from "vscode";
import {
  OPEN_TERMINAL_COMMAND,
  REFRESH_ENCODINGS_COMMAND,
} from "../../commands";
import { TERMINAL_PROFILE_ID } from "../../extension";

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

  test("設定の既定値が宣言どおり読める", () => {
    const config = vscode.workspace.getConfiguration("luit");

    assert.strictEqual(config.get("luitPath"), "");
    assert.strictEqual(config.get("defaultEncoding"), "");
    assert.strictEqual(config.get("shellPath"), "");
    assert.deepStrictEqual(config.get("shellArgs"), ["--login"]);
    assert.strictEqual(config.get("rememberLastEncoding"), true);
  });
});
