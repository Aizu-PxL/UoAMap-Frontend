# 13g — Repository依存をcomposition rootから注入

## GOAL

`DataProvider` のモジュールスコープにある具体RepositoryとPromiseを除去し、`App` が `mockRepository` を選択してProviderへ注入する。Provider単位のmemoized loader、Repository context、`useRepository()` を追加し、QR着地も同じRepositoryを利用する。

## 参照

- `docs/SPEC.md` §3.2、§5.1
- `docs/API.md`
- `.agent/refactor-plan.md` M4
- `src/data/DataProvider.tsx`
- `src/data/repository.ts`
- `src/app/App.tsx`
- `src/app/landings.tsx`

## やること

- `Repository` を受け取るProvider単位のloaderを追加し、events/tags取得Promiseを同じProvider内だけでmemoizeする。
- `DataProvider` に `repository` propを追加し、Repository contextと `useRepository()` を公開する。
- `App` だけが `mockRepository` を選択して `DataProvider` へ渡す。
- `QrLanding` の具体singleton importを `useRepository()` へ置換する。
- `src/data/repository.ts` から具体singleton exportとmock実装への依存を削除する。

## SCOPE

- `src/data/repositoryLoader.ts`
- `src/data/repositoryLoader.test.ts`
- `src/data/DataProvider.tsx`
- `src/data/repository.ts`
- `src/app/App.tsx`
- `src/app/landings.tsx`
- `.agent/refactor-plan.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/tasks/13g-repository-injection.md`

Repository interface、API契約、mockデータ、QR文言、URL正規化、reload機能は対象外。

## 受入基準

- 同一loaderへのStrictMode相当の重複呼び出しでevents/tagsを各1回だけ取得する。
- 別loaderは同じRepositoryを受けても取得Promiseを共有しない。
- 成功値と失敗をそのまま呼び出し側へ伝える。
- `App` 以外のproductionコードから `mockRepository` と具体singletonを参照しない。
- `QrLanding` がProviderへ注入されたRepositoryを使い、成功・未知QR・失敗時の現行挙動を維持する。
- `bun test`、`bun run verify:routes`、`bun run verify:places`、`bun run build`、`git diff --check` がPASSする。
- 幅402pxで `/q/Q003?to=M21`、未知QR、Repository失敗表示、既存クエリ保持、console errorなしを確認する。
- 会話履歴を引き継がない読み取り専用レビューで指摘がない。

## DELIVERABLE

- `src/data/repositoryLoader.ts` と3件のcharacterization testを追加した。
- `DataProvider` にRepository prop/contextと `useRepository()` を追加し、Appへmock選択を集約した。
- QrLandingの具体singleton参照を削除し、Providerへ注入されたRepositoryを利用するようにした。
- `bun test`: 67 tests / 438 assertions PASS
- `bun run build`: PASS
- `bun run verify:places`: 36件 PASS
- `bun run verify:routes`: 104 nodes / 112 edges PASS
- `git diff --check`: PASS
- 幅402pxでQR成功時の `to`・任意クエリ保持と `at=lh-large` 設定、未知QR表示、注入Repository失敗表示、console error 0件を確認した。一時的な失敗Repository差し替えは確認直後に除去し、最終差分には含めていない。
- 独立レビュー: 会話履歴なしの読み取り専用レビューで指摘なし。
