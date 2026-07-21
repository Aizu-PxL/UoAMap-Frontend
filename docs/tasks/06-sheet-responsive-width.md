# 06: ボトムシートのレスポンシブ幅

## GOAL

ボトムシート・タブバーの354px固定幅を廃し、画面幅に追従(幅100%、max-width 430px・中央寄せ)させる。375px端末で右に出ている隙間をなくす。

## 参照

- [SPEC.md](../SPEC.md) §1(320〜430px追従)・§2(シート幅の項)
- `src/styles/global.css`(`.bottom-sheet` / `.sheet-nav` 等の354px指定)

## やること

1. `.bottom-sheet`・`.sheet-nav` 等の固定幅指定を幅100% + max-width 430px + 中央寄せへ変更する
2. シート内パネル(検索・詳細・QR・スケジュール)が可変幅で崩れないことを確認する

## SCOPE

- `src/styles/global.css`
- `src/components/bottom-sheet/`(幅指定がコンポーネント側にある場合のみ)
- 本ブリーフ(受入結果の記入)

## 受入基準

- [x] `bun run build` が通る
- [ ] 幅320px / 375px / 430pxでシート右端の隙間がない(スクショ)
- [ ] 幅430px超ではシートが430pxで中央寄せされる(スクショ)
- [ ] 検索パネル・イベント詳細・QR・スケジュールのレイアウトが崩れない(スクショ)
- [ ] コンソールエラーがない

## 受入結果(2026-07-20)

| 基準 | 結果 | 根拠 |
|---|---|---|
| `bun run build` が通る | PASS | `tsc -b && vite build` が終了コード0。`62 modules transformed`、`built in 451ms`。 |
| 幅320px / 375px / 430pxでシート右端の隙間がない | FAIL(リード確認待ち) | `.bottom-sheet` を `width: 100%`、`.sheet-nav` も `width: 100%` に変更済み。指定どおりスクリーンショット確認はリードが実施するため、現時点では未確認。 |
| 幅430px超ではシートが430pxで中央寄せされる | FAIL(リード確認待ち) | `.bottom-sheet` / `.sheet-nav` に `max-width: 430px` を指定し、シートは `left: 50%` と `translateX(-50%)`、タブバーは左右 `auto` margin で中央寄せ済み。スクリーンショットは未確認。 |
| 検索・イベント詳細・QR・スケジュールのレイアウトが崩れない | FAIL(リード確認待ち) | シート本文に `min-width: 0` を追加。既存の各パネルは可変幅指定(`width: 100%`、`min()`、横スクロール等)を維持しているが、指定されたスクリーンショット確認は未実施。 |
| コンソールエラーがない | FAIL(環境制限で未確認) | ローカルサーバー起動時に `listen EPERM: operation not permitted 127.0.0.1:5173` となり、ブラウザコンソールを確認できなかった。ビルドはPASS。 |

## DELIVERABLE

変更ファイル一覧、受入基準ごとのPASS/FAIL。
