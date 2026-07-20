# 03d: 全建物展開前のルート基盤強化

## GOAL

残りの建物へRouteグラフを展開する前に、1枚のSVGに複数フロアを持つ講義棟を安全に抽出できる作図契約を追加し、Placeノードの全体一意性とtransferだけを通るフロアの表示を保証する。既存03a〜03cのRoute資産・探索結果は維持する。

## 参照

- [SPEC.md](../SPEC.md) §3.3 / §4 / §5.3
- [MAP_AUTHORING.md](../MAP_AUTHORING.md)
- [03c](03c-rq-auditorium-outdoor-route.md)
- `scripts/extract-routes.ts`
- `src/features/map/MapCanvas.tsx`

## やること

1. `MAP_AUTHORING.md`へ「1 SVG・複数フロア」のRoute契約を追加する
2. 抽出スクリプトを、単一フロアSVGの後方互換性を保ったまま複数フロアSVGへ対応させる
3. `data-place-id`がRouteグラフ全体で一意であることを検証する
4. transferエッジの端点だけがあるフロアでも、ルートレイヤーとフロアインジケータを正しく公開する
5. 既存グラフ・探索テスト・ビルドを回帰検証する

## SCOPE

- 本ブリーフ
- `docs/MAP_AUTHORING.md`
- `scripts/extract-routes.ts`
- `src/features/map/MapCanvas.tsx`
- `src/features/routing/findShortestRoute.test.ts`

## 受入基準

- [x] 単一フロアSVGの既存Routeグラフが差分なく抽出できる
- [x] 複数フロアSVGではRoute直下の全ノード・全エッジに有効な`data-floor-id`が必須になる
- [x] 同じPlaceを複数Routeノードへ付けると検証エラーになる
- [x] transferだけを通るフロアもルートレイヤーが`aria-hidden`にならない
- [x] `bun test`が通る
- [x] `bun run verify:routes`が58ノード/65エッジで通る
- [x] `bun run verify:places`が36件PASS
- [x] `bun run build`が通る
- [x] `git diff --check`が通る

## DELIVERABLE

変更ファイル一覧、受入基準ごとのPASS/FAIL、複数フロア契約とPlace一意性検証の設計判断を報告する。
