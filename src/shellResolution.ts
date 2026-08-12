/** luitの子として起動するシェル */
export interface ShellSpec {
  path: string;
  args: string[];
}

/** 設定と環境変数のどちらからもシェルを決められなかった場合の最終手段 */
const FALLBACK_SHELL = "bash";

/**
 * luitの中で動かすシェルを決める
 *
 * 優先順位は 設定`luit.shellPath` > 環境変数`$SHELL` > `bash`。
 * `$SHELL`は拡張機能ホストのプロセス環境から読むため、リモート接続時は
 * リモート側のログインシェルになる
 *
 * VS Codeの`terminal.integrated.defaultProfile.*`は意図的に参照しない。
 * 設定の参照元が増えると「どこで指定したシェルが効いているのか」が
 * 追いにくくなるため、使いたければ`luit.shellPath`に明示してもらう
 *
 * @param configuredShellPath 設定`luit.shellPath`の値(空文字列なら未指定)
 * @param configuredShellArgs 設定`luit.shellArgs`の値
 * @param envShell 環境変数`$SHELL`の値
 * @returns 起動するシェルとその引数
 */
export function resolveShellSpec(
  configuredShellPath: string,
  configuredShellArgs: readonly string[],
  envShell: string | undefined,
): ShellSpec {
  // 設定も$SHELLも「空文字列 = 未指定」として扱いたいので、??(nullish)ではなく
  // 「値が入っているもの」を順に探す
  const path =
    [configuredShellPath, envShell].find((value) => value) ?? FALLBACK_SHELL;

  return { path, args: [...configuredShellArgs] };
}
