# 09 — 地図パン操作の座標倍率修正

## GOAL

`preserveAspectRatio="xMidYMid meet"` による余白がある地図でも、指でドラッグした画面上の距離と地図の移動距離を縦横とも一致させる。特にフロア別分割で横長になった講義棟1Fの縦パンが遅くなる問題を解消する。

## 参照

- `docs/SPEC.md` §3.1
- `docs/STATUS.md`「座標変換」
- `src/features/map/MapCanvas.tsx`

## やること

- パン開始時の `getScreenCTM().inverse()` を保持する
- ドラッグ開始点と現在点を同じ変換行列でSVG座標へ変換し、その差分でviewBoxを移動する
- 講義棟以外の地図、ズーム、フロア切替を維持する

## SCOPE

- `src/features/map/MapCanvas.tsx`
- `docs/tasks/09-map-pan-coordinate-scale.md`
- `docs/STATUS.md`

## 受入基準

- [x] 幅402pxの講義棟1Fで、縦横のドラッグが指の移動量に追従する
- [x] 講義棟2Fと他の代表地図でもパン操作が後退しない
- [x] 講義棟1F/2Fのフロア切替とズームが動作する
- [x] `bun test` が成功する
- [x] `bun run build` が成功する
- [x] `bun run verify:places` が36件PASSする
- [x] `bun run verify:routes` が成功する
- [x] `git diff --check` が成功する

## DELIVERABLE

変更ファイル:

- `src/features/map/MapCanvas.tsx`
- `docs/tasks/09-map-pan-coordinate-scale.md`
- `docs/STATUS.md`

検証結果:

- 幅402pxの講義棟1Fで50pxずつドラッグし、横・縦ともviewBoxが23.2509 SVG単位移動することを確認
- 講義棟2Fの縦50pxドラッグも23.2509 SVG単位移動
- 学生ホール1Fの横・縦50pxドラッグはともに6.8138 SVG単位移動
- 1F→2F切替とホイールズームを確認。ピンチ処理自体は変更していない
- ブラウザのコンソールエラーなし
- `bun test`: 36 tests / 0 fail
- `bun run verify:routes`: 104ノード / 112エッジ
- `bun run verify:places`: 36件PASS
- `bun run build`: PASS
- `git diff --check`: PASS

設計判断:

- `viewBox幅÷コンテナ幅` と `viewBox高さ÷コンテナ高さ` を別々に使う換算を廃止した
- パン開始時の逆変換行列をジェスチャー中固定し、viewBox更新による座標変換の変化を受けないようにした
