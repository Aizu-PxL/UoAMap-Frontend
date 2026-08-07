# TESTING — テスト実行手順(Windows / PowerShell)

最終更新: 2026-08-07
**位置づけ**: 検証ゲートの「何を満たせば合格か」は [WORKFLOW.md](WORKFLOW.md)「検証ゲート」、確認するURLと期待挙動は [STATUS.md](STATUS.md)「動作確認手順」が正。このファイルはそれを**Windowsで実際に流すときの手順と落とし穴**だけを補う。macOS/Linuxなら素直にそのまま動くので、このファイルは不要。

## 0. 前提

| 項目 | 確認コマンド | 実測(2026-08-07) |
|---|---|---|
| bun | `bun --version` | 1.3.14 |
| Node | `node --version` | v24.18.0(vite/tscはbun経由で動くため直接は使わない) |
| 依存 | `bun install` | `bun.lock` あり。node_modules が無いときだけ実行 |

シェルは **Windows PowerShell 5.1**。Git Bash でも動くが、以下の注意はPowerShell前提。

## 1. コマンド一覧(全部リポジトリルートで実行)

```powershell
bun run verify:all
```

これが一括ゲート。中身は `bun test && bun run build && bun run verify:places && bun run verify:routes && git diff --check` で、**`&&` の解釈はbun自身のシェルが行う**ため、`&&` が使えないPowerShell 5.1でも問題なく連鎖する(前段が落ちるとそこで停止する)。

個別に流す場合:

| コマンド | 何を見るか | 期待 |
|---|---|---|
| `bun test` | 純粋ロジックの単体テスト(routeExtractionCore ほか) | 183 tests all pass |
| `bun run build` | `verify:route-editor` → `tsc -b` → `vite build`。**型チェックを兼ねる** | `✓ built in ...` |
| `bun run verify:places` | Place/QR/Event と計画JSONの整合 | `✓ Place・QR・Event検証成功` |
| `bun run verify:routes` | SVGのRouteグラフ ⇔ `routeGraph.json` の一致 | 差分なし |
| `bun run dev` | dev server(:5173) | ブラウザ確認用 |

`bun run verify:routes` が落ちたときの復旧は `bun run generate:routes`(生成物 `src/features/routing/generated/routeGraph.json` を更新する。**書き込みが発生するのでコミット前提で実行する**)。

## 2. PowerShell特有の落とし穴

- **`bun` は `bun.ps1` ラッパー経由で動く。実行するコマンド行(`$ bun run scripts/...`)を stderr に出すため、PowerShellが `NativeCommandError` として赤字で表示する。これは失敗ではない。**
  ```
  bun.exe : $ bun run scripts/verify-places.ts
  At C:\Users\moton\AppData\Roaming\npm\bun.ps1:14 char:3
      + CategoryInfo : NotSpecified: ... [], RemoteException
  ```
  この直後に `✓ Place・QR・Event検証成功` と出ていれば PASS。
- **同じ理由で `$?` は当てにならない。合否は必ず `$LASTEXITCODE` で判定する。**
  ```powershell
  bun run verify:places; "EXIT=$LASTEXITCODE"
  ```
- 出力を絞りたいときは `2>&1 | Select-Object -Last 20` を付ける(`tail` は無い)。
- `&&` / `||` はPowerShell 5.1では構文エラー。複数コマンドを続けるなら `;` か、上記のとおり `bun run verify:all` に任せる。

### 改行コード(重要)

このリポジトリの検証は、生成物を**バイト単位の文字列比較**で突き合わせる([extract-routes.ts:50](../scripts/extract-routes.ts:50)、[build-route-editor.ts:52](../scripts/build-route-editor.ts:52))。生成側は常にLFで書き出すため、`core.autocrlf=true` のWindowsでチェックアウト時にCRLFへ変換されると、**中身が完全に同じでも `verify:routes` / `verify:route-editor` が落ちる**。

しかもこの状態は `git diff` に出ない(gitがCRLFを正規化して読むため、作業ツリーはcleanに見える)。「cleanなのにテストだけ落ちる」ときは真っ先にこれを疑う。判定は:

```powershell
git ls-files --eol src/features/routing/generated/routeGraph.json tools/route-editor.html
```

