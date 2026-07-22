# 13d — MapCanvasのviewBox計算を純粋化

## GOAL

SVG viewBoxの解析、フォーカス、ズーム、パン、同一建物内のフロア切替時比例変換、属性文字列化をDOMから独立した純粋モジュールへ集約する。表示範囲、ズーム上限・下限、フォーカス位置、wheel・pinch・pan挙動は変更しない。

## 参照

- `docs/SPEC.md` §3.1、§3.3
- `.agent/refactor-plan.md` M3-1
- `docs/tasks/09-map-pan-coordinate-fix.md`
- `src/features/map/MapCanvas.tsx`
- `src/features/map/mapViewportScale.ts`

## やること

- `viewBox`属性を優先し、未指定時だけ`width` / `height`へfallbackする現行解析を純粋化する。
- zoom幅を元viewBoxの1/8〜2倍に制限し、元の縦横比を維持する。
- 地点フォーカス、任意アンカー中心のwheel/pinch zoom、pan差分、フロア間比例変換、viewBox文字列化を純粋関数へ移す。
- `MapCanvas`はSVG属性の読取・設定、`getScreenCTM().inverse()`、pointer/touchイベント所有を維持する。

## SCOPE

- `src/features/map/mapViewBox.ts`
- `src/features/map/mapViewBox.test.ts`
- `src/features/map/MapCanvas.tsx`
- `.agent/refactor-plan.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/tasks/13d-map-viewbox.md`

SVG、生成Route JSON、URL、props、見た目、gesture/SVG load hook化は対象外。

## 受入基準

- viewBoxの空白・comma解析、不正値、属性存在時の非fallback、単位付きwidth/height fallbackを固定する。
- zoom上下限、縦横比、アンカー不動、focusの垂直anchor、pan、フロア間比例変換、文字列化を固定する。
- `getScreenCTM().inverse()` とDOM属性操作は `MapCanvas` に残る。
- `bun test`、`bun run verify:routes`、`bun run verify:places`、`bun run build`、`git diff --check` がPASSする。
- 幅402pxと1440×900でfocus、フロア切替、wheel、pinch、pan、console errorなしを確認する。
- 会話履歴を引き継がない読み取り専用レビューで指摘がない。

## DELIVERABLE

- `src/features/map/mapViewBox.ts` に解析、width/height fallback、focus、anchor zoom、pan、フロア間比例変換、文字列化を集約。
- 8件のcharacterization testで属性優先・不正値・単位付きfallback、zoom上下限とアンカー、focus、pan、比例変換、文字列を固定。
- `MapCanvas` はSVG属性と `getScreenCTM().inverse()` のDOM境界、pointer/touch gesture所有を維持し、純粋計算だけを委譲。
- 自動検証: `bun test` 57件 / 424 assertions、`bun run verify:routes` 104 nodes / 112 edges、`bun run verify:places` 36件、`bun run build`、`git diff --check` がPASS。
- ブラウザ検証: 幅402pxと1440×900でfocus、live resize、同一建物の1F→2F比例変換、wheel、Ctrl+wheel pinch相当、pan、全overlay viewBox同期、横スクロールなし、console error 0件。
- 独立レビュー: 会話履歴なし読み取り専用レビューで指摘なし。
