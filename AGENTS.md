# AGENTS.md

vscode-luitは単一パッケージのTypeScript製VS Code拡張機能。`luit`を使って、UTF-8前提のVS Code統合ターミナルでEUC-JPやShift_JISなどのレガシーエンコーディングを扱えるようにする。本体コードは`src/`、テストは`src/test/suite/`。コマンドは`package.json`の`scripts`を参照する。変更後は最低限`npm run lint` / `format-check` / `spellcheck` / `test`を通す。

## この拡張機能が前提にしている外部仕様

これらは調査で裏付けを取った上で設計に組み込んである。変更する前に根拠を確認すること。

- **ターミナルプロファイルと独自コマンドの両方を提供している**のは冗長ではない。`workbench.action.terminal.newWithProfile`の`profileName`は`availableProfiles`(= `terminal.integrated.profiles.*`とOS検出分)しか検索せず、拡張機能が提供するプロファイルは`contributedProfiles`という別リストにある([terminalProfileService.ts](https://github.com/microsoft/vscode/blob/main/src/vs/workbench/contrib/terminal/browser/terminalProfileService.ts)、[microsoft/vscode#152635](https://github.com/microsoft/vscode/issues/152635))。コマンドパレットやキーバインドから開けるようにするには独自コマンドが要る
- **`provideTerminalProfile`から中止するときは、メッセージが空のエラーを投げる**(`SilentCancellation`、`src/terminalProfile.ts`)。`undefined`を返すとVS Codeが`No terminal profile options provided for id "..."`を投げ、それが`createContributedTerminalProfile`の`catch`で`notificationService.error(error.message)`に渡ってエラー通知になる。QuickPickをEscしても`token`はキャンセルされないので、これは通常操作で踏む。`CancellationError`でも解決しない: 通知側に渡るのはErrorではなく`message`の文字列で、`isCancellationError`はErrorのインスタンスにしか真にならないため、"Canceled"がそのまま表示される。通知の生成条件`if (!message || isCancellationError(message)) return;`のうち、実際に効くのは`!message`だけ(VS Code 1.133.0のバンドルで確認)
- **shell integrationは効かない**。VS Codeは実行ファイルのbasenameを`bash`/`fish`/`pwsh`/`zsh`と照合して統合スクリプトを注入するため、`luit`では発動しない。将来的には`shellIntegrationNonce`(VS Code 1.104+)で迂回できるが、`engines.vscode`を大きく上げることになる
- **`extensionKind: ["workspace"]`は意図的**。Remote-SSH/WSL/Dev Container接続時に拡張機能ホストがリモート側で動くことで、`luit`の探索もターミナルの起動もリモート側で行われる。これがこの拡張機能の主用途であり、バイナリを同梱しなくて済む理由でもある
- **プロファイルの`title`は意図的にローカライズしていない**。`terminal.integrated.defaultProfile.*`は`contributedProfiles.find(p => p.title === 設定値)`で照合する(1.74.0/1.133.0の両方で確認)。翻訳すると、ユーザーがsettings.jsonに書くべき値が表示言語によって変わってしまう
- **luitはシェルのロケールを変更しない**。`-encoding eucJP`を指定しても子プロセスの`LANG`はそのまま。シェルがUTF-8を出力する設定のままだと文字化けするため、`luit.env`で`LANG`を渡せるようにしてある
- **エンコーディング一覧はハードコードしない**。`luit -list`の「Known locale encodings:」セクションを実行時に解析する。「Known charsets」以降は文字集合であってエンコーディングではないので取り込まないこと(`luit -encoding`に渡すと失敗する)

## CHANGELOG.md

- ユーザー向け変更(feat/fix/perf/挙動変更)なら`CHANGELOG.md`の`[Unreleased]`に追記する(依存関係更新・内部限定の変更は対象外)
- 追記後は`npm run format-check`と`npm run spellcheck`を通す

## PRのラベル

内容に応じたラベルを付ける。

- feat → `enhancement`
- fix → `bug`
- perf → `enhancement`
- docs → `documentation`
- 上記以外(refactor/chore/testなど)は無理に付けない

## Node.jsバージョン

`.nvmrc`が唯一の情報源。VS Code拡張のExtension HostはVS Code同梱のNode.js上で動くため、`microsoft/vscode`自身の`.nvmrc`に合わせる。

- CIは`actions/setup-node`の`node-version-file: ./.nvmrc`で自動追従する(ワークフロー変更は不要)
- `.devcontainer/`もビルド時に`.nvmrc`を読んでnvmでインストールする(Dockerfileへの直書きはしない)
- 上げる場合は`.nvmrc`を書き換え、`@types/node`のメジャーバージョンも追従させ、`.github/dependabot.yml`の無視ルールも更新する
- 注意: `@types/node`(型定義)が追従する`.nvmrc`と、Extension Host内で実際に動くコードの実行時Node.jsバージョン(`engines.vscode: "^1.74.0"`が同梱するElectron 19のNode.js v16.14.2)は別物。両者の乖離により`tsc`がNode 18+専用APIの誤用を見逃さないよう、`eslint.config.js`の`eslint-plugin-n`(`n/no-unsupported-features/*`)が`src/**/*.ts`を実行時floorでガードしている(`src/test/runTest.ts`だけはdev/CI機で動くため`>=18.3.0`で上書き)
  - このガードが見るのは**グローバル参照とモジュールメンバのみ**。プロトタイプメソッド(`Array#at`、`String#replaceAll`など)は対象外で、そちらは`tsconfig.json`の`"lib"`が捕捉する。安全網であって保証ではない

## engines.vscode

現在`^1.74.0`。この値は`activationEvents`と連動している: `activationEvents`には`onTerminalProfile:luit.profile`しか書いておらず、コマンドの有効化はVS Code 1.74で入った暗黙アクティベーションに任せている。**`engines.vscode`を1.74未満に下げるなら、`onCommand:luit.openTerminal`と`onCommand:luit.refreshEncodings`を明示的に追加しないと、コマンドパレットから叩いても何も起きない。**

CIの`test-minimum-vscode-version`ジョブが1.74.0で実際にテストを走らせてこれを担保している。

## テスト

- `vscode`をimportしないテスト(純粋関数、`ExecFileFn`をモックしたもの)も、`vscode`に依存するテストも、同じmochaスイート(`@vscode/test-electron`でExtension Host内実行)で動かす
- luitが実際にエンコーディングを変換しているかは自動テストの対象外。検証範囲の上限は「正しい`TerminalOptions`が組み立つところまで」
- 環境によってはVS Codeのバイナリが起動できず`npm test`がローカルで通らないことがある(共有ライブラリ不足、X不在など)。その場合は`tsc` / `eslint` / `prettier` / `cspell`をローカルで、テスト結果はCI(3 OSマトリクス)で確認する旨をPR本文に書く。`vscode`をimportしないテストだけなら`npx mocha --ui tdd out/test/suite/<name>.test.js`で直接実行できる

## コミット規約

Conventional Commits(`feat:` / `fix:` / `docs:` / `refactor:` / `test:` / `chore:` / `perf:` / `build(deps):` / `build(deps-dev):`)。PRはsquash mergeされ、件名末尾に`(#PR番号)`が付く。

## 新しいファイル/ディレクトリを追加するとき

`.vscodeignore`はVSIX(配布物)からの除外リストで、既存パターンに含まれない新規パスはデフォルトで同梱される。エンドユーザーに不要なもの(AIエージェント専用ファイルなど)は`.vscodeignore`への追加要否を確認する。`npx vsce ls`で実際の同梱ファイルを確認できる。

**`l10n/`は除外しないこと。**`vscode.l10n.t()`が実行時に読むため、配布物に含まれている必要がある。
