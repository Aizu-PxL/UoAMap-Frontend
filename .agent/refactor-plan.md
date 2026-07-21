# UoAMap リポジトリ横断リファクタリング ExecPlan

状態: **M1完了、M2開始可能**
作成日: 2026-07-22
対象ブランチ: `codex/repository-wide-refactor`（作成・切替はユーザーが管理）

## 1. 目的

外部仕様と画面挙動を維持したまま、責務分離、依存方向、型安全性、テスト容易性を実質的に改善する。全ファイルを一度に書き換えず、先に現行挙動を自動テストで固定し、純粋ロジックと依存境界から順に小さく変更する。

この計画の完了条件は「ファイル数や行数が減ること」ではない。主要な変更理由がテストまたは明確な依存境界で説明でき、各スライスが独立レビュー済みで、全検証が通ることである。

## 2. 監査時点の基準

2026-07-22、変更前の作業ツリーはclean。次を確認した。

- `bun test`: 39 tests / 0 fail / 380 assertions
- `bun run verify:places`: 36件 PASS
- `bun run verify:routes`: 104 nodes / 112 edges PASS
- `bun run build`: PASS（`tsc -b` と Vite production build）
- 最大の実装集中点: `src/features/map/MapCanvas.tsx` 1,325行
- 次点: `tools/route-editor.html` 1,263行、`src/styles/global.css` 793行、`scripts/extract-routes.ts` 518行
- 現在の自動テストは地図幾何、viewport縮尺、QR URL、最短経路を対象とする。URL更新の全経路、Repository失敗系、イベント検索、BottomSheet操作、経路抽出器、route editorには不足がある。

次スレッドは実装前に `git status --short` と上記4コマンド、および `git diff --check` を再実行し、基準が変わっていたらこの節を更新する。

## 3. 維持する契約

- `docs/SPEC.md` の全外部仕様。特にURLが状態の正であること。
- `/`、`/q/:qrId`、`/p/:placeId`、`/e/:eventId`、`/events`、`/qr`、`/schedule` とクエリ保持規則。
- 幅402pxのスマホUI、アクセシビリティ、Figma準拠の表示。
- `Repository` インターフェースと `docs/API.md` の境界。
- `MapSheet` / `Floor` / `Place` / Route graph のデータ形式。
- `MapCanvas` のReact管理DOMとインラインSVG非管理DOMの境界。
- `public/maps/*.svg` の既存要素・ID・座標系。Routeの正はSVG、生成JSONは生成物。
- route editorの単一HTML配布と `file://` 動作、Undo / Redo、計画JSON・CSV・SVG出力。

現実装とSPECの差を発見しても、リファクタリングのついでに挙動を変えない。例: `/e/:eventId` がいつ `to` を設定するかは別の仕様判断として扱う。

## 4. SCOPEと非目標

対象は `src/`、`scripts/`、`tools/route-editor.html`、関連テスト・設定・文書。各マイルストーンの実装前に、さらに狭いSCOPEを `docs/tasks/13x-*.md` で列挙する。

非目標:

- API接続、機能追加、UI刷新、文言変更、デザイン変更
- React / Vite / TypeScript等のバージョン更新
- 根拠のない依存追加、全IDの一括branded type化
- SVG既存レイヤーや生成Route JSONの手編集
- 全CSSの一括分割・整形、コンポーネントの機械的なファイル移動
- QRカメラ処理の大規模hook化
- CI、デプロイ、本番URL、QR設置など別の運用課題

## 5. 問題と根拠

### A. URL状態の書き込み規則が分散

読み取りは `src/app/useNavState.ts` に集約されているが、`at` / `to` / `focus` / `highlight` の更新と保持規則は `src/app/landings.tsx`、`src/features/events/EventDetail.tsx`、`src/features/map/MapCanvas.tsx`、`src/features/map/MapPanel.tsx`、`src/features/qr/qrValue.ts` に分散する。特に `MapCanvas` のイベントマーカーは、既存クエリを保持して `/events?highlight=:eventId` へ遷移する。QR以外のcharacterization testがなく、URLが状態の正という最重要契約を変更時に壊しやすい。

