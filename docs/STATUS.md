# STATUS — いまどこまでできているか

最終更新: 2026-07-22(リポジトリ横断リファクタリングM7完了)
**更新タイミング**: スライス(docs/tasks/のブリーフ1本)完了ごと、またはロードマップのステップ完了時に必ず更新する。

新しいセッション・別のエージェントは、まずこのファイル → [HANDOFF.md](HANDOFF.md) → [SPEC.md](SPEC.md) → [WORKFLOW.md](WORKFLOW.md) → [BACKLOG.md](BACKLOG.md) の順に読めば作業を再開できる。

## ロードマップ進捗(SPEC.md §6)

| # | ステップ | 状態 | 備考 |
|---|---|---|---|
| 1 | 土台(型・モック・リポジトリ層・Router・feature構成) | ✅ 完了 | |
| 2 | 地図表示 | ✅ 完了 | ブリーフ: docs/tasks/02a〜02d + UI修正02e〜02h(建物枠線・フロア切替viewBox維持・イベントマーカー・視認性とピン置換)。各レビュー指摘も修正済み。ビジュアル刷新04〜06、横長固定サイズ補正07、講義棟フロア別SVG化08、パン座標補正09、オーバーレイアンカー固定10も完了 |
| 3 | ルート | ✅ 完了 | 03a〜03i。`campus-all`(全域概念)を除く全38 Placeを104ノード/112エッジの単一連結グラフへ収録。全イベント地点・Q001〜Q003地点をcoverageテストで固定 |
| 4 | イベント検索 | ✅ 完了 | 検索・タグ絞り込み・詳細・「ここへ行く」 |
| 5 | QR/ディープリンク | ✅ 完了 | `/q`・`/p`・`/e` の正規化、アプリ内カメラスキャン、`to`保持での再スキャン、エラー復旧を実装 |
| 6 | スケジュール | ✅ 完了 | PDF画像表示(public/schedule/) |
| 7 | API接続 | ⬜ 未着手 | 契約は docs/API.md。現在はモック(src/data/mock/) |

最新ルート実装コミット: `0189530 全案内地点のルート対応を完了`

## リポジトリ横断リファクタリング

本体コードを一括変更せず、小スライスで進めるための準備を `docs/tasks/13a-refactor-preparation.md` で行い、M1を `docs/tasks/13b-navigation-search-refactor.md`、M2を `docs/tasks/13c-route-presentation.md` で完了した。

