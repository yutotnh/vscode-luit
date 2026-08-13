import * as assert from "assert";
import { buildLuitTerminalOptions } from "../../terminalOptions";

suite("buildLuitTerminalOptions", () => {
  test("記事で紹介したコマンドと同じ引数を組み立てる", () => {
    // luit -encoding eucJP -- bash --login
    const options = buildLuitTerminalOptions({
      luitPath: "luit",
      encoding: "eucJP",
      encodingLabel: "EUC-JP",
      shell: { path: "bash", args: ["--login"] },
    });

    assert.strictEqual(options.shellPath, "luit");
    assert.deepStrictEqual(options.shellArgs, [
      "-encoding",
      "eucJP",
      "--",
      "bash",
      "--login",
    ]);
  });

  test("シェルに引数が無くても区切りの--を落とさない", () => {
    // --が無いと、シェルのパスをluitが自分のオプションとして解釈しうる
    const options = buildLuitTerminalOptions({
      luitPath: "/usr/bin/luit",
      encoding: "SJIS",
      encodingLabel: "Shift JIS",
      shell: { path: "/bin/sh", args: [] },
    });

    assert.deepStrictEqual(options.shellArgs, [
      "-encoding",
      "SJIS",
      "--",
      "/bin/sh",
    ]);
  });

  test("ターミナル名にシェル名とエンコーディングを含める", () => {
    const options = buildLuitTerminalOptions({
      luitPath: "luit",
      encoding: "eucJP",
      encodingLabel: "EUC-JP",
      shell: { path: "/usr/bin/zsh", args: [] },
    });

    assert.strictEqual(options.name, "zsh (EUC-JP via luit)");
  });

  test("表示にはencodingLabel、luitへの引数にはencodingを使う", () => {
    // 表記の統一は見た目だけの話で、luitに渡せるのはluit自身の名前だけ
    const options = buildLuitTerminalOptions({
      luitPath: "luit",
      encoding: "SJIS",
      encodingLabel: "Shift JIS",
      shell: { path: "bash", args: ["--login"] },
    });

    assert.strictEqual(options.name, "bash (Shift JIS via luit)");
    assert.deepStrictEqual(options.shellArgs, [
      "-encoding",
      "SJIS",
      "--",
      "bash",
      "--login",
    ]);
  });
});

// 環境変数名は大文字が慣習のため、camelCaseを要求するルールの対象から外す
/* eslint-disable @typescript-eslint/naming-convention */
suite("buildLuitTerminalOptions env", () => {
  test("環境変数の指定が無ければenvを持たせない", () => {
    const options = buildLuitTerminalOptions({
      luitPath: "luit",
      encoding: "eucJP",
      encodingLabel: "EUC-JP",
      shell: { path: "bash", args: [] },
    });

    assert.ok(!("env" in options));
  });

  test("空のオブジェクトもenvを持たせない", () => {
    // 空のenvを渡すとVS Code側で余計な差分になるため
    const options = buildLuitTerminalOptions({
      luitPath: "luit",
      encoding: "eucJP",
      encodingLabel: "EUC-JP",
      shell: { path: "bash", args: [] },
      env: {},
    });

    assert.ok(!("env" in options));
  });

  test("LANGを渡せる", () => {
    // luitはシェルのロケールを変えないため、シェル側がEUC-JPを
    // 出力する状態になっていないと文字化けする
    const options = buildLuitTerminalOptions({
      luitPath: "luit",
      encoding: "eucJP",
      encodingLabel: "EUC-JP",
      shell: { path: "bash", args: [] },
      env: { LANG: "ja_JP.eucJP" },
    });

    assert.deepStrictEqual(options.env, { LANG: "ja_JP.eucJP" });
  });

  test("渡された環境変数をコピーする", () => {
    const env = { LANG: "ja_JP.eucJP" };
    const options = buildLuitTerminalOptions({
      luitPath: "luit",
      encoding: "eucJP",
      encodingLabel: "EUC-JP",
      shell: { path: "bash", args: [] },
      env,
    });

    assert.ok(options.env);
    options.env["LANG"] = "C";

    assert.strictEqual(env.LANG, "ja_JP.eucJP");
  });
});
/* eslint-enable @typescript-eslint/naming-convention */
