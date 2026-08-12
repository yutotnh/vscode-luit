import * as assert from "assert";
import { buildLuitTerminalOptions } from "../../terminalOptions";

suite("buildLuitTerminalOptions", () => {
  test("記事で紹介したコマンドと同じ引数を組み立てる", () => {
    // luit -encoding eucJP -- bash --login
    const options = buildLuitTerminalOptions({
      luitPath: "luit",
      encoding: "eucJP",
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
      shell: { path: "/usr/bin/zsh", args: [] },
    });

    assert.strictEqual(options.name, "zsh (eucJP via luit)");
  });
});
