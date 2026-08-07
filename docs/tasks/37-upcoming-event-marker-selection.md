# 37: 同一地点イベントの未実施回選択

## GOAL

同一地点に第1回・第2回など複数イベントがある場合、地図の個別イベントバッジをタップした時点で未実施の回を表示する。開始時刻が現在時刻以降の候補から最も早いイベントを選び、終了時刻がない回へ架空の終了時刻は補わない。

## 参照

- `docs/SPEC.md` §3.1「イベント開催地マーカー」
- `docs/WORKFLOW.md`
- `src/features/map/mapMarkerPresentation.ts`
- `src/features/map/MapCanvas.tsx`

## やること

- 同一地点のイベント群から、現在時刻以降で最も早い`timeSlots[].start`を持つイベントを選ぶ純粋関数を追加する。
- 同じイベントに複数スロットがある場合は、後続の未実施スロットも選択候補にする。
- 全候補の開始後、または時刻情報がない場合は、マーカーを消さず従来どおり入力順の先頭イベントへフォールバックする。
- マーカー生成時だけでなくタップ時にも現在時刻で再選択し、画面を開いたまま時刻境界をまたいでも遷移先を最新化する。
- 次の開始時刻直後にバッジを再生成し、表示名・`aria-label`・`data-event-*`も遷移先と同時に更新する。
- 建物集約バッジのフロア切替、イベント件数・色、ピン優先、URLクエリ保持は変更しない。

## SCOPE

- `docs/SPEC.md`
- `docs/STATUS.md`
- `docs/tasks/37-upcoming-event-marker-selection.md`
- `src/features/map/mapMarkerPresentation.ts`
- `src/features/map/mapMarkerPresentation.test.ts`
- `src/features/map/MapCanvas.tsx`

## 受入基準

- [x] 同一地点で入力順に関係なく、現在時刻以降で最も早い回の詳細へ遷移する。
- [x] 第1回の開始後は未実施の第2回を選ぶ。
- [x] 複数`timeSlots`を持つイベントは、後続スロットが未実施なら候補に残る。
- [x] 全回の開始後、または時刻情報がない場合は入力順の先頭へフォールバックする。
- [x] タップ時に時刻を再評価し、既存クエリとBottomSheet 82svh遷移を維持する。
- [x] 時刻境界後はバッジの表示名・`aria-label`・`data-event-*`も新しい代表回へ更新する。
- [x] `bun test`、`bun run build`、`bun run verify:places`、`git diff --check`がPASSする。
- [x] 402×874pxで代表的な同一地点イベントバッジから詳細を開き、console error 0件を確認する。
- [x] 会話履歴なしの読み取り専用独立レビューで指摘がない。
