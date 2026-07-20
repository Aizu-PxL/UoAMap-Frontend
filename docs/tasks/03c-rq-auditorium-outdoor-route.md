# 03c: 研究棟〜講堂のキャンパス横断ルート

## GOAL

研究棟1F〜3Fの既存経路グラフを、研究棟西側出入口からキャンパス屋外歩行者路へ接続し、研究棟内の16地点と講堂の間でシートをまたぐ最短経路を表示する。建物内・階段・出入口・屋外の各区間を1本の経路として探索し、表示中フロアの区間と乗換地点を既存UIで追える状態にする。

## 参照

- [SPEC.md](../SPEC.md) §3.3 / §4 / §5.3
- [MAP_AUTHORING.md](../MAP_AUTHORING.md)「建物出入口接続」
- [03b](03b-rq-floor-stairs.md)（前提スライス）
- `public/maps/RQ1F_base_plain.svg`
- `public/maps/CampusMap_base_plain.svg`

## やること

1. `MAP_AUTHORING.md`に`data-entrance-id`の作図・検証・transfer生成規約を追加する
2. RQ1Fの`mark_w1_entrance1`に対応する西側出入口を既存Routeグラフへ接続する
3. CampusMapにRouteグループを追加し、研究棟西側出入口から講堂北東側出入口まで歩行者路上の経路を作図する
4. 抽出スクリプトで入口ペアを検証し、距離0のシート間transferエッジを生成する
5. 経路にcampus区間が含まれる場合、「キャンパス全体へ戻る」ボタンへルートインジケータとaria-labelを付ける
6. 実グラフの研究棟3F〜講堂経路を単体テストし、生成グラフ・既存ルートの回帰を検証する

## SCOPE

- `docs/MAP_AUTHORING.md`, `docs/STATUS.md`, `docs/BACKLOG.md`, 本ブリーフ
- `public/maps/RQ1F_base_plain.svg`, `public/maps/CampusMap_base_plain.svg`（Routeグループのみ）
- `scripts/extract-routes.ts`
- `src/features/routing/generated/routeGraph.json`, `src/features/routing/findShortestRoute.test.ts`
- `src/features/map/MapCanvas.tsx`, `src/styles/global.css`

## 受入基準

- [x] `bun test`が通る（実グラフのrq3-325f ↔ auditorium経路テストを含む）
- [x] `bun run verify:routes`が通る（entrance-id検証が有効な状態で）
- [x] `bun run build`が通る
- [x] `bun run verify:places`が36件PASS
- [x] 幅402pxの`/?at=rq3-325f&to=A1`で初期表示のキャンパス図に研究棟出入口〜講堂の屋外ルート線と出入口マーカーが出る
- [x] 同URLで研究棟を開くと1F/2F/3Fとキャンパス戻りボタンにルートインジケータが出る
- [x] 幅402pxの`/?at=auditorium&to=P12`で研究棟3Fから逆方向にも同じ経路が成立する
- [x] 既存の研究棟内・階段ルートに回帰がなく、コンソールエラーがない
- [x] `git diff --check`が通る

ブラウザ受入4項目は2026-07-21に幅402pxのローカルdev serverで確認済み。

## 判断メモ

- 研究棟3F〜講堂の最短経路は、中西階段を3F→2F→1Fと連続利用する。2Fでは同じ階段の隣接階transferが連続するため、人工的なwalkエッジは追加しない
- 2Fは2本の階段transferの端点として経路対象に含まれ、既存仕様どおりフロアボタンのルートインジケータと乗換マーカーを表示する
- この扱いにより、既存の階段transfer ID・固定コスト・Dijkstra実装を維持したまま、実グラフ上の最短経路を選択する

## DELIVERABLE

変更ファイル一覧、受入基準ごとのPASS/FAIL、採用した出入口・屋外経路・入口transferの設計判断を報告する。