### B. Repositoryの具体実装とキャッシュがグローバル

`src/data/repository.ts` がmock実装を直接exportし、`src/data/DataProvider.tsx` はモジュールスコープのPromiseを保持する。`src/app/landings.tsx` も同じ具体シングルトンへ直接依存するため、API差し替え、失敗系、複数Providerのテストが難しい。

### C. MapCanvasに責務が集中

`src/features/map/MapCanvas.tsx` がSVG取得・解析・非管理DOM挿入、地図ラベル、経路投影・描画、マーカーDOMとURL遷移、フロア切替、フォーカス、パン・wheel・pinchを担う。`AppLayout` が探索済み経路を渡す一方で、`MapCanvas` は生成 `routeGraph` を再び直接参照し、経路表示用のフロア・transfer nodeを組み立てている。

routeとmarkerのeffectは `viewBox` 全体に依存するため、x/yだけが変わるパン中にも非管理DOMとイベントリスナーを再生成する。表示縮尺に必要なのは原則width/heightであり、責務分離前に再生成条件をテストで固定できる。

### D. イベント検索と汎用BottomSheetの境界

`src/features/events/SearchPanel.tsx` は取得済みデータ、検索、タグ、highlight、DOM参照、スクロール補正、描画を担うが、検索の純粋ロジックにテストがない。`src/components/bottom-sheet/BottomSheet.tsx` は汎用コンポーネントでありながらイベント固有の `highlight` クエリを読む。

### E. scriptsとroute editorがテスト境界の外

`scripts/extract-routes.ts` は518行で、グローバル可変状態、SVG解析、検証、transfer生成、シリアライズ、CLI終了・書き込みを一体化する。`tsconfig` は `src` と `vite.config.ts` だけを対象とし、scriptsは `bun run build` の型検査外。

`tools/route-editor.html` は1,263行の単一HTMLで、地図設定、履歴、SVG取込、検証、QR入出力、Route XML生成を含む。単一HTMLと `file://` 動作は既存要件なので、単純な外部JS分割は不可。`places.ts` の地図・フロア情報とエディタ内設定、正式なRoute抽出検証とエディタ内検証には二重管理がある。

## 6. 実装マイルストーン

各項目は1つ以上の小スライスに分ける。番号は順序であり、1スライスにまとめる指示ではない。

### M1: URL状態をcharacterization testで固定し、純粋関数へ集約（完了）

- `URLSearchParams` を受け取り、新しいインスタンスを返す純粋関数で、目的地設定、地点フォーカス、QR解決後の現在地設定を表す。
- 無関係なクエリ保持、`to`保持、`focus`削除、再フォーカスnonceの現行挙動をテストする。
- `MapCanvas` のイベントマーカーから `/events?highlight=:eventId` へ遷移する処理と、その際に既存の `at` / `to` を含む無関係なクエリを保持する現行挙動をcharacterization testで固定する。
- React Routerへの遷移と表示は変えない。

受入: 新規URLテスト（イベントマーカーの `/events?highlight=...` 遷移と既存クエリ保持を含む）、既存QRテスト、build、verify:places、幅402pxで代表ディープリンク。

### M2: 経路の探索結果から表示モデルを作る

- `src/features/routing/routePresentation.ts` 相当の純粋モジュールで、`routeEdges` からroute floor、フロア別walk edge、フロア別transfer nodeを一度だけ導出する。
- `MapCanvas` から生成 `routeGraph` の直接importとグローバルnode indexを外し、表示モデルを受け取る。
- transfer-onlyフロア、キャンパス戻りインジケータ、正逆経路をテストする。
- SVGと生成JSONは変更しない。

受入: routing単体/統合テスト、verify:routes 104/112、verify:places 36、build、STATUSの代表複数階・建物横断URL。

