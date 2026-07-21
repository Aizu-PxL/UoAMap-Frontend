# HANDOFF — 次のセッションへの引き継ぎ

最終更新: 2026-07-21(講義棟SVGをフロア別分割)
対象ブランチ: `feature/takami-makeFront`
ルート実装の基準コミット: `0189530 全案内地点のルート対応を完了`

## 現在地

SPECロードマップのステップ3「ルート」とステップ5「QR/ディープリンク」は完了している。`campus-all`（点ではなくキャンパス全域を表す概念地点）を除く全38 Placeが、104ノード・112エッジの単一連結グラフに収録済み。QRタブから現在地を読み取り、目的地を保持した初回・再スキャンの双方でルートを更新できる。

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
| 08 | 講義棟SVGを1F/2Fへ分割し複数フロア専用処理を撤去 | 未コミット |

詳細なSCOPE・設計判断・受入結果は `docs/tasks/03d-*.md`〜`03i-*.md` を参照する。

## 完了したQRスライス

### 05a アプリ内QRスキャン

- `qr-scanner` 1.4.2で背面カメラを優先し、QRタブ表示中だけスキャンする
- 同一originかつVite `BASE_URL`配下の`/q/:qrId`だけを道案内QRとして受理する。外部origin・別パス・空ID・余分なパスは拒否してスキャンを継続する
- 有効なQRは既存クエリを保持して`/q/:qrId`へ渡す。`QrLanding`が`at`だけを置換し、`to`を保持、`focus`を削除する
- QR検出後は重複処理をロックし、画面離脱時はカメラ・Worker・イベントリスナーをdestroyする
- QRタブへ戻った直後のカメラ解放競合には400ms後の自動再試行1回、その後の失敗には日本語エラーと手動再試行を提供する
- Figma Screen/02 QRに合わせ、説明文と254px正方形プレビューを320〜430px幅で維持する
- `qr-scanner`はMITライセンス。アプリ内表示義務はないため画面は追加せず、`public/THIRD_PARTY_NOTICES.txt`を配布物へ同梱する

詳細は `docs/tasks/05a-in-app-qr-scanner.md` を参照する。

## 実装上の要点

- Routeの正は `public/maps/*.svg` の `Route` グループ。生成物は `src/features/routing/generated/routeGraph.json`
- `bun run generate:routes` でSVGからグラフを再生成し、`bun run verify:routes` で生成差分と構造を検証する
- すべての地図を1 SVG = 1 Floorで管理し、Routeグループの`data-floor-id`をシート唯一のFloorと一致させる。詳しい作図契約は [MAP_AUTHORING.md](MAP_AUTHORING.md)
- 03dで導入した複数フロアSVG抽出は08で廃止した。講義棟は`LH1F_base_plain.svg`と`LH2F_base_plain.svg`が正本
- 同じ `data-stair-id` の隣接階ノード間にコスト60、同じ `data-entrance-id` の建物側・キャンパス側ノード間にコスト0のtransfer edgeを生成する
- `MapCanvas` は経路が存在するフロアだけでなく、乗換地点だけを含むフロアも表示対象として扱う
- 全Place coverage、全ノードの単一連結性、全イベント地点、Q001〜Q003は `src/features/routing/findShortestRoute.test.ts` で固定している
- `campus-all` は意図的な唯一のRoute非収録Place。URLで指定されてもクラッシュせず「位置情報なし」として扱う

## 最終検証結果

2026-07-21時点で以下を確認済み。

```text
bun test               36 tests / 0 fail / 367 expect() calls
bun run verify:routes  104 nodes / 112 edges
bun run verify:places  36件すべてPASS
bun run build          PASS（tsc -bを含む）
git diff --check       PASS
```

幅402pxのブラウザで学生ホール、UBIC、講義棟、LICTiA、ロボット格納庫について建物内経路と他建物からの横断経路を確認済み。05aでは実QR画像からQ003 URLを復号し、`to=M21`を保持した初回スキャン（`at=lh-large`）と再スキャン（`at=sh-hall`）で経路が講義棟内からキャンパス横断へ更新されること、`focus`解除、カメラ再起動・再試行、コンソールエラーなしを確認した。QR画面は幅320px・402px・430pxで254px正方形を維持し、横スクロールなし。代表URLは [STATUS.md](STATUS.md) の検証表に掲載している。

08では講義棟を1F/2Fの別SVGへ分割し、幅402px・1440×900と再読み込みなしの幅変更で表示・ルート・マーカー・ラベルを確認した。ルート編集ツールは全10マップを読み込み、講義棟1F/2Fを個別に検証できる。Routeグラフは104ノード/112エッジのまま変更なし。

再開時の最低限の健全性確認:

```bash
bun test
bun run verify:routes
bun run verify:places
bun run build
git diff --check
```

## 確定事項と要確認事項

以下は再調査を避けるための判断記録。仕様変更や公式会場図の更新がない限り、確定事項は維持する。

- `campus-all` は面を表す概念地点なのでRoute対象外
- 学生ホール2Fには選択可能なPlaceがなく、中央階段の着地点だけをRouteへ収録
- v1は各建物につき代表となる来場者入口1か所でキャンパスRouteと接続。別入口を追加する場合、SVGごとに座標単位が異なるため、建物内・屋外コストの正規化を先に設計する
- `lictia-chamber` は現SVG上の「検証室」と判断した中心座標 `(32.5, 54.6)` に割り当てた。公開前に公式の会場配置と一致するか確認する
- Q002のPlace `ubic` は、現時点ではUBICのキャンパス側代表入口へ案内する。QRの実設置位置が決まったら屋内の正確な現在地に変更するか判断する
- テキストによる曲がり方・所要時間案内はSPEC上の将来拡張であり、ステップ3の未実装ではない

## SVG編集時の注意

- 既存要素・既存ID・座標系は読み取り専用。編集してよいのは `Route` グループだけ
- Placeとの紐付けキーを壊さない
- Routeを変更したら生成JSONを更新し、ルート4ゲート（test / verify:routes / verify:places / build）を必ず通す
- Routeの`data-floor-id`はSVG直下のRouteグループへ設定し、子ノード・エッジには重複指定しない
