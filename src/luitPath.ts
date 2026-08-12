import { defaultExecFile, ExecFileFn } from "./execFile";
import { HostPlatform } from "./platform";

/** 見つかったluit */
export interface LuitLocation {
  /** 実行に使う値。PATHから見つけた場合は "luit" のままで、絶対パスには解決しない */
  path: string;
  /** `luit -V`の出力(診断用) */
  version: string;
  source: "setting" | "path";
}

/** luitを使える状態にできなかった理由 */
export type LuitResolutionError =
  | { kind: "unsupportedHost"; platform: string }
  | { kind: "settingInvalid"; configuredPath: string; reason: string }
  | { kind: "notFoundOnPath"; reason: string };

export type LuitResolutionResult =
  | { ok: true; location: LuitLocation }
  | { ok: false; error: LuitResolutionError };

/** PATHから探すときに使う実行ファイル名 */
const LUIT_COMMAND = "luit";

/**
 * 使用するluitを決める
 *
 * 探索は優先順位付きの戦略リストとして実装してある。将来luitのバイナリを
 * 拡張機能に同梱する場合は、同梱バイナリを試す戦略をリストの先頭に足せばよく、
 * 呼び出し側は変更しなくて済む
 *
 * 結果はキャッシュしない。判定は`luit -V`の1回の起動(数十ms)で済むうえ、
 * キャッシュするとセッション中にluitをインストールしたユーザーが
 * VS Codeを再起動するまで使えないままになる
 *
 * 設定`luit.luitPath`が指定されている場合、それが動かなくてもPATHには
 * フォールバックしない。明示的に指定したものが黙って別のluitに差し替わると、
 * 設定が効いていないことに気づけないため
 *
 * @param configuredPath 設定`luit.luitPath`の値(空文字列なら未指定)
 * @param hostPlatform 拡張機能ホストのOS
 * @param exec コマンド実行の実装(テストでの差し替え用)
 * @returns 見つかったluit、または見つからなかった理由
 */
export async function resolveLuitPath(
  configuredPath: string,
  hostPlatform: HostPlatform,
  exec: ExecFileFn = defaultExecFile,
): Promise<LuitResolutionResult> {
  if (hostPlatform !== "linux") {
    return {
      ok: false,
      error: { kind: "unsupportedHost", platform: process.platform },
    };
  }

  if (configuredPath) {
    const version = await tryRun(configuredPath, exec);
    if (version.ok) {
      return {
        ok: true,
        location: {
          path: configuredPath,
          version: version.version,
          source: "setting",
        },
      };
    }
    return {
      ok: false,
      error: {
        kind: "settingInvalid",
        configuredPath,
        reason: version.reason,
      },
    };
  }

  const version = await tryRun(LUIT_COMMAND, exec);
  if (version.ok) {
    return {
      ok: true,
      location: {
        path: LUIT_COMMAND,
        version: version.version,
        source: "path",
      },
    };
  }
  return {
    ok: false,
    error: { kind: "notFoundOnPath", reason: version.reason },
  };
}

/**
 * 指定したパスがluitとして実行できるかを確かめる
 *
 * バージョン文字列の中身は解析せず、`-V`が正常終了したことだけを条件にする。
 * luit側が出力書式を変えても壊れないようにするため
 */
async function tryRun(
  candidate: string,
  exec: ExecFileFn,
): Promise<{ ok: true; version: string } | { ok: false; reason: string }> {
  try {
    const { stdout, stderr } = await exec(candidate, ["-V"]);
    return { ok: true, version: (stdout || stderr).trim() };
  } catch (error) {
    return {
      ok: false,
      reason: error instanceof Error ? error.message : String(error),
    };
  }
}
