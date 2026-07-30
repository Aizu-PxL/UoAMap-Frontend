# FIGMA — デザインファイルの構造と運用

最終更新: 2026-07-30
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
| 🧪 UX Demo | 現行React実装の状態・例外・遷移注記。UX検討専用で、**UIの正ではない** |

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
| 🧪 UX Demo(page) | `192:338` | 正式ページを変更せず、現行挙動を検討するページ |
| UX Inventory & Flow Notes | `192:339` | 状態一覧・注記専用。Prototypeの再生対象にはしない |
| 🎬 Core Flow — Prototype Screens | `216:1361` | 9個の402×874px画面を直下に持つSection |
| 🎬 Map & Sheet — Prototype Screens | `216:1362` | 5個の402×874px画面を直下に持つSection |
| 🎬 QR Exceptions — Prototype Screens | `216:1363` | 8個の402×874px画面を直下に持つSection |
| 🎬 Search & Detail — Prototype Screens | `216:1364` | 8個の402×874px画面を直下に持つSection |
| 01 Core Flow | `192:342` | 地図→検索→詳細→目的地→QR→経路→Scheduleの9状態 |
| 02 Map & Sheet States | `192:343` | 22／58／82svh、現在地のみ、不正指定の5状態 |
| 03 QR States | `192:344` | 起動・読取・対象外・HTTPS・非対応・権限・未登録・API失敗の8状態 |
| 04 Search & Detail States | `192:345` | タグ・強調・0件・読込・失敗・詳細読込・不存在の8状態 |
| 05 Flow Notes | `192:346` | 現行遷移、URL保持契約、既存Figmaとの差分分類 |

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
5. `🧪 UX Demo` はUX検討用。各画面本体は402×874pxで、外側のメタ情報に画面ID・URL・開始条件・想定遷移先を記録する。UX合意前に `📱 Screens` やReactへ反映しない
6. UX Demoの30画面は4つの `🎬 ... Prototype Screens` Section直下に置く。`192:339` の資料ボードを開始画面にせず、最初に `C01 Screen — 地図初期状態` をFlow starting pointへ指定する
7. UX DemoのPrototype reactionはユーザーが初回接続する。Codexは接続後にPresent操作とreaction構造をレビューし、URL・Repository・カメラ状態などFigmaだけで再現できない条件はFlow Notesで扱う
