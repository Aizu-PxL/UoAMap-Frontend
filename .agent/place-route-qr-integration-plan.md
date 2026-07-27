# Place・Route・QR計画JSON統合 ExecPlan

このExecPlanは `.agent/PLANS.md` に従う生きた計画であり、74件のQR地点、イベント会場、新Route、Q001〜Q074を一貫したPlace語彙へ移行する。

## 目的と期待する結果

`uoamap-place-proposals.json` の74座標Placeと、60イベントが利用する34会場Place、概念地点`campus-all`を109件のPlaceレジストリへ統合する。`uoamap-qr-placement-plan.json`とランタイム用QR対応表を今回の作業で手動同期し、旧Place IDを新Routeノード形式へ置換する。完成時は`campus-all`以外の108 Placeが336ノード／425エッジの単一連結Routeグラフへ収録される。

## 現状と問題

- 開始時点は`feature/setMap`の`c8589a2`。既存差分は未追跡`uoamap-place-proposals.json`のみ。
- 10 SVGのRouteには74個の新`data-place-id`があるが、`src/data/places.ts`は旧39 Placeのため`verify:routes`と実SVG抽出テストが失敗する。
- コミット済み`routeGraph.json`は旧104ノード／112エッジ、QRモックは旧Q001〜Q003のままで、新SVG・計画JSONと同期していない。
- 74 Place案はQR設置地点だけであり、研究室・講義室等のイベント会場を含まない。

## SCOPEと非目標

変更対象は、Place/QR/Eventの静的データ、`uoamap-*.json`、9枚のSVGのRouteグループ、生成Routeグラフ、データ・Route検証、関連テスト、仕様・運用文書に限定する。Route外のSVG、React UI、Repository/APIの型、URLクエリ形式、Figma、依存パッケージ、本番公開・QR印刷は変更しない。Gitのcheckout/reset/stash/commitは行わない。

## 維持・変更する契約

- `Place`、`QrCode`、Repository、`/q`・`/p`・`/e`、`at`・`to`・`focus`の形式は維持する。
- Place ID語彙は破壊的に更新し、旧IDエイリアスは設けない。Event ID、内容、時刻は維持する。
- 計画JSONは74 placements／74 placeProposals／`nextQrNumber: 75`を維持し、ランタイムデータとは自動連動させない。検証は不一致をFAILさせる。
- `campus-all`だけをRoute非対応Placeとして維持する。

## 実装順序

1. `docs/tasks/14-place-route-qr-integration.md` とSPEC/APIで新契約を固定する。
2. Place案・QR対応表・イベント参照を新IDへ移行し、Q034表記を全JSONで修正する。
3. 31既存RouteノードへPlaceを結び、M8・受付・3Dシアターの専用ノードとエッジを追加する。
4. Routeグラフを再生成し、`verify:places`とcoverageを109/108 Place・336/425 graphへ更新する。
5. 全ゲート、幅402pxブラウザ受入、STATUS/HANDOFF更新、履歴なし独立レビューを完了する。

## 受入基準

- `bun run verify:places`、`bun run verify:routes`、`bun test`、`bun run build`、`git diff --check`、`bun run verify:all`がPASSする。
- Place 109件、Route対応Place 108件、Event 60件、QR 74件が相互参照整合する。
- Routeグラフが336 nodes / 425 edges（walk 387 / transfer 38）の単一連結成分になる。
- 幅402pxでQ001→M21、Q034→U1、受付、3Dシアター、P1 highlight、未知QRを確認し、console errorが0件になる。
- 会話履歴なしの読み取り専用レビューで指摘なしになる。

## 進捗

- [x] 2026-07-28: 現行checkout、74 Place案、74 QR計画、新SVG、旧生成グラフの不整合を再確認。
- [x] 2026-07-28: 109 Place、Q001〜Q074、60 Event、新Route IDへ移行し、Q034を3 JSONで統一。
- [x] 2026-07-28: 31既存ノードと3専用ノードを統合し、336/425グラフを再生成。自動検証と幅402pxブラウザ受入を完了。
- [x] 2026-07-28: 初回独立レビューのP2（Event ID重複検出）を修正し、別コンテキストの再レビューで指摘なし。

## 判断・代替案

- 74 Place案だけで旧Placeを置換する案はイベント会場を失うため不採用。意味付きRouteノード31件と専用ノード3件を会場Placeとして補完する。
- 旧Place ID互換を残す案はユーザー選択により不採用。新Routeノード形式へ移行する。
- 計画JSONをランタイムの正にする案、生成コマンドで自動同期する案はユーザー選択により不採用。今回は計画・出力・コードを手動同期し、検証で差異を検出する。

## 最終結果・残存リスク

109 Place / 74 QR / 60 Eventと336 nodes / 425 edges（walk 387 / transfer 38）へ移行した。107 tests / 927 assertions、build、Place/Route検証、幅402pxのQ001・Q034・受付・3Dシアター・P1・未知QRでPASSし、console errorは0件。初回独立レビューのP2（Event ID重複検出）を修正し、別コンテキストの再レビューで指摘なし。物理QRの設置位置承認、本番origin、印刷・実機受入は`docs/PRODUCTION.md`の未解決ゲートとして残す。
