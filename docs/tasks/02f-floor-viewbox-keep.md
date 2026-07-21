# 02f: フロア切替時のviewBox維持 + RQ2F表示修理

## GOAL

同一建物内のフロア切替でパン・ズーム状態を維持し「同じ場所が重なって見える」ようにする。あわせてviewBox属性を持たないRQ2Fが表示できない問題を直す(docs/BACKLOG.md #3)。

## 参照

- [docs/STATUS.md](../STATUS.md) アーキテクチャ要点
- 対象コード: `src/features/map/MapCanvas.tsx` の `parseViewBox` / シート読み込みuseEffect / `floorGroups`
- 調査済みの事実:
  - **RQ2F(`public/maps/RQ2F_base_plain.svg`)にはviewBox属性が無い**(`width="507.13501" height="693"` のみ)。現行 `parseViewBox` はthrowするため研究棟2Fは表示に失敗するはず(まず現状再現を確認)
  - フロア間の座標系は揃っていない(RQ1F viewBox 454×650 / RQ3F 486×693 / SH1F 137×128 / SH2F 134×125)。**絶対座標の引き継ぎは不可**

## やること

1. `parseViewBox` フォールバック: viewBox属性が無い場合は `width` / `height` 属性(数値部分)から `0 0 w h` を構成する。両方無ければ従来通りエラー。**SVGファイル自体は編集しない**
2. フロア切替時のviewBox引き継ぎ(比例マッピング):
   - 切替元と切替先が同じ建物(`floorGroups` の同一グループ内)の場合のみ、現在のviewBoxの「シート全体viewBoxに対する相対位置・相対サイズ」を切替先シートのviewBoxへ写して初期viewBoxとする
   - 例: 旧シートで中心が(40%, 60%)・幅30%なら、新シートでも中心(40%, 60%)・幅30%
   - LH(同一シートのdisplay切替)はviewBoxを一切変更しない
   - キャンパス⇄建物の切替は従来通り全体表示にリセット
3. ズームクランプ基準(originalViewBoxRef)は切替先シートの値で更新すること

## SCOPE(変更してよいファイル)

- `src/features/map/MapCanvas.tsx`(同ディレクトリへの関数分割ファイル追加可)

public/maps/ は読み取り専用。git操作禁止(WORKFLOW.md)。

## 受入基準(自分で実行して結果を報告)

- [ ] `bun run build` が通る
- [ ] `bun run verify:places` が36件PASS
- [ ] 研究棟2Fが表示できる(現状の失敗が直っている)
- [ ] 研究棟1Fで部屋が読めるくらいにズーム→2F→3F→1Fと切替えても、同じ相対位置・同倍率のままフロアが入れ替わる
- [ ] 講義棟1F⇄2Fはズーム状態が完全に維持される
- [ ] キャンパス→建物、建物→キャンパスは全体表示にリセットされる(回帰確認)

## DELIVERABLE

変更ファイル一覧 + 受入基準ごとのPASS/FAIL + 比例マッピングの計算方法の要約。
