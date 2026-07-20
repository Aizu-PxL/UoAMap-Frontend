# STATUS — いまどこまでできているか

最終更新: 2026-07-20(UI修正スライス02e〜02h完了時点)
**更新タイミング**: スライス(docs/tasks/のブリーフ1本)完了ごと、またはロードマップのステップ完了時に必ず更新する。

新しいセッション・別のエージェントは、まずこのファイル → [WORKFLOW.md](WORKFLOW.md) → [BACKLOG.md](BACKLOG.md) の順に読めば作業を再開できる。仕様の正は [SPEC.md](SPEC.md)。

## ロードマップ進捗(SPEC.md §6)

| # | ステップ | 状態 | 備考 |
|---|---|---|---|
| 1 | 土台(型・モック・リポジトリ層・Router・feature構成) | ✅ 完了 | |
| 2 | 地図表示 | ✅ 完了 | ブリーフ: docs/tasks/02a〜02d + UI修正02e〜02h(建物枠線・フロア切替viewBox維持・イベントマーカー・視認性とピン置換)。各レビュー指摘も修正済み |
| 3 | ルート | ⬜ 未着手 | Routeレイヤー作図規約(docs/MAP_AUTHORING.md)が先。SPEC §3.3 |
| 4 | イベント検索 | ✅ 完了 | 検索・タグ絞り込み・詳細・「ここへ行く」 |
| 5 | QR/ディープリンク | △ 一部 | `/q`・`/p`・`/e` の正規化は済み。**アプリ内QRスキャンが未実装** |
| 6 | スケジュール | ✅ 完了 | PDF画像表示(public/schedule/) |
| 7 | API接続 | ⬜ 未着手 | 契約は docs/API.md。現在はモック(src/data/mock/) |

最新コミット時点: `e979c25 いい感じにマップが動くの巻き`(ステップ2一式を含む)

## 動作確認手順(検証ゲート)

```bash
bun run dev            # dev server(ポート5173)
bun run build          # tsc -b + vite build。型チェックを兼ねる
bun run verify:places  # places.tsのSVG紐付け検証。36件PASSが正常
```

ブラウザは**幅402px**(iPhone 17)で確認する。検証用URLと期待挙動:

| URL | 期待挙動 |
|---|---|
| `/` | キャンパス全体図。パン・ズーム可。建物(研究棟/学生ホール/講義棟/UBIC/LICTiA)タップで建物フロアへ |
| `/?to=A1` | 講堂へフォーカス+赤ピン(目的地)。シートに「目的地へ」ボタン |
| `/?at=sh-cafeteria` | 学生ホール1Fへ自動切替+現在地ピン(人型) |
| `/?focus=lh-m8` | 講義棟1FのM8へフォーカス+アクセント色ピン |
| `/?at=campus-all` | unmapped地点。クラッシュせず「(位置情報なし)」表示 |
| `/events` | 検索タブ。テキスト+タグで絞り込み、カード→詳細→「ここへ行く」 |
| `/events?highlight=T3` | 該当イベントカードがアクセント色枠で強調され、リスト内の位置まで自動スクロール |
| `/` のイベントマーカー | 開催地(表示中フロア)に白背景の黒い人型バッジ。タップで `/events?highlight=:id` へ(at/to保持)。同じ地点に現在地・目的地・注目ピンがあればピンだけ表示 |
| `/schedule` | タイムスケジュールPDF画像 |

## アーキテクチャ要点(触る前に知るべきこと)

- **地図SVGはReact非管理DOM**: `MapCanvas` は SVG を `svgHostRef`(専用div)内に `DOMParser`+`replaceChildren` で挿入する。**React管理下の要素とSVG DOMを混ぜない**こと(混ぜるとReactの再レンダーでクラッシュする)。SVG要素へのイベントは addEventListener + クリーンアップで管理
- **URLが状態の正**(SPEC §5.2): 現在地`at`/目的地`to`/注目`focus`はURLクエリ。フォーカス優先順位は focus > to > at。「現在地へ/目的地へ」の再フォーカスも `focus=` クエリを書く方式(コンポーネントstateに逃がさない)
- **フロア切替**: floors(src/data/places.ts)がfloorId→sheetIdを解決。講義棟(LH)だけ1シートに1F/2F併記で、`fill_1F`/`frame_1F`/`part_1F`/`room_1F`/`text_1F`/`mark_1F`(2F同様)のグループdisplay切替で表現
- **places.ts が地点語彙の正**: Place⇔SVG要素の紐付け36件+意図的unmapped 5件(複合施設等、ファイル内コメント参照)。**変更したら必ず `bun run verify:places`**
- **座標変換**: スクリーン→SVG座標は `getScreenCTM().inverse()` を使う(コンテナ矩形の線形換算はレターボックス余白でずれるため禁止)。Place位置解決は `src/features/map/placeLocator.ts`(getBBox+CTM)
- **マーカー**: React非管理のオーバーレイSVGレイヤー。ズームしても画面上サイズ一定になるよう逆スケール補正あり。イベント開催地マーカーは同一placeIdで1つに集約し、タップで `/events?highlight=:eventId`(先頭イベント代表)へ遷移。同じ地点に現在地・目的地・注目ピンがある場合はイベントマーカーを生成せず、ピンだけを表示
- **フロア切替のviewBox引き継ぎ**: 同一建物内の切替は「シート全体に対する相対位置・相対ズーム」を比例マッピングして維持(フロア間で座標系が揃っていないため絶対座標は使えない)。キャンパス⇄建物は全体表示リセット。RQ2FはviewBox属性が無いためwidth/height属性からフォールバック構成
- **scrollIntoViewは `behavior:"auto"`**: smoothはバックグラウンドタブでアニメーションが進まず止まることがあるため使わない

## 既知の注意(再発防止ルール)

- **実装エージェント(Codex等)にgit操作をさせない**(checkout/reset/stash禁止)。過去に作業ツリーの他ファイルの変更が巻き戻される事故が発生した。ディスパッチ後は `bun run verify:places` で36件PASSを必ず確認する
- SVG(`public/maps/`)は読み取り専用。要素IDがデータとの紐付けキー(AGENTS.md参照)
- ボトムシートの高さはCSS変数 `--bottom-sheet-height`(共通祖先にセット)。地図上のUIはこれを参照して位置決めする(58svh等の直書き禁止)
