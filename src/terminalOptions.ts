import * as path from "path";
import { ShellSpec } from "./shellResolution";

/** ターミナルを起動するために必要な情報 */
export interface BuildLuitTerminalOptionsInput {
  luitPath: string;
  /** `luit -encoding`にそのまま渡す値。例: "eucJP" */
  encoding: string;
  /**
   * ターミナル名に出す表記。例: "EUC-JP"
   *
   * VS Code流の表記(`encodingNames.ts`)を呼び出し側で解決して渡してもらう。
   * この関数は起動コマンドの組み立てだけを持つため、表示の都合をここに持ち込まない
   */
  encodingLabel: string;
  shell: ShellSpec;
  /**
   * ターミナルに渡す環境変数
   *
   * luitは子プロセスのロケールを変更しない。`-encoding eucJP`を指定しても
   * シェル側の`LANG`はそのままなので、シェルがUTF-8を出力する設定のままだと
   * luitはそれをEUC-JPとして解釈してしまい文字化けする。
   * そのため`LANG`を合わせられるようにしてある
   */
  env?: Readonly<Record<string, string | null>>;
}

/** `vscode.window.createTerminal`と`vscode.TerminalProfile`の双方に渡せる形 */
export interface LuitTerminalOptions {
  name: string;
  shellPath: string;
  shellArgs: string[];
  env?: Record<string, string | null>;
}

/**
 * luit経由でシェルを起動するためのターミナル設定を組み立てる
 *
 * VS Codeから見た実行ファイルはシェルではなくluitで、本来のシェルは
 * luitの引数として渡す。記事で紹介した設定と同じ形:
 *
 * ```
 * luit -encoding eucJP -- bash --login
 * ```
 *
 * `--`はluit自身のオプションとシェルの引数の区切り。これが無いと
 * シェルに渡したい`--login`などをluitが自分のオプションとして解釈してしまう
 *
 * @param input luitのパス・エンコーディング・起動するシェル
 * @returns ターミナルの表示名と起動コマンド
 */
export function buildLuitTerminalOptions(
  input: BuildLuitTerminalOptionsInput,
): LuitTerminalOptions {
  const { luitPath, encoding, encodingLabel, shell, env } = input;

  const options: LuitTerminalOptions = {
    name: `${path.basename(shell.path)} (${encodingLabel} via luit)`,
    shellPath: luitPath,
    shellArgs: ["-encoding", encoding, "--", shell.path, ...shell.args],
  };

  // exactOptionalPropertyTypes のため、指定があるときだけenvを持たせる
  if (env && Object.keys(env).length > 0) {
    options.env = { ...env };
  }

  return options;
}
