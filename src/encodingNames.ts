import { LuitEncoding } from "./luitEncodingList";

/** エンコーディング1件の表示用の表記 */
export interface EncodingLabels {
  /** 一覧向けの長いラベル。例: "Japanese (EUC-JP)" */
  label: string;
  /** ターミナル名向けの短いラベル。例: "EUC-JP" */
  shortLabel: string;
}

/**
 * VS Codeがエンコーディングに付けている表記
 *
 * `[VS Codeのキー, labelLong, labelShort]`。VS Code本体の`SUPPORTED_ENCODINGS`
 * (`vs/workbench/services/textfile/common/encoding`)から、`luit -list`の一覧と
 * 重なるものだけを写している。
 *
 * この表は**ラベルを被せるためだけのもの**で、`luit -encoding`に渡す値を
 * ここから作ることは無い。何が使えるかの正は常に`luit -list`の出力側にある。
 *
 * ローカライズはしない。VS Code自身がこれらのラベルをローカライズしておらず
 * (同じバンドル内でterminal拡張ポイントのスキーマは`localize()`経由なのに対し、
 * この表はリテラルで埋め込まれている)、加えて翻訳するとターミナル名や
 * `luit.defaultEncoding`に書くべき値が表示言語によって変わってしまう。
 */
const VSCODE_ENCODINGS: readonly (readonly [
  key: string,
  label: string,
  shortLabel: string,
])[] = [
  ["utf8", "UTF-8", "UTF-8"],
  ["windows1252", "Western (Windows 1252)", "Windows 1252"],
  ["iso88591", "Western (ISO 8859-1)", "ISO 8859-1"],
  ["iso88593", "Western (ISO 8859-3)", "ISO 8859-3"],
  ["iso885915", "Western (ISO 8859-15)", "ISO 8859-15"],
  ["cp437", "DOS (CP 437)", "CP437"],
  ["iso88596", "Arabic (ISO 8859-6)", "ISO 8859-6"],
  ["iso88594", "Baltic (ISO 8859-4)", "ISO 8859-4"],
  ["iso885914", "Celtic (ISO 8859-14)", "ISO 8859-14"],
  ["windows1250", "Central European (Windows 1250)", "Windows 1250"],
  ["iso88592", "Central European (ISO 8859-2)", "ISO 8859-2"],
  ["cp852", "Central European (CP 852)", "CP 852"],
  ["windows1251", "Cyrillic (Windows 1251)", "Windows 1251"],
  ["cp866", "Cyrillic (CP 866)", "CP 866"],
  ["iso88595", "Cyrillic (ISO 8859-5)", "ISO 8859-5"],
  ["koi8r", "Cyrillic (KOI8-R)", "KOI8-R"],
  ["koi8u", "Cyrillic (KOI8-U)", "KOI8-U"],
  ["koi8ru", "Cyrillic (KOI8-RU)", "KOI8-RU"],
  ["iso885913", "Estonian (ISO 8859-13)", "ISO 8859-13"],
  ["iso88597", "Greek (ISO 8859-7)", "ISO 8859-7"],
  ["windows1255", "Hebrew (Windows 1255)", "Windows 1255"],
  ["iso88598", "Hebrew (ISO 8859-8)", "ISO 8859-8"],
  ["iso885910", "Nordic (ISO 8859-10)", "ISO 8859-10"],
  ["cp865", "Nordic DOS (CP 865)", "CP 865"],
  ["iso885916", "Romanian (ISO 8859-16)", "ISO 8859-16"],
  ["iso88599", "Turkish (ISO 8859-9)", "ISO 8859-9"],
  ["cp850", "Western European DOS (CP 850)", "CP 850"],
  ["iso885911", "Latin/Thai (ISO 8859-11)", "ISO 8859-11"],
  ["gbk", "Simplified Chinese (GBK)", "GBK"],
  ["gb18030", "Simplified Chinese (GB18030)", "GB18030"],
  ["gb2312", "Simplified Chinese (GB 2312)", "GB 2312"],
  ["cp950", "Traditional Chinese (Big5)", "Big5"],
  ["big5hkscs", "Traditional Chinese (Big5-HKSCS)", "Big5-HKSCS"],
  ["shiftjis", "Japanese (Shift JIS)", "Shift JIS"],
  ["eucjp", "Japanese (EUC-JP)", "EUC-JP"],
  ["euckr", "Korean (EUC-KR)", "EUC-KR"],
];

