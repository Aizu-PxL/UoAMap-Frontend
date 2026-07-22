# 13h — イベント検索条件を純粋化

## GOAL

ID・タイトル・説明・地点名への部分一致とタグ条件を、地点名resolverを受け取る純粋な検索関数へ抽出する。trim、大文字小文字、空白、未知タグ、タグAND、入力順維持を固定し、SearchPanelのhighlight/scroll処理は変更しない。

## 参照

- `docs/SPEC.md` §3.4、§4
- `.agent/refactor-plan.md` M5
- `src/features/events/SearchPanel.tsx`

## やること

- queryとtag ID配列を受け取る純粋なイベント検索関数を追加する。
- queryをtrim・小文字化し、event ID、title、description、resolverから得た地点名の結合文字列へ部分一致させる。
- tag IDをすべて持つイベントだけを返し、未知タグは0件にする。
- SearchPanelは現在の単一active tagを0件または1件のtag ID配列として渡す。
- highlight解除、filter reset、card ref、scroll補正は変更しない。

## SCOPE

- `src/features/events/eventSearch.ts`
- `src/features/events/eventSearch.test.ts`
- `src/features/events/SearchPanel.tsx`
- `.agent/refactor-plan.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/tasks/13h-event-search.md`

UI、検索入力値、タグ選択方式、EventCard、highlight/scroll処理、URLは対象外。

## 受入基準

- ID・タイトル・説明・地点名への部分一致を固定する。
- queryの前後空白、大文字小文字、空白のみを固定する。
- 複数タグAND、未知タグ、入力順維持を固定する。
- 地点名解決をresolver注入とし、検索モジュールからplacesを直接参照しない。
- SearchPanelのhighlight/scroll処理に差分がない。
- `bun test`、`bun run verify:routes`、`bun run verify:places`、`bun run build`、`git diff --check` がPASSする。
- 幅402pxで検索、タグ、検索＋タグ、0件、highlight scroll、console errorなしを確認する。
- 会話履歴を引き継がない読み取り専用レビューで指摘がない。

## DELIVERABLE

- `src/features/events/eventSearch.ts` と4件のcharacterization testを追加した。
- SearchPanelの検索ロジックを純粋関数呼び出しへ置換し、highlight/scroll処理には差分を加えていない。
- `bun test`: 71 tests / 447 assertions PASS
- `bun run build`: PASS
- `bun run verify:places`: 36件 PASS
- `bun run verify:routes`: 104 nodes / 112 edges PASS
- `git diff --check`: PASS
- 幅402pxで「AI」7件、研究室公開タグ併用5件、非一致0件、`highlight=P20` の対象カード1件とタグ未選択、console error 0件を確認した。
- 独立レビュー: P3のSPEC節番号を修正し、会話履歴なしの読み取り専用再レビューで指摘なし。