- ExecPlan規約: `.agent/PLANS.md`
- 現行コードの監査根拠・実装順・受入基準: `.agent/refactor-plan.md`
- リポジトリ固有Codex設定の非適用サンプル: `.codex/config.toml.example`
- M1: `src/app/navigationSearch.ts` に目的地、地点focus、QR解決後の現在地、イベントhighlight、再フォーカスnonceの純粋な更新規則を集約
- M1テスト: 入力非破壊、無関係なクエリ保持、`to`保持、`focus`削除、MapCanvasから `/events?highlight=...` への遷移規則を6件のcharacterization testで固定
- M2: `createRoutePresentation(routeEdges, routeNodes)` でroute floor、フロア別walk edge、transfer nodeを一度だけ導出し、`MapCanvas` から生成 `routeGraph` の直接参照を除去
- M2テスト: transfer-onlyフロア、transfer node重複排除、未知endpoint無視、実グラフの正逆経路を4件のcharacterization testで固定
- M2検証: 49 tests / 412 assertions、104 nodes / 112 edges、36 places、build、幅402pxの複数階・建物横断・逆向き、console error 0件
- M2レビュー: P2 2件と検証件数のP3を解消し、最終独立レビューで指摘なし
- M3 13d: `src/features/map/mapViewBox.ts` へviewBox解析・fallback・focus・anchor zoom・pan・フロア間比例変換・文字列化を純粋関数として抽出。`getScreenCTM().inverse()` とgesture/SVG load所有はMapCanvasに維持
- M3 13d検証: 57 tests / 424 assertions、104 nodes / 112 edges、36 places、build、402px / 1440×900 live resize、focus、フロア切替、wheel、Ctrl+wheel pinch相当、pan、console error 0件
- M3 13dレビュー: 会話履歴なし読み取り専用レビューで指摘なし
- M3 13e: overlay再生成キーをviewBox width/heightとcontainer width/heightだけから導出し、pan中のx/y変更では元SVGと3 overlayのviewBox属性だけを同期
- M3 13e検証: 60 tests / 427 assertions、104 nodes / 112 edges、36 places、build、402px / 1440×900でpan時のroute/label/marker子HTML不変、zoom/resize時の画面固定サイズ更新、console error 0件
- M3 13eレビュー: 会話履歴なし読み取り専用レビューで指摘なし
- M3 13f: `createMapMarkerPresentation` へ同一placeの先頭イベント代表、キャンパス建物・屋外place集約、pin優先、event→current→destination→focusの描画順、floor/event actionを抽出。座標・floor→sheet・place resolverを注入し、DOM生成とRouter遷移はMapCanvasに維持
- M3 13f検証: 64 tests / 431 assertions、104 nodes / 112 edges、36 places、build、幅402pxで建物badge、同一place集約、floor/event action、既存クエリ保持、pin優先と描画順、console error 0件
- M3 13fレビュー: 会話履歴なし読み取り専用レビューで指摘なし。M3完了
- M4 13g: `DataProvider` にRepositoryを注入し、Provider単位のmemoized loader、Repository context、`useRepository()` を追加。Appが`mockRepository`を選択し、QrLandingも同じ注入Repositoryを利用。具体singleton exportを削除
- M4 13g検証: 67 tests / 438 assertions、104 nodes / 112 edges、36 places、build、幅402pxで `/q/Q003?to=M21` 成功・未知QR・注入Repository失敗、既存クエリ保持、console error 0件
- M4 13gレビュー: 会話履歴なし読み取り専用レビューで指摘なし。M4完了
- M5 13h: 地点名resolverを受け取る `filterEventsByCriteria` へID・タイトル・説明・地点名の部分一致とタグAND条件を抽出。trim、大文字小文字、空白のみ、未知タグ、未知地点、入力順維持を固定し、highlight/scroll処理は不変
- M5 13h検証: 71 tests / 447 assertions、104 nodes / 112 edges、36 places、build、幅402pxで「AI」7件、研究室公開併用5件、0件表示、`highlight=P20` 対象カード、console error 0件
- M5 13hレビュー: P3文書参照を修正し、再レビューで指摘なし
- M5 13i: BottomSheetのURL依存を `expandRequestKey` propへ置換し、AppLayoutがhighlightを渡す。22/58/82svhのclamp・drag換算・nearest・double-click・展開を純粋化し、window pointer listenerを削除してcapture済みdrag-zone handlerへ集約
- M5 13i検証: 76 tests / 454 assertions、104 nodes / 112 edges、36 places、build、幅402pxでdouble-click 58→82→22→58、marker highlightで22→58展開、console error 0件。pointer drag計算は純粋テストで上下clamp・snapを確認
- M5 13iレビュー: 会話履歴なし読み取り専用レビューで指摘なし。M5完了
- M6 13j: `extractRouteGraph({sources,mapSheets,floors,places})` とserializerへ解析・検証・stair/entrance transfer・sortを移し、CLIをI/O・`--check`・表示・終了だけに縮小。`@types/bun@1.3.14` とscripts/tools strict tsconfigをbuildへ追加
- M6 13j検証: 84 tests / 477 assertions、104 nodes / 112 edges、36 places、build。実10 SVGの生成JSON完全バイト一致、主要な不正fixture、generate後のJSON差分ゼロ、git diff --checkを確認
- M6 13jレビュー: P3のSCOPE記載漏れを修正し、再レビューで指摘なし。M6完了
- M7 13k: route editorのmap/floor設定を `tools/route-editor/config.ts` へ移し、places/mapSheets/floors・全10 SVGとの同期を自動検証。Bun IIFEをHTML markerへ埋め込むgenerate/checkとbuild鮮度検証を追加し、単一HTML・外部scriptなしを維持
- M7 13k検証: 88 tests / 488 assertions、`verify:route-editor`、104 nodes / 112 edges、36 places、build、git diff --checkがPASS。Vite配信で起動・代表モード切替・console error 0件を確認。Browser security policyとファイル入力API制約により、`file://`と全10 SVGのブラウザ自動取込は未実施。単一HTML、外部scriptなし、全10ファイル同期、生成鮮度は自動検証済み
- M7 13kレビュー: P2のFloor短縮表示名同期を純粋規則と全Floor assertionで修正し、再レビューで指摘なし。13k完了
- M7 13l: schema v1計画JSON、QrCode JSON、BOM/CRLF CSV、座標Place案の構築・parse・文字列化をpure coreへ移し、generated IIFE globalからinline editorへ接続。情報用floor/x/yは保存するが読込時はSVGノードを正として無視する契約を維持
- M7 13l検証: plan I/O 6 tests / 20 assertions、全体94 tests / 508 assertions、`verify:route-editor`、104 nodes / 112 edges、36 places、build、git diff --checkがPASS。Vite配信でgenerated core初期化、QRモード切替、空計画JSON保存、console error 0件を確認。Browser file input API制約により計画JSON再読込のブラウザ自動操作は未実施し、pure parse exact testで補完
- M7 13lレビュー: P2のnull要素受理とP3の既知sheet・未知nodeのfloor消失を修正し、再レビューで指摘なし。13l完了
- M7 13m: history state作成・record・undo・redo・resetとeditable snapshot比較をimmutable pure state machineへ移動。selection/current sheetをno-op判定から除外し、nextQrNumberをsnapshot外のまま維持。inline editorにはsnapshot採取・復元とdrag/continuous-input境界を残した
- M7 13m検証: history 6 tests / 28 assertions、全体100 tests / 536 assertions、`verify:route-editor`、104 nodes / 112 edges、36 places、build、git diff --checkがPASS。Vite配信で全10 SVG読込、QR追加→Undo→Redo→Undo、再追加Q002による連番非巻戻し、console error 0件を確認
- M7 13mレビュー: P3のlimit=0上限不整合を正の整数制約と0/1境界testで修正し、再レビューで指摘なし。13m完了
- M7 13n: Route group生成、attribute escape、座標3桁format、既存Route置換、未存在時appendをpure coreへ移動。inline editorはMapState配列化とBlob/downloadだけを担当し、partial-load簡易検証と正式抽出器は共通化していない
- M7 13n検証: Route XML 5 tests / 15 assertions、全体105 tests / 551 assertions、`verify:route-editor`、104 nodes / 112 edges、36 places、build、git diff --checkがPASS。Vite配信で全10 SVG読込、キャンパスSVG download、console error 0件を確認
- M7 13nレビュー: P3のindent fallback・空optional test不足を3種fallbackのexact assertionで修正し、再レビューで指摘なし。13nとM7完了
- 次の開始位置: M8の `13o-refactor-final-integration`

