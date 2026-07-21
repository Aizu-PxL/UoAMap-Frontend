# 08: 講義棟SVGのフロア別分割

## GOAL

1枚に併記された講義棟1F/2Fを1フロア1SVGへ分割し、表示・Route抽出・編集ツールから複数フロアSVG専用処理を撤去する。Place、URL、経路グラフ、フロア切替体験は維持し、講義棟も他の複数階建物と同じ汎用処理で扱える状態にする。

## 参照

- [SPEC.md](../SPEC.md) §3.1 / §4 / §5.3
- [MAP_AUTHORING.md](../MAP_AUTHORING.md)
- [STATUS.md](../STATUS.md)「アーキテクチャ要点」
- `src/features/map/MapCanvas.tsx`
- `scripts/extract-routes.ts`

## やること

1. `LH_base_plain.svg`を座標・ID・形状を変えずに1F/2Fへ分割し、各階の外形をviewBoxにする
2. `mapSheets`を講義棟1F/2Fの2シートへ変更する
3. MapCanvasの講義棟専用表示切替・DOM計測を削除し、汎用のシート切替へ統一する
4. Route抽出・作図契約・ルート編集ツールを1 SVG = 1 Floorへ単純化する
5. 既存Place、階段transfer、入口transfer、生成Routeグラフを維持する
6. 既存の未コミット差分であるEventDetail、ラベル、マーカーの挙動は保持する

## SCOPE

- 本ブリーフ
- `docs/SPEC.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/MAP_AUTHORING.md`
- `docs/ROUTE_EDITING_GUIDE.md`
- `public/maps/LH_base_plain.svg`
- `public/maps/LH1F_base_plain.svg`
- `public/maps/LH2F_base_plain.svg`
- `src/data/places.ts`
- `src/features/map/MapCanvas.tsx`
- `scripts/extract-routes.ts`
- `tools/route-editor.html`
- `src/features/routing/generated/routeGraph.json`

## 受入基準

- [x] 講義棟1F/2Fが別SVG・別MapSheetで表示され、旧結合SVGが参照されない
- [x] MapCanvasに講義棟専用の表示切替・外形計測処理が残らない
- [x] RouteのfloorIdは各SVGのRouteグループから解決され、子ノード/エッジに`data-floor-id`が残らない
- [x] 講義棟9地点、東側階段、キャンパス入口を含む既存経路が維持される
- [x] EventDetail、ラベル、マーカーの未コミット挙動が維持される
- [x] `bun test`が通る
- [x] `bun run verify:routes`が104ノード/112エッジで通る
- [x] `bun run verify:places`が36件PASS
- [x] `bun run build`が通る
- [x] 幅402pxと1440×900の関連ブラウザ確認でコンソールエラーがない
- [x] ルート編集ツールが講義棟1F/2Fを別々に読込・出力できる
- [x] `git diff --check`が通る

ブラウザ確認では、講義棟1F/2Fの別SVG切替、2Fの横断ルート6区間と階段マーカー、両フロアのルートインジケータを確認した。イベント詳細は表示だけではURLを変更せず、「ここへ行く」でのみ`to`を設定する。ルート編集ツールは10マップを読み込み、講義棟1Fを8ノード/8エッジ、2Fを8ノード/7エッジとして個別に検証した。

## DELIVERABLE

変更ファイル一覧、受入結果、SVG分割範囲、削除した複数フロア専用処理、保持した既存差分を報告する。
