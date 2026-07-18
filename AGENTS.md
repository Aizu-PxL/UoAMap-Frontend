# UoAMap Frontend

会津大学オープンキャンパス来場者向けの**ルート案内**スマホWebアプリ(React 19 + TypeScript + Vite, bun)。
QRスキャンで現在地、イベント選択や外部リンクで目的地をセットし、地図上にルートを表示する。

## 必読ドキュメント

- **[docs/SPEC.md](docs/SPEC.md)** — プロダクト仕様の正。機能・データモデル・技術方針・ロードマップはすべてここに従う。仕様を変える場合は先にSPEC.mdを更新する
- [docs/API.md](docs/API.md) — API契約(バックエンドとの境界。経路API・検索APIは作らない)

## 基本ルール

- UIの正は Figma「UoAmap」の 📱 Screens ページ(Page 1 はレガシー、実装対象外)
- スマホ専用。PC対応・レスポンシブは不要
- UIコンポーネントから直接fetchしない。データ取得は `src/data/` のリポジトリ層を経由する
- 地図は `public/maps/` の自作構造化SVG(Inkscape製)が正。要素ID(`room_*`, `building_*` 等)がデータとの紐付けキーなので、SVGを編集する際はIDを壊さない
- 開発コマンド: `bun run dev` / `bun run build`(build は tsc -b を含むため型チェックを兼ねる)
