# STATUS — いまどこまでできているか

最終更新: 2026-08-06(きやれイベント／Q089データ同期)
**更新タイミング**: スライス(docs/tasks/のブリーフ1本)完了ごと、またはロードマップのステップ完了時に必ず更新する。

新しいセッション・別のエージェントは、まずこのファイル → [HANDOFF.md](HANDOFF.md) → [SPEC.md](SPEC.md) → [WORKFLOW.md](WORKFLOW.md) → [BACKLOG.md](BACKLOG.md) の順に読めば作業を再開できる。

## ロードマップ進捗(SPEC.md §6)

| # | ステップ | 状態 | 備考 |
|---|---|---|---|
| 1 | 土台(型・モック・リポジトリ層・Router・feature構成) | ✅ 完了 | |
| 2 | 地図表示 | ✅ 完了 | ブリーフ: docs/tasks/02a〜02d + UI修正02e〜02h(建物枠線・フロア切替viewBox維持・イベントマーカー・視認性とピン置換)。各レビュー指摘も修正済み。ビジュアル刷新04〜06、横長固定サイズ補正07、講義棟フロア別SVG化08、パン座標補正09、オーバーレイアンカー固定10も完了 |
| 3 | ルート | ✅ 完了 | 03a〜03i + 14 + 19 + 21。`campus-all`(全域概念)を除く全122 Placeを348ノード/445エッジの単一連結グラフへ収録。全61イベント地点・88 QR地点をcoverageテストで固定 |
| 4 | イベント検索 | ✅ 完了 | 検索・タグ絞り込み・詳細・「ここへ行く」 |
| 5 | QR/ディープリンク | ✅ 完了 | `/q`・`/p`・`/e` の正規化、アプリ内カメラスキャン、`to`保持での再スキャン、エラー復旧を実装 |
| 6 | スケジュール | ✅ 完了 | 画像表示と全画面拡大(public/schedule/) |
| 7 | API接続 | ⬜ 未着手 | 契約は docs/API.md。現在はモック(src/data/mock/) |

最新ルート実装: `docs/tasks/14-place-route-qr-integration.md`（未コミット）

最新公開設定ブリーフ: `docs/tasks/15-github-pages-mock-deployment.md`（未コミット）

最新UX検討ブリーフ: `docs/tasks/16-figma-ux-demo.md`（未コミット）

最新イベントデータブリーフ: `docs/tasks/17-open-campus-2026-data.md`（未コミット）

最新モバイル地図UXブリーフ: `docs/tasks/18-mobile-map-ux-adjustments.md`（未コミット）

最新QR対応表ブリーフ: `docs/tasks/19-qr-mapping-refresh.md`（未コミット）

最新地図回帰修正ブリーフ: `docs/tasks/20-map-focus-event-marker-regressions.md`（未コミット）

最新きやれ／Q089データ同期ブリーフ: `docs/tasks/21-kiyare-data-sync.md`（未コミット）

## きやれイベント／Q089データ同期

運営Event `service-map-guide` を正式IDなし・タグなしの内部keyへ修正し、イベント会場Place「きやれ」(`sh_room_kiyare`)を登録した。Q089はこのPlaceを参照し、Place 123件、QR 88件、Event 61件へ同期した。Q089のPlaceはイベント会場と共有するため、一意なPlace件数に重複はない。

学生ホールのRoute正本からグラフを再生成し、`campus-all`を除く122 Placeを348 nodes / 445 edges（walk 406 / transfer 39）の単一連結グラフへ収録した。`verify:places`はQ089、IDなしEventの許可key、Place参照、計画JSON、Routeノードの整合を検証する。

関連確認URLは `/events/service-map-guide`、`/q/Q089?to=M21`、`/q/Q001?to=service-map-guide`。いずれも幅402pxで確認し、console error 0件とする。

## 地図注目とイベントバッジ回帰修正

目的地を保持したQR解決でフロアが切り替わる際、対象SVGの読込完了前に古いシートで注目要求を処理済みにする競合を修正した。読込済みsheet IDが現在のsheetと一致してから注目処理を行うため、初回QRと「ここへ行く」のどちらも現在地へ確実に注目する。

イベントピンから詳細を開くときは一時的な地図注目stateを引き継ぎ、シートを82svhへ上げても現在のviewBoxを維持する。stateだけが更新された場合もマーカーレイヤーを再同期する。イベントバッジは白地へ戻し、カテゴリ色を縁と人型グリフへ適用し、淡色カテゴリにも濃色の外周とグリフ輪郭を付けて操作対象を識別できるようにした。キーボードフォーカス時は濃色外周だけをさらに広げ、カテゴリ色で覆わないフォーカスリングを維持する。イベント詳細から `/events` へ戻るリンクの表示は「リストに戻る」へ統一した。

