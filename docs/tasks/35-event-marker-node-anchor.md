# 35: イベントバッジのノードアンカー化

## GOAL

イベントバッジが部屋ラベル(React再描画テキスト)の真上に重なる問題を解消する。

1. **フロアシート(建物内・キャンパス直置きPlace共通)**: イベントバッジの**中心**を、そのPlaceに対応するルートグラフノード(`RouteNode.placeId` 一致・同一フロア)の座標に固定する。対応ノードがないPlaceは従来どおりPlace座標(SVG要素中心)へフォールバックする。現行の「Place座標の画面上20px上」オフセットは廃止する。
2. **キャンパス俯瞰シート**: 建物集約バッジ(件数付き)を、建物バウンディングボックス中心ではなく**建物名ラベルの直上**(画面固定オフセット、文字を隠さない)に配置する。建物に複数テキストがある場合(例: 学生ホール/食堂)は建物名のラベルを基準にする。
3. **ラベル衝突**: イベントバッジと重なるラベルは衝突カリングで非表示にする(現在は水滴ピンのみが対象)。

## SPEC参照

- `docs/SPEC.md` §3.1.1「マップ内ビジュアル仕様」— 本タスクに合わせて更新済み。実装はこの記述を正とする
- ルートグラフ: `src/features/routing/generated/routeGraph.json`(`src/features/routing/routeGraph.ts` からexport)。ノード検索の既存例は `src/features/routing/findShortestRoute.ts` の `placeId` 一致検索

## 現状の参考情報(変更箇所の特定用)

- バッジ配置ロジック: `src/features/map/mapMarkerPresentation.ts`(pure・テスト済み)
- 座標解決: `src/features/map/MapCanvas.tsx` の `resolveCoordinates` コールバック(2箇所ある点に注意)+ `src/features/map/placeLocator.ts`
- アンカー定数: `MapCanvas.tsx` の `EVENT_MARKER_LOCAL_ANCHOR`
- ラベル衝突除外: `MapCanvas.tsx` の `exclusionBounds`(現在 `type === "pin"` のみ)。`getMarkerExclusionBounds()` にevent分岐は実装済み
- 建物名ラベルの抽出: `src/features/map/mapLabels.ts`(SVG `<text>` から文言と見た目上の中心を抽出済み)

## SCOPE(変更してよいパス)

- `src/features/map/` 配下
- `src/features/map/` 配下のテストファイル

**変更禁止**: `src/data/`(特に `places.ts`)、`src/features/routing/`(参照のみ可)、SVGアセット、`docs/SPEC.md`

## 受け入れ基準(自己実行して結果を報告)

1. ユニットテスト: 既知の会場でバッジ中心座標がノード座標に一致すること(例: `rq_room_267` → ノード `rq-2f:rq_room_267` = (135, 393))
2. ユニットテスト: 対応ノードを持たないPlaceは従来のPlace座標(SVG要素中心)にフォールバックすること
3. ユニットテスト or 検証ログ: キャンパス俯瞰の集約バッジのアンカーが建物名ラベル基準になり、バッジ境界がラベル文字境界と交差しないこと
4. `npm run build` PASS
5. lint PASS(プロジェクトのlintコマンド)
6. 既存テストすべてPASS(`mapMarkerPresentation.test.ts` は新仕様に合わせて更新可)

## DELIVERABLE

- 変更ファイル一覧(SCOPE外の変更がないことを明記)
- 受け入れ基準1〜6の実行結果(PASS/FAIL と簡潔な根拠)
