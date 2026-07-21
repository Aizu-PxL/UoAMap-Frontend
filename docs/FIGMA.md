# FIGMA — デザインファイルの構造と運用

最終更新: 2026-07-19
**更新タイミング**: Figma側の構造変更(ページ・コンポーネント追加/改名、トークン変更)をしたら更新する。

- ファイル: 「UoAmap」 fileKey **`eexOndb459l2FxWkhGvxbV`**
  - URL: https://www.figma.com/design/eexOndb459l2FxWkhGvxbV/UoAmap
- 編集はFigma MCP(リモートサーバー)の `use_figma` で可能。キャンバス書き込みはリモートMCP限定。レート上限はプラン+シート依存(Professional + Full/Devシートで200回/日)

## ページ構成

| ページ | 役割 |
|---|---|
| Page 1 | **レガシー**。手作業の元デザイン(iPhone 17 - 1〜5)。参照用で実装対象外 |
| 🧩 Components | 再構築済みコンポーネント群+Tokens。**部品の正** |
| 📱 Screens | 再構築済み画面(Screen/01〜05)。**UIの正**(SPEC §2) |

## 主要ノードID対応表

| ノード | ID | 備考 |
|---|---|---|
| BottomSheet | `79:360` | Content スロットは INSTANCE_SWAP プロパティ `Content#88:0` |
| TabBar(バリアントセット) | `135:580` | プロパティ `Active` = Qr / List / Schedule / None |
| MapCanvas | `79:370` | 地図+ルート+マーカー(プレースホルダー) |
| EventCard | `78:387` | 検索結果カード |
| TagChip | `78:379` | タグ(Icon/Tag `78:374` 内包) |
| Button/Primary | `120:579` | 「ここへ行く」。`color/cta`(=accentエイリアス)+白文字 |
| Panel/Placeholder | `88:393` | Contentスロットのデフォルト |
| Panel/Qr | `88:397` | QR案内 |
| Panel/EventSearch | `88:468` | 検索(イベント一覧) |
| Panel/Schedule | `92:774` | タイムライン版(**不採用**だが保管中) |
| Panel/SchedulePdf | `94:567` | PDF画像版(採用中) |
| Screen/01 Map | `80:338` | シート最小化(h130)、TabBar Active=None |
| Screen/02 QR | `88:473` | Active=Qr |
| Screen/03 Event Search | `88:496` | Active=List |
| Screen/04 Schedule | `88:580` | Active=Schedule、PDF表示 |
| Screen/05 Detail | `120:724` | イベント詳細(全画面ビュー) |
| Icon/Schedule | `78:363` | ストローク描画カレンダー(TabBar第3タブ) |
| Icon/Back / Icon/WhereToVote | `120:571` / `120:574` | 詳細画面用 |
| Icon/PersonPin / Icon/LocationPin / Icon/QrStartMarker | `78:365` / `78:368` / `78:371` | 地図マーカー用 |
| TimelineItem | `91:413` | タイムライン版の部品(不採用・保管) |

注: `MapCanvas` 内の `Marker/Event`(旧 Marker/Arrow、`79:364`)は**イベント開催地マーカー**。タップで検索タブ+該当イベント強調(SPEC §3.1/§3.4)。

## Tokens ⇔ CSS変数対応

Figmaの `Tokens` コレクション(`VariableCollectionId:78:340`)と `src/styles/global.css` の `:root` は1対1対応:

| Figma変数 | 値 | CSS変数 |
|---|---|---|
| color/accent | #008B8C | --color-accent |
| color/surface | #FFFFFF | --color-surface |
| color/surface-muted | #D9D9D9 | --color-surface-muted |
| color/text | #000000(実装は#111111) | --color-text |
| color/icon-muted | #171717 30% | --color-icon-muted |
| color/cta | accentのエイリアス | (--color-accentを直接参照) |
| radius/chip・card・sheet・pill | 8 / 9 / 20 / 100 | --radius-chip・card・sheet・pill |
| space/xs〜xl | 4/8/12/16/24 | (CSSでは未変数化。必要になったら追加) |

フォント: Noto Sans JP(Google Fonts CDN、index.htmlで読み込み)。基本14px、詳細タイトル20px Bold。

## 運用ルール

1. **UI変更の順序**: Figma(Screens)を先に変更 → 仕様に関わるなら SPEC.md 更新 → 実装。実装だけ先行させない
2. 新しい画面パネルは `Panel/<名前>` コンポーネントを作り、BottomSheetインスタンスの Content スロットにスワップする(構造を複製しない)
3. アイコンを実装に持ち込むときは Figmaから `exportAsync({format:'SVG_STRING'})` で正確なパスを取得する(手描き近似をしない)
4. Web実装との対応: TabBarは固定354px中央寄せ、QRタブはアクティブ時のみアクセント色(TabBarのActiveバリアントと1対1)