`bun run verify:all`は、現行のきやれ／Q089データ同期後の件数（123 Place / 88 QR / 61 Event、348 nodes / 445 edges）を含む全ゲートをPASSする。幅402pxで目的地付き初回QR、現在地ありの「ここへ行く」、経路開始後のイベントピン詳細を確認し、22／82svh、現在地注目、viewBox不変、白地とカテゴリ色を確認した。正式ID・内部keyの両詳細で「リストに戻る」とクエリ保持、淡色カテゴリのキーボードフォーカスで濃色外周6px＋カテゴリ色2px、console error 0件を確認した。

会話履歴なしの初回独立レビューでSTATUSの旧マーカー記述を現行仕様へ同期し、修正後の別コンテキスト再レビューは指摘なし。

## QR対応表87件反映

受領した`uoamap-qr-mapping (2).json`はリポジトリ内の`uoamap-qr-mappings.json`とバイト単位で一致した。対応表と計画JSONはQ018を欠番のまま再利用せず、Q075〜Q089を追加した88件、`nextQrNumber: 90`である。新規Place案は73件のまま、Q075〜Q088は既存Routeノード14件をPlaceとして再利用し、Q089はイベント会場Place `sh_room_kiyare`を参照する。

Placeは88 QR地点 + 35イベント会場 + `campus-all`の123件（Q089の`sh_room_kiyare`はQR地点とイベント会場で共有）。`campus-all`以外の122件は、348ノード／445エッジ（walk 406 / transfer 39）の単一連結グラフに収録される。`verify:places`はQR IDの欠番を明示的に扱い、88 mappings / 88 placements / 73 placeProposals、Place参照・floor・座標、重複、61イベントを検証する。

自動検証は現行のきやれ／Q089データ同期後の件数（123 Place / 88 QR / 61 Event、348 nodes / 445 edges）、production build、git diff checkをPASSする。幅402pxでQ075→`main_dormitory`（創明寮前）、Q088→`sh_entrance_north`（学生ホール北口出口）、Q089→`sh_room_kiyare`、Q001→`main_node_11`（駐車場北）の解決と経路表示、Q018の登録なし案内を確認し、console error 0件。物理QRの印刷・設置承認は引き続き対象外。

会話履歴なしの初回読み取り専用レビューでは、再利用QRの`routeNodeId`を生成Routeへ突合する検証不足とブリーフSCOPE漏れを修正した。修正後の別コンテキスト再レビューは指摘なし。

## モバイル地図UX一括調整

地図viewBoxを元SVG範囲へclampし、最大拡大率を6倍へ統一した。8px以内の地図タップでBottomSheetを22svhへ下げる。シートは22／58／82svhを外部要求でき、QRとイベント詳細は82svh、「ここへ行く」とQR解決後は22svhを使う。旧192px最小高を撤廃し、地図表示切替はCSS変数へ追従、下部3メニューは各1/3幅・64pxの操作領域とした。

イベントバッジは正式ID先頭文字をScheduleの7色へ対応させ、混色／IDなし集約はtealとした。バッジをPlace座標の画面上20px上へ置いて部屋ラベルを残し、個別イベントは正式ID詳細または内部key詳細へ直接遷移する。フロア切替の経路通知ドットを廃止した。QRカメラはdocumentまたは映像領域が非表示なら破棄し、両方が表示された時だけ再取得する。Schedule画像にはスクロール／ピンチ可能な全画面拡大ダイアログを追加した。

`bun run verify:all`は初回122 tests / 965 assertions、109 Place / 74 QR / 60 Event、336 nodes / 425 edges、型チェック、production build、git diff checkをPASS。独立レビュー指摘の直リンク時シート状態を修正後、全123 tests / 971 assertions、production build、109 Place / 74 QR / 60 Event、git diff checkを再度PASSした。幅402pxで地図四辺clamp・最大6倍、QR 82svh、地図タップ22svh、Schedule拡大とEscape終了、イベント詳細、現在地あり／なしの「ここへ行く」、QR解決後の経路、カテゴリ色、ラベル、経路ドット非表示、console error 0件を確認した。直リンクの`/qr`・正式／内部key詳細は82svh、イベント一覧は58svh、QR解決後は22svhとなることも再確認した。320×568は22svh=124.95px、375×667は143.01pxとなり、各1/3幅・64pxメニューとシート上16px以上を保つ地図表示切替を確認した。ブラウザにカメラ権限を付与していないため実映像の停止／再取得は未確認で、可視性の組み合わせはpure testで固定した。

