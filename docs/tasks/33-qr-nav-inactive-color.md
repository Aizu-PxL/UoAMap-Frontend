# 33 QRナビゲーション未選択色の調整

## GOAL

BottomSheet上部のQRアイコンが未選択のとき、灰色ではなく薄い緑で表示されるようにする。選択中のアクセント色と、検索・スケジュールのアイコン色は維持する。

## 参照

- `docs/SPEC.md` §2、§5.4
- `docs/WORKFLOW.md`
- `src/components/bottom-sheet/SheetNavigation.tsx`
- `src/styles/global.css`

## やること

- QRアイコン未選択時専用の薄いアクセント色を追加する。
- QRタブの未選択状態だけへ適用し、選択中は既存のアクセント色を維持する。

## SCOPE

- `docs/tasks/33-qr-nav-inactive-color.md`
- `docs/STATUS.md`
- `src/styles/global.css`

React、ルーティング、データ、SVG地図、API契約、Figmaは変更しない。

## 受入基準

- `bun test` がPASSする。
- `bun run build` がPASSする。
- `bun run verify:places` が124 Place / 89 QR / 61 EventでPASSする。
- `git diff --check` がPASSする。
- 幅402pxでQR未選択時が薄い緑、選択中が既存アクセント色であり、console errorが0件である。
- 会話履歴なしの読み取り専用レビューで指摘なし、または指摘を修正・再検証・再レビューで解消する。

## DELIVERABLE

変更ファイル、検証結果、ブラウザ確認結果、独立レビュー結果を`docs/STATUS.md`へ追記する。git操作は行わない。

## 実施結果

- `--color-accent-muted: rgba(0, 139, 140, 0.3)`を追加し、未選択のQRタブだけへ適用した。
- `bun run verify:all`: PASS（139 tests / 1,058 assertions、production build、124 Place / 89 QR / 61 Event、350 nodes / 447 edges、git diff check）。
- Browser 402×874: `/events`でQRの計算色`rgba(0, 139, 140, 0.3)`・未選択、`/qr`で`rgb(0, 139, 140)`・`aria-current="page"`を確認。console error 0件（localhostカメラの既存HTTPS warningのみ）。
- 会話履歴なしの読み取り専用独立レビュー: 指摘なし。