### M3: MapCanvasの純粋計算と再描画境界を分離

順序を守る。

1. viewBox解析、ズーム制限、フロア間比例変換、座標計算を純粋関数へ抽出してテストする。
2. route / marker / labelの再生成依存を、位置x/yと縮尺width/heightで分離する。パン中はoverlay viewBox更新だけで済むことを確認する。
3. マーカー配置モデルを純粋化し、同一place集約、ピン優先、建物集約をテストする。
4. 上記が安定した後だけ、ジェスチャー所有またはSVGロード副作用を専用hook/モジュールへ移すか判断する。

受入: map単体テスト、build、402pxと1440x900、再読込なし幅変更、pan/wheel/pinch、代表ラベル・イベント・ルートURL、console errorなし。

### M4: Repository依存をcomposition rootから注入

- `DataProvider` に `Repository` を注入し、既定実装の選択を `App.tsx` へ寄せる。
- QR着地も同じ注入済みRepositoryを使う。
- Provider単位の取得・成功・失敗・StrictMode相当の重複防止をテストする。
- API実装やreload機能は追加しない。

受入: data/providerテスト、QR landingの現行挙動、build、verify:places、代表 `/q/Q003?to=M21`。

### M5: イベント検索とBottomSheetの依存境界を整理

- 検索条件を純粋関数へ抽出し、ID・タイトル・説明・地点名、タグ併用、大文字小文字、空白をテストする。scroll処理は初回スライスでは動かさない。
- `BottomSheet` から `highlight` のURL知識を外し、app側から展開要求をpropsで渡す。
- pointer終了処理とsnap計算の重複を、characterization testを先に追加してから整理する。

受入: event/bottom-sheetテスト、build、402pxで検索、タグ、highlightスクロール、drag、double click、console errorなし。

### M6: 経路抽出器を純粋coreとCLIへ分離

- 現行SVG群から同じJSONを生成するcharacterization testを先に置く。
- 解析・検証・transfer生成を、入力から `{ graph, errors }` を返す副作用なしのcoreへ移す。
- ファイル走査、`process.exit`、読み書きは薄いCLIへ残す。
- 不正Route fixtureで `docs/MAP_AUTHORING.md` の主要契約を固定する。
- scriptsの型検査を追加する場合、必要なBun型依存とlockfile変更をこのスライスのブリーフで明示し、必要性が確認できた場合だけ行う。

受入: fixtureテスト、生成JSONバイト一致、verify:routes 104/112、bun test、build、git diff --check。

### M7: route editorの二重管理と純粋ロジックを段階整理

順序を守る。

1. エディタ内のmap/floor設定と `places.ts` の一致を検証するコマンドまたはテストを追加する。
2. 履歴、計画JSON schema、CSV、Route XML生成をcharacterization testで固定する。
3. 単一HTMLと `file://` を維持できる生成/inlining方式が検証できた場合だけ、純粋ロジックをソースモジュールへ分離する。
4. エディタ内の簡易検証と正式な抽出器の共通化は、ブラウザ/Bun双方で使える純粋規則だけに限定する。

受入: editor自動テスト、全10 SVG取込、Undo/Redo、計画JSON再読込、CSV/JSON/SVG出力、`file://` とVite配信の両方、verify:routes/places、build。

### M8: 最終統合と限定的な整理

- アルゴリズム単体テストと実生成グラフcoverageテストを、失敗原因が分かる単位へ整理する。
- すべての検証を再現する統合scriptを、既存commandを弱めず追加する。
- 動的参照を含む全参照検索後に限り、明白なdead codeを削除する。
- README、STATUS、HANDOFF、SPECの陳腐化した記述を、実装事実に合わせて更新する。
- リポジトリ全差分を独立レビューし、残存リスクと別タスクを記録する。

受入: 全テスト、全型検査、build、verify:places、verify:routes、git diff --check、STATUSの関連URL、独立最終レビュー。

## 7. 進捗ログ