## オープンキャンパス2026最新データ

2026-07-31確認済みの `uoa_open_campus_2026.json` を現行Eventへ変換し、37プログラムの55枠と5運営サービスを60 Eventへ反映した。タイトル・説明・会場・開催時刻を最新化し、研究室公開の明示された昼休憩は複数`timeSlots`へ展開した。新JSONの詳細タグ101種類はユーザー判断により対象外とし、正式IDの先頭文字に対応する9カテゴリ（A/L/E/U/P/T/M/G/R）だけを使う。

Eventは全60件で必須の内部`key`を持ち、公式プログラム55件だけが正式`id`を持つ。総合案内・自由見学・休憩所・ランチ営業・売店営業は正式IDとTagを持たず、`service-*`内部keyにより一覧カード、`/events/:eventKey`詳細、「ここへ行く」、地図マーカーからの詳細遷移を利用できる。正式IDの外部詳細URL `/e/:eventId` は維持する。

受験勉強相談R1〜R9は公式情報に終了時刻がないため、架空の20分枠を廃止した。`TimeSlot.end`は公式終了時刻がない場合だけ省略でき、一覧と詳細では「9:40〜」のように開始時刻だけを表示する。`verify:places`はEventのkey/ID件数と一意性、9カテゴリとID先頭文字の一致、IDなし5件、厳密なISO時刻、開始・終了順、複数枠の重複、終了時刻省略対象も検証する。

新JSONとの一時照合は正式ID 55件 / 5 services / 60 EventでPASSした。`bun run verify:all`は112 tests / 934 assertions、109 Place / 74 QR / 60 Event、336 nodes / 425 edges、build、git diff checkをPASS。幅402pxでカテゴリチップ9件・カード60件、IDなしランチカードの詳細と`to=service-lunch`、検索タブ選択、正式ID `/e/P1`、`highlight=service-shop`、R1の「9:40〜」、横方向overflowなし、ランタイムエラー表示なしを確認した。

## Figma UX Demo

Figma「UoAmap」に `🧪 UX Demo`（page `192:338`）を追加し、現行React実装のコアフロー9、地図・BottomSheet 5、QR 8、検索・詳細8の計30状態を402×874pxで配置した。各状態は画面ID、URL、開始条件、想定遷移先を持ち、既存コンポーネントとSchedule画像を再利用している。正式な `📱 Screens` の5画面と `🧩 Components` の21ノードは変更していない。

Flow Notes（`192:346`）には、地図・検索・QR・Schedule間、カード→詳細、「ここへ行く」、QR成功・失敗、`/q`・`/p`・`/e`、22／58／82svh、`at`／`to`／`focus` の契約を記録した。作成当時は詳細の表示文言「マップに戻る」が実際には `/events` へ戻る点を挙動不一致として注記し、ブリーフ20で「リストに戻る」へ解消した。正式Mapが固定例で実装は3段階のシート状態を持つ点は、修正せず挙動不一致として注記した。作成時に注記した外部 `/e/:eventId` と`to`設定の差は、ブリーフ17でSPECを現行実装の「詳細→ここへ行く」に統一して解消した。

Scheduleは実アプリの一時キャプチャとFigma部品の画像ハッシュ一致を確認し、キャプチャを削除した。30画面はPrototypeで巨大な資料ボード1枚として扱われないよう、4つのトップレベルSection（`216:1361`〜`216:1364`）直下へ移動し、資料ボード `192:339` は右側へ分離した。Prototype reactionの初回接続と `C01 Screen — 地図初期状態` のFlow starting point指定は未実施で、ユーザーが接続後にPresent操作とreaction構造を別スライスでレビューする。UX合意前は `📱 Screens`、SPEC、Reactの遷移契約を変更しない。

会話履歴なしの読み取り専用レビューでは、QR着地、検索・詳細の置換状態、`/e`仕様差、詳細のAppLayoutシェル再現などの指摘を解消し、最終再レビューで指摘なしを確認した。

## GitHub Pagesモック公開

GitHub Actionsで`main`または手動実行からGitHub Pagesへ現行モックを公開する設定を追加した。Pagesが返すbase pathをVite `base`とReact Router `basename`へ反映し、地図SVG・スケジュール画像も同じbase pathから取得する。GitHub Pages用の`404.html`は成果物内だけで生成し、将来Cloudflare Pagesへルート配信するときは通常の`bun run build`と標準SPAフォールバックを使える。