`w/lf` なら正常。`w/crlf` や `w/mixed` なら変換されている。対象ファイルは [.gitattributes](../.gitattributes) で `text eol=lf` に固定済みなので、通常は再発しない。万一崩れたら `bun run generate:routes` / `bun run generate:route-editor` で書き直せば戻る。

## 3. ブラウザ確認

`bun run dev` で :5173 を上げ、**幅402px(iPhone 17)** で [STATUS.md](STATUS.md)「動作確認手順」のURL表のうち、変更に関連する行を確認する。ラベル・マーカーの固定サイズを触った場合のみ 1440×900 と「再読み込みなしの幅変更」も追加で見る。

各URLで見るのは (1) 期待挙動どおりの表示 (2) **コンソールエラーが0件** の2点。

Claude Code から確認する場合(このリポジトリには `.claude/launch.json` が入っている):

1. `preview_start` に `{name: "uoamap-dev"}` — `bun run dev` を直接Bashで起動しない
2. `resize_window` で 402×874
3. `navigate` で対象URL
4. `read_console_messages` で `onlyErrors: true` → 0件を確認
5. `read_page` または `javascript_tool` で描画結果を確認

**スクリーンショットはBrowserペインを表示していないと 5秒でタイムアウトして撮れない。** ペインが閉じているときは `javascript_tool` でDOMを直接数えるのが確実。ルート表示の確認例:

```js
JSON.stringify({
  url: location.href,
  route: document.querySelectorAll('.map-canvas__route-layer .map-route').length,
  markers: document.querySelectorAll('.map-canvas__marker-layer .map-marker').length,
})
```

`/?at=rq_room_161&to=P12` で route 6本 + `map-route-stair` + `map-marker--current` が出れば期待どおり。

## 4. 現状の実測結果(2026-08-07 / `feature/fixerror` @ 29b3f23)

`bun run verify:all` **全ゲートPASS**(EXIT 0)。

| ゲート | 結果 |
|---|---|
| `bun test` | ✅ 183 pass / 0 fail |
| `bun run build` | ✅ PASS |
| `bun run verify:places` | ✅ 125 Place / 89 QR / 61 Event |
| `bun run verify:routes` | ✅ 350ノード / 448エッジ |
| ブラウザ `/?at=rq_room_161&to=P12` @402px | ✅ 描画OK / コンソールエラー0件 |

### 解決済み: `bun test` / `verify:routes` のFAIL(改行コード)

当初 `routeExtractionCore.test.ts:78` の「350 nodes / 448 edgesへ抽出し生成JSONと**完全バイト一致**する」と `verify:routes` が、作業ツリーcleanのまま落ちていた。

原因はRouteグラフの内容ではなく `core.autocrlf=true` によるCRLF変換で、`bun run generate:routes` で書き直しても `git diff` は空(=グラフの中身は最初から正しかった)。恒久対策として [.gitattributes](../.gitattributes) を追加し、バイト比較される生成物2つをLF固定にした。詳細は §2「改行コード」。

同じ理由で潜在的に壊れていた `tools/route-editor.html`(`w/mixed`)も同時に固定した。

### 解決済み: ドキュメントのPlace件数が古かった

`bun run verify:places` は **125 Place / 89 QR / 61 Event** でPASSし、スクリプト側の期待値も `scripts/verify-places.ts:11` で `EXPECTED_PLACE_COUNT = 125` と整合していたが、ドキュメント側が「124 Place / 350 nodes / 447 edges」のまま取り残されていた。現在値を述べている箇所(AGENTS.md / WORKFLOW.md / STATUS.md / SPEC.md / HANDOFF.md / MAP_AUTHORING.md / README.md)を実測値へ更新した。スライスごとの日付つき検証ログと `docs/tasks/` のブリーフは当時の事実なので変更していない。

実測した現在の内訳(参考):

```
Place 合計          125
  QR地点             89（新規座標Place案73 + 既存Routeノード再利用14 + Q018 1 + Q089 1）
  イベント会場       38（うち main_auditorium / sh_room_kiyare の2件はQR地点と共有）
  重複しない会場     35
  unmapped            1（campus-all）
Routeグラフ         350 nodes / 448 edges（walk 409 / transfer 39）
  収録Place          124（campus-all を除く全Place）
```
