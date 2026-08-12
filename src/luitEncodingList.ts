import { defaultExecFile, ExecFileFn } from "./execFile";

/** luitが認識するエンコーディング1件 */
export interface LuitEncoding {
  /** `luit -encoding`にそのまま渡せる名前。例: "eucJP" */
  id: string;
  isoType: "iso-2022" | "non-iso-2022";
}

/** エンコーディング一覧が始まる行 */
const LOCALE_SECTION_HEADING = "Known locale encodings:";

/** エンコーディング一覧の次に来るセクションの見出し。ここ以降は読まない */
const CHARSET_SECTION_HEADING = "Known charsets";

/** ISO 2022ではないエンコーディングの行に付く接尾辞 */
const NON_ISO_SUFFIX = " (non-ISO-2022 encoding)";

/**
 * `luit -list`の標準出力からエンコーディング名を取り出す
 *
 * 出力は2つのセクションに分かれており、前半だけが`-encoding`に渡せる名前:
 *
 * ```
 * Known locale encodings:
 *
 *   eucJP: GL -> G0, GR -> G1, G0: ASCII, G1: JIS X 0208, ...
 *   SJIS (non-ISO-2022 encoding)
 *
 * Known charsets (not all may be available):
 *
 *   ASCII (ISO 2022, 94 codes)
 * ```
 *
 * 後半の"Known charsets"は文字集合であってエンコーディングではないため、
 * ここに含めてはいけない(`luit -encoding ASCII`のような無効な指定になる)
 *
 * どちらの行形式にも一致しない行は黙って読み飛ばす。将来luitが出力書式を
 * 変えても、認識できた分だけを返して壊れないようにするため。1件も取れなかった
 * 場合の扱い(手動入力へのフォールバック)は呼び出し側の責務
 *
 * @param stdout `luit -list`の標準出力
 * @returns 認識できたエンコーディングの一覧(luitの出力順のまま)
 */
export function parseLuitEncodingList(stdout: string): LuitEncoding[] {
  const lines = stdout.split(/\r?\n/);

  const startIndex = lines.findIndex(
    (line) => line.trim() === LOCALE_SECTION_HEADING,
  );
  if (startIndex === -1) {
    return [];
  }

  const endIndex = lines.findIndex(
    (line, index) =>
      index > startIndex && line.trim().startsWith(CHARSET_SECTION_HEADING),
  );
  const section = lines.slice(
    startIndex + 1,
    endIndex === -1 ? undefined : endIndex,
  );

  const encodings: LuitEncoding[] = [];
  for (const rawLine of section) {
    const line = rawLine.trim();
    if (line === "") {
      continue;
    }

    if (line.endsWith(NON_ISO_SUFFIX)) {
      encodings.push({
        id: line.slice(0, -NON_ISO_SUFFIX.length),
        isoType: "non-iso-2022",
      });
      continue;
    }

    // "eucJP: GL -> G0, ..." のように、最初のコロンまでが名前。
    // 値側にもコロンが現れる("G0: ASCII")ため、最初の1つだけを見る
    const colonIndex = line.indexOf(":");
    if (colonIndex > 0) {
      encodings.push({
        id: line.slice(0, colonIndex),
        isoType: "iso-2022",
      });
    }
  }

  return encodings;
}

/** エンコーディング一覧の取得結果 */
export type EncodingListResult =
  { ok: true; encodings: LuitEncoding[] } | { ok: false; reason: string };

/** 取得済みのエンコーディング一覧を保持するキャッシュ */
export interface EncodingListCache {
  /**
   * エンコーディング一覧を取得する
   *
   * 同じluitパスで取得済みならプロセスを起動せずにキャッシュを返す
   */
  get(luitPath: string, exec?: ExecFileFn): Promise<EncodingListResult>;
  /** キャッシュを捨てる。`luit.luitPath`の変更時と明示的な再取得コマンドから呼ぶ */
  invalidate(): void;
}

/**
 * エンコーディング一覧のキャッシュを作る
 *
 * 保持先は拡張機能ホストのメモリのみで、`globalState`やディスクには永続化しない。
 * luitの更新やPATHの変更をまたいで古い一覧が残ると、存在しないエンコーディングを
 * 選べてしまうため
 */
export function createEncodingListCache(): EncodingListCache {
  let cachedPath: string | undefined;
  let cachedEncodings: LuitEncoding[] | undefined;

  return {
    async get(luitPath, exec = defaultExecFile) {
      if (cachedPath === luitPath && cachedEncodings) {
        return { ok: true, encodings: cachedEncodings };
      }

      let stdout: string;
      try {
        ({ stdout } = await exec(luitPath, ["-list"]));
      } catch (error) {
        return {
          ok: false,
          reason: error instanceof Error ? error.message : String(error),
        };
      }

      const encodings = parseLuitEncodingList(stdout);
      if (encodings.length === 0) {
        return {
          ok: false,
          reason: `'${luitPath} -list' returned no known encodings`,
        };
      }

      cachedPath = luitPath;
      cachedEncodings = encodings;
      return { ok: true, encodings };
    },

    invalidate() {
      cachedPath = undefined;
      cachedEncodings = undefined;
    },
  };
}