/**
 * 綴りを揃えるだけでは対応が付かない組み合わせ
 *
 * `[luit側の名前, VS Codeのキー]`。VS Codeのキー・labelLong・labelShortは
 * 自動で別名として登録されるため、`Big5`(VS Codeのキーは`cp950`だがlabelShortが
 * `Big5`)のような対応はここに書かなくても付く。ここに残るのは、両者で綴りそのものが
 * 違うものだけ。
 */
const EXTRA_ALIASES: readonly (readonly [luitName: string, key: string])[] = [
  ["SJIS", "shiftjis"],
  ["CP1250", "windows1250"],
  ["CP1251", "windows1251"],
  ["CP1252", "windows1252"],
  ["CP1255", "windows1255"],
  // EUC-CNはGB 2312の、TIS620はISO 8859-11の別名
  ["eucCN", "gb2312"],
  ["TIS620", "iso885911"],
];

/**
 * 大小や区切り記号の揺れを吸収した比較用の形にする
 *
 * `EUC-JP` / `euc_jp` / `eucJP`はいずれも`eucjp`になる。
 *
 * @param name エンコーディング名やラベル
 * @returns 英数字だけを残して小文字にした文字列
 */
export function canonicalize(name: string): string {
  return name.toLowerCase().replace(/[^a-z0-9]/g, "");
}

/** `canonicalize`した名前から、VS Codeのキーを引く表 */
const KEY_BY_ALIAS = new Map<string, string>();
/** VS Codeのキーから、表示用のラベルを引く表 */
const LABELS_BY_KEY = new Map<string, EncodingLabels>();

for (const [key, label, shortLabel] of VSCODE_ENCODINGS) {
  LABELS_BY_KEY.set(key, { label, shortLabel });
  // キーそのものと、長短どちらのラベルからも引けるようにする。
  // ユーザーが一覧で見た表記をそのまま設定に書いても通るようにするため
  for (const alias of [key, label, shortLabel]) {
    KEY_BY_ALIAS.set(canonicalize(alias), key);
  }
}

for (const [luitName, key] of EXTRA_ALIASES) {
  KEY_BY_ALIAS.set(canonicalize(luitName), key);
}

/**
 * 別名も畳んだ比較用の形にする
 *
 * `SJIS`も`Shift_JIS`も`Japanese (Shift JIS)`も同じ値になる。
 * 対応するVS Codeのエンコーディングが無い名前は`canonicalize`と同じ結果になる。
 *
 * @param name エンコーディング名やラベル
 * @returns 同じエンコーディングを指す名前どうしで一致する文字列
 */
export function foldEncodingName(name: string): string {
  const canonical = canonicalize(name);
  return KEY_BY_ALIAS.get(canonical) ?? canonical;
}

/**
 * luitのエンコーディング名に対応する表示用のラベルを返す
 *
 * @param id `luit -list`が返すエンコーディング名。例: "eucJP"
 * @returns VS Code流の表記。対応が無ければ`id`をそのまま入れたもの
 */
export function describeEncoding(id: string): EncodingLabels {
  return (
    LABELS_BY_KEY.get(foldEncodingName(id)) ?? { label: id, shortLabel: id }
  );
}

/**
 * ユーザーが書いた名前を、luitに渡せるエンコーディング名へ寄せる
 *
 * `luit.defaultEncoding`は自由記述で、実際に`-encoding`へ渡せるのはluitの
 * 名前だけ。一覧では`Japanese (EUC-JP)`と表示しているので、それをそのまま
 * 設定に書いたユーザーが動かない、という状態にはできない。
 *
 * **別名を畳む前に、まず綴りの揺れだけを吸収した完全一致を試す。** luitは
 * `ISO8859-11`と`TIS620`を別々の項目として持っているため、いきなり別名を
 * 畳むと`TIS620`と書いたユーザーが黙って`ISO8859-11`に差し替えられてしまう。
 *
 * @param input ユーザーが書いた名前
 * @param known `luit -list`から得た一覧。取得できていない場合は空でよい
 * @returns 寄せられたエンコーディング名。寄せられなければ`input`のまま
 *   (luit自身にエラーを出させる)
 */
export function resolveEncodingId(
  input: string,
  known: readonly LuitEncoding[],
): string {
  const canonical = canonicalize(input);
  const exact = known.find((entry) => canonicalize(entry.id) === canonical);
  if (exact) {
    return exact.id;
  }

  const folded = foldEncodingName(input);
  const aliased = known.find((entry) => foldEncodingName(entry.id) === folded);
  return aliased?.id ?? input;
}
