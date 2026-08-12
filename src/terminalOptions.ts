import * as path from "path";
import { ShellSpec } from "./shellResolution";

/** ターミナルを起動するために必要な情報 */
export interface BuildLuitTerminalOptionsInput {
  luitPath: string;
  encoding: string;
  shell: ShellSpec;
}

/** `vscode.window.createTerminal`と`vscode.TerminalProfile`の双方に渡せる形 */
export interface LuitTerminalOptions {
  name: string;
  shellPath: string;
  shellArgs: string[];
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
  const { luitPath, encoding, shell } = input;

  return {
    name: `${path.basename(shell.path)} (${encoding} via luit)`,
    shellPath: luitPath,
    shellArgs: ["-encoding", encoding, "--", shell.path, ...shell.args],
  };
}
