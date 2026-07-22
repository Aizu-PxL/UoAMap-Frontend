# 13a — リポジトリ横断リファクタリング準備

## GOAL

本体コードを変更せず、次のCodexスレッドが外部仕様を維持したリポジトリ横断リファクタリングを、安全な小スライスで開始・継続・検証・独立レビューできる状態にする。

## 参照

- `docs/SPEC.md` §5
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/WORKFLOW.md`
- OpenAI Codexのproject config、AGENTS.md、ExecPlanの公式ガイダンス

## やること

- リポジトリ固有Codex設定の非適用サンプルを追加する。
- `.agent/PLANS.md` にUoAMap向けExecPlan規約を追加する。
- 読み取り専用監査と基準検証を基に `.agent/refactor-plan.md` を作成する。
- `AGENTS.md` と `docs/WORKFLOW.md` からExecPlan運用へ接続する。
- `docs/STATUS.md` と `docs/HANDOFF.md` に次スレッドの開始位置を残す。

## SCOPE

- `.codex/config.toml.example`
- `.agent/PLANS.md`
- `.agent/refactor-plan.md`
- `AGENTS.md`
- `docs/WORKFLOW.md`
- `docs/STATUS.md`
- `docs/HANDOFF.md`
- `docs/tasks/13a-refactor-preparation.md`

本体コード、テストコード、package/lockfile、SVG、生成物は変更しない。

## 受入基準

- `.codex/config.toml.example` がTOMLとして解析でき、現行Codexの有効なキーだけを使う。アクティブな権限設定は変更しない。
- ExecPlanが目的、根拠、制約、マイルストーン、検証、進捗、次の1手を単体で説明する。
- 既存のブリーフ・検証・独立レビュー・git操作禁止ルールと矛盾しない。
- `bun test`、`bun run verify:routes`、`bun run verify:places`、`bun run build` がPASSする。
- `git diff --check` がPASSする。
- 会話履歴を引き継がない読み取り専用レビューで指摘がない。

## DELIVERABLE

- 次スレッド向けのproject configサンプル、ExecPlan規約、初期refactor plan
- 既存ワークフローとの接続と引き継ぎ
- 検証結果（2026-07-22）
  - `.codex/config.toml.example` TOML解析: PASS
  - `bun test`: PASS（39 tests / 380 assertions）
  - `bun run verify:routes`: PASS（104 nodes / 112 edges）
  - `bun run verify:places`: PASS（36件）
  - `bun run build`: PASS
  - `git diff --check`: PASS
- 初回独立レビュー: `.codex/config.toml.example` の `gpt-5.6` がCLI 0.144.6で利用不能とのP1指摘
  - 採否: 不採用。CLI版は0.144.6だが、2026-07-22取得の現行Codexマニュアルと公式sample configが、通常タスクの推奨モデルおよび設定例として `gpt-5.6` を明記していることを確認した
- 最終独立レビュー: P2（`MapCanvas` のイベントマーカーから `/events?highlight=...` へ遷移する処理と既存クエリ保持をcharacterization test対象へ明記）を修正後、指摘なし
