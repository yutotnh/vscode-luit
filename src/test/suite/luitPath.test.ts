import * as assert from "assert";
import { ExecFileFn } from "../../execFile";
import { resolveLuitPath } from "../../luitPath";

/** 呼ばれたコマンドを記録しつつ、指定した結果を返すモック */
function createExec(responses: Map<string, string>): {
  exec: ExecFileFn;
  calls: string[];
} {
  const calls: string[] = [];

  const exec: ExecFileFn = (command, args) => {
    calls.push([command, ...args].join(" "));
    const stdout = responses.get(command);
    if (stdout === undefined) {
      return Promise.reject(new Error(`spawn ${command} ENOENT`));
    }
    return Promise.resolve({ stdout, stderr: "" });
  };

  return { exec, calls };
}

const LUIT_VERSION = "luit - 2.0-20250912\n";

suite("resolveLuitPath", () => {
  test("設定されたパスが使える場合はそれを使う", async () => {
    const { exec, calls } = createExec(new Map([["/opt/luit", LUIT_VERSION]]));

    const result = await resolveLuitPath("/opt/luit", "linux", exec);

    assert.ok(result.ok);
    assert.strictEqual(result.location.path, "/opt/luit");
    assert.strictEqual(result.location.source, "setting");
    assert.strictEqual(result.location.version, "luit - 2.0-20250912");
    assert.deepStrictEqual(calls, ["/opt/luit -V"]);
  });

  test("設定されたパスが使えなくてもPATHにフォールバックしない", async () => {
    // 明示指定が黙って別のluitに差し替わると、設定が効いていないことに
    // 気づけないため、意図的にフォールバックしない
    const { exec, calls } = createExec(new Map([["luit", LUIT_VERSION]]));

    const result = await resolveLuitPath("/opt/missing", "linux", exec);

    assert.ok(!result.ok);
    assert.strictEqual(result.error.kind, "settingInvalid");
    assert.deepStrictEqual(calls, ["/opt/missing -V"]);
  });

  test("設定が空ならPATHから探す", async () => {
    const { exec, calls } = createExec(new Map([["luit", LUIT_VERSION]]));

    const result = await resolveLuitPath("", "linux", exec);

    assert.ok(result.ok);
    assert.strictEqual(result.location.path, "luit");
    assert.strictEqual(result.location.source, "path");
    assert.deepStrictEqual(calls, ["luit -V"]);
  });

  test("PATHにも無ければnotFoundOnPathを返す", async () => {
    const { exec } = createExec(new Map());

    const result = await resolveLuitPath("", "linux", exec);

    assert.ok(!result.ok);
    assert.strictEqual(result.error.kind, "notFoundOnPath");
  });

  test("Linux以外ではコマンドを実行せずに終わる", async () => {
    // 非対応環境でプロセスを起動しても意味がないため、
    // プラットフォーム判定を最初に行っている
    const { exec, calls } = createExec(new Map([["luit", LUIT_VERSION]]));

    const result = await resolveLuitPath("", "unsupported", exec);

    assert.ok(!result.ok);
    assert.strictEqual(result.error.kind, "unsupportedHost");
    assert.deepStrictEqual(calls, []);
  });
});
