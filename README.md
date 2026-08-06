# UoAMap

会津大学オープンキャンパス来場者向けの、スマートフォン用ルート案内Webアプリです。QRコードで現在地を設定し、イベントや地点を目的地にして、構造化SVG上へ経路を表示します。

React 19、TypeScript、Vite、Bunを使用しています。現在はモックRepositoryで動作し、API境界は [`docs/API.md`](docs/API.md) に定義しています。

## 開発

```bash
bun install
bun run dev
```

Viteの表示URLをスマートフォン幅（基準402px）で開いて確認します。仕様と代表確認URLは [`docs/SPEC.md`](docs/SPEC.md) と [`docs/STATUS.md`](docs/STATUS.md) を参照してください。

## 検証

変更後の全ゲートは次の1コマンドで実行できます。

```bash
bun run verify:all
```

このコマンドはunit test、TypeScript strict型検査とproduction build、route editor生成物鮮度、124 Place / 89 QR / 61 Event、350 nodes / 447 edgesのRouteグラフ、`git diff --check`を順に検証します。

個別コマンド:

```bash
bun test
bun run build
bun run verify:places
bun run verify:routes
bun run verify:route-editor
```

## GitHub Pagesでモックを公開

GitHubのリポジトリ設定で **Settings → Pages → Source: GitHub Actions** を選ぶと、`main`へのpushまたはActions画面からの手動実行でモック版を公開できます。ワークフローはPagesのbase pathへViteとReact Routerを揃え、SPAの直接リンク用`404.html`を成果物内だけに生成します。

公開版も`src/data/mock/mockRepository.ts`を使用します。GitHub PagesのURLを物理QRへ印刷する本番URLとしては扱わないでください。

## 将来Cloudflare Pagesへ移行

Cloudflare Pagesでは、ルート配信を前提に次を設定します。

- Build command: `bun run build`
- Build output directory: `dist`
- Environment variable: `BUN_VERSION=1.3.14`
- `APP_BASE_PATH`: 未設定（または`/`）

トップレベルの`404.html`はリポジトリへ追加していないため、Cloudflare Pagesの標準SPAフォールバックを利用できます。API接続は別スライスでRepository層だけを差し替えます。

## 地図とRoute editor

地図の正本は `public/maps/*.svg`、Routeグラフの正は各SVG直下の `<g id="Route">` です。生成JSONを手編集せず、SVG変更後に次を実行します。

```bash
bun run generate:routes
bun run verify:routes
```

Route editorは単一ファイル [`tools/route-editor.html`](tools/route-editor.html) として配布します。TypeScriptの設定・計画I/O・履歴・Route XML coreを変更した場合は、生成IIFEをHTMLへ反映して鮮度を確認します。

```bash
bun run generate:route-editor
bun run verify:route-editor
```

SVG作図・編集手順は [`docs/MAP_AUTHORING.md`](docs/MAP_AUTHORING.md) と [`docs/ROUTE_EDITING_GUIDE.md`](docs/ROUTE_EDITING_GUIDE.md) に従ってください。

## 主要文書

- [`docs/SPEC.md`](docs/SPEC.md): プロダクト仕様
- [`docs/STATUS.md`](docs/STATUS.md): 現在の進捗・代表確認URL
- [`docs/WORKFLOW.md`](docs/WORKFLOW.md): 実装・検証・独立レビュー手順
- [`docs/HANDOFF.md`](docs/HANDOFF.md): 次の作業者向け引き継ぎ
- [`docs/PRODUCTION.md`](docs/PRODUCTION.md): 本番公開・物理QRの人間作業ゲート
