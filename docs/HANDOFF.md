# HANDOFF — 次のセッションへの引き継ぎ

最終更新: 2026-08-07(公開QRパス対応)
対象ブランチ: `feature/fixerror`
最新実装ブリーフ: `docs/tasks/32-public-qr-path-alias.md`（未コミット）

## 現在地

Q018をキャンパスSVGのRouteノード`nazonobasyo`（図書館の池前）へ割り当て、追加JSONをフロントの正式モックへ採用した。Q075〜Q088は既存Routeノード14件をPlaceへ登録して再利用し、Q089はイベント会場Place `sh_room_kiyare`を参照する。Placeは89 QR地点、35イベント会場、`campus-all`の124件（Q089のPlaceはイベント会場と共有）で、`campus-all`以外の123 Placeは350ノード・447エッジ（walk 408 / transfer 39）の単一連結グラフに収録される。計画JSONの`nextQrNumber: 91`を維持し、現行配置はQ001〜Q089の89件。計画JSON・Place案JSON・QR対応表は手動同期し、`verify:places`がID・参照・座標の不一致をFAILさせる。

印刷QRの正式URLは`https://uoa-ocmap.com/UoAMap-Frontend/q/:qrId`。アプリ本体のbase pathは`/`を維持し、この公開パスだけを既存`QrLanding`の別名として受理する。アプリ内スキャナーは同一originの正式URLと従来のアプリbase path配下`/q/:qrId`を受理し、スキャン後は内部`/q/:qrId`へ渡す。公開Q001、目的地付き公開Q001、公開Q999、既存Q001の402×874px確認はPASS。本番デプロイと実URL・実機・実印刷受入は未実施。

開始時は `AGENTS.md` → `docs/STATUS.md` → このファイル → `docs/SPEC.md` → `docs/WORKFLOW.md` → `.agent/PLANS.md` → `.agent/refactor-plan.md` の順に読み、作業ツリーと基準コマンドを再確認する。各マイルストーンを `docs/tasks/13x-*.md` の小スライスに分け、検証・STATUS/ExecPlan更新・独立レビューまで閉じる。このリファクタリングではユーザーがスライス単位のgit commitを許可している。

開始プロンプト:

```text
`.agent/refactor-plan.md` のM1〜M8完了を確認し、次に着手する機能を `docs/SPEC.md` と `docs/BACKLOG.md` から選んで別ブリーフを作成してください。本番公開や物理QRの場合は先に `docs/PRODUCTION.md` の人間決定ゲートを確認してください。
```

SPECロードマップのステップ3「ルート」とステップ5「QR/ディープリンク」は完了している。`campus-all`（点ではなくキャンパス全域を表す概念地点）を除く全123 Placeが、350ノード・447エッジの単一連結グラフに収録済み。QRタブから現在地を読み取り、目的地を保持した初回・再スキャンの双方でルートを更新できる。

次のロードマップ実装候補はステップ7の `docs/API.md` 契約に沿ったAPI接続。
並行する公開準備は [PRODUCTION.md](PRODUCTION.md) を正とし、実装前に人間が本番origin、base path、ホスティング所有者、API構成、QR台帳責任者を確定する。URL凍結前にQRを量産しない。

着手前に [STATUS.md](STATUS.md) → このファイル → [SPEC.md](SPEC.md) → [WORKFLOW.md](WORKFLOW.md) → [BACKLOG.md](BACKLOG.md) の順に読むこと。

## 完了したルートスライス

| スライス | 内容 | コミット |
|---|---|---|
| 03d | 複数フロアSVGのRoute抽出基盤 | `b4adaaf` |
| 03e | 学生ホールの屋内外ルート | `73f3647` |
| 03f | UBICの屋内外ルート | `eb6f5c9` |
| 03g | 講義棟1F/2Fと階段接続 | `84ca52e` |
| 03h | LICTiAの屋内外ルート | `4ddbd9b` |
| 03i | 研究棟建物地点・ロボット格納庫・全地点coverage | `0189530` |
| 08 | 講義棟SVGを1F/2Fへ分割し複数フロア専用処理を撤去 | `d6d7915` |

詳細なSCOPE・設計判断・受入結果は `docs/tasks/03d-*.md`〜`03i-*.md` を参照する。

## 完了したQRスライス

### 05a アプリ内QRスキャン

- `qr-scanner` 1.4.2で背面カメラを優先し、QRタブ表示中だけスキャンする
- 同一originかつVite `BASE_URL`配下の`/q/:qrId`、または正式公開パス`/UoAMap-Frontend/q/:qrId`を道案内QRとして受理する。外部origin・その他のパス・空ID・余分なパスは拒否してスキャンを継続する
- 有効なQRは既存クエリを保持して`/q/:qrId`へ渡す。`QrLanding`が`at`だけを置換し、`to`を保持、`focus`を削除する
- QR検出後は重複処理をロックし、画面離脱時はカメラ・Worker・イベントリスナーをdestroyする
- QRタブへ戻った直後のカメラ解放競合には400ms後の自動再試行1回、その後の失敗には日本語エラーと手動再試行を提供する
- Figma Screen/02 QRに合わせ、説明文と254px正方形プレビューを320〜430px幅で維持する
- `qr-scanner`はMITライセンス。アプリ内表示義務はないため画面は追加せず、`public/THIRD_PARTY_NOTICES.txt`を配布物へ同梱する

