# 10 — 地図オーバーレイのアンカー固定

## GOAL

イベントバッジの中心と水滴ピンの先端をPlace座標へ固定し、ズーム時に地図上を滑って見える画面固定オフセットを廃止する。地図ラベルは元SVGの見た目上の中心を基準に中央揃えで再描画し、マーカーと重なる文字だけを一時非表示にする。

## 参照

- `docs/SPEC.md` §3.1.1
- `docs/STATUS.md`「ラベル・マーカー固定サイズ」
- `src/features/map/MapCanvas.tsx`
- `src/features/map/mapLabels.ts`

## やること

1. イベント円の中心と水滴ピンの先端がPlace座標へ一致する共通transformを使う
2. 表示中マーカーの配置情報を描画とラベル除外領域で共有する
3. 元 `<text>` のBBox中心をSVGルート座標へ変換し、中央揃え・中央基準の行配置で再描画する
4. マーカーの実表示範囲と交差するラベルだけを非表示にする
5. アンカー変換、複数行の中心配置、衝突判定を純粋ロジックのテストで固定する

## SCOPE

- `docs/SPEC.md`
- `docs/STATUS.md`
- `docs/tasks/10-map-overlay-anchor-stability.md`
- `src/features/map/MapCanvas.tsx`
- `src/features/map/mapLabels.ts`
- `src/features/map/mapOverlayGeometry.ts`
- `src/features/map/mapOverlayGeometry.test.ts`

`public/maps/`、`src/features/routing/`、URL契約、公開データ型、Figmaは変更しない。

## 受入基準

- [x] `bun test` が成功する
- [x] `bun run build` が成功する
- [x] `bun run verify:places` が36件PASSする
- [x] `bun run verify:routes` が成功する
- [x] `git diff --check` が成功する
- [x] 幅402pxのキャンパス、研究棟1〜3F、学生ホール1〜2F、講義棟1〜2F、UBIC、LICTiAでズーム・パンを確認する
- [x] 全イベント開催フロアでバッジ中心とPlace座標の差がズーム前後とも1px以内になる
- [x] 水滴ピン先端とPlace座標の差がズーム前後とも1px以内になる
- [x] 全10シートでラベル中心がズーム前後に動かず、研究棟1〜3Fの部屋番号が中央揃えになる
- [x] マーカーと重なるラベルだけが消え、マーカー解除後に同じ位置で復帰する
- [x] 1440×900と再読み込みなしの402×874⇄1440×900でキャンパス・研究棟の位置と固定サイズを維持する
- [x] バッジのクリック／キーボード遷移、ピン優先表示、コンソールエラーなしを確認する

## DELIVERABLE

変更ファイル一覧、検証ゲート、シートごとのブラウザPASS/FAIL、アンカー変換とラベル衝突処理の設計判断を記録する。

## 受入結果 (2026-07-21)

変更ファイル:

- `docs/SPEC.md` / `docs/STATUS.md` / 本ブリーフ
- `src/features/map/MapCanvas.tsx` / `mapLabels.ts`
- `src/features/map/mapOverlayGeometry.ts` / `mapOverlayGeometry.test.ts`

検証ゲート:

- `bun test`: **39 tests / 0 fail / 380 expect() calls**
- `bun run build`: **PASS** (`tsc -b` + Vite 68 modules)
- `bun run verify:places`: **36件PASS**
- `bun run verify:routes`: **104ノード / 112エッジ**
- `git diff --check`: **PASS**

幅402pxのブラウザ検証:

| シート | イベントバッジ | ズーム・パン | ラベル中心 |
|---|---:|---|---|
| キャンパス | 建物5件 + 講堂 + ロボット格納庫 | PASS | PASS |
| 研究棟1F | P1〜P5 | PASS | PASS |
| 研究棟2F | P6〜P11 | PASS | PASS |
| 研究棟3F | P12〜P16 | PASS | PASS |
| 学生ホール1F | C / R1 / S | PASS | PASS |
| 学生ホール2F | 0件(仕様どおり) | PASS | PASS |
| 講義棟1F | L1 / U1 / P17 | PASS | PASS |
| 講義棟2F | M21 / M31 / M41 / M51 / M61 / M71 | PASS | PASS |
| UBIC | P18 / P19 / G1 | PASS | PASS |
| LICTiA | P20 / P21 | PASS | PASS |

- バッジ中心の最大誤差は全シート・ズーム・パンを通して **0.001px未満**、円直径は22pxを維持
- 水滴ピンはキャンパス2地点と各イベント開催フロアの計10地点で確認し、先端誤差は最大 **0.011px未満**。同一地点のイベントバッジはすべて非表示
- 全ラベルの保存中心と画面上BBox中心の誤差は最大 **0.001px未満**。研究棟104ラベルは元SVG DOMに残りつつ、P1バッジとの重なり時だけ再描画対象から除外された
- キャンパスと研究棟1Fは402×874 → 1440×900 → 402×874を再読み込みなしで変更し、直径22px・アンカー位置・ラベル中心を維持
- LICTiA集約バッジの建物遷移、P20のクリック、P21のEnter操作、`/events?highlight=` 遷移を確認。ブラウザコンソールのwarning / errorなし

設計判断:

- バッジ中心／ピン先端をローカルアンカーとして共通transformへ渡し、同じ配置情報から描画とラベル除外領域を生成する
- ラベルは元 `<text>` のBBox中心をSVGルート座標へ変換する。BBox取得不能時だけ元アンカー・文字幅・行間から中心を推定する
- ラベルは移動させず、マーカー実表示範囲 + 2pxと交差する間だけ除外する。除外領域が空になれば同じ保存中心へ再描画されることを純粋ロジックのテストで固定した
