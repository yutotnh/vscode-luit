import * as vscode from "vscode";
import { Diagnostics } from "./diagnostics";
import { EncodingListCache, LuitEncoding } from "./luitEncodingList";
import { resolveLuitPath } from "./luitPath";
import { detectHostPlatform } from "./platform";
import { resolveShellSpec } from "./shellResolution";
import { LuitState } from "./state";
import {
  buildLuitTerminalOptions,
  LuitTerminalOptions,
} from "./terminalOptions";

/** ターミナル設定の組み立て結果 */
export type PrepareResult =
  | { kind: "ok"; options: LuitTerminalOptions }
  /** ユーザーが選択を中断した。通知は出さない */
  | { kind: "cancelled" }
  /** 組み立てられなかった。理由は既にユーザーへ通知済み */
  | { kind: "failed" };

/** パイプラインが必要とする依存 */
export interface TerminalProfileDeps {
  encodingCache: EncodingListCache;
  state: LuitState;
  diagnostics: Diagnostics;
}

/**
 * ターミナルを開くのに必要な設定を組み立てる
 *
 * コマンド(`luit.openTerminal`)とターミナルプロファイルの両方から呼ばれる共通処理。
 * どちらの導線でも同じ挙動になるよう、UI(エンコーディングの選択)もここに含める
 */
export async function prepareLuitTerminal(
  deps: TerminalProfileDeps,
): Promise<PrepareResult> {
  const config = vscode.workspace.getConfiguration("luit");
  const configuredLuitPath = config.get<string>("luitPath", "");

  const resolution = await resolveLuitPath(
    configuredLuitPath,
    detectHostPlatform(),
  );
  if (!resolution.ok) {
    deps.diagnostics.reportResolutionError(resolution.error);
    return { kind: "failed" };
  }

  const { location } = resolution;
  deps.diagnostics.log(
    `Using luit at '${location.path}' (from ${location.source}): ${location.version}`,
  );

  const encoding = await pickEncoding(deps, location.path, config);
  if (encoding === undefined) {
    return { kind: "cancelled" };
  }

  if (config.get<boolean>("rememberLastEncoding", true)) {
    await deps.state.setLastEncoding(encoding);
  }

  const shell = resolveShellSpec(
    config.get<string>("shellPath", ""),
    config.get<string[]>("shellArgs", []),
    process.env["SHELL"],
  );

  const options = buildLuitTerminalOptions({
    luitPath: location.path,
    encoding,
    shell,
    env: config.get<Record<string, string | null>>("env", {}),
  });
  deps.diagnostics.log(
    `Launching: ${options.shellPath} ${options.shellArgs.join(" ")}`,
  );

  return { kind: "ok", options };
}

/**
 * 使用するエンコーディングを決める
 *
 * `luit.defaultEncoding`が設定されていれば何も尋ねずにそれを使う。
 * ターミナルプロファイルを`terminal.integrated.defaultProfile.linux`に
 * 指定している場合、ここで選択を挟むとターミナルを開くたびに操作を求めることに
 * なるため、この設定が事実上の必須になる
 *
 * @returns 選ばれたエンコーディング。ユーザーが中断した場合は`undefined`
 */
async function pickEncoding(
  deps: TerminalProfileDeps,
  luitPath: string,
  config: vscode.WorkspaceConfiguration,
): Promise<string | undefined> {
  const defaultEncoding = config.get<string>("defaultEncoding", "");
  if (defaultEncoding) {
    return defaultEncoding;
  }

  const rememberLast = config.get<boolean>("rememberLastEncoding", true);
  const lastEncoding = rememberLast ? deps.state.getLastEncoding() : undefined;

  const list = await deps.encodingCache.get(luitPath);
  if (!list.ok) {
    // 一覧を取れなくても、エンコーディング名さえ分かっていれば起動はできる。
    // 通知は出さず、詳細は出力チャネルに残して手動入力に切り替える
    deps.diagnostics.log(`Could not list encodings: ${list.reason}`);
    return await vscode.window.showInputBox({
      title: vscode.l10n.t("luit: Encoding"),
      prompt: vscode.l10n.t(
        "Could not read the encoding list from luit. Enter an encoding name (for example eucJP).",
      ),
      value: lastEncoding ?? "",
    });
  }

  const items = buildQuickPickItems(list.encodings, lastEncoding);

  const selected = await vscode.window.showQuickPick(items, {
    title: vscode.l10n.t("luit: Encoding"),
    placeHolder: vscode.l10n.t("Select the encoding to translate"),
    matchOnDescription: true,
  });
  if (!selected) {
    return undefined;
  }

  if (selected.encoding === undefined) {
    return await vscode.window.showInputBox({
      title: vscode.l10n.t("luit: Encoding"),
      prompt: vscode.l10n.t("Enter an encoding name (for example eucJP)."),
    });
  }

  return selected.encoding;
}

