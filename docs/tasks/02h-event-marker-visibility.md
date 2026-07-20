# 02h: イベントマーカーの視認性とピン置換

## GOAL

イベント開催地マーカーの内側を白くして地図上で判別しやすくし、同じ地点に現在地・目的地・注目ピンがある場合はイベントマーカーを重ねずピンだけを表示する。

## 参照

- 仕様: [docs/SPEC.md](../SPEC.md) §3.1「イベント開催地マーカー」
- デザイン: Figma「UoAmap」の `Marker/Event` (`79:364`)。白背景は `color/surface`
- 実装: `src/features/map/MapCanvas.tsx`, `src/styles/global.css`
- 前提: イベントマーカーは同一placeIdで集約し、タップで `/events?highlight=:eventId` へ遷移する

## やること

1. イベントマーカーの吹き出し外形に沿う白背景を黒い前景の背面へ追加する。透明なヒット領域は維持する。
2. 現在地・目的地・注目地点のPlace IDを集め、同じ地点のイベントマーカーを生成しない。
3. 既存のマーカー集約、遷移、クエリ保持、キーボード操作、スクリーンスペース固定を維持する。

## SCOPE

- `docs/SPEC.md`
- `docs/STATUS.md`
- `docs/tasks/02h-event-marker-visibility.md`
- `src/features/map/MapCanvas.tsx`
- `src/styles/global.css`

`public/maps/` と `src/data/` は変更しない。git操作禁止。

## 受入基準

- [ ] `bun run build` が通る
- [ ] `bun run verify:places` が36件PASS
- [ ] 幅402pxでイベントマーカーの内側が白く表示される
- [ ] イベントマーカーのタップ遷移と `at` / `to` の保持が従来どおり動く
- [ ] `/?to=A1` では講堂に赤い目的地ピンだけが表示される
- [ ] イベント開催地と同じ `at` / `focus` でも対応するピンだけが表示される
- [ ] ピンを解除するとイベントマーカーが再表示される
- [ ] パン・ズーム、フロア切替が動作し、コンソールエラーがない

## DELIVERABLE

変更ファイル一覧、受入基準ごとのPASS/FAIL、FigmaとWebの白背景・ピン置換方法の要約。
