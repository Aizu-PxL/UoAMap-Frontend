# 02c: シート/フロア切替

## GOAL

MapCanvas にシート(キャンパス全体⇄各建物)とフロア(研究棟1〜3F、学生ホール1〜2F、講義棟1F/2F)の切替を実装する(SPEC.md §3.1)。

## 前提

- 02b完了後に着手(MapCanvasが存在すること)
- 講義棟(LH)は1シートに `fill_1F` / `fill_2F` グループが併記されている。**フロア切替はこの2グループの表示/非表示で行う**(この方式でSPEC §7の未決事項を確定し、SPEC.mdの該当項目を更新すること)

## 参照

- `src/data/places.ts` の `mapSheets` / `floors`(floorId→sheetIdの対応が定義済み)
- SVGレイヤー: LHの `fill_1F`/`fill_2F`。他シートは1シート=1フロア

## やること

1. MapCanvas の表示状態を「floorId」基準に変更(floors→sheetId解決)。シート読み込みはキャッシュする(一度fetchしたSVGは再利用)
2. 切替UI:
   - 地図右下(ボトムシートと重ならない位置)にフロア切替コントロール: 現在のシートが複数フロアを持つ場合のみ表示(RQ 1F/2F/3F、SH 1F/2F、LH 1F/2F)
   - キャンパス⇄建物の切替: CampusMap上の `building_*` 要素タップでその建物のデフォルトフロアへ、建物シート表示中は「キャンパス全体へ戻る」ボタン
   - タップ可能な建物は `building_ResearchQuad`・`building_Auditrium`・`building_UBIC` 等、`floors`に対応シートがあるもののみ(講堂はシートがないのでフォーカスのみ=何もしなくてよい)
3. LH表示時: 選択フロアに応じて `fill_1F`/`fill_2F` の `display` を切替
4. シート切替時はviewBoxをそのシート全体表示にリセット
5. SPEC.md §7 の「講義棟(LH)の1F/2F併記シートのフロア切替UI」項目を `[x]` にし、決定内容を1行追記

## SCOPE(変更してよいファイル)

- `src/features/map/MapCanvas.tsx`(および同ディレクトリへの分割ファイル追加可)
- `src/app/AppLayout.tsx`
- `src/styles/global.css`
- `docs/SPEC.md`(§7の1項目のみ)

## 受入基準(自分で実行して結果を報告)

- [ ] `bun run build` が通る
- [ ] キャンパス→研究棟タップ→1F表示→2F/3Fへ切替→キャンパスへ戻る、が一連で動く(スクリーンショット)
- [ ] LHで1F/2F切替ができ、両フロアが同時に見えない
- [ ] コンソールエラーなし

## DELIVERABLE

変更ファイル一覧 + 受入基準ごとのPASS/FAIL + スクリーンショット。