/** QuickPickの項目。`encoding`が`undefined`の項目は「手動入力」を意味する */
interface EncodingQuickPickItem extends vscode.QuickPickItem {
  encoding?: string;
}

/**
 * エンコーディング一覧をQuickPickの項目に変換する
 *
 * 並び順は`luit -list`の出力のまま。よく使うものを拡張機能側で決め打ちすると、
 * luitのバージョンや環境によって実際に使える一覧とズレる
 */
function buildQuickPickItems(
  encodings: readonly LuitEncoding[],
  lastEncoding: string | undefined,
): EncodingQuickPickItem[] {
  const items: EncodingQuickPickItem[] = [];

  const isKnown = encodings.some((entry) => entry.id === lastEncoding);
  if (lastEncoding !== undefined && isKnown) {
    items.push(
      {
        label: vscode.l10n.t("Recently used"),
        kind: vscode.QuickPickItemKind.Separator,
      },
      { label: lastEncoding, encoding: lastEncoding },
      {
        label: vscode.l10n.t("All encodings"),
        kind: vscode.QuickPickItemKind.Separator,
      },
    );
  }

  for (const entry of encodings) {
    // exactOptionalPropertyTypes のため、description は値がある場合のみ持たせる
    items.push(
      entry.isoType === "non-iso-2022"
        ? {
            label: entry.id,
            description: vscode.l10n.t("non-ISO-2022"),
            encoding: entry.id,
          }
        : { label: entry.id, encoding: entry.id },
    );
  }

  items.push(
    { label: "", kind: vscode.QuickPickItemKind.Separator },
    { label: vscode.l10n.t("$(edit) Enter an encoding name...") },
  );

  return items;
}

/**
 * ターミナルの生成を、余計な通知を出さずに中止するためのエラー
 *
 * `provideTerminalProfile`には戻り値の癖があり、中止する手段が素直ではない。
 * VS Code 1.133.0のバンドルを読んで確認した挙動は次のとおり:
 *
 * 1. `token`がキャンセルされていない状態で`undefined`を返すと、VS Codeが
 *    ``No terminal profile options provided for id "..."``を投げる。
 *    QuickPickをEscで閉じても`token`はキャンセルされないので、ユーザーが
 *    操作を取り消しただけでこのエラーに行き着く
 * 2. そのエラーは呼び出し元の`createContributedTerminalProfile`で捕まり、
 *    `catch (error) { this._notificationService.error(error.message) }`
 *    としてユーザーに表示される。**渡されるのはErrorではなく`message`の文字列**
 * 3. 通知の生成側は`if (!message || isCancellationError(message)) return;`
 *    という条件を持つが、`isCancellationError`はErrorのインスタンスにしか
 *    真にならない。つまり(2)で文字列になった時点でこの判定は素通りする。
 *    `CancellationError`を投げても、その`message`である"Canceled"が
 *    そのまま通知として表示されるだけで解決しない
 *
 * 残る条件が`!message`、つまり**メッセージが空なら通知は作られない**。
 * そのため中止したいときはメッセージが空のエラーを投げる
 */
class SilentCancellation extends Error {
  constructor() {
    super("");
    this.name = "SilentCancellation";
  }
}

/** テストから参照するための、中止時に投げるエラーの生成 */
export function createSilentCancellation(): Error {
  return new SilentCancellation();
}

/**
 * ターミナルプロファイル(`+`ボタン横のドロップダウン)の実装
 *
 * `provideTerminalProfile`の戻り値はVS Code側で`await`されるため、この中で
 * QuickPickを出してユーザーに選ばせてよい
 *
 * ただし、tasks.jsonのcustom executionから呼ばれる経路ではVS Codeが
 * `provideTerminalProfile`を`await`しない(microsoft/vscode#200558)。
 * その用途では`luit.defaultEncoding`を設定してQuickPickを出さない構成にする必要がある
 */
export class LuitTerminalProfileProvider
  implements vscode.TerminalProfileProvider
{
  constructor(private readonly deps: TerminalProfileDeps) {}

  async provideTerminalProfile(
    token: vscode.CancellationToken,
  ): Promise<vscode.TerminalProfile> {
    const result = await prepareLuitTerminal(this.deps);

    if (token.isCancellationRequested || result.kind !== "ok") {
      // "failed"の場合、原因の通知は既に出している。ここで更にVS Codeに
      // エラーを出させると二重になるため、同じく静かに中止する
      throw new SilentCancellation();
    }

    return new vscode.TerminalProfile(result.options);
  }
}