リファクタリングは外部仕様、URL状態、Repository/API契約、Figma UI、SVG ID、生成データ形式を変更しない。マイルストーンごとに `docs/tasks/13x-*.md` を作り、通常の検証ゲートと独立レビューを完了してから次へ進む。

## 本番公開準備

[PRODUCTION.md](PRODUCTION.md) に、本番URLの凍結、デプロイ、実印刷QR、iPhone/Android実機受入、量産・設置、当日運用までのゲートを定義した。
現時点では**計画のみ**で、ホスティング先・本番URL・API本番環境・QR設置一覧は未確定。本番公開と実機受入は未実施。

人間による決定・作業が必要な項目:

- 公式ドメイン、DNS、ホスティング組織、所有者、デプロイ承認者
- バックエンド本番環境、CORS/同一origin構成、データ更新権限
- QR設置地点の確定、出力した対応表・設置台帳の承認、実印刷、物理設置、Go/No-Go判断

実装再開時は、先に `docs/PRODUCTION.md` §3を埋め、API接続・ホスティング設定・公開受入を必要に応じて別々のブリーフへ分ける。

## QR設置計画ツール

`tools/route-editor.html` に、RouteノードへQR候補を配置するモード、地図マーカー、フロア横断一覧、`Q001`からの非再利用連番、新規座標Place案を追加した。作業状態はSVGと分離した計画JSONで保存・再読込でき、検証PASS後にバックエンド向け`QrCode[]` JSON、同内容CSV、Place案JSONを出力する。

