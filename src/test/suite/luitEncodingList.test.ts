import * as assert from "assert";
import { parseLuitEncodingList } from "../../luitEncodingList";

/**
 * `luit -list`の実際の出力を切り出したもの(luit 2.0-20250912)
 *
 * ISO 2022形式の行、非ISO 2022形式の行、セクション区切り、そして
 * 取り込んではいけない"Known charsets"セクションをすべて含む
 */
const REAL_OUTPUT = [
  "Known locale encodings:",
  "",
  "  C: GL -> G0, GR -> G2, G0: ASCII, G2: ISO 8859-1",
  "  ISO8859-1: GL -> G0, GR -> G2, G0: ASCII, G2: ISO 8859-1",
  "  KOI8-R: GL -> G0, GR -> G2, G0: ASCII, G2: KOI8-R",
  "  eucJP: GL -> G0, GR -> G1, G0: ASCII, G1: JIS X 0208, G2: JIS X 0201:GR, G3: JIS X 0212",
  "  Big5: GL -> G0, GR -> G1, G0: ASCII, G1: Big 5",
  "  GBK (non-ISO-2022 encoding)",
  "  UTF-8 (non-ISO-2022 encoding)",
  "  SJIS (non-ISO-2022 encoding)",
  "  GB18030 (non-ISO-2022 encoding)",
  "",
  "",
  "Known charsets (not all may be available):",
  "",
  "  ISO 646 (1973) (ISO 2022, 94 codes)",
  "  ASCII (ISO 2022, 94 codes)",
  "  JIS X 0201:GL (ISO 2022, 94 codes)",
  "",
].join("\n");

suite("parseLuitEncodingList", () => {
  test("実際のluitの出力からエンコーディング名を取り出す", () => {
    const encodings = parseLuitEncodingList(REAL_OUTPUT);

    assert.deepStrictEqual(encodings, [
      { id: "C", isoType: "iso-2022" },
      { id: "ISO8859-1", isoType: "iso-2022" },
      { id: "KOI8-R", isoType: "iso-2022" },
      { id: "eucJP", isoType: "iso-2022" },
      { id: "Big5", isoType: "iso-2022" },
      { id: "GBK", isoType: "non-iso-2022" },
      { id: "UTF-8", isoType: "non-iso-2022" },
      { id: "SJIS", isoType: "non-iso-2022" },
      { id: "GB18030", isoType: "non-iso-2022" },
    ]);
  });

  test("Known charsetsセクションの文字集合を含めない", () => {
    const ids = parseLuitEncodingList(REAL_OUTPUT).map((e) => e.id);

    // これらは文字集合であってエンコーディングではないため、
    // `luit -encoding`に渡すと失敗する
    assert.ok(!ids.includes("ASCII"));
    assert.ok(!ids.includes("ISO 646 (1973)"));
    assert.ok(!ids.includes("JIS X 0201"));
  });

  test("値側のコロンを名前の区切りと誤認しない", () => {
    // "G2: JIS X 0201:GR"のように、値側にもコロンが現れる
    const encodings = parseLuitEncodingList(REAL_OUTPUT);
    const eucJP = encodings.find((e) => e.id === "eucJP");

    assert.ok(eucJP);
  });

  test("Known charsetsセクションが無くても最後まで読む", () => {
    const encodings = parseLuitEncodingList(
      ["Known locale encodings:", "", "  eucJP: GL -> G0", ""].join("\n"),
    );

    assert.deepStrictEqual(encodings, [{ id: "eucJP", isoType: "iso-2022" }]);
  });

  test("CRLFの出力でも解析できる", () => {
    const encodings = parseLuitEncodingList(
      [
        "Known locale encodings:",
        "",
        "  SJIS (non-ISO-2022 encoding)",
        "",
      ].join("\r\n"),
    );

    assert.deepStrictEqual(encodings, [
      { id: "SJIS", isoType: "non-iso-2022" },
    ]);
  });

  test("見出しが無ければ空を返す", () => {
    assert.deepStrictEqual(parseLuitEncodingList("luit: unknown option\n"), []);
    assert.deepStrictEqual(parseLuitEncodingList(""), []);
  });

  test("解釈できない行は読み飛ばす", () => {
    // 将来luitが書式を変えても、認識できた分だけ返して壊れないこと
    const encodings = parseLuitEncodingList(
      [
        "Known locale encodings:",
        "",
        "  eucJP: GL -> G0",
        "  something entirely unexpected",
        "  SJIS (non-ISO-2022 encoding)",
      ].join("\n"),
    );

    assert.deepStrictEqual(encodings, [
      { id: "eucJP", isoType: "iso-2022" },
      { id: "SJIS", isoType: "non-iso-2022" },
    ]);
  });
});
