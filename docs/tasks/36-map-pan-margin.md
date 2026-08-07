# 36: マップのパン範囲拡大

## GOAL

地図を端まで移動した後も、表示領域の約15%ぶん地図外の余白を見せられるようにする。全フロアで同じパン挙動を使い、ズーム・自動フォーカス・フロア切替の既存クランプ挙動は維持する。

## 実装

- `panMapViewBox` に限って、現在の表示viewBox幅・高さの15%を各方向の移動余白として許可する。
- 余白を超えるパンはクランプし、表示viewBoxが元地図より大きい場合は従来どおり中央固定する。
- SVG、ルートデータ、マーカー、URL、公開API、CSSレイアウトは変更しない。

## 変更範囲

- `src/features/map/mapViewBox.ts`
- `src/features/map/mapViewBox.test.ts`
- `docs/SPEC.md`
- `docs/STATUS.md`
- 本ブリーフ

## 受け入れ基準

- [x] パンの上下左右端で表示viewBoxの15%ぶんまで地図外余白を表示できる。
- [x] 許容余白を超えてパンできない。
- [x] ズーム・自動フォーカス・フロア切替の既存クランプ挙動が変わらない。
- [x] 元地図より大きい表示viewBoxはパンせず中央固定する。
- [x] 402×874pxでキャンパス全体と代表的な建物フロアのパン、ズーム、フロア切替、BottomSheet操作、console error 0件を確認する。
- [x] `bun test`、`bun run build`、`bun run verify:places`、`bun run verify:routes`、`git diff --check`がPASSする。
- [x] 会話履歴なしの読み取り専用独立レビューで指摘がない。
