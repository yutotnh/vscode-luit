import * as assert from "assert";
import {
  canonicalize,
  describeEncoding,
  foldEncodingName,
  resolveEncodingId,
} from "../../encodingNames";
import { LuitEncoding } from "../../luitEncodingList";

/** ローカルのluit 2.0-20250912の`-list`から、判定に関わる分を抜いたもの */
const KNOWN: LuitEncoding[] = [
  { id: "ISO8859-1", isoType: "iso-2022" },
  { id: "ISO8859-11", isoType: "iso-2022" },
  { id: "TIS620", isoType: "iso-2022" },
  { id: "KOI8-E", isoType: "iso-2022" },
  { id: "CP1252", isoType: "iso-2022" },
  { id: "GB2312", isoType: "iso-2022" },
  { id: "eucJP", isoType: "iso-2022" },
  { id: "eucCN", isoType: "iso-2022" },
  { id: "Big5", isoType: "iso-2022" },
  { id: "SJIS", isoType: "non-iso-2022" },
  { id: "GB18030", isoType: "non-iso-2022" },
];

suite("canonicalize", () => {
  test("大小と区切り記号の揺れを吸収する", () => {
    assert.strictEqual(canonicalize("EUC-JP"), "eucjp");
    assert.strictEqual(canonicalize("euc_jp"), "eucjp");
    assert.strictEqual(canonicalize("eucJP"), "eucjp");
    assert.strictEqual(canonicalize(" ISO 8859-1 "), "iso88591");
  });
});

suite("foldEncodingName", () => {
  test("綴りの違う別名を同じ値に畳む", () => {
    assert.strictEqual(foldEncodingName("SJIS"), foldEncodingName("Shift_JIS"));
    assert.strictEqual(
      foldEncodingName("SJIS"),
      foldEncodingName("Japanese (Shift JIS)"),
    );
    assert.strictEqual(
      foldEncodingName("CP1252"),
      foldEncodingName("Windows 1252"),
    );
  });

  test("対応が無い名前はcanonicalizeと同じ結果になる", () => {
    assert.strictEqual(foldEncodingName("KOI8-E"), canonicalize("KOI8-E"));
    assert.strictEqual(foldEncodingName("eucTW"), canonicalize("eucTW"));
  });
});

suite("describeEncoding", () => {
  test("VS Code流の表記を返す", () => {
    assert.deepStrictEqual(describeEncoding("eucJP"), {
      label: "Japanese (EUC-JP)",
      shortLabel: "EUC-JP",
    });
    assert.deepStrictEqual(describeEncoding("SJIS"), {
      label: "Japanese (Shift JIS)",
      shortLabel: "Shift JIS",
    });
    assert.deepStrictEqual(describeEncoding("CP1252"), {
      label: "Western (Windows 1252)",
      shortLabel: "Windows 1252",
    });
    // VS Codeのキーはcp950だが、labelShortの"Big5"から自動で対応が付く
    assert.deepStrictEqual(describeEncoding("Big5"), {
      label: "Traditional Chinese (Big5)",
      shortLabel: "Big5",
    });
  });

  test("VS Code側に対応が無ければluitの名前をそのまま使う", () => {
    assert.deepStrictEqual(describeEncoding("KOI8-E"), {
      label: "KOI8-E",
      shortLabel: "KOI8-E",
    });
    assert.deepStrictEqual(describeEncoding("eucTW"), {
      label: "eucTW",
      shortLabel: "eucTW",
    });
  });
});

suite("resolveEncodingId", () => {
  test("VS Code流の表記からluitの名前へ寄せる", () => {
    assert.strictEqual(resolveEncodingId("EUC-JP", KNOWN), "eucJP");
    assert.strictEqual(resolveEncodingId("euc-jp", KNOWN), "eucJP");
    assert.strictEqual(resolveEncodingId("Japanese (EUC-JP)", KNOWN), "eucJP");
    assert.strictEqual(resolveEncodingId("Shift_JIS", KNOWN), "SJIS");
    assert.strictEqual(resolveEncodingId("Shift JIS", KNOWN), "SJIS");
    assert.strictEqual(resolveEncodingId("Windows 1252", KNOWN), "CP1252");
  });

  test("luitの名前をそのまま渡しても変わらない", () => {
    for (const entry of KNOWN) {
      assert.strictEqual(resolveEncodingId(entry.id, KNOWN), entry.id);
    }
  });

  test("完全一致を別名解決より優先する", () => {
    // TIS620はISO 8859-11の別名だが、luitは両方を別の項目として持っている。
    // 先に別名を畳むと、TIS620と書いたユーザーが黙ってISO8859-11にされてしまう
    assert.strictEqual(resolveEncodingId("TIS620", KNOWN), "TIS620");
    assert.strictEqual(resolveEncodingId("ISO8859-11", KNOWN), "ISO8859-11");
    // 同じ理由で、eucCNとGB2312も入れ替わらない
    assert.strictEqual(resolveEncodingId("eucCN", KNOWN), "eucCN");
    assert.strictEqual(resolveEncodingId("GB2312", KNOWN), "GB2312");
  });

  test("寄せられない入力はそのまま返す", () => {
    // 妥当性の検証はしない。luit自身にエラーを出させる
    assert.strictEqual(
      resolveEncodingId("no-such-encoding", KNOWN),
      "no-such-encoding",
    );
  });

  test("一覧が空でも入力をそのまま返す", () => {
    // `luit -list`が失敗した場合。設定を握り潰さない
    assert.strictEqual(resolveEncodingId("EUC-JP", []), "EUC-JP");
  });
});