- [x] 2026-07-22: 全体構造、依存、主要な長大ファイル、テスト境界を読み取り専用で監査。
- [x] 2026-07-22: 変更前ベースラインを確認。
- [x] 2026-07-22: リポジトリ固有Codex設定サンプル、ExecPlan規約、この初期計画を作成。
- [x] 2026-07-22: 準備差分に対してTOML解析、39 tests、verify:routes 104/112、verify:places 36、build、git diff --checkがPASS。
- [x] 2026-07-22: `MapCanvas` のイベントマーカーから `/events?highlight=...` へ遷移する処理と既存クエリ保持をM1のcharacterization test対象へ追記し、準備差分の最終独立レビューで指摘なし。
- [x] 2026-07-22: `docs/tasks/13b-navigation-search-refactor.md` を作成し、目的地、地点focus、QR解決後の現在地、イベントhighlight、再フォーカスnonceを `src/app/navigationSearch.ts` の純粋関数へ集約。
- [x] 2026-07-22: URL characterization testを6件追加。45 tests / 394 assertions、verify:routes 104/112、verify:places 36、build、git diff --checkがPASS。
- [x] 2026-07-22: 幅402pxでMapCanvasのP20マーカーから既存 `at` / `to` / `source` を保持したhighlight遷移、目的地設定、`/p`・`/q`着地、console errorなしを確認。
- [x] 2026-07-22: M1独立レビューのP2（既存highlight置換とクエリ順維持のテスト不足）を修正し、再レビューで指摘なし。
- [ ] 次: M2用の小スライスを作成し、経路表示モデルのcharacterization testから開始する。

## 8. 判断と発見

- `MapCanvas` は最優先の集中点だが、最初に巨大分割しない。経路表示モデルと純粋計算を先に抽出する。
- route editorは単一HTML・`file://` が契約のため、外部JSへ直接分割しない。
- CSS 793行は長いが、現時点で単純分割の価値が責務変更より低い。関連コンポーネントの境界が安定してから判断する。
- `TagIcon` の別ファイル化、全ID型の一括変更、依存パッケージの分類移動は初期計画から除外した。
- 設計問題ではない仕様差・subpath互換性・本番公開課題は、リファクタリングと混ぜない。
- アクティブな `.codex/config.toml` は実行権限を永続変更するため自動追加せず、レビュー用の `.codex/config.toml.example` だけを置いた。
- 設定サンプルの `gpt-5.6` は、2026-07-22取得の現行Codexマニュアルと公式sample configの推奨例に合わせた。ローカルCLIの版番号だけからモデルカタログを推測しない。
- 既存コードの見直しでは、現行10枚以外のSVGへ同種機能を適用する可能性を設計観点として持つ。ただし要件は未確定なので、将来機能や汎用化層を先行実装しない。各スライスでは現行SVGファイル名への不要な結合を増やさず、複数の実例から共通境界が立証された場合だけ抽象化する。

## 9. 次スレッドへの開始指示

1. `AGENTS.md`、`docs/STATUS.md`、`docs/HANDOFF.md`、`docs/SPEC.md`、`docs/WORKFLOW.md`、`.agent/PLANS.md`、このファイルを読む。
2. `git status --short` と基準コマンドを実行する。
3. M2の `routeEdges` 利用箇所と生成 `routeGraph` への依存を現行コードで再確認し、表示モデル用の小さな `docs/tasks/13c-*.md` を作る。
4. transfer-onlyフロア、キャンパス戻りインジケータ、正逆経路のcharacterization testを先に追加する。
5. M2を実装・検証・文書更新し、`fork_turns="none"` の読み取り専用レビューを完了する。

開始プロンプトは次でよい。

```text
`.agent/PLANS.md` に従い、`.agent/refactor-plan.md` のM2「経路の探索結果から表示モデルを作る」を小さなスライスとして開始してください。現行挙動を維持し、ブリーフ作成、実装、検証、STATUS/ExecPlan更新、独立レビューまで進めてください。gitの変更操作は行わないでください。
```
