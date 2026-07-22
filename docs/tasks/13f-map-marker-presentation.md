# 13f — 地図marker配置モデルを純粋化

## GOAL

イベント、キャンパス建物集約、current/destination/focus pinの配置判断を座標resolver注入型の純粋関数へ移す。同一place集約、ピン優先、先頭イベント代表、描画順、floor/event actionを固定し、DOM生成とRouter遷移はMapCanvasに残す。

## 参照

- `docs/SPEC.md` §3.1、§3.3、§4.2
- `.agent/refactor-plan.md` M3-3
- `docs/tasks/02g-map-event-markers.md`
- `docs/tasks/06-map-event-pin-marker.md`
- `docs/tasks/13e-map-overlay-redraw.md`
- `src/features/map/MapCanvas.tsx`

## やること

- place、floor→sheet、座標をresolverとして受け取る純粋なmarker presentationを追加する。
- 同一placeのイベントを入力順の先頭で代表し、キャンパスでは建物単位の件数へ集約する。
- current/destination/focusが同じplaceのイベントmarkerより優先される現行挙動を維持する。
- eventを先、pinをcurrent→destination→focusの順で返し、floor/event actionをモデルに保持する。
- MapCanvasにはDOM要素生成、listener、React Router遷移、SVG座標解決だけを残す。

## SCOPE

- `src/features/map/mapMarkerPresentation.ts`
- `src/features/map/mapMarkerPresentation.test.ts`
- `src/features/map/MapCanvas.tsx`
- `.agent/refactor-plan.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/tasks/13f-map-marker-presentation.md`

URL、marker DOM/CSS、表示文言、SVG、イベントデータ、gesture/SVG load hook化は対象外。

## 受入基準

- 同一place集約、先頭イベント代表、未知place・座標なし除外を固定する。
- キャンパス建物集約、建物pin優先、屋外place集約、floor/event actionを固定する。
- event先行、pinのcurrent→destination→focus順とイベントmarkerに対するpin優先を固定する。
- MapCanvasから集約・action決定を除去し、座標resolver、DOM生成、Router遷移だけを保持する。
- `bun test`、`bun run verify:routes`、`bun run verify:places`、`bun run build`、`git diff --check` がPASSする。
- 幅402pxでキャンパス建物badge、同一placeイベント、current/destination/focus、floor/event action、既存クエリ保持、console errorなしを確認する。
- 会話履歴を引き継がない読み取り専用レビューで指摘がない。

## DELIVERABLE

- `src/features/map/mapMarkerPresentation.ts` と4件のcharacterization testを追加した。
- MapCanvasから同一place・建物集約、pin優先、描画順、action決定を除去し、resolver、DOM生成、listener、Router遷移だけを残した。
- `bun test`: 64 tests / 431 assertions PASS
- `bun run build`: PASS
- `bun run verify:places`: 36件 PASS
- `bun run verify:routes`: 104 nodes / 112 edges PASS
- `git diff --check`: PASS
- 幅402pxでキャンパス建物件数、同一placeの先頭イベント代表、LICTiAのfloor action、既存クエリを保持するP22 event action、current/destination/focusのpin優先と描画順、console error 0件を確認した。
- 独立レビュー: 会話履歴なしの読み取り専用レビューで指摘なし。
