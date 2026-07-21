# 02e: クリック可能な建物の枠線アフォーダンス

## GOAL

キャンパス全体図で「タップすると中が開ける」建物に薄い枠線を表示し、操作可能であることを視覚的に伝える(docs/BACKLOG.md #2)。

## 参照

- [docs/STATUS.md](../STATUS.md) アーキテクチャ要点(SVGはReact非管理DOM)
- 対象コード: `src/features/map/MapCanvas.tsx` — campusシート読み込み時に `buildingFloorIds` の5建物へ role/tabindex/cursor を付与している箇所
- デザイン意図: アクセント色(`--color-accent` #008B8C)の低透明度ストロークで「薄く」。塗りは変えない

## やること

1. campusシートのクリック可能な5建物(building_ResearchQuad / StudentHall / LecHall / UBIC / LICTiA)に、既存の属性付与と同じ場所で枠線スタイルを付与する
   - SVG要素に直接 `stroke` / `stroke-width` / `stroke-opacity` を設定するか、クラスを付けてCSSで指定(実装しやすい方でよい)
   - 線の太さはズームで太らないよう `vector-effect: non-scaling-stroke` を使うこと
   - 対象要素がグループの場合は見た目に枠線が出る要素へ適用する(子のシェイプ等)
2. focus-visible時は既存のフォーカスリングと整合する見た目にする(すでに tabindex=0 が付いている)

## SCOPE(変更してよいファイル)

- `src/features/map/MapCanvas.tsx`
- `src/styles/global.css`

public/maps/ は読み取り専用。git操作禁止(WORKFLOW.md)。

## 受入基準(自分で実行して結果を報告)

- [ ] `bun run build` が通る
- [ ] `bun run verify:places` が36件PASS
- [ ] `/` でキャンパス全体図を表示すると5建物に薄い枠線が見える
- [ ] 開けない建物(講堂・体育館・図書館等)には枠線が出ない
- [ ] 建物シートへ移動→キャンパスへ戻る、を繰り返しても枠線が正しく再適用される

## DELIVERABLE

変更ファイル一覧 + 受入基準ごとのPASS/FAIL + 実装方式(直接stroke/CSSクラスのどちらにしたか)の1行説明。
