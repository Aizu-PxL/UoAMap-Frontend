# 34 ボトムシートのフリックスナップ

## GOAL

ボトムシートのドラッグ終了時にリリース速度を考慮する。勢いよく下へフリックしたら中間の58svhを飛ばして一番下(22svh)へ、勢いよく上へフリックしたら一番上(82svh)へ直接スナップする。速度が閾値未満のリリースは従来どおり最寄りスナップ点へ吸着する(同距離なら下側優先のタイブレークも維持)。

## 参照

- `docs/SPEC.md` §2(ボトムシート3段階スナップ+フリックの記述)
- `src/components/bottom-sheet/BottomSheet.tsx`
- `src/components/bottom-sheet/bottomSheetGeometry.ts`
- `src/components/bottom-sheet/bottomSheetGeometry.test.ts`

## やること

- 速度判定を含む純粋ヘルパー(例 `getReleaseBottomSheetSnapPoint({ height, velocity })`)を`bottomSheetGeometry.ts`へ追加し、速度閾値の定数もエクスポートする。閾値の具体値・速度の単位系は実装側の裁量(ただしテストと`BottomSheet.tsx`側で一貫させる)。
- `BottomSheet.tsx`は pointermove の直近サンプル(位置+タイムスタンプ、直近およそ100ms分)からリリース速度を算出してヘルパーへ渡す。ドラッグ開始点からの平均速度は不可(途中で止めてから離すと誤発火するため)。
- `onPointerCancel`はフリック扱いせず、従来の最寄りスナップとする。
- 高さ変更の他経路(`snapRequest` / `expandRequestKey` / タブ切替 / ダブルクリック)の挙動は変更しない。

## SCOPE

- `docs/tasks/34-bottom-sheet-fling-snap.md`
- `docs/STATUS.md`
- `src/components/bottom-sheet/BottomSheet.tsx`
- `src/components/bottom-sheet/bottomSheetGeometry.ts`
- `src/components/bottom-sheet/bottomSheetGeometry.test.ts`

CSS、ルーティング、データ、SVG地図、API契約、Figmaは変更しない。依存パッケージの追加は不可。

## 受入基準

- `bun test` がPASSする。既存の`getNearestBottomSheetSnapPoint`のタイブレークテスト(下側優先)は変更せずPASSする。
- 新規ユニットテスト(日本語テスト名)が以下を検証する:
  - 82相当の高さから閾値超の下方向速度→22(58を飛ばす)
  - 22相当の高さから閾値超の上方向速度→82
  - 閾値未満の速度→最寄りスナップ点(従来挙動)
  - 閾値ちょうどの境界挙動が明示されている
- `bun run build` がPASSする。
- `git diff --check` がPASSする。
- 会話履歴なしの読み取り専用レビューで指摘なし、または指摘を修正・再検証・再レビューで解消する。

## DELIVERABLE

変更ファイル、検証結果、独立レビュー結果を`docs/STATUS.md`へ追記する。git操作は行わない。

## 実施結果

- `bottomSheetGeometry.ts`へ`getReleaseBottomSheetSnapPoint`と速度閾値`0.5 px/ms`を追加した。下向き速度を正とし、閾値を厳密に超えた場合だけ下方向は22svh、上方向は82svhへ直接スナップする。閾値以下は既存の最寄り判定と下側優先タイブレークを維持する。
- `BottomSheet.tsx`は直近100ms以内のpointermoveサンプル（位置・タイムスタンプ）からリリース速度を算出する。pointer cancelは速度を使わず最寄りへ戻し、`snapRequest`、`expandRequestKey`、タブ切替、ダブルクリックは変更していない。
- 日本語名の4テストを追加し、下方向フリック、上方向フリック、閾値未満、閾値ちょうどを固定した。既存タイブレークテストは変更していない。
- `bun test`は143 tests / 0 fail / 1,062 assertions、`bun run build`、`bun run verify:places`（124 Place / 89 QR / 61 Event）、`git diff --check`はPASSした。
- 402×874pxブラウザ確認をリードが補完実施。合成PointerEventで高速下フリック（58→22svh、82→22svhで58を飛ばす）、高速上フリック（22→82svh）、低速ドラッグ（82svhから終了位置約48svh→最寄り58svh）を確認し、console error 0件。
- 初回の会話履歴なし読み取り専用レビューではコード上の指摘なし。STATUS未追記のP2は本結果追記で解消し、ブラウザ未確認のP2は上記の環境制約として記録した。
