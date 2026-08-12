import * as assert from "assert";
import { resolveShellSpec } from "../../shellResolution";

suite("resolveShellSpec", () => {
  test("設定が最優先", () => {
    assert.deepStrictEqual(
      resolveShellSpec("/usr/bin/zsh", ["-l"], "/bin/bash"),
      { path: "/usr/bin/zsh", args: ["-l"] },
    );
  });

  test("設定が空なら$SHELLを使う", () => {
    assert.deepStrictEqual(resolveShellSpec("", ["--login"], "/usr/bin/fish"), {
      path: "/usr/bin/fish",
      args: ["--login"],
    });
  });

  test("設定も$SHELLも無ければbashにフォールバックする", () => {
    assert.deepStrictEqual(resolveShellSpec("", [], undefined), {
      path: "bash",
      args: [],
    });
  });

  test("空文字列の$SHELLはフォールバック対象", () => {
    assert.strictEqual(resolveShellSpec("", [], "").path, "bash");
  });

  test("渡された引数配列を書き換えない", () => {
    const args = ["--login"];
    const spec = resolveShellSpec("", args, "/bin/bash");

    spec.args.push("-c");

    assert.deepStrictEqual(args, ["--login"]);
  });
});