QR候補は歩行可能なRouteノードにのみ置き、既存Placeを再利用するか、ノード座標からPlace案を作る。候補／確定ステータスは設けず、登録済み候補を全件出力する。実際の設置地点選定、印刷、現地受入は引き続き人間の作業であり未実施。

ルートエディタのノード・エッジ・入口・階段・Route floor・QR候補・Place案・計画JSON読込は、セッション内で最大100操作のUndo / Redoに対応した。ツールバーボタンに加えて`Ctrl/Cmd + Z`、`Ctrl/Cmd + Shift + Z`、`Ctrl + Y`を使用でき、ドラッグと連続入力は各1操作として扱う。自動採番の上限は巻き戻さず、SVGダウンロード後も保存済みRoute状態との差から未保存表示を再計算する。SVG再読込時は履歴を初期化する。

## 動作確認手順(検証ゲート)

```bash
bun run dev            # dev server(ポート5173)
bun test               # 純粋ロジックの単体テスト
bun run build          # tsc -b + vite build。型チェックを兼ねる
bun run verify:places  # places.tsのSVG紐付け検証。36件PASSが正常
bun run verify:routes  # SVGのRouteグラフが生成結果と一致することを確認
```

ブラウザは**幅402px**(iPhone 17)で確認する。検証用URLと期待挙動:
ラベル・マーカーの固定サイズを変更した場合は、追加で**1440×900**と再読み込みなしの幅変更も確認する。

