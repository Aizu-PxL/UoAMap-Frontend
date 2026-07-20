# 07: マップオーバーレイの横長画面固定サイズ補正

## GOAL

地図SVGが `preserveAspectRatio="xMidYMid meet"` で表示される全画面比率において、ラベル・イベントバッジ・現在地／目的地／注目ピンの見かけサイズを一定に保つ。スマホ向けレイアウトは維持し、PC専用レイアウトは追加しない。

## 参照

- [SPEC.md](../SPEC.md) §3.1.1「マップ内ビジュアル仕様」
- `src/features/map/MapCanvas.tsx`(ラベル・マーカーの逆スケール補正)
- `src/features/map/mapLabels.ts`(ラベル目標サイズ12px)
- `public/maps/*.svg`(資産は**変更禁止**。読み取りのみ)

## やること

1. `xMidYMid meet` の実表示縮尺に合わせ、viewBoxとコンテナの幅・高さから共通の `user単位/px` を計算する
2. 共通縮尺をラベル・イベントバッジ・現在地／目的地／注目ピンへ適用する
3. `ResizeObserver` でコンテナ寸法変更を検知し、再読み込みなしで縮尺を更新する
4. 縦長・横長・ゼロ寸法を純粋関数の単体テストで検証する

## SCOPE

- `docs/SPEC.md`
- `docs/STATUS.md`
- `docs/tasks/07-map-overlay-screen-scale.md`
- `src/features/map/MapCanvas.tsx`
- `src/features/map/mapViewportScale.ts`
- `src/features/map/mapViewportScale.test.ts`

`public/maps/`・`src/features/routing/`・URL契約・公開データ型は変更しない。

## 受入基準

- [x] `bun test` が通る
- [x] `bun run build` が通る
- [x] `bun run verify:places` が36件PASS
- [x] `bun run verify:routes` が通る
- [x] 402×874と1440×900の両方でラベルが12px相当、イベント円が22px、ピンが同じ画面サイズで表示される
- [x] PC幅からスマホ幅へ再読み込みなしで変更しても上記サイズが維持される
- [x] ズーム前後でラベル・マーカーの画面サイズが維持される
- [x] イベントバッジの操作と既存URL遷移が維持される
- [x] コンソールエラーがない
- [x] `git diff --check` が通る

## DELIVERABLE

変更ファイル一覧、受入基準ごとのPASS/FAIL、縦横比対応の縮尺計算とリサイズ監視の設計判断を報告する。

## 受入結果 (2026-07-20)

- `bun test`: **PASS** (9テスト)
- `bun run build`: **PASS** (63 modules transformed)
- `bun run verify:places`: **PASS** (36件)
- `bun run verify:routes`: **PASS** (13ノード / 14エッジ)
- 402×874: **PASS** (ラベル12px、イベント円22px)
- 1440×900直接表示: **PASS** (ラベル12px、イベント円22px)
- 再読み込みなしの402×874 ⇄ 1440×900: **PASS** (ラベル12px、イベント円22px、目的地ピン同寸)
- ズーム前後: **PASS** (ラベル12px、イベント円22px、目的地ピン同寸)
- バッジ操作: **PASS** (キャンパス集約バッジでLICTiAへ切替、個別P21バッジで `/events?highlight=P21` へ遷移)
- ブラウザコンソール: **PASS** (warning / error なし)
- `git diff --check`: **PASS**

### 設計判断

`xMidYMid meet` の実表示は幅・高さのうち厳しい側で決まるため、逆スケールは
`max(viewBox.width / container.width, viewBox.height / container.height)` とした。
コンテナ寸法は `ResizeObserver` で監視し、同値ならstateを更新しないことで不要な再描画を避ける。
