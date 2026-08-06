# 24 — ブラウザのプル更新抑止

## GOAL

スマートフォンブラウザでアプリ全体を下方向へ引っ張ったときに、ブラウザのプルして更新が発生しないようにする。イベント一覧・QR・詳細・スケジュールなど、アプリ内のスクロールは維持する。

## 参照

- `docs/SPEC.md` §3.2、§3.6、§5.3
- `src/styles/global.css`
- 既存の地図パン、BottomSheetドラッグ、内部スクロール領域

## やること

- `html`、`body`、`#root` の縦方向overscrollを抑止する。
- ページ自体をスクロールさせず、既存の内部スクロール領域へスクロールを閉じ込める。
- タッチイベントを全体で無条件にキャンセルせず、地図パン・BottomSheetドラッグ・スケジュール画像の操作を維持する。

## SCOPE

- `src/styles/global.css`
- `docs/tasks/24-pull-to-refresh-guard.md`
- `docs/STATUS.md`

## 受入基準

- `bun run build` がPASSする。
- `bun run verify:places` が123 Place / 88 QR / 61 EventでPASSする。
- `bun run verify:all` がPASSする。
- 幅402pxでアプリのページ領域がルートスクロールせず、イベント一覧・QR・詳細・スケジュールの内部スクロールが維持される。
- 地図パン、ピンチズーム、BottomSheetドラッグが維持される。
- 実機または対象ブラウザで下方向へ引っ張ってもブラウザ更新が発生しないことを確認する。

## DELIVERABLE

- ルートと内部スクロール領域のoverscroll制御をCSSへ追加する。
- 自動検証結果と実機確認の未実施範囲を`docs/STATUS.md`へ記録する。

実装結果:

- `src/styles/global.css`へルート固定と内部スクロール領域のoverscroll制御を追加。
- `bun run verify:all` PASS（125 tests / 1,015 assertions、production build、123 Place / 88 QR / 61 Event、348 nodes / 445 edges、git diff check）。
- ローカルブラウザの402×874pxでページ本体のスクロール抑止、イベント一覧の内部スクロール、QR／スケジュールの内部overscroll、console error 0件を確認。
- 実機ブラウザのプル操作確認は未実施。Safari系で必要な場合は限定的なタッチイベントフォールバックを別スライスで追加する。
