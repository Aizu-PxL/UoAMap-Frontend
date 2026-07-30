# 16 Figma UX Demo

## GOAL

現行React実装の主要画面・URL状態・例外状態を、正式なFigma `📱 Screens` と `🧩 Components` を変更せず、新規ページ `🧪 UX Demo` に再現する。現行挙動の矛盾は修正せず注記し、Figma Prototype/Presentで画面遷移を検討できる材料とする。

## 参照

- `docs/SPEC.md` §2、§3、§4
- `docs/STATUS.md`
- `docs/WORKFLOW.md`
- `docs/FIGMA.md`
- `src/app/AppLayout.tsx`
- `src/app/landings.tsx`
- `src/app/navigationSearch.ts`
- `src/components/bottom-sheet/BottomSheet.tsx`
- `src/features/map/MapPanel.tsx`
- `src/features/events/SearchPanel.tsx`
- `src/features/events/EventDetail.tsx`
- `src/features/qr/QrPanel.tsx`
- `src/features/schedule/SchedulePanel.tsx`

## やること

1. 幅402px・高さ874pxで現行アプリの主要URL、操作、表示状態、遷移先を棚卸しする。
2. 既存Figma 5画面との対応を「既存と一致／Figma未収録／挙動不一致」に分類する。
3. Figmaに `🧪 UX Demo` ページを作成し、既存コンポーネント、Tokens、Noto Sans JPを再利用して主要フローと例外状態を配置する。
4. 各状態に画面ID、URL、開始条件、想定遷移先、現行実装上の注記を付ける。
5. `Flow Notes` に現行遷移、`at`／`to`／`focus` の保持契約、Figmaだけでは再現できないURL状態を記録する。Prototype reactionの初回接続はユーザーが行う。
6. 一時キャプチャを使って画像を含むScheduleを照合し、参照後は一時キャプチャを削除する。

## SCOPE

- Figma「UoAmap」の新規ページ `🧪 UX Demo`
- `docs/FIGMA.md`
- `docs/STATUS.md`
- `docs/tasks/16-figma-ux-demo.md`（このファイル）

React、データ、SVG、既存Figma `📱 Screens`／`🧩 Components` は変更しない。

## 受入基準

- [x] `📱 Screens` の既存5画面と `🧩 Components` の既存ノードを変更していない。
- [x] `🧪 UX Demo` の画面フレームがすべて402×874pxである。
- [x] コアフロー、BottomSheet 22／58／82svh、地図状態、QR例外、検索・詳細の読込／空／失敗／不存在状態を収録している。
- [x] 各状態に画面ID、URL、開始条件、想定遷移先がある。
- [x] 「マップに戻る」が現行実装では検索へ戻るなど、表示文言と遷移先の矛盾を修正せず注記している。
- [x] 既存コンポーネント、Tokens、Noto Sans JPを再利用し、仮テキストや不要な重複コンポーネントがない。
- [x] Schedule画像を実アプリの一時キャプチャと照合し、一時キャプチャを削除している。
- [x] Flow Notesに現行遷移とURL状態保持契約が記録されている。
- [x] `bun run build` と `bun run verify:places` がPASSする。
- [x] 主要URLを402×874pxで確認し、console errorが0件である。
- [x] 会話履歴なしの読み取り専用レビューで指摘0件、または指摘を解消している。
- [x] `git diff --check` がPASSする。

## DELIVERABLE

### Figma

- `🧪 UX Demo`: page `192:338`、資料board `192:339`（Prototype対象外）
- Prototype Sections: Core `216:1361`、Map & Sheet `216:1362`、QR `216:1363`、Search & Detail `216:1364`
- Core Flow `192:342`: 9状態
- Map & Sheet States `192:343`: 5状態
- QR States `192:344`: 8状態
- Search & Detail States `192:345`: 8状態
- Flow Notes `192:346`: 現行遷移、URL契約、既存Figmaとの差分分類
- 正式 `📱 Screens`: 5トップレベルノード、正式 `🧩 Components`: 21トップレベルノードを作業前後で維持
- 全30 screen frame: 402×874px。仮文言、欠損フォント、画面外オーバーフローなし
- 全30 screen frameはPrototype Sectionsの直下に配置。再生前にC01をFlow starting pointへ手動指定する
- Schedule: 一時キャプチャと既存 `Schedule PDF` の画像hash `4dbf525cc2f271aac1e6ba7bba1e1b951c98c02d` が一致。参照キャプチャは削除済み

### 差分分類

- 既存と一致: Map／QR／Event Search／Schedule／Detailの基本構成
- Figma未収録だった状態: 現在地・目的地・経路、22／58／82svh、focus、読込・空・失敗・不存在、QR着地とカメラ例外
- 挙動不一致として注記: 詳細の「マップに戻る」→実際は`/events`、SPEC §5.2の外部`/e`→`to`契約と現行詳細表示の差、正式Mapの固定例と実装の3段階シート

### 検証

- `bun run build`: PASS
- `bun run verify:places`: PASS（109 Place / 74 QR / 60 Event）
- `git diff --check`: PASS
- Browser 402×874: `/`、`/events`、`/e/P1`、`/?to=P1`、`/q/Q001?to=P1`、`/?at=main_node_11&to=P1`、`/schedule`、`/e/unknown`、`/p/unknown`を確認。console error 0件
- 操作確認: 詳細の戻る→`/events?at=main_node_11&to=P1`、Scheduleタブ→`/schedule?at=main_node_11&to=P1`

### 独立レビュー

- 初回レビュー: QR着地、`/e`仕様差、検索・詳細の置換状態、参照パス、完了証跡の5件を指摘。Figmaと文書を修正済み
- 最終再レビュー: C04／S06／S07を現行AppLayoutシェルへ載せ替えた後、指摘なし
