# 02g: イベント開催地マーカー

## GOAL

地図上のイベント開催地にマーカーを表示し、タップすると検索タブが開いて該当イベントカードが強調表示される機能を実装する(SPEC.md §3.1「イベント開催地マーカー」・§3.4「強調表示」。仕様は追記済み)。

## 参照

- 仕様: [docs/SPEC.md](../SPEC.md) §3.1 / §3.4(`/events?highlight=:eventId`)
- [docs/STATUS.md](../STATUS.md) アーキテクチャ要点(マーカーレイヤーはReact非管理のオーバーレイSVG、スクリーンスペース固定の逆スケール補正あり)
- データ: イベントは `useCampusData()`(src/data/DataProvider.tsx)から全件取得できる。Event.placeId → `getPlace`(src/data/places.ts)→ 位置解決は `src/features/map/placeLocator.ts`
- デザイン: マーカー形状はFigma「UoAmap」MapCanvas内の `Marker/Event`(旧Marker/Arrow)。緑系の小さな旗/矢印マーク。厳密再現でなくてよいが、現在地/目的地/注目ピンと見分けがつくこと

## やること

1. **地図側**(src/features/map/):
   - 全イベントの placeId を位置解決し、**表示中フロアに属する開催地**にイベントマーカーを描画(既存マーカーレイヤーの仕組みに追加。スクリーンスペース固定)
   - 同一placeIdに複数イベントがある場合はマーカー1つに集約
   - 現在地・目的地・注目ピンと同一地点の場合はピンを前面に(描画順で制御)
   - マーカータップで `/events?highlight=:eventId` へ遷移(集約地点は先頭イベントのIDを代表にする)。**既存の at/to クエリは保持**。React非管理DOM上のリスナーなのでクリーンアップを忘れない
2. **検索タブ側**(src/features/events/SearchPanel.tsx / EventCard.tsx):
   - `highlight` クエリがあるとき、該当イベントカードを視覚的に強調(アクセント色 `--color-accent` の枠線等)し、`scrollIntoView` でリスト内の位置まで自動スクロール
   - highlight対象が現在のフィルタで隠れる場合でも、初期表示時点(フィルタ未操作)では必ず見えること
   - 強調はhighlightクエリが変わる/消えるまで維持。検索・タグ操作は通常通り

## SCOPE(変更してよいファイル)

- `src/features/map/`(MapCanvas.tsx、新規ファイル追加可)
- `src/features/events/SearchPanel.tsx`, `src/features/events/EventCard.tsx`
- `src/app/AppLayout.tsx`(イベントデータをMapCanvasへ渡す配線が必要な場合)
- `src/styles/global.css`

public/maps/ と src/data/ は読み取り専用。git操作禁止(WORKFLOW.md)。

## 受入基準(自分で実行して結果を報告)

- [ ] `bun run build` が通る
- [ ] `bun run verify:places` が36件PASS
- [ ] `/` でキャンパス全体図にイベント開催地マーカーが表示される(講堂=A1等)
- [ ] 研究棟1Fに切り替えると、そのフロアの開催地(104F等)にマーカーが出て、他フロアのものは出ない
- [ ] マーカータップで `/events?highlight=<eventId>` に遷移し、検索タブで該当カードが強調+スクロール表示される
- [ ] `/?at=sh-cafeteria` の状態でマーカーをタップしても `at` が保持される
- [ ] コンソールエラーなし

## DELIVERABLE

変更ファイル一覧 + 受入基準ごとのPASS/FAIL + 設計判断の要約(マーカー集約・タップ遷移のクエリ処理・強調スタイル)。
