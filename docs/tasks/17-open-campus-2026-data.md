# 17 オープンキャンパス2026最新データ反映

## GOAL

`uoa_open_campus_2026.json`（最終確認 2026-07-31）を現行のEvent/Tag/Place語彙へ変換し、60イベントのタイトル・説明・会場・開催時刻を最新化する。新JSONの詳細タグ101種類はユーザー判断により対象外とし、既存の7カテゴリだけを維持する。終了時刻が公表されていない受験勉強相談は架空の終了時刻を補わず、開始時刻のみ表示する。

## 参照

- `docs/SPEC.md` §3.4、§3.5、§4
- `docs/API.md` `GET /api/events`
- `/Users/motonefu/Downloads/uoa_open_campus_2026.json`
- `src/data/mock/events.ts`
- `src/data/mock/mockRepository.ts`

## やること

1. 新JSONの37プログラムを55 Event、5運営サービスを5 Eventへ変換する。
2. `category` は既存7カテゴリへ対応させ、`programs[].tags` の詳細タグ101種類は取り込まない。
3. location IDを既存Place IDへ意味一致で対応させ、60 EventのRoute/Place参照を維持する。
4. 休憩時間を複数`timeSlots`へ展開し、終了時刻未公表のR1〜R9は`end`なしで保持・表示する。
5. 件数、一意性、Place/Tag参照、ISO時刻、時刻順を自動検証する。

## SCOPE

- `docs/SPEC.md`
- `docs/API.md`
- `docs/STATUS.md`
- `docs/tasks/17-open-campus-2026-data.md`
- `src/data/types.ts`
- `src/data/format.ts`
- `src/data/format.test.ts`
- `src/data/mock/events.ts`
- `scripts/verify-places.ts`

上記以外は変更しない。開始時から存在する `docs/FIGMA.md`、`docs/STATUS.md`、`docs/tasks/16-figma-ux-demo.md` のFigma UX Demo差分を維持する。

## 受入基準

- [x] 109 Place / 74 QR / 60 Eventを維持し、Event IDが一意で全Place参照が有効である。
- [x] Eventのタグは既存7カテゴリだけで、詳細タグ101種類を取り込んでいない。
- [x] 新JSONのタイトル・説明・会場・時刻を反映し、明示された休憩は複数`timeSlots`になる。
- [x] R1〜R9は終了時刻を補完せず、カードと詳細で「開始時刻〜」と表示される。
- [x] `bun run verify:all` と `git diff --check` がPASSする。
- [x] 幅402pxでイベント検索、カテゴリ絞り込み、詳細、R1の開始時刻のみ表示を確認し、console errorが0件である。
- [ ] 会話履歴なしの読み取り専用レビューで指摘なしになる。

## DELIVERABLE

変更ファイル、60 Eventと7カテゴリの維持、詳細タグを対象外とした判断、終了時刻未公表の表現、検証結果を報告する。コミットは行わない。

### 実装結果

- 37プログラムの55枠と5運営サービスを60 Eventへ反映した。
- 新JSONとの一時照合スクリプトで、60件のID・タイトル・説明・会場・カテゴリ・時刻が一致することを確認した。
- 研究室公開の明示された12:00〜13:00休憩を複数`timeSlots`へ展開した。
- 詳細タグ101種類は取り込まず、既存7カテゴリだけをカード・詳細・絞り込みに維持した。
- `TimeSlot.end`を公式終了時刻がない場合のみ省略可能にし、R1〜R9を「9:40〜」等で表示した。

### 検証結果

- `bun run verify:all`: PASS（110 tests / 930 assertions、109 Place / 74 QR / 60 Event、336 nodes / 425 edges、build、`git diff --check`）
- Browser 402×874: `/events`でカテゴリチップ7件、相談フィルタ11件、R1カード「9:40〜」、`/e/R1`でも同表示、横方向overflowなし、console error 0件
