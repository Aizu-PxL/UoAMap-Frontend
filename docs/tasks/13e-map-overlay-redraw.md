# 13e — MapCanvas overlayの同期と再生成境界を分離

## GOAL

viewBox属性の同期とroute・label・marker子DOM生成の依存を分離し、pan中はx/y属性だけを更新する。panでは子DOMとイベントlistenerを再生成せず、zoom・live resizeでは現行の画面固定サイズ補正を維持する。

## 参照

- `docs/SPEC.md` §3.1、§3.3
- `.agent/refactor-plan.md` M3-2
- `docs/tasks/10-map-overlay-anchor-fix.md`
- `docs/tasks/13d-map-viewbox.md`
- `src/features/map/MapCanvas.tsx`
- `src/features/map/mapViewportScale.ts`

## やること

- overlay viewBox属性はx/y/width/heightの全変更へ同期する。
- 子DOM再生成キーはviewBox width/heightとcontainer width/heightだけから導出する。
- route、label、marker effectを同じ再生成キーへ接続し、panのx/y変化を依存から除外する。
- zoom/resize時のroute transfer半径、label font、event badge/pinの画面固定サイズ補正を維持する。

## SCOPE

- `src/features/map/mapOverlayRedraw.ts`
- `src/features/map/mapOverlayRedraw.test.ts`
- `src/features/map/MapCanvas.tsx`
- `.agent/refactor-plan.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/tasks/13e-map-overlay-redraw.md`

マーカー配置規則、Router遷移、DOM生成内容、CSS、SVG、gesture/SVG load hook化は対象外。

## 受入基準

- x/yだけのpanでは再生成キーが変わらず、zoomまたはcontainer resizeで変わることを単体テストで固定する。
- viewBox属性は元SVG・route・label・markerの4レイヤーでpan中も一致する。
- pan前後でroute/label/marker子DOMが同じ内容を保ち、marker focusが維持される。
- zoom/resizeではmarker transform、route transfer半径、label fontが新しい画面縮尺へ更新される。
- `bun test`、`bun run verify:routes`、`bun run verify:places`、`bun run build`、`git diff --check` がPASSする。
- 幅402pxと1440×900、live resize、wheel/pinch相当、pan、代表route/label/marker、console errorなしを確認する。
- 会話履歴を引き継がない読み取り専用レビューで指摘がない。

## DELIVERABLE

- `getMapOverlayRedrawKey(viewBox, container)` を追加し、panでは不変、zoom/resizeでは変化する3件のcharacterization testを追加。
- 元SVGとroute/label/markerのviewBox属性同期effectは全viewBox変更へ追従し、3つの子DOM生成effectは再生成キーだけへ依存。
- 自動検証: `bun test` 60件 / 427 assertions、`bun run verify:routes` 104 nodes / 112 edges、`bun run verify:places` 36件、`bun run build`、`git diff --check` がPASS。
- ブラウザ検証: 冷間起動した幅402pxでpan前後のroute/label/marker子HTML不変と全viewBox同期を確認。zoomと1440×900 live resizeではmarker transform、transfer半径、label fontが更新され、横スクロールなし、console error 0件。
- 独立レビュー: 会話履歴なし読み取り専用レビューで指摘なし。
