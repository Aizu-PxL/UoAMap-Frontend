# 13b — URL状態更新のcharacterization testと集約

## GOAL

URLを状態の正とする現行仕様を変えず、分散している `at` / `to` / `focus` / `highlight` の更新規則をcharacterization testで固定し、`URLSearchParams` を複製して返す純粋関数へ集約する。`MapCanvas` のイベントマーカー遷移と既存クエリ保持、および地図の再フォーカスnonceも退行検知対象にする。

## 参照

- `docs/SPEC.md` §3.4、§5.2
- `.agent/PLANS.md`
- `.agent/refactor-plan.md` M1
- `docs/STATUS.md`「URLが状態の正」「マーカー」
- `src/app/landings.tsx`
- `src/features/events/EventDetail.tsx`
- `src/features/map/MapCanvas.tsx`
- `src/features/map/MapPanel.tsx`
- `src/features/qr/qrValue.ts`

## やること

- 既存の検索パラメータを変更せず、新しい `URLSearchParams` を返すURL状態更新関数を `src/app/` に追加する。
- 目的地設定、地点フォーカス、QR解決後の現在地設定、イベントhighlight設定について、既存クエリの保持・置換・削除規則をcharacterization testで固定する。
- `MapCanvas` のイベントマーカーが `/events?highlight=:eventId` へ遷移し、既存の `at` / `to` と無関係なクエリを保持することを純粋関数と幅402pxのブラウザ確認で固定する。
- 「現在地へ」「目的地へ」を同じURL状態から繰り返し押しても再フォーカス要求が増分されるnonce規則を純粋関数へ移し、テストする。
- 現在の各呼び出し元を集約した関数へ置き換える。React Routerのpathname、replace/state指定、表示、クエリ順序を意図的に変更しない。

## SCOPE

- `src/app/navigationSearch.ts`
- `src/app/navigationSearch.test.ts`
- `src/app/landings.tsx`
- `src/features/events/EventDetail.tsx`
- `src/features/map/MapCanvas.tsx`
- `src/features/map/MapPanel.tsx`
- `src/features/qr/qrValue.ts`
- `src/features/qr/qrValue.test.ts`
- `.agent/refactor-plan.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/tasks/13b-navigation-search-refactor.md`

SVG、生成Route JSON、見た目、文言、Repository/API契約、依存関係は変更しない。

## 受入基準

- 新規テストが、入力 `URLSearchParams` の非破壊、無関係なクエリ保持、`to`保持、`focus`削除、値の置換を固定する。
- `MapCanvas` 用のhighlight更新で `at` / `to` / 無関係なクエリが保持され、既存highlightだけが置換される。
- 再フォーカスnonceが数値なら1増え、未設定または非数値なら1になる。
- URL状態の各書き込み元が共通純粋関数を使用し、React Routerの遷移先・replace/state指定を維持する。
- `bun test`、`bun run verify:routes`、`bun run verify:places`、`bun run build`、`git diff --check` がPASSする。
- 幅402pxでイベントマーカーから `/events?highlight=...` へ遷移して既存 `at` / `to` / 無関係なクエリを保持し、代表の目的地設定・地点着地・QR着地が従来どおり動作し、コンソールエラーがない。
- 会話履歴を引き継がない読み取り専用レビューで指摘がない。

## DELIVERABLE

- URL状態更新の純粋関数とcharacterization test
- 分散していたURL書き込み元の集約
- 検証結果（2026-07-22）
  - `bun test`: PASS（45 tests / 394 assertions）
  - `bun run verify:routes`: PASS（104 nodes / 112 edges）
  - `bun run verify:places`: PASS（36件）
  - `bun run build`: PASS
  - `git diff --check`: PASS
  - 幅402pxブラウザ: PASS
    - MapCanvasのP20イベントマーカーをキーボードで作動し、`/events?at=rq1-161&to=P21&source=m1&highlight=P20` へ遷移
    - P20カードが `is-highlighted`、既存 `at` / `to` / `source` を保持
    - イベント目的地設定で `focus` を削除し、`at` / `source` を保持
    - `/p/lictia-chamber` と `/q/Q003?to=M21` の正規化、コンソールエラー0件
- 独立レビュー:
  - 初回P2: 既存 `highlight` の置換とクエリ順維持のcharacterization test不足
  - 修正後再レビュー: 指摘なし