公開版のデータは引き続き`mockRepository`であり、GitHub Pages URLは本番URL・物理QR印刷の承認ではない。実際の公開には、GitHub側でPagesのSourceをGitHub Actionsに設定し、この変更を`main`へ反映する人間作業が残る。

検証は`bun run verify:all`（107 tests / 927 assertions、109 Place / 74 QR / 60 Event、336 nodes / 425 edges）、`APP_BASE_PATH=/UoAMap-Frontend/ bun run build`、Pages成果物の`index.html`/`404.html`一致をPASS。幅402pxでトップ、`/q/Q001?to=M21`、`/schedule`をサブパス配信し、Q001→`at=main_node_11`、地図SVG、Schedule画像、console error 0件を確認した。GitHub上の実デプロイは未実施。

## Place・Route・QR計画JSON統合

Route Editor出力の74 Place案とQ001〜Q074対応表をフロントの正式モックへ反映し、60イベントの会場参照を新Routeノード形式のPlace IDへ移行した。Placeは74 QR地点 + 34イベント会場 + `campus-all`の109件。`campus-all`以外の108件は、336ノード／425エッジ（walk 387 / transfer 38）の単一連結グラフに収録される。

計画JSON、Place案JSON、QR対応表はランタイムで自動連動せず手動同期する。`verify:places`が74件のID・座標・名称、Q001〜Q074、60イベント参照を照合し、不一致を自動修正せずFAILさせる。Q034は「講義棟エレベーター前１階」に統一済み。物理QRの印刷・設置承認は引き続き対象外。

