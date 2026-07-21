# UoAMap Frontend

会津大学オープンキャンパス来場者向けの**ルート案内**スマホWebアプリ(React 19 + TypeScript + Vite, bun)。
QRスキャンで現在地、イベント選択や外部リンクで目的地をセットし、地図上にルートを表示する。

## 必読ドキュメント

- **[docs/SPEC.md](docs/SPEC.md)** — プロダクト仕様の正。機能・データモデル・技術方針・ロードマップはすべてここに従う。仕様を変える場合は先にSPEC.mdを更新する
- **[docs/STATUS.md](docs/STATUS.md)** — 現在の進捗・動作確認手順・アーキテクチャ要点。**作業を再開するときは最初にこれを読む**
- [docs/WORKFLOW.md](docs/WORKFLOW.md) — 作業の進め方(運用モード・ブリーフ様式・検証ゲート・レビュー)。Codex実装は検証後に必ず別セッションの読み取り専用レビューを通し、Claude(Fable)が関与する場合は従来のリード運用に戻る
- [docs/BACKLOG.md](docs/BACKLOG.md) — 未実装の要望・検討事項(SPEC昇格前の置き場)
- [docs/FIGMA.md](docs/FIGMA.md) — FigmaファイルのノードID対応表・トークン対応・運用ルール
- [docs/API.md](docs/API.md) — API契約(バックエンドとの境界。経路API・検索APIは作らない)

## 基本ルール

- UIの正は Figma「UoAmap」の 📱 Screens ページ(Page 1 はレガシー、実装対象外)
- スマホ専用。PC対応・レスポンシブは不要
- UIコンポーネントから直接fetchしない。データ取得は `src/data/` のリポジトリ層を経由する
- 地図は `public/maps/` の自作構造化SVG(Inkscape製)が正。要素ID(`room_*`, `building_*` 等)がデータとの紐付けキーなので、SVGを編集する際はIDを壊さない。SVGは `Route` グループの追加・編集のみ可、既存要素は読み取り専用
- **git操作(checkout / reset / stash / commit)はユーザーまたはリード(Claude関与時)のみ**。実装(Codex)は行わない
- Codexで実装した変更は、完了報告前に会話履歴を引き継がないレビュー専用サブエージェントを起動し、別コンテキストの読み取り専用レビューを通す。適格なレビュー結果を受領できない場合は自己レビューで代替せず未完了として報告する。詳細は [docs/WORKFLOW.md](docs/WORKFLOW.md)「レビュー」に従う
- 作業を再開するときは [docs/WORKFLOW.md](docs/WORKFLOW.md)「作業開始時に読む順」に従う
- `src/data/places.ts` を変更したら(していなくても作業完了時に)`bun run verify:places` で36件PASSを確認する
- 開発コマンド: `bun run dev` / `bun run build`(build は tsc -b を含むため型チェックを兼ねる)/ `bun run verify:places`

## Review guidelines

- 対象ブリーフと `docs/SPEC.md` の該当節に照合し、仕様逸脱、SCOPE外変更、受入基準の未達、既存ID・React/SVG境界の破壊を優先して探す
- `git status --short`、対象となる追跡済みファイルの `git diff HEAD -- <path>`、対象となる未追跡ファイルの直接確認により、ステージ済み・未ステージ・未追跡を含む最終変更全体を確認する
- 作業開始時スナップショットと最終状態を比較し、既存のユーザー変更は指摘対象にせず、今回の作業による改変・消失やSCOPE外への追加変更だけを指摘する
- 指摘だけを重要度付き・ファイル/行つきで簡潔に報告し、指摘がなければその旨を明言する
- レビュー中はファイルを変更しない。`git status`、`git diff`、`git show` などの読み取り専用git操作は許可し、checkout / reset / stash / commit等の作業ツリーや履歴を変更する操作は禁止する