詳細は `docs/tasks/05a-in-app-qr-scanner.md` を参照する。

## 実装上の要点

- URL状態更新は `src/app/navigationSearch.ts` が正。各関数は入力 `URLSearchParams` を変更せず新しいインスタンスを返し、目的地設定、地点focus、QR解決後の現在地、イベントhighlightの保持・削除規則を統一する
- `MapPanel` の再フォーカスは同モジュールの `createNextMapFocusRequestState` で `mapFocusRequestNonce` を1ずつ増やす。URLが同じでも再フォーカスできる現行挙動を維持する
- MapCanvasのイベントマーカーは共通関数で既存クエリを保持し、`/events?highlight=:eventKey` へ遷移する
- Routeの正は `public/maps/*.svg` の `Route` グループ。生成物は `src/features/routing/generated/routeGraph.json`
- `bun run generate:routes` でSVGからグラフを再生成し、`bun run verify:routes` で生成差分と構造を検証する
- すべての地図を1 SVG = 1 Floorで管理し、Routeグループの`data-floor-id`をシート唯一のFloorと一致させる。詳しい作図契約は [MAP_AUTHORING.md](MAP_AUTHORING.md)
- 03dで導入した複数フロアSVG抽出は08で廃止した。講義棟は`LH1F_base_plain.svg`と`LH2F_base_plain.svg`が正本
- 同じ `data-stair-id` の隣接階ノード間にコスト60、同じ `data-entrance-id` の建物側・キャンパス側ノード間にコスト0のtransfer edgeを生成する
- `MapCanvas` は経路が存在するフロアだけでなく、乗換地点だけを含むフロアも表示対象として扱う
- 最短経路アルゴリズムは `src/features/routing/findShortestRoute.test.ts`、全123 Route対応Place、全ノードの単一連結性、全61イベント地点、全89 QR地点は `src/features/routing/routeGraphCoverage.test.ts` で固定している
- `campus-all` は意図的な唯一のRoute非収録Place。URLで指定されてもクラッシュせず「位置情報なし」として扱う

## 最終検証結果

2026-08-07の公開QRパス対応で以下を確認済み。

```text
bun run verify:all     PASS
bun test               138 tests / 0 fail / 1053 expect() calls
bun run build          PASS（route editor鮮度、strict型検査、Vite build）
bun run verify:routes  350 nodes / 447 edges
bun run verify:places  124 Place / 89 QR / 61 Event
git diff --check       PASS
```

幅402×874pxのブラウザで`/UoAMap-Frontend/q/Q001`、`/UoAMap-Frontend/q/Q001?to=M21`、`/UoAMap-Frontend/q/Q999`、`/q/Q001`を確認し、Q001→`at=main_node_11`、目的地保持、未知QRエラー、既存ルート互換、console error/warn 0件を確認した。

初回の会話履歴なし読み取り専用独立レビューで、残存していた旧QR表記とURL決定手順の矛盾3件をP2として指摘され、仕様・実機受入表・スキャナー説明を修正した。修正後の最終再レビューは指摘なし。

再開時の最低限の健全性確認:

```bash
bun run verify:all
```

## 確定事項と要確認事項

以下は再調査を避けるための判断記録。仕様変更や公式会場図の更新がない限り、確定事項は維持する。

- `campus-all` は面を表す概念地点なのでRoute対象外
- 学生ホール2Fには選択可能なPlaceがなく、中央階段の着地点だけをRouteへ収録
- v1は各建物につき代表となる来場者入口1か所でキャンパスRouteと接続。別入口を追加する場合、SVGごとに座標単位が異なるため、建物内・屋外コストの正規化を先に設計する
- `lictia_room_cswr` は現SVG上の「検証室」と判断した中心座標 `(32.5, 54.6)` に割り当てた。公開前に公式の会場配置と一致するか確認する
- 89件（Q001〜Q089）はフロント用モックとして確定したが、物理QRの量産・設置承認ではない。本番originと現地受入は`docs/PRODUCTION.md`のゲートに従う
- テキストによる曲がり方・所要時間案内はSPEC上の将来拡張であり、ステップ3の未実装ではない

## SVG編集時の注意

- 既存要素・既存ID・座標系は読み取り専用。編集してよいのは `Route` グループだけ
- Placeとの紐付けキーを壊さない
- Routeを変更したら生成JSONを更新し、ルート4ゲート（test / verify:routes / verify:places / build）を必ず通す
- Routeの`data-floor-id`はSVG直下のRouteグループへ設定し、子ノード・エッジには重複指定しない
