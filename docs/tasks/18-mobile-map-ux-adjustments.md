# 18 モバイル地図UX一括調整

## GOAL

地図操作、BottomSheet、QRカメラ、Schedule、イベントマーカー、「ここへ行く」導線を1つの変更セットとして調整し、幅402pxとiPhone SE相当で主要操作が隠れず、目的地設定からQR・経路表示まで一貫して動作するようにする。

## 参照

- `docs/SPEC.md` §2、§3.1〜3.6、§5.2〜5.3
- `docs/STATUS.md`
- `docs/WORKFLOW.md`
- `docs/tasks/17-open-campus-2026-data.md`
- `public/schedule/ocschedule2026.png`

## やること

- [x] 地図のpan範囲と最大拡大率を制限し、地図タップでBottomSheetを下げる。
- [x] BottomSheetの外部スナップ要求、QR全展開、iPhone SE最小表示、追従コントロール、メニューのタップ領域を整える。
- [x] カメラをページ／映像領域の非表示時に停止し、Schedule画像を拡大ダイアログで表示する。
- [x] イベントマーカーをID別に色分けし、ラベル上方へ配置して詳細へ直接遷移させる。
- [x] 「ここへ行く」の現在地あり／なしとQR解決後の経路・注目・シート状態を接続する。
- [x] フロア／キャンパス切替ボタンのルート通知ドットを廃止する。
- [x] 全体検証、402px／iPhone SE相当ブラウザ確認、最終差分の独立レビューを1回行う。

## SCOPE

- `docs/SPEC.md`, `docs/STATUS.md`, `docs/tasks/18-mobile-map-ux-adjustments.md`
- `src/app/`
- `src/components/bottom-sheet/`
- `src/features/map/`, `src/features/events/`, `src/features/qr/`, `src/features/schedule/`
- `src/styles/global.css`

上記以外、Figma、依存、SVG、Routeグラフ、Repository/API契約は変更しない。

## 受入基準

- [x] `bun run verify:all` がPASSし、109 Place / 74 QR / 60 Event、336 nodes / 425 edgesを維持する。
- [x] 幅402pxで地図、シート、QR、Schedule、イベント詳細、目的地設定、経路表示、マーカー色・ラベルを確認し、console errorが0件である。
- [x] 320×568と375×667で22svh時もメニューと地図表示切替が利用できる。
- [x] カメラはページまたは映像領域の非表示時に停止し、再表示時に再開する。
- [x] 会話履歴なしの読み取り専用レビューで指摘なし、または初回指摘を1回の修正・再検証・再レビューで解消する。

## DELIVERABLE

完了項目、分離項目、変更ファイル、検証・ブラウザ・独立レビュー結果、残存リスクを簡潔に報告する。git履歴を変更しない。
