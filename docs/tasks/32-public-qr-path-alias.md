# 32 公開QRパス対応

## GOAL

アプリをルート配信（`base=/`）のまま維持し、印刷QRの正式URL `https://uoa-ocmap.com/UoAMap-Frontend/q/:qrId` を既存のQR着地処理へ接続する。標準カメラからの直接アクセスとアプリ内スキャンのどちらでもQRをPlaceへ解決し、既存のURL状態を維持する。

## 参照

- `docs/SPEC.md` §5.2
- `docs/PRODUCTION.md` §1、§3、§5
- `docs/WORKFLOW.md`
- `src/app/routes.tsx`
- `src/features/qr/qrValue.ts`

## やること

- 正式origin、アプリのbase path、印刷QRの公開パスを仕様・本番計画へ記録する。
- `/UoAMap-Frontend/q/:qrId`を既存の`QrLanding`へ接続する。
- アプリ内スキャナーで、同一originの正式QRパスと従来のアプリbase path配下`/q/:qrId`を受理する。
- スキャン後の内部遷移、`at`更新、`to`保持、`focus`削除、未知QRエラーを維持する。

## SCOPE

- `docs/SPEC.md`
- `docs/PRODUCTION.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/tasks/32-public-qr-path-alias.md`
- `src/app/routes.tsx`
- `src/features/qr/qrValue.ts`
- `src/features/qr/qrValue.test.ts`

Repository/API、QR ID・Place対応表、Vite `base`、公開アセット、CSS、Figma、QRポスター生成処理は変更しない。

## 受入基準

- [x] 正式URLからQ001を抽出でき、別origin・類似パス・余分なパス・不正IDを拒否する単体テストが通る。
- [x] `/UoAMap-Frontend/q/Q001`が`/?at=main_node_11`へ正規化される。
- [x] `/UoAMap-Frontend/q/Q001?to=M21`が目的地を保持してルートを表示する。
- [x] 公開パスの未登録QRが既存の利用者向けエラーを表示する。
- [x] 既存の`/q/Q001`が従来どおり解決される。
- [x] `bun run verify:all`、`bun run build`、`bun run verify:places`、`git diff --check`がPASSする。
- [x] 幅402×874pxの関連URLでコンソールエラーがない。
- [x] 会話履歴なしの読み取り専用独立レビューで指摘がない。

## DELIVERABLE

- 公開QR別名ルートとスキャナーURL検証
- 仕様・公開運用文書の確定値更新
- 自動検証: `bun run verify:all` PASS（138 tests / 1,053 assertions、production build、124 Place / 89 QR / 61 Event、350 nodes / 447 edges、git diff check）
- ブラウザ: 402×874pxで公開Q001、目的地付き公開Q001、公開Q999、既存Q001を確認し、console error/warn 0件
- QRポスター生成処理は正式URLを既に生成しているため変更なし
- 初回独立レビュー: P2 3件（SPEC・実機受入表の旧QR表記、既存スキャナー説明、URL決定手順の矛盾）を修正済み
- 最終再レビュー: 指摘なし
