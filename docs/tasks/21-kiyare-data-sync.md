# 21 きやれイベント／Q089のデータ同期

## GOAL

きやれ追加データを正式採用し、Event・Place・QR・SVG Route・生成物・検証基準・現行文書を同じPlace語彙へ同期する。`service-map-guide`は正式IDなしの運営Event、`sh_room_kiyare`はPlace名「きやれ」とし、Q089からイベント目的地までの経路を利用できる状態にする。

## 参照

- `docs/SPEC.md` §3.2、§3.3、§4、§5.2
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/WORKFLOW.md`
- `public/maps/SH1F_base_plain.svg`
- `uoamap-qr-mappings.json`
- `uoamap-qr-placement-plan.json`
- `docs/tasks/20-map-focus-event-marker-regressions.md`

## やること

- [x] `service-map-guide`を内部keyだけの運営Eventへ修正し、tagsを空配列にする。
- [x] `sh_room_kiyare`をPlace名「きやれ」、SVG要素`sh_room_kiyare`で登録する。
- [x] Place／QR／Event件数、Q089の次番号、IDなしEvent許可keyを検証スクリプトへ反映する。
- [x] Route正本から生成Routeとroute-editor生成物を再生成し、Route coverage期待値を更新する。
- [x] Route抽出とRoute Editorの既存鮮度テストに残っていた旧件数・旧生成文字列期待値を現行生成物へ同期する。
- [x] buildのstrict型検査で露呈したQRポスター生成スクリプトの既存型エラーを、生成挙動を変えない型注釈だけで解消する。
- [x] SPEC、STATUS、HANDOFF、README、作業ブリーフを現行件数へ更新する。

## SCOPE

- `src/data/mock/events.ts`
- `src/data/places.ts`
- `scripts/verify-places.ts`
- `scripts/routeExtractionCore.test.ts`
- `scripts/generate-qr-posters.ts`
- `src/features/routing/routeGraphCoverage.test.ts`
- `tools/route-editor/history.test.ts`
- `src/features/routing/generated/routeGraph.json`
- `tools/route-editor.html`
- `docs/SPEC.md`
- `AGENTS.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `README.md`
- `docs/tasks/21-kiyare-data-sync.md`

既存の`bun.lock`変更は保持する。公開API・TypeScript公開型・既存Event説明文・Q089設置メモ・Route正本以外のSVG要素は変更しない。git checkout / reset / stash / commitは行わない。

## 受入基準

- [x] Place 123件、QR 88件、Event 61件（正式ID 55件）で、`service-map-guide`は正式IDなし・tagsなしである。
- [x] `sh_room_kiyare`のPlace名が「きやれ」で、EventとQ089が同じPlaceを参照する。
- [x] Routeが348 nodes / 445 edges（walk 406 / transfer 39）で、全Route対応Placeが単一連結である。
- [x] `bun test`（123 tests / 0 fail / 1012 expect calls）、`bun run verify:places`、`bun run verify:routes`、`bun run verify:route-editor`、`bun run build`、`bun run verify:all`、`git diff --check`がPASSする。
- [x] 幅402px（402×874）で`/events/service-map-guide`、`/q/Q089?to=M21`、`/q/Q001?to=service-map-guide`を確認し、console error 0件である。
- [x] 会話履歴なしの読み取り専用レビューで初回指摘を修正し、再検証後の再レビューを指摘なしで完了する。

## DELIVERABLE

変更ファイル、生成物、検証結果、402pxブラウザ確認、独立レビュー結果を報告する。コミットは行わない。