| URL | 期待挙動 |
|---|---|
| `/` | キャンパス全体図。パン・ズーム可。建物(研究棟/学生ホール/講義棟/UBIC/LICTiA)タップで建物フロアへ |
| `/?to=A1` | 講堂へフォーカス+赤ピン(目的地)。シートに「目的地へ」ボタン |
| `/?at=sh-cafeteria` | 学生ホール1Fへ自動切替+現在地ピン(人型) |
| `/?focus=lh-m8` | 講義棟1FのM8へフォーカス+アクセント色ピン |
| `/?at=campus-all` | unmapped地点。クラッシュせず「(位置情報なし)」表示 |
| `/?at=rq1-161&to=P1` | 研究棟1Fへ切替し、161から104Fまでの最短ルート線+両ピン |
| `/?at=rq1-127&to=P3` | 研究棟1Fへ切替し、127から144Fまでの最短ルート線+両ピン |
| `/?at=rq1-161&to=P12` | 研究棟3Fへ切替し、1F→2F→3Fの最短経路。表示中フロアのルート線+乗換マーカー、1F/2F/3Fボタンすべてにルートインジケータ |
| `/?at=rq3-325f&to=A1` | キャンパス図へ切替し、研究棟3F→階段→西側出入口→屋外歩行者路→講堂の最短経路。研究棟を開くと1F/2F/3Fとキャンパス戻りにルートインジケータ |
| `/?at=auditorium&to=P12` | 研究棟3Fへ切替し、講堂から研究棟3F 325Fまで同じキャンパス横断経路を逆方向に表示 |
| `/?at=sh-hall&to=S` | 学生ホール1Fでホールから売店までの室内ルート線を表示 |
| `/?at=rq1-161&to=W` | 学生ホール1Fへ切替し、研究棟161から食堂まで研究棟入口・キャンパス・学生ホール入口を通る経路を表示 |
| `/?at=ubic-3d-theater&to=P18` | UBIC内で3Dシアターから研究ラボエリアまでの室内ルート線を表示 |
| `/?at=rq1-161&to=P19` | UBICへ切替し、研究棟161から運動解析ルームまで研究棟入口・キャンパス・UBIC入口を通る経路を表示 |
| `/q/Q003?to=M21` | `at=lh-large`へ正規化し、講義棟1F大講義室から2F M2まで東側階段を通る経路を表示。1F/2F双方にインジケータ |
| `/qr?to=M21` | 背面カメラを起動。Q003を読むと`at=lh-large`でルート表示。QRタブへ戻ってQ001を読むと`to=M21`のまま`at=sh-hall`へ更新し、キャンパス横断ルートを再計算 |
| `/?at=rq1-161&to=M21` | 講義棟2Fへ切替し、研究棟161からM2まで研究棟入口・キャンパス・講義棟入口・階段を通る経路を表示 |
| `/?at=lictia-innovation&to=P20` | LICTiA内でイノベーション創出スペースから箱庭チャンバー室までの室内ルート線と両ピンを表示 |
| `/?at=rq1-161&to=P21` | LICTiAへ切替し、研究棟161からイノベーション創出スペースまでキャンパス北側経路を通って表示 |
| `/?at=rq1-161&to=P22` | キャンパス図へ切替し、研究棟161からロボット格納庫まで屋外経路を表示 |
| `/?at=robot-garage&to=P12` | 研究棟3Fへ切替し、ロボット格納庫から研究棟325Fまで逆方向の屋外・入口・階段経路を表示 |
| `/events` | 検索タブ。テキスト+タグで絞り込み、カード→詳細→「ここへ行く」 |
| `/events?highlight=T3` | 該当イベントカードがアクセント色枠で強調され、リスト内の位置まで自動スクロール |
| `/` のイベントマーカー | 開催地(表示中フロア)に白背景の黒い人型バッジ。タップで `/events?highlight=:id` へ(at/to保持)。同じ地点に現在地・目的地・注目ピンがあればピンだけ表示 |
| `/schedule` | タイムスケジュールPDF画像 |

## アーキテクチャ要点(触る前に知るべきこと)

