# 15 GitHub Pages モック公開

## GOAL

`main` へのpushまたは手動実行で、現行のモックRepositoryを使うVite SPAをGitHub Pagesへ公開できるようにする。リポジトリ配下のbase pathでも地図SVG・スケジュール画像・QRディープリンクを正しく扱い、将来Cloudflare Pagesのルート配信へ移るときは通常ビルドへ戻すだけで済む構成にする。

## 参照

- `docs/SPEC.md` §5.1、§5.2
- `docs/PRODUCTION.md` §1、§4、§5 Phase B
- `docs/WORKFLOW.md`
- `src/app/App.tsx`
- `src/data/places.ts`
- `src/features/schedule/SchedulePanel.tsx`
- `vite.config.ts`

## やること

1. Viteの`base`をビルド環境から指定でき、未指定時はルート`/`になるようにする。
2. React Routerの`basename`、地図SVG、スケジュール画像をViteの`BASE_URL`へ追従させる。
3. Bunで検証・ビルドし、GitHub Pages用base pathとSPA用`404.html`を含む成果物をPages Actionsで公開する。
4. GitHub PagesはモックRepositoryのまま公開する。API Repositoryは追加しない。
5. README、STATUS、PRODUCTIONへ暫定公開とCloudflare移行時の設定を記録する。

## SCOPE

- `.github/workflows/deploy-pages.yml`（新規）
- `vite.config.ts`
- `src/app/App.tsx`
- `src/data/places.ts`
- `src/features/schedule/SchedulePanel.tsx`
- `README.md`
- `docs/STATUS.md`
- `docs/PRODUCTION.md`
- `docs/tasks/15-github-pages-mock-deployment.md`（このファイル）

## 受入基準

- [x] `bun run verify:all` がPASSする。
- [x] `APP_BASE_PATH=/UoAMap-Frontend/ bun run build` がPASSする。
- [x] Pages用成果物のHTML・JS・CSS・地図SVG・スケジュール画像が`/UoAMap-Frontend/`配下で取得できる。
- [x] 幅402pxで`/UoAMap-Frontend/`、`/UoAMap-Frontend/q/Q001?to=M21`、`/UoAMap-Frontend/schedule`が表示でき、コンソールエラーがない。
- [x] `/q/Q001?to=M21`がモック対応表を使って`at=main_node_11`へ正規化される。
- [x] GitHub Pagesのワークフローが`main` pushと手動実行に対応し、依存をlockfile固定で導入してから検証・Pages用ビルド・公開を行う。
- [x] Cloudflare Pagesでは`APP_BASE_PATH`未指定の通常ビルド、出力`dist`、トップレベル`404.html`なしでSPAとして配信できることが文書化されている。
- [x] `git diff --check` がPASSする。

## DELIVERABLE

### 変更

- `.github/workflows/deploy-pages.yml`: Bun 1.3.14で全検証後、Pagesのbase path用に再ビルドし、成果物へ`404.html`を追加してデプロイする。
- `vite.config.ts` / `src/app/App.tsx`: `APP_BASE_PATH`からVite `base`を設定し、React Routerも同じ`BASE_URL`を使用する。
- `src/data/places.ts` / `src/features/schedule/SchedulePanel.tsx`: 地図SVGとスケジュール画像を`BASE_URL`配下から取得する。
- `README.md` / `docs/STATUS.md` / `docs/PRODUCTION.md`: 暫定モック公開とCloudflare Pages移行条件を記録する。

### 受入結果

- `bun run verify:all`: PASS（107 tests / 927 assertions、109 Place / 74 QR / 60 Event、336 nodes / 425 edges、build、diff check）。
- `APP_BASE_PATH=/UoAMap-Frontend/ bun run build`: PASS。
- Pages成果物: `index.html`と`404.html`の一致、base path付きJS/CSS/地図/画像URLを確認。
- ブラウザ（幅402px）: トップ、Q001→M21、Scheduleを確認。Q001は`at=main_node_11`へ正規化、SVG 4層と1500px幅Schedule画像を読込、console error 0件。
- Workflow YAML: 構文解析PASS。GitHub上での実ワークフロー実行と公開URL確認は、Pages Source設定と`main`反映後に行う。

### 人間作業

1. GitHubのSettings → PagesでSourceをGitHub Actionsにする。
2. 変更を`main`へ反映するか、Actionsの`Deploy mock to GitHub Pages`を手動実行する。
3. 成功後のPages URLをモック確認用として共有する。本番QRには使用しない。
