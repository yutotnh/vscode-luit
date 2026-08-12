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
});