- **地図SVGはReact非管理DOM**: `MapCanvas` は SVG を `svgHostRef`(専用div)内に `DOMParser`+`replaceChildren` で挿入する。**React管理下の要素とSVG DOMを混ぜない**こと(混ぜるとReactの再レンダーでクラッシュする)。SVG要素へのイベントは addEventListener + クリーンアップで管理
- **URLが状態の正**(SPEC §5.2): 現在地`at`/目的地`to`/注目`focus`はURLクエリ。フォーカス優先順位は focus > to > at。「現在地へ/目的地へ」の再フォーカスも `focus=` クエリを書く方式(コンポーネントstateに逃がさない)
- **アプリ内QRスキャン**: `qr-scanner`で背面カメラを優先し、同一origin・`BASE_URL`配下の`/q/:qrId`だけを受理する。読み取り後は既存クエリを保持して`/q/:qrId`へ渡し、`QrLanding`が`at`を置換・`focus`を削除・`to`を保持する。画面離脱時はscannerをdestroyし、カメラ再取得の一時競合には400ms後の自動再試行1回+手動再試行で復旧する
- **フロア切替**: floors(src/data/places.ts)がfloorId→sheetIdを解決。全フロアを1 SVG = 1 MapSheetで管理し、同一建物内の切替も共通のシート読込処理を使う
- **places.ts が地点語彙の正**: 全39 Placeの内訳はSVG要素への紐付け36件、座標アンカー2件、意図的unmapped 1件(`campus-all`)。**変更したら必ず `bun run verify:places`**
- **座標変換**: スクリーン→SVG座標は `getScreenCTM().inverse()` を使う(コンテナ矩形の線形換算はレターボックス余白でずれるため禁止)。Place位置解決は `src/features/map/placeLocator.ts`(getBBox+CTM)
- **パン操作**: ドラッグ開始時の `getScreenCTM().inverse()` をジェスチャー中固定し、開始点と現在点のSVG座標差でviewBoxを移動する。`viewBox幅/コンテナ幅`・`viewBox高さ/コンテナ高さ`の軸別換算は、`xMidYMid meet` の余白がある横長SVGで縦移動量が不足するため使わない
- **ラベル・マーカー固定サイズ**: `preserveAspectRatio="xMidYMid meet"` に合わせ、`max(viewBox幅/コンテナ幅, viewBox高さ/コンテナ高さ)` で逆スケールする。コンテナ寸法は`ResizeObserver`で追従し、横長画面や実行中の幅変更でも画面上サイズを維持する。ラベルは元SVGのBBox中心へ中央揃えし、表示中マーカーの実表示範囲と交差するものだけを一時非表示にする
- **マーカー**: React非管理のオーバーレイSVGレイヤー。イベント円の中心／水滴ピンの先端をPlace座標へ固定し、画面px固定の位置オフセットは加えない。ズームしても画面上サイズ一定になるよう逆スケール補正し、イベント開催地マーカーは同一placeIdで1つに集約する。タップで `/events?highlight=:eventId`(先頭イベント代表)へ遷移し、同じ地点に現在地・目的地・注目ピンがある場合はイベントマーカーを生成せず、ピンだけを表示
- **ルート**: `public/maps/` の `Route` グループを `scripts/extract-routes.ts` が `src/features/routing/generated/routeGraph.json` へ抽出する。作図契約は `docs/MAP_AUTHORING.md`。探索はフロントのDijkstra、描画はベースSVGとマーカーの間にある独立オーバーレイSVG。`campus-all`を除く全38 Placeを104ノード/112エッジの単一連結グラフへ収録し、全イベント地点とQ001〜Q003をcoverageテストで固定。同じ`data-stair-id`を持つ隣接階ノード間へ固定コスト60、建物・キャンパス両側の同じ`data-entrance-id`間へコスト0のtransferエッジを生成する。floorIdは各SVG直下のRouteグループから抽出する
- **フロア切替のviewBox引き継ぎ**: 同一建物内の切替は「シート全体に対する相対位置・相対ズーム」を比例マッピングして維持(フロア間で座標系が揃っていないため絶対座標は使えない)。キャンパス⇄建物は全体表示リセット。RQ2FはviewBox属性が無いためwidth/height属性からフォールバック構成
- **scrollIntoViewは `behavior:"auto"`**: smoothはバックグラウンドタブでアニメーションが進まず止まることがあるため使わない

## 既知の注意(再発防止ルール)

- **実装エージェント(Codex等)にgit操作をさせない**(checkout/reset/stash禁止)。過去に作業ツリーの他ファイルの変更が巻き戻される事故が発生した。ディスパッチ後は `bun run verify:places` で36件PASSを必ず確認する
- SVG(`public/maps/`)は `Route` グループの追加・編集のみ可。既存要素・IDは読み取り専用でデータとの紐付けキー(AGENTS.md参照)
- ボトムシートの高さはCSS変数 `--bottom-sheet-height`(共通祖先にセット)。地図上のUIはこれを参照して位置決めする(58svh等の直書き禁止)
- カメラは本番ではHTTPSのsecure contextが必須。`qr-scanner`のMIT通知は`public/THIRD_PARTY_NOTICES.txt`として配布物へ同梱する(アプリ内ライセンス画面は不要)
