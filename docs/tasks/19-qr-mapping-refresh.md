# 19 QR対応表87件反映

## GOAL

受領した新QR対応表をフロントの正式モックへ反映し、Route Editor計画JSON・Place・Routeグラフを87件の同じQR語彙で動作させる。

## 参照

- `docs/SPEC.md` 3.2、4章、5.2
- `docs/API.md`
- `docs/PRODUCTION.md`
- 受領ファイル `uoamap-qr-mapping (2).json`
- `uoamap-qr-placement-plan.json` / `uoamap-place-proposals.json`

## やること

1. 受領JSONと`uoamap-qr-mappings.json`の内容一致を確認する。
2. Q018を欠番のまま維持し、Q075〜Q088が参照する既存Routeノード14件をPlaceへ登録する。
3. 87 QR / 73 Place案 / `nextQrNumber: 89`と欠番を検証できるよう`verify:places`を更新する。
4. Routeグラフを再生成し、全121 Route対応Place・全60イベント・全87 QR地点のcoverageを固定する。
5. 件数と運用文書を現在値へ更新する。

## SCOPE

- `AGENTS.md`, `README.md`
- `docs/SPEC.md`, `docs/STATUS.md`, `docs/HANDOFF.md`, `docs/WORKFLOW.md`, `docs/MAP_AUTHORING.md`, `docs/PRODUCTION.md`
- `docs/tasks/19-qr-mapping-refresh.md`
- `src/data/places.ts`
- `scripts/verify-places.ts`
- `scripts/routeExtractionCore.test.ts`
- `src/features/routing/generated/routeGraph.json`
- `src/features/routing/routeGraphCoverage.test.ts`

受領JSONと同一だった`uoamap-qr-mappings.json`、すでに87 placementsへ更新済みの計画JSON、Routeの`data-place-id`が反映済みのSVGは変更しない。SCOPE外のファイルは変更しない。

## 受入基準

- [x] 受領JSONと`uoamap-qr-mappings.json`がバイト単位で一致する
- [x] 122 Place / 87 QR / 60 Eventが一意かつ参照整合する
- [x] Q018が欠番で、Q075〜Q088が再利用Routeノードへ解決する
- [x] `nextQrNumber: 89`、87 placements、73 placeProposalsを維持する
- [x] Routeが347 nodes / 444 edges（walk 405 / transfer 39）で単一連結になり、全121 Route対応Placeを収録する
- [x] `bun run verify:places`, `bun run verify:routes`, `bun test`, `bun run build`, `git diff --check`, `bun run verify:all`がPASSする
- [x] 幅402pxで新規QR・欠番QR・既存QRとconsole error 0件を確認する
- [x] 会話履歴なしの読み取り専用レビューで指摘なしになる

## DELIVERABLE

変更ファイル、検証PASS/FAIL、Q018欠番・Q075〜Q088追加・物理QR非承認の判断を報告する。コミットは行わない。
