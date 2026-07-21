# 02a: Place⇔SVG要素の紐付けと検証スクリプト

## GOAL

`src/data/places.ts` の `mapping: "unmapped"` な地点のうち、実SVGに対応要素が存在するものへ `mapping: "svg"` + `svgElementId` を付与し、紐付けの正しさを機械検証するスクリプトを追加する。ステップ2「地図表示」(SPEC.md §3.1)の地点フォーカス実装の前提データを完成させる。

## 参照

- 仕様: [docs/SPEC.md](../SPEC.md) §3.1(素材とID規約)、§4(Place定義とunmappedの扱い)
- 対象データ: `src/data/places.ts`(mapSheets/floorsは実装済み。触るのはplaces配列のみ)
- SVGアセット: `public/maps/*_base_plain.svg` 9枚
  - 部屋IDの例: `room_e1_seminar10_133`(RQ1F)、`room_2F_M7_207`(LH)、`building_Auditrium`(CampusMap)
  - InkscapeのゴミID(`path1`, `marker29` 等)が混在しているので、`room_*` / `building_*` / `area_*` だけを対象にする

## やること

1. 各SVGから `room_*` / `building_*` / `area_*` のID一覧を抽出し、places.tsの各unmapped地点に対応IDを探して紐付ける
   - 部屋番号が名前に入っている地点(例: 「研究棟1F 104F」→ RQ1F内の `room_*_104*`)はIDの部屋番号サフィックスで機械的に探す
   - 建物単位の地点(`rq`, `ubic` 等)はCampusMapの `building_*` に紐付ける(フロアは現状のfloorIdを維持)
   - **対応要素が見つからない地点はunmappedのまま残し**、ブリーフ末尾の報告に「地点ID: 探した候補と見つからなかった旨」を列挙する。推測で間違ったIDを付けない
2. `scripts/verify-places.ts` を新規作成: places.tsの `mapping:"svg"` 全地点について、該当フロア→シートのSVGファイル内に `id="<svgElementId>"` が実在するかを検証し、欠落があれば非0終了+一覧表示。`bun run scripts/verify-places.ts` で実行できること
3. package.json に `"verify:places": "bun run scripts/verify-places.ts"` スクリプトを追加

## SCOPE(変更してよいファイル)

- `src/data/places.ts`(places配列のみ)
- `scripts/verify-places.ts`(新規)
- `package.json`(scripts追記のみ)

public/maps/ のSVGは**読み取り専用**。変更禁止。

## 受入基準(自分で実行して結果を報告)

- [ ] `bun run build` が通る
- [ ] `bun run verify:places` がPASS(exit 0)
- [ ] 紐付け済み地点数が作業前(3件)から増えている。増えなかった場合はその理由(SVGに対応IDがない)を地点ごとに列挙
- [ ] unmappedのまま残した地点の一覧と理由を報告

## DELIVERABLE

変更ファイル一覧 + 受入基準の実行結果(コマンド出力の要約)+ 紐付けできた/できなかった地点の対応表。
