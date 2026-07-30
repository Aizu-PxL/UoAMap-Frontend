# 17 オープンキャンパス2026最新データ反映

## GOAL

`uoa_open_campus_2026.json`（最終確認 2026-07-31）を現行のEvent/Tag/Place語彙へ変換し、60イベントのタイトル・説明・会場・開催時刻を最新化する。詳細タグ101種類は対象外とし、正式IDの先頭文字に対応する9カテゴリだけを使う。正式ID55件とIDなし運営イベント5件を分離し、全Eventを内部keyでクリック・詳細表示・目的地設定できるようにする。終了時刻が公表されていない受験勉強相談は架空の終了時刻を補わない。

## 参照

- `docs/SPEC.md` §3.4、§3.5、§4
- `docs/API.md` `GET /api/events`
- `/Users/motonefu/Downloads/uoa_open_campus_2026.json`
- `src/data/mock/events.ts`
- `src/data/mock/mockRepository.ts`

## やること

1. 新JSONの37プログラムを55 Event、5運営サービスを5 Eventへ変換する。
2. 正式IDは`A/L/E/U/P/T/M/G/R`で始まる55件だけとし、同じ先頭文字を9カテゴリのTag IDに使う。`programs[].tags` の詳細タグ101種類は取り込まない。
3. 総合案内・自由見学・休憩所・ランチ営業・売店営業は正式IDを削除して内部keyだけを持たせ、一覧カード・詳細・目的地・地図マーカーを内部keyで動かす。
4. location IDを既存Place IDへ意味一致で対応させ、60 EventのRoute/Place参照を維持する。
5. 休憩時間を複数`timeSlots`へ展開し、終了時刻未公表のR1〜R9は`end`なしで保持・表示する。
6. 件数、key/ID一意性、ID/Tag対応、Place参照、厳密なISO 8601時刻、時刻順を自動検証する。

## SCOPE

- `docs/SPEC.md`
- `docs/API.md`
- `docs/STATUS.md`
- `docs/tasks/17-open-campus-2026-data.md`
- `src/data/types.ts`
- `src/data/format.ts`
- `src/data/format.test.ts`
- `src/data/mock/events.ts`
- `src/data/mock/mockRepository.ts`
- `src/data/repositoryLoader.test.ts`
- `scripts/verify-places.ts`
- `src/app/routes.tsx`
- `src/app/useNavState.ts`
- `src/app/navigationSearch.ts`
- `src/app/navigationSearch.test.ts`
- `src/components/bottom-sheet/SheetNavigation.tsx`
- `src/components/bottom-sheet/SheetNavigation.test.ts`
- `src/features/events/EventCard.tsx`
- `src/features/events/EventDetail.tsx`
- `src/features/events/SearchPanel.tsx`
- `src/features/events/eventSearch.ts`
- `src/features/events/eventSearch.test.ts`
- `src/features/map/MapCanvas.tsx`
- `src/features/map/mapMarkerPresentation.ts`
- `src/features/map/mapMarkerPresentation.test.ts`
- `src/features/routing/routeGraphCoverage.test.ts`
- `docs/HANDOFF.md`

上記以外は変更しない。開始時から存在する `docs/FIGMA.md`、`docs/STATUS.md`、`docs/tasks/16-figma-ux-demo.md` のFigma UX Demo差分を維持する。

## 受入基準

- [x] 109 Place / 74 QR / 60 Eventを維持し、全Place参照が有効である。
- [x] Eventは内部key 60件、正式ID 55件で一意。正式IDは`A/L/E/U/P/T/M/G/R`だけで、Tag IDと先頭文字が一致する。
- [x] IDなし5件はTagなしで一覧に残り、クリックして詳細を開き「ここへ行く」と地図マーカーhighlightが動く。
- [x] フィルターは表どおり9カテゴリで、詳細タグ101種類と旧7カテゴリを取り込んでいない。
- [x] 新JSONのタイトル・説明・会場・時刻を反映し、明示された休憩は複数`timeSlots`になる。
- [x] R1〜R9は終了時刻を補完せず、カードと詳細で「開始時刻〜」と表示される。
- [x] `bun run verify:all` と `git diff --check` がPASSする。
- [x] 幅402pxでイベント検索、9カテゴリ、60カード、正式IDあり／なしの詳細・目的地、内部keyのhighlight、R1の開始時刻のみ表示を確認し、ランタイムエラー表示がない。
- [ ] 会話履歴なしの読み取り専用レビューで指摘なしになる。

## DELIVERABLE

変更ファイル、60 Event（正式ID 55件・IDなし5件）と9カテゴリ、詳細タグを対象外とした判断、終了時刻未公表の表現、検証結果を報告する。コミットは行わない。

### 実装結果

- 37プログラムの55枠と5運営サービスを60 Eventへ反映した。
- 新JSONとの一時照合スクリプトで、正式ID 55件・運営サービス5件の内部key、タイトル・説明・会場・カテゴリ・時刻が一致することを確認した。
- 研究室公開の明示された12:00〜13:00休憩を複数`timeSlots`へ展開した。
- 詳細タグ101種類は取り込まず、正式ID先頭文字に対応する9カテゴリだけをカード・詳細・絞り込みに使用した。
- 運営サービス5件は正式IDとTagを持たず、`service-*`内部keyで一覧カード、`/events/:eventKey`詳細、「ここへ行く」、地図マーカーhighlightを動かす。
- IDなし詳細でも検索タブを選択状態にし、正式ID詳細と同じナビゲーション状態を維持する。
- `TimeSlot.end`を公式終了時刻がない場合のみ省略可能にし、R1〜R9を「9:40〜」等で表示した。

### 検証結果

- `bun run verify:all`: PASS（112 tests / 934 assertions、109 Place / 74 QR / 60 Event、336 nodes / 425 edges、build、`git diff --check`）
- Browser 402×874: `/events`でカテゴリチップ9件・カード60件・横方向overflowなし。`/events/service-lunch`から`/?to=service-lunch`への目的地設定と検索タブ選択、`/e/P1`の正式ID詳細、`/events?highlight=service-shop`の内部key強調、R1カード「9:40〜」、ランタイムエラー表示なしを確認
