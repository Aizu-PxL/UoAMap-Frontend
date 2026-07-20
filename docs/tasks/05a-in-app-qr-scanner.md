# 05a — アプリ内QRスキャン

## GOAL

QRタブから端末の背面カメラを起動し、会場に設置されたURL型QRを読み取って現在地を更新する。目的地が設定済みならその `to` を保持したままルートを表示し、別のQRを再スキャンした場合も目的地を変えずに新しい現在地からルートを再計算する。

## 参照

- `docs/SPEC.md` §2「02 QR」、§3.2「現在地・目的地とナビゲーション」、§5.2「ルーティング」、§6「ステップ5」
- `docs/FIGMA.md` Screen/02 QR (`88:473`)、Panel/Qr (`88:397`)
- `src/app/landings.tsx` — `/q/:qrId` を `/?at=:placeId` へ正規化する既存処理
- `src/app/AppLayout.tsx` — `at` / `to` 変更時のルート再計算
- `src/features/qr/QrPanel.tsx` — 現在のQRパネル骨組み

## やること

- `qr-scanner` を導入し、背面カメラ優先でQRタブ表示中だけスキャンする
- 読み取り値が同一オリジン・同一アプリベース配下の `/q/:qrId` URLであることを検証する
- 有効なQRを読んだら現在の検索クエリを保持して `/q/:qrId` へ遷移し、既存 `QrLanding` で解決する
- QR検出後の重複処理を防ぎ、アンマウント時にカメラ・Worker・イベントリスナーを破棄する
- カメラ非対応、HTTPS外、権限拒否、カメラなし、起動失敗、不正QRに日本語で対処し、再試行可能にする
- Figmaの説明文と254px正方形プレビューを基準に、320〜430px幅へ追従させる
- MITライセンスの著作権・許諾文を配布物へ同梱する。アプリ内表示義務はないためライセンス画面は作らない

## SCOPE

- `package.json`
- `bun.lock`
- `public/THIRD_PARTY_NOTICES.txt`
- `src/app/landings.tsx`
- `src/features/qr/QrPanel.tsx`
- `src/features/qr/qrValue.ts`
- `src/features/qr/qrValue.test.ts`
- `src/styles/global.css`
- `docs/SPEC.md`
- `docs/tasks/05a-in-app-qr-scanner.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/BACKLOG.md`

上記以外は変更しない。特に `public/maps/`、`src/features/routing/`、既存のQR対応表は変更しない。

## 受入基準

- [x] `/qr` を開くと背面カメラが起動し、Figma準拠の正方形領域へ映像が表示される
- [x] `.../q/Q001` を読むと `at=sh-hall` がセットされる
- [x] `/qr?to=M21` で `.../q/Q003` を読むと `/?at=lh-large&to=M21` へ正規化され、ルートが表示される
- [x] 目的地を保持したままQRタブへ戻り、別のQRを読むと `to` は不変で `at` だけが更新され、ルートが再計算される
- [x] スキャン時に残っていた `focus` は既存 `QrLanding` により削除される
- [x] 外部オリジン、別パス、空のQR ID、余分なパスを持つQRは拒否され、スキャンを継続できる
- [x] 権限拒否・カメラなし・非対応・非HTTPS・その他の起動失敗で日本語メッセージと再試行操作が表示される
- [x] QRタブから離れるとカメラが停止し、戻ると再びスキャンできる
- [x] 320px / 402px / 430pxで横スクロールや切れがない
- [x] QR読み取りと遷移でコンソールエラーがない
- [x] `bun test` PASS
- [x] `bun run build` PASS
- [x] `bun run verify:places` が36件PASS
- [x] `git diff --check` PASS

## DELIVERABLE

- 変更ファイル一覧
- 受入基準ごとのPASS / FAILと根拠
- QR URL検証、再スキャン、カメラライフサイクル、ライセンス対応の設計判断

## 受入結果

- `bun test`: 36 tests / 0 fail / 367 expect() calls
- `bun run build`: PASS。`qr-scanner-worker`を別chunkとして生成し、`THIRD_PARTY_NOTICES.txt`をdistへ同梱
- `bun run verify:places`: 36件PASS
- `bun run verify:routes`: 104ノード / 112エッジ（SCOPE外の回帰確認）
- `git diff --check`: PASS
- ブラウザ: 実QR画像からQ003 URLを復号。`to=M21`を保持して初回`at=lh-large`、再スキャン`at=sh-hall`へ更新し、`focus`を削除。経路は講義棟内からキャンパス横断へ再計算
- ブラウザ: QRタブ再表示時のカメラ自動再試行と手動再試行を確認。320px / 402px / 430pxでカメラ枠254×254px、横スクロールなし、コンソールエラーなし

## 設計判断

- スキャナーから現在地を直接書き換えず、既存`/q/:qrId`へ渡してリポジトリ層のQR解決とURL正規化を一元化した
- QR値は同一origin・アプリbase pathに限定し、外部URLを誤って現在地として扱わない
- 再スキャンでは`at`だけを置き換え、`to`を保持、旧`focus`を削除する純粋関数をテストで固定した
- `qr-scanner`はMITライセンスでアプリ内表示義務がないため画面は増やさず、許諾文を配布物へ同梱した
