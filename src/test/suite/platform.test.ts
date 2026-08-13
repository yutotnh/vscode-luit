import * as assert from "assert";
import { detectHostPlatform } from "../../platform";

suite("detectHostPlatform", () => {
  test("Linuxはサポート対象", () => {
    assert.strictEqual(detectHostPlatform("linux"), "linux");
  });

  test("Linux以外はサポート対象外", () => {
    assert.strictEqual(detectHostPlatform("win32"), "unsupported");
    assert.strictEqual(detectHostPlatform("darwin"), "unsupported");
    assert.strictEqual(detectHostPlatform("freebsd"), "unsupported");
  });

  test("引数を省くと実行中のホストを見る", () => {
    // 引数を明示するケースしか無いと、この関数の唯一の仕事である
    // process.platformの読み取りがどのOSでも検証されないままになる。
    // CIを複数OSで回している意味は、実質このassertionが担っている
    const expected = process.platform === "linux" ? "linux" : "unsupported";

    assert.strictEqual(detectHostPlatform(), expected);
  });
});
