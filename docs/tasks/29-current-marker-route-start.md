# 29 — ルート表示開始時の現在地ピン表示統一

## GOAL

目的地設定後にルートを表示する際、操作経路や直接URL・再読み込みにかかわらず、ルート可能な現在地を初期表示のフロアとフォーカスへ統一する。地図は1枚につき1フロアを表示するため、別フロアの現在地・目的地を同時に表示することはせず、既存のフロア切替で確認できる状態を維持する。

## 参照

- `docs/SPEC.md` §3.2〜3.3、§5.2
- `docs/WORKFLOW.md`
- `src/app/AppLayout.tsx`
- `src/features/map/MapCanvas.tsx`
- `src/features/map/mapMarkerPresentation.ts`
- `src/features/routing/`

## やること

- 現在地・目的地からのルート計算と初期フォーカス地点の選択を `src/app/mapNavigation.ts` の純粋関数へ集約する。
- 明示的な一時フォーカス、URL `focus`、ルート可能な現在地、目的地、現在地の優先順位を固定する。
- `AppLayout` が同じ導出結果をフロア選択と `MapCanvas` のフォーカスへ渡す。
- `MapCanvas` 内の目的地優先の重複判定を削除する。
- 現在地・目的地マーカーの描画、URL、Repository、SVG、CSS、Figmaは変更しない。

## SCOPE

- `src/app/mapNavigation.ts`
- `src/app/mapNavigation.test.ts`
- `src/app/AppLayout.tsx`
- `src/features/map/MapCanvas.tsx`
- `src/features/map/mapMarkerPresentation.test.ts`
- `docs/tasks/29-current-marker-route-start.md`
- `docs/STATUS.md`

## 受入基準

- `/?at=main_node_11&to=M21` 相当の状態で現在地を初期フォーカスし、`campus`・`lh-1f`・`lh-2f` の経路表示モデルを作る。
- 目的地のみ、現在地のみ、位置情報なしの既存挙動を維持する。
- 明示的な一時フォーカスとURL `focus`を現在地より優先する。
- 同一フロアでは現在地・目的地の両ピンを表示し、別フロアでは表示中フロアのピンだけを表示する。
- 402px幅で直接URL・QR経由・フロア切替を確認し、console errorがない。
- `bun.cmd test`、`bun.cmd run build`、`bun.cmd run verify:places`、`bun.cmd run verify:routes`、`bun.cmd run verify:all` がPASSする。

## DELIVERABLE

- `src/app/mapNavigation.ts` にルート計算と初期フォーカス導出を集約し、`AppLayout` と `MapCanvas` を接続した。
- `src/app/mapNavigation.test.ts` と `src/features/map/mapMarkerPresentation.test.ts` に直URL・優先順位・同一／別フロアの回帰テストを追加した。
- `bun.cmd run verify:all` PASS（134 tests / 1,041 assertions、production build、124 Place / 89 QR / 61 Event、350 nodes / 447 edges、git diff check）。
- 402×874pxで`/?at=main_node_11&to=M21`、`/?at=lh_room_m3&to=M21`、`/q/Q001?to=M21`を確認し、console error 0件。
- 会話履歴なしの読み取り専用独立レビューは指摘なし。
