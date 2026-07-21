# 02b: MapCanvas — SVGインライン描画+パン・ズーム

## GOAL

`AppLayout.tsx` の `.map-canvas` プレースホルダーを、地図SVGをインライン描画しパン・ズーム操作できる `MapCanvas` コンポーネントに置き換える(SPEC.md §3.1, §5.3)。

## 参照

- 仕様: [docs/SPEC.md](../SPEC.md) §3.1(操作)、§5.3(インラインSVG・viewBox操作で自作)
- シート定義: `src/data/places.ts` の `mapSheets`(id→svgUrl)
- 差し替え箇所: `src/app/AppLayout.tsx` の `.map-canvas`
- スタイル: `src/styles/global.css`(トークンは既存の `:root` を使用)

## やること

1. `src/features/map/MapCanvas.tsx` 新規:
   - props `sheetId`(まずは `"campus"` 固定で `AppLayout` から渡す)
   - `mapSheets` から svgUrl を引き、fetch → サニタイズせずそのまま `<div dangerouslySetInnerHTML>` ではなく **パースしてインラインSVG要素として挿入**(要素ID操作を見据えDOMとして扱えること。DOMParser使用可)
   - 取得失敗時はエラーメッセージ表示。取得中はプレースホルダー
2. パン・ズームを viewBox 操作で実装:
   - ドラッグでパン(Pointer Events。マウス・タッチ両対応)
   - ホイールでズーム(カーソル位置中心)、2本指ピンチでズーム
   - ズーム範囲は 0.5×〜8× 程度でクランプ
   - **ボトムシート上のジェスチャと干渉しないこと**(シートより背面にあるので通常は届かないが、`touch-action` 設定でスクロール暴発を防ぐ)
3. `AppLayout.tsx` を `<MapCanvas sheetId="campus" />` に差し替え。`.map-canvas` のCSSは全画面背面レイヤーを維持

## SCOPE(変更してよいファイル)

- `src/features/map/MapCanvas.tsx`(新規)
- `src/app/AppLayout.tsx`
- `src/styles/global.css`(map-canvas関連の追記のみ)

## 受入基準(自分で実行して結果を報告)

- [ ] `bun run build` が通る
- [ ] dev server で `/` を開くとCampusMapが背面に描画される(スクリーンショット)
- [ ] ドラッグでパン、ホイールでズームできる(操作後のスクリーンショット)
- [ ] コンソールエラーなし
- [ ] ボトムシートのドラッグ・タブ操作が引き続き動作する

## DELIVERABLE

変更ファイル一覧 + 受入基準ごとのPASS/FAIL + スクリーンショット(操作前後)。
