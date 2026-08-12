import * as assert from "assert";
import { ExecFileFn } from "../../execFile";
import { createEncodingListCache } from "../../luitEncodingList";

const LIST_OUTPUT = [
  "Known locale encodings:",
  "",
  "  eucJP: GL -> G0, GR -> G1",
  "  SJIS (non-ISO-2022 encoding)",
].join("\n");

suite("createEncodingListCache", () => {
  test("2回目はluitを起動しない", async () => {
    let callCount = 0;
    const exec: ExecFileFn = () => {
      callCount += 1;
      return Promise.resolve({ stdout: LIST_OUTPUT, stderr: "" });
    };
    const cache = createEncodingListCache();

    const first = await cache.get("luit", exec);
    const second = await cache.get("luit", exec);

    assert.ok(first.ok);
    assert.ok(second.ok);
    assert.strictEqual(callCount, 1);
  });

  test("luitのパスが変われば取り直す", async () => {
    let callCount = 0;
    const exec: ExecFileFn = () => {
      callCount += 1;
      return Promise.resolve({ stdout: LIST_OUTPUT, stderr: "" });
    };
    const cache = createEncodingListCache();

    await cache.get("luit", exec);
    await cache.get("/opt/luit", exec);

    assert.strictEqual(callCount, 2);
  });

  test("invalidate後は取り直す", async () => {
    let callCount = 0;
    const exec: ExecFileFn = () => {
      callCount += 1;
      return Promise.resolve({ stdout: LIST_OUTPUT, stderr: "" });
    };
    const cache = createEncodingListCache();

    await cache.get("luit", exec);
    cache.invalidate();
    await cache.get("luit", exec);

    assert.strictEqual(callCount, 2);
  });

  test("実行に失敗したら理由を返す", async () => {
    const exec: ExecFileFn = () => Promise.reject(new Error("spawn ENOENT"));
    const cache = createEncodingListCache();

    const result = await cache.get("luit", exec);

    assert.ok(!result.ok);
    assert.match(result.reason, /ENOENT/);
  });

  test("1件も解析できなければ失敗として扱う", async () => {
    // 手動入力へのフォールバックに切り替えるため、空の成功にはしない
    const exec: ExecFileFn = () =>
      Promise.resolve({ stdout: "unexpected output", stderr: "" });
    const cache = createEncodingListCache();

    const result = await cache.get("luit", exec);

    assert.ok(!result.ok);
  });

  test("失敗した結果はキャッシュしない", async () => {
    let shouldFail = true;
    const exec: ExecFileFn = () =>
      shouldFail
        ? Promise.reject(new Error("spawn ENOENT"))
        : Promise.resolve({ stdout: LIST_OUTPUT, stderr: "" });
    const cache = createEncodingListCache();

    const failed = await cache.get("luit", exec);
    shouldFail = false;
    const succeeded = await cache.get("luit", exec);

    assert.ok(!failed.ok);
    assert.ok(succeeded.ok);
  });
});
