import * as vscode from "vscode";

/** 直近に使ったエンコーディングの記憶 */
export interface LuitState {
  getLastEncoding(): string | undefined;
  setLastEncoding(encoding: string): Thenable<void>;
}

/** `globalState`のキー。ワークスペースをまたいで共有したいのでworkspaceStateは使わない */
const LAST_ENCODING_KEY = "luit.lastEncoding";

/**
 * 直近使用エンコーディングを`globalState`に保存する実装を作る
 *
 * @param memento 保存先(通常は`ExtensionContext.globalState`)
 */
export function createState(memento: vscode.Memento): LuitState {
  return {
    getLastEncoding() {
      return memento.get<string>(LAST_ENCODING_KEY);
    },
    setLastEncoding(encoding) {
      return memento.update(LAST_ENCODING_KEY, encoding);
    },
  };
}
