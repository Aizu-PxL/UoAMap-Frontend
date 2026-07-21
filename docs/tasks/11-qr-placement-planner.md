# 11 QR設置計画・対応表出力

## GOAL

ルートノード作図ツール上でQR設置候補を地図と一覧から検討し、作業状態を再編集可能な計画JSONとして保存できるようにする。入力が完成したQRは、バックエンドへそのまま渡せる`QrCode[]`互換JSONとCSVへ全件出力する。

## 参照

- [SPEC.md](../SPEC.md) §3.2、§4、§7
- [API.md](../API.md) `GET /api/qrs/{qrId}`
- [MAP_AUTHORING.md](../MAP_AUTHORING.md)
- `src/data/types.ts` の `QrCode`

## やること

1. RouteノードへQR候補を置くモード、専用マーカー、フロア横断一覧、編集パネルを追加する
2. `Q001`形式の非再利用連番を自動採番し、重複・形式・必須項目を検証する
3. Place未設定ノードへ座標Place案を作り、Routeの`data-place-id`へ反映する
4. 計画JSONの保存・置換読込、`QrCode[]` JSON、同内容CSV、Place案JSONを出力する
5. 既存のノード・エッジ・階段・入口編集とSVG出力を回帰させない

## SCOPE

- `docs/SPEC.md`
- `docs/MAP_AUTHORING.md`
- `docs/STATUS.md`
- `docs/tasks/11-qr-placement-planner.md`
- `tools/route-editor.html`

## 受入基準

- [x] Routeノードを選んでQR候補を作成でき、`Q001`以降が最大番号+1で採番される
- [x] QRマーカーと一覧から候補を選択し、別マップの候補へ移動できる
- [x] 既存Placeを再利用でき、未設定ノードには座標Place案を作成できる
- [x] 計画JSONの保存・再読込でQR候補、Place案、次回採番値が復元される
- [x] 正常時に`QrCode[]` JSON、CSV、Place案JSONを出力でき、不正時は対応表出力を拒否する
- [x] Vite配信で既存の全マップ読込・SVG表示を維持し、単一HTML・FileReaderによる`file://`フォールバックを変更しない
- [x] `bun test`、`bun run build`、`bun run verify:places`、`bun run verify:routes`、`git diff --check`がPASSする

## DELIVERABLE

変更ファイルは本ブリーフのSCOPE内のみ。ブラウザでは全10マップ読込、既存PlaceへのQR配置、Q002削除後にQ003となる非再利用採番、新規座標Place案、別フロアへの配置と一覧移動、計画JSON読込後のQ011採番復元、不正時の出力無効化、正常時の出力有効化、コンソールエラーなしを確認した。

検証結果は`bun test` 39件PASS、`bun run build` PASS、`bun run verify:places` 36件PASS、`bun run verify:routes` 104ノード／112エッジ、`git diff --check` PASS。QR計画はSVGへ埋め込まず計画JSONへ保存し、新規Placeを確定した場合だけRouteノードの`data-place-id`をSVG出力へ反映する。
