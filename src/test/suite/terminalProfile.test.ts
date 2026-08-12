import * as assert from "assert";
import { createSilentCancellation } from "../../terminalProfile";

suite("SilentCancellation", () => {
  test("メッセージが空である", () => {
    // VS Codeはプロバイダーが投げたエラーを
    // `notificationService.error(error.message)`としてユーザーに表示し、
    // 通知側は`!message`のときだけ通知の生成をやめる。
    // ここにメッセージを持たせると、ユーザーがQuickPickをEscで閉じただけで
    // エラー通知が出るようになる(詳細はsrc/terminalProfile.tsのコメント)
    assert.strictEqual(createSilentCancellation().message, "");
  });

  test("Errorとして投げられる", () => {
    assert.ok(createSilentCancellation() instanceof Error);
  });
});
