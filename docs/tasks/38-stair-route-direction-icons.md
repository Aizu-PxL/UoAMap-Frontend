# 38: 階段ルートの上り／下りアイコン

## GOAL

階段を使う経路で、各階段transferの出発側ノードに進行方向を示す上り／下りアイコンを表示する。到着側には階段マーカーを表示せず、入口transferと既存のルート線・ピン・フロア切替挙動を維持する。

## 参照

- `docs/SPEC.md` §3.3「ルート表示」
- `docs/WORKFLOW.md`
- `src/features/routing/routePresentation.ts`
- `src/features/map/MapCanvas.tsx`
- `/Users/motonefu/Downloads/stairs_arrow_up.svg`
- `/Users/motonefu/Downloads/stairs_arrow_down.svg`

## やること

- 添付SVGを黒24pxの上り／下りアイコンとして取り込み、白い32px円形背景とアクセント色2px枠へ載せる。
- 経路表示モデルへ開始ノードを渡し、順序付けられた経路を始点からたどって階段transferの出発側と方向を導出する。
- 下階から上階は`up`、上階から下階は`down`として、表示中フロアの階段ノード中央へズーム非依存の固定サイズで描画する。
- 連続する階段移動では、中間階を次のtransferの出発側としてアイコンを表示する。最終到着階には表示しない。
- 建物出入口transferの既存円形マーカー、歩行ルート線、現在地・目的地ピン、URLとフロア切替を維持する。
- Figma、地図SVG、生成Routeグラフ、Place・QR・Event、Repository/API契約は変更しない。

## SCOPE

- `docs/SPEC.md`
- `docs/STATUS.md`
- `docs/tasks/38-stair-route-direction-icons.md`
- `src/assets/stairs_arrow_up.svg`
- `src/assets/stairs_arrow_down.svg`
- `src/app/mapNavigation.ts`
- `src/app/mapNavigation.test.ts`
- `src/features/routing/routePresentation.ts`
- `src/features/routing/routePresentation.test.ts`
- `src/features/map/MapCanvas.tsx`
- `src/styles/global.css`

## 受入基準

- [x] 1F→3Fでは1F・2Fに上りアイコンを表示し、3Fには階段マーカーを表示しない。
- [x] 3F→1Fでは3F・2Fに下りアイコンを表示し、1Fには階段マーカーを表示しない。
- [x] 黒24pxアイコン＋白32px円形背景＋アクセント色2px枠を階段ノード中央へ表示し、ズームしても画面上サイズを維持する。
- [x] 建物出入口transferの既存円形マーカーと歩行ルート線を維持する。
- [x] 同一フロア経路、未知または不連続な経路から誤った階段方向を生成しない。
- [x] `bun run verify:all`、`bun run verify:routes`、`bun run verify:places`、`git diff --check`がPASSする。
- [x] 402×874pxで上り・下り・入口を含む代表URLとズームを確認し、console error 0件を確認する。
- [x] 会話履歴なしの読み取り専用独立レビューで指摘がない。

## DELIVERABLE

- 変更ファイル: `docs/SPEC.md`、`docs/STATUS.md`、本ブリーフ、階段SVG 2件、`src/app/mapNavigation.ts`とテスト、`src/features/routing/routePresentation.ts`とテスト、`src/features/map/MapCanvas.tsx`、`src/styles/global.css`
- 受入結果: 全項目PASS。`verify:all`は172 tests / 1,135 assertions、125 Place / 89 QR / 61 Event、350 nodes / 448 edges、build・diff checkをPASS。402×874pxの上り・下り・入口・ズーム確認もPASS。会話履歴なしの読み取り専用独立レビューは指摘なし
- 設計判断: 最短経路の開始ノードから順にエッジをたどり、抽出済み階段transferの`nodeA=下階`／`nodeB=上階`契約で方向を決める。階段は出発側だけ、入口は従来どおり両側を表示し、アイコンと背景はuserUnitsPerPixelで画面固定サイズにする
