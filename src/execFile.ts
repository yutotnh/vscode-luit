import { execFile } from "child_process";

/** コマンドの実行結果 */
export interface ExecFileResult {
  stdout: string;
  stderr: string;
}

/**
 * 外部コマンドを実行する関数の型
 *
 * `luitPath.ts`(luitの存在確認)と`luitEncodingList.ts`(エンコーディング列挙)は
 * どちらも「luitバイナリを叩く」という同じI/Oを持つため、テストで差し替えられるよう
 * この1つの型に集約している。実プロセスを起動しないモックを渡せば、luitが
 * インストールされていないCI環境でも両モジュールを検証できる
 */
export type ExecFileFn = (
  command: string,
  args: readonly string[],
) => Promise<ExecFileResult>;

/** コマンドの実行を打ち切るまでの時間(ms)。luitの`-V`/`-list`はいずれも即座に返る */
const EXEC_TIMEOUT_MS = 5000;

/**
 * `child_process.execFile`による既定の実装
 *
 * シェルを経由しない(`shell: false`が既定)ため、パスや引数に空白や
 * メタ文字が含まれていてもクォートの心配が要らない
 */
export const defaultExecFile: ExecFileFn = (command, args) =>
  new Promise((resolve, reject) => {
    execFile(
      command,
      [...args],
      { timeout: EXEC_TIMEOUT_MS, encoding: "utf8" },
      (error, stdout, stderr) => {
        if (error) {
          // @types/nodeのExecFileExceptionはOmit<>で組み立てられているため、
          // 実行時はErrorでも型の上ではErrorを継承していない。
          // 呼び出し側がinstanceof Errorで扱えるよう作り直す
          reject(new Error(error.message));
          return;
        }
        resolve({ stdout, stderr });
      },
    );
  });
