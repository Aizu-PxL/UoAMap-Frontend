# 02d: 地点フォーカス+マーカー

## GOAL

URLクエリ(at/to/focus)から導出した地点へ地図を自動フォーカスし、現在地・目的地・注目地点マーカーを描画する(SPEC.md §3.1, §3.2)。ステップ2の最終スライス。

## 前提

- 02b・02c完了後に着手
- `useNavState()`(`src/app/useNavState.ts`)が at/to/focus → Place を解決済み
- Placeの位置は `mapping:"svg"` なら svgElementId、`"coordinates"` なら座標。unmappedの地点はフォーカス不可(エラーではなく「位置情報なし」の扱い)

## やること

1. Place→位置解決: svgElementId の要素を `getBBox()` で取り中心座標を得るユーティリティ(`src/features/map/placeLocator.ts` 等)
2. フォーカス動作: 対象Placeのフロア(floorId)へシート/フロアを自動切替し、viewBoxをその地点中心(適度なズーム)へアニメーションなしで移動。優先順位: focus > to(目的地) > at(現在地)
3. マーカー描画: SVG上にオーバーレイ:
   - 現在地(at): 人型ピン。Figmaの `Icon/PersonPin` 相当
   - 目的地(to): 赤いロケーションピン。Figmaの `Icon/LocationPin` 相当(#FF0000)
   - 注目地点(focus): 目的地と同形状・アクセント色(#008B8C)
   - マーカーはズームしても画面上サイズが一定(スクリーンスペース固定)になるようスケール補正する
   - 表示中フロアに属するマーカーのみ表示
4. `MapPanel.tsx` 簡素化: ステータス表示は維持しつつ、「現在地へ」「目的地へ」ボタンで再フォーカスできるようにする
5. イベント詳細の「ここへ行く」→ `/?to=:eventId` 遷移で目的地フォーカスが機能することを確認(既存実装の接続確認)

## SCOPE(変更してよいファイル)

- `src/features/map/`(MapCanvas.tsx、新規ファイル追加可)
- `src/features/map/MapPanel.tsx`
- `src/app/AppLayout.tsx`
- `src/styles/global.css`

## 受入基準(自分で実行して結果を報告)

- [ ] `bun run build` が通る
- [ ] `/e/A1` →「ここへ行く」で講堂(building_Auditrium)にフォーカスし赤ピン表示(スクリーンショット)
- [ ] `/?at=sh-cafeteria` で学生ホール1Fに切替わり現在地ピン表示(スクリーンショット)
- [ ] `/?focus=lh-m8` で講義棟1FのM8にフォーカス(スクリーンショット)
- [ ] unmapped地点(`/?at=campus-all` 等)でクラッシュせず「位置情報なし」相当の表示
- [ ] コンソールエラーなし

## DELIVERABLE

変更ファイル一覧 + 受入基準ごとのPASS/FAIL + スクリーンショット3点。
