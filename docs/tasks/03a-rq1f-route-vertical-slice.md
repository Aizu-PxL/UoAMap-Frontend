# 03a: 研究棟1Fルートの縦切り

## GOAL

研究棟1Fの5地点を同一の経路グラフへ接続し、現在地と目的地がともに研究棟1Fの場合に、SVG由来の最短経路を地図上へ表示する。経路作図・抽出・探索・描画を一巡させ、ステップ3の技術基盤を確立する。

## 参照

- [SPEC.md](../SPEC.md) §3.3 / §4 / §5.3
- [MAP_AUTHORING.md](../MAP_AUTHORING.md)
- [STATUS.md](../STATUS.md)「アーキテクチャ要点」
- `public/maps/RQ1F_base_plain.svg`
- `src/features/map/MapCanvas.tsx`

## やること

1. RQ1FへRouteグループを追加し、104F・141E・144F・127・161の地点アンカーと主要廊下・階段を接続する
2. SVGから型付き経路グラフJSONを生成・検証するスクリプトを追加する
3. Dijkstra法による最短経路探索を純粋関数として実装する
4. 現在地・目的地から経路を導出し、表示中フロアの区間を専用SVGオーバーレイへ描画する
5. 他フロア・未収録地点ではクラッシュせず、従来どおり地図とマーカーを表示する

## SCOPE

- `docs/SPEC.md`, `docs/MAP_AUTHORING.md`, `docs/STATUS.md`, `docs/BACKLOG.md`, 本ブリーフ
- `public/maps/RQ1F_base_plain.svg`（今回のみRouteグループ追加を許可。既存要素は変更禁止）
- `scripts/extract-routes.ts`, `package.json`
- `src/data/types.ts`
- `src/features/routing/`
- `src/features/map/MapCanvas.tsx`, `src/app/AppLayout.tsx`, `src/styles/global.css`

## 受入基準

- [ ] `bun test src/features/routing` が通る
- [ ] `bun run verify:routes` が通る
- [ ] `bun run build` が通る
- [ ] `bun run verify:places` が36件PASS
- [ ] 幅402pxの `/?at=rq1-161&to=P1` で161→104Fのルート線が表示される
- [ ] 幅402pxの `/?at=rq1-127&to=P3` で127→144Fのルート線が表示される
- [ ] パン・ズームで線幅が変わらず、マーカーがルート線より前面に表示される
- [ ] キャンパス表示ではルート線が消え、研究棟1Fへ戻ると再表示される
- [ ] コンソールエラーがない

## DELIVERABLE

変更ファイル一覧、受入基準ごとのPASS/FAIL、Route作図・抽出形式・探索と描画の設計判断を報告する。