自動検証は107 tests / 927 assertions、109 Place / 74 QR / 60 Event、336 nodes / 425 edges、production build、git diff checkがPASS。幅402pxでQ001→M21、Q034→U1、受付、3Dシアター、P1 highlight、未知QRを確認し、console error 0件。

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
- M8 13o: 最短経路の6 synthetic testsと、全Place・event・QR・連結性・建物/階段/入口を固定する19実グラフcoverage testsを別ファイルへ分離。test/assertion総数は105 / 551のまま維持
- M8 13o検証: `bun run verify:all` で全test、route editor鮮度、scripts/toolsを含むstrict型検査、production build、36 places、104 nodes / 112 edges、git diff --checkがPASS。幅402pxで代表3 URL、route editorはVite配信1440×900で全10 SVG・Undo/Redo・自動採番非巻戻し・SVG downloadを確認し、console error 0件
- M8 13o整理: 全exportと動的参照を検索し、安全に削除できる明白なdead codeがなかったため削除なし。READMEを現行手順へ更新。将来の別SVG機能は追加せず、地図設定と `public/maps/` の同期漏れをtestでFAILさせる境界を維持
- 自動化制約: Browser security policyにより `file://`、ファイル入力API制約により計画JSON再読込のブラウザ自動操作は未実施。単一HTML・外部scriptなし・全10ファイル同期・生成鮮度とpure parse exact testで補完
- M8 13oレビュー: 基準コミット `5b37580` 以降の累積差分を会話履歴なしで独立レビューし、指摘なし。M1〜M8完了
- 次の開始位置: リファクタリングの追加作業はなく、SPECロードマップのAPI接続など次機能を別ブリーフで開始する。本番公開・物理QRは `docs/PRODUCTION.md` の人間決定が先

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
bun run verify:all     # 下記の全ゲートを順に実行
bun run dev            # dev server(ポート5173)
bun test               # 純粋ロジックの単体テスト
bun run build          # tsc -b + vite build。型チェックを兼ねる
bun run verify:places  # 123 Place / 88 QR / 61 Eventと計画JSONの整合検証
bun run verify:routes  # SVGのRouteグラフが生成結果と一致することを確認
```

ブラウザは**幅402px**(iPhone 17)で確認する。検証用URLと期待挙動:
ラベル・マーカーの固定サイズを変更した場合は、追加で**1440×900**と再読み込みなしの幅変更も確認する。

| URL | 期待挙動 |
|---|---|
| `/` | キャンパス全体図。パン・ズーム可。建物(研究棟/学生ホール/講義棟/UBIC/LICTiA)タップで建物フロアへ |
| `/?to=A1` | 講堂へフォーカス+赤ピン(目的地)。シートに「目的地へ」ボタン |
| `/?at=sh_room_cafeteria` | 学生ホール1Fへ自動切替+現在地ピン(人型) |
| `/?focus=lh_room_m8` | 講義棟1FのM8へフォーカス+アクセント色ピン |
| `/?at=campus-all` | unmapped地点。クラッシュせず「(位置情報なし)」表示 |
| `/?at=rq_room_161&to=P1` | 研究棟1Fへ切替し、161から104Fまでの最短ルート線+両ピン |
| `/?at=rq_room_127&to=P3` | 研究棟1Fへ切替し、127から144Fまでの最短ルート線+両ピン |
| `/?at=rq_room_161&to=P12` | 研究棟3Fへ切替し、1F→2F→3Fの最短経路。表示中フロアのルート線+乗換マーカー。切替ボタンには通知ドットを表示しない |
| `/?at=rq_room_325f&to=A1` | キャンパス図へ切替し、研究棟3F→階段→出入口→屋外歩行者路→講堂の最短経路。切替ボタンには通知ドットを表示しない |
| `/?at=main_auditorium&to=P12` | 研究棟3Fへ切替し、講堂から研究棟3F 325Fまで同じキャンパス横断経路を逆方向に表示 |
| `/q/Q001?to=M21` | `at=main_node_11`へ正規化し、駐車場北から講義棟2F M2までの経路を表示 |
| `/q/Q034?to=U1` | `at=lh_stairs_northeast_1f`へ正規化し、講義棟1Fエレベーター前からM8までの経路を表示 |
| `/q/Q001?to=service-reception` | 駐車場北から学生ホール受付までの経路を表示 |
| `/q/Q001?to=G1` | 駐車場北からUBIC 3Dシアターまでの経路を表示 |
| `/events/service-map-guide` | 正式IDなしの地図アプリ解説Event「きやれ」の詳細を表示 |
| `/q/Q089?to=M21` | `at=sh_room_kiyare`へ正規化し、きやれから講義棟2F M2までの経路を表示 |
| `/q/Q001?to=service-map-guide` | 駐車場北から地図アプリ解説Event「きやれ」までの経路を表示 |
| `/?at=lictia_room_is&to=P20` | LICTiA内でイノベーション創出スペースから箱庭チャンバー室までの室内ルート線と両ピンを表示 |
| `/?at=rq_room_161&to=P22` | キャンパス図へ切替し、研究棟161からロボット格納庫まで屋外経路を表示 |
| `/events` | 検索タブ。テキスト+タグで絞り込み、カード→詳細→「ここへ行く」 |
| `/events?highlight=T3` | 内部Event keyが一致するカードがアクセント色枠で強調され、リスト内の位置まで自動スクロール |
| `/` のイベントマーカー | 開催地(表示中フロア)のラベル上20pxにカテゴリ色の人型バッジ。単一イベントのタップは `/e/:eventId` または `/events/:eventKey` の詳細へ遷移し、at/to/focusを保持してシートを82svhへ展開。キャンパス集約は建物フロアへ移動 |
| `/schedule` | タイムスケジュール画像。画像タップでスクロール／ピンチ可能な全画面拡大ダイアログを表示 |

## アーキテクチャ要点(触る前に知るべきこと)

- **地図SVGはReact非管理DOM**: `MapCanvas` は SVG を `svgHostRef`(専用div)内に `DOMParser`+`replaceChildren` で挿入する。**React管理下の要素とSVG DOMを混ぜない**こと(混ぜるとReactの再レンダーでクラッシュする)。SVG要素へのイベントは addEventListener + クリーンアップで管理
- **URLが状態の正**(SPEC §5.2): 現在地`at`/目的地`to`/注目`focus`はURLクエリ。フォーカス優先順位は focus > to > at。「現在地へ/目的地へ」は`focus=`を使う。「ここへ行く」直後とQR解決直後の現在地への注目だけは、公開URLへ`focus`ピンを追加しない一時的なnavigation stateで要求する
- **アプリ内QRスキャン**: `qr-scanner`で背面カメラを優先し、同一origin・`BASE_URL`配下の`/q/:qrId`だけを受理する。読み取り後は既存クエリを保持して`/q/:qrId`へ渡し、`QrLanding`が`at`を置換・`focus`を削除・`to`を保持する。画面離脱、document非表示、映像領域がシート外へ隠れた時はscannerをdestroyし、両方が表示状態へ戻った時だけ再取得する。カメラ再取得の一時競合には400ms後の自動再試行1回+手動再試行で復旧する
- **フロア切替**: floors(src/data/places.ts)がfloorId→sheetIdを解決。全フロアを1 SVG = 1 MapSheetで管理し、同一建物内の切替も共通のシート読込処理を使う
- **places.ts が地点語彙の正**: 全123 Placeの内訳はQR地点88件（新規座標Place案73件 + 既存Routeノード再利用14件 + Q089のイベント会場共有1件）、イベント会場35件、意図的unmapped 1件(`campus-all`)。**変更したら必ず `bun run verify:places`**
- **座標変換**: スクリーン→SVG座標は `getScreenCTM().inverse()` を使う(コンテナ矩形の線形換算はレターボックス余白でずれるため禁止)。Place位置解決は `src/features/map/placeLocator.ts`(getBBox+CTM)
- **パン操作**: ドラッグ開始時の `getScreenCTM().inverse()` をジェスチャー中固定し、開始点と現在点のSVG座標差でviewBoxを移動する。`viewBox幅/コンテナ幅`・`viewBox高さ/コンテナ高さ`の軸別換算は、`xMidYMid meet` の余白がある横長SVGで縦移動量が不足するため使わない
- **ラベル・マーカー固定サイズ**: `preserveAspectRatio="xMidYMid meet"` に合わせ、`max(viewBox幅/コンテナ幅, viewBox高さ/コンテナ高さ)` で逆スケールする。コンテナ寸法は`ResizeObserver`で追従し、横長画面や実行中の幅変更でも画面上サイズを維持する。ラベルは元SVGのBBox中心へ中央揃えし、表示中マーカーの実表示範囲と交差するものだけを一時非表示にする
- **マーカー**: React非管理のオーバーレイSVGレイヤー。イベントバッジはPlace座標から画面上20px上へ置き、ラベル衝突除外には使わない。水滴ピンの先端はPlace座標へ固定し、従来どおりラベル衝突除外に使う。ズームしても画面上サイズ一定になるよう逆スケール補正し、イベント開催地マーカーは同一placeIdで1つに集約する。バッジは白地と濃色外周を持ち、正式IDのカテゴリ色を縁と人型グリフへ適用し、同一地点が混色またはIDなしならtealへ戻す。単一イベントは詳細へ遷移し、キャンパス集約は建物フロアへ移動する。同じ地点に現在地・目的地・注目ピンがある場合はイベントマーカーを生成せず、ピンだけを表示
- **ルート**: `public/maps/` の `Route` グループを `scripts/extract-routes.ts` が `src/features/routing/generated/routeGraph.json` へ抽出する。作図契約は `docs/MAP_AUTHORING.md`。探索はフロントのDijkstra、描画はベースSVGとマーカーの間にある独立オーバーレイSVG。`campus-all`を除く全122 Placeを348ノード/445エッジの単一連結グラフへ収録し、全61イベント地点と全88 QR地点をcoverageテストで固定。同じ`data-stair-id`を持つ隣接階ノード間へ固定コスト60、建物・キャンパス両側の同じ`data-entrance-id`間へコスト0のtransferエッジを生成する。floorIdは各SVG直下のRouteグループから抽出する
- **フロア切替のviewBox引き継ぎ**: 同一建物内の切替は「シート全体に対する相対位置・相対ズーム」を比例マッピングして維持(フロア間で座標系が揃っていないため絶対座標は使えない)。キャンパス⇄建物は全体表示リセット。RQ2FはviewBox属性が無いためwidth/height属性からフォールバック構成
- **scrollIntoViewは `behavior:"auto"`**: smoothはバックグラウンドタブでアニメーションが進まず止まることがあるため使わない

## 既知の注意(再発防止ルール)

- **実装エージェント(Codex等)にgit操作をさせない**(checkout/reset/stash禁止)。過去に作業ツリーの他ファイルの変更が巻き戻される事故が発生した。ディスパッチ後は `bun run verify:places` で123 Place / 88 QR / 61 EventのPASSを必ず確認する
- SVG(`public/maps/`)は `Route` グループの追加・編集のみ可。既存要素・IDは読み取り専用でデータとの紐付けキー(AGENTS.md参照)
- ボトムシートの高さはCSS変数 `--bottom-sheet-height`(共通祖先にセット)。地図上のUIはこれを参照して位置決めする(58svh等の直書き禁止)
- カメラは本番ではHTTPSのsecure contextが必須。`qr-scanner`のMIT通知は`public/THIRD_PARTY_NOTICES.txt`として配布物へ同梱する(アプリ内ライセンス画面は不要)
