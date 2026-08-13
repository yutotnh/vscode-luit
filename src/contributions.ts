/**
 * `package.json`の`contributes`と一致させる必要がある値
 *
 * ずれても型検査では捕まらないので、参照する側がリテラルを重複して持たないよう
 * ここに集約している。コマンドIDは`commands.ts`側にある。
 */

/** `contributes.terminal.profiles[].id`と一致させる */
export const TERMINAL_PROFILE_ID = "luit.profile";

/**
 * `contributes.terminal.profiles[].icon`と一致させる
 *
 * codicon IDであること。`contributes`側は相対パスを受け付けない
 * (VS Codeは文字列をcodicon IDとして照合し、外れると`URI.parse`にそのまま渡すだけで、
 * 拡張機能のインストール先を基準に解決しない)。
 */
export const TERMINAL_ICON_ID = "terminal";
