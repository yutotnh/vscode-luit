/**
 * 拡張機能ホストが動いているOSの判定
 *
 * ここで見ているのは「VS Codeのウィンドウが表示されているマシン」ではなく
 * 「拡張機能のコードが実行されているマシン」。この拡張機能は
 * `extensionKind: ["workspace"]` を宣言しているため、Remote-SSH/WSL/Dev Container
 * 接続時はリモート側で動く。つまりWindowsのVS CodeからLinuxへSSH接続している場合、
 * ここでの判定結果は "linux" になる(それが本拡張機能の主用途)
 */
export type HostPlatform = "linux" | "unsupported";

/**
 * 拡張機能ホストのOSがサポート対象かを判定する
 *
 * @param platform 判定対象のプラットフォーム(既定は実行中のホスト)
 * @returns サポート対象なら "linux"、それ以外は "unsupported"
 */
export function detectHostPlatform(
  platform: NodeJS.Platform = process.platform,
): HostPlatform {
  return platform === "linux" ? "linux" : "unsupported";
}
