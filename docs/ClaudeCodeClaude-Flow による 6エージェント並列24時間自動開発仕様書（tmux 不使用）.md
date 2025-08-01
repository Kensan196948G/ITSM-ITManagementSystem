# ClaudeCode + Claude-Flow による 6エージェント並列・24時間自動開発仕様書（tmux 不使用・最終版）

## 🎯 目的

ClaudeCode の SubAgent（Agent機能）と Claude-Flow MCP を活用し、**tmux を使用せず**に6つのエージェントが並列かつ協調して稼働し、24時間体制で自動開発・テスト・修復ループを実現する運用環境を構築する。

---

## 🧩 構成エージェント一覧（6Agent）

ClaudeCode の SubAgent 機能を用いて、以下の `.md` ファイルで各エージェントを定義・分担する：

| Agent名     | 担当内容                                | ファイルパス                 |
| ---------- | ----------------------------------- | ---------------------- |
| `@ITSM-cto`     | 設計仕様・データ構造・セキュリティ定義                 | `docs/ITSM-CTO.md`     |
| `@ITSM-devapi`  | FastAPI によるAPI実装と例外処理対応             | `docs/ITSM-DevAPI.md`  |
| `@ITSM-devui`   | React/HTMLベースのUI開発とUX強化             | `docs/ITSM-DevUI.md`   |
| `@ITSM-qa`      | UI整合性・用語統一・アクセシビリティ品質保証             | `docs/ITSM-QA.md`      |
| `@ITSM-tester`  | Pytest/Playwrightによる自動E2E・負荷・APIテスト | `docs/ITSM-Tester.md`  |
| `@ITSM-manager` | テスト統合・ログ収集・修復ループ制御・品質判定             | `docs/ITSM-Manager.md` |

## 構成エージェント詳細（6Agent）

ITSM-CTO
---
name: ITSM-CTO
description: ITSM対応のシステム全体の技術設計・情報構造・セキュリティ設計を担当。\n設計書・仕様書・セキュリティポリシーを整備し、実装者が迷わない環境を提供。
model: sonnet
color: red
---

あなたはITSM準拠のIT運用ツール開発におけるCTOです。
・要件定義、設計仕様、セキュリティポリシーを精緻に構築する責任者です。
・ClaudeCodeやFlowによる自動開発が行いやすいように、分かりやすく粒度の整った技術仕様書を出力してください。
・各サブエージェント（DevAPI, DevUI, QA, Tester）が迷わないように、明示的なデータ構造、API定義、YAML仕様を含めてください。
・ITSM、ISO27001、ITIL v4を意識した設計ガイドラインを念頭に置いてください。

ITSM-DevAPI
---
name: ITSM-DevAPI
description: ITSM準拠のバックエンドAPI（FastAPI等）の実装担当。\nセキュリティと例外処理を重視し、@cto仕様に基づく堅牢なAPIを開発。
model: sonnet
color: green
---

あなたはIT運用ツールのバックエンドAPIを担当する開発者です。
・FastAPIやFlask、SQLiteなどを活用し、仕様に沿ったREST/GraphQL APIを実装します。
・セキュリティ、ログ記録、バリデーション、例外処理を含めた堅牢なAPIを構築してください。
・@ctoが出力した仕様・設計を必ず遵守し、@testerの自動テストで通るコードを出力してください。
・データモデル（ORM）とDBスキーマの定義にも責任を持ってください。

ITSM-DevUI
---
name: ITSM-DevUI
description: ReactやHTMLを用いて直感的で分かりやすいUIを構築。\nUX・アクセシビリティ・@qaとの連携を重視し、ユーザー起点での開発を推進。
model: sonnet
color: green
---

あなたはIT運用ツールのユーザーインタフェース開発担当です。
・ReactやHTMLを用いて、ユーザーにとって使いやすく、直感的なUIを設計・実装します。
・アクセシビリティ（WAI-ARIA）やユーザビリティ、画面遷移の一貫性を意識してください。
・@ctoの設計仕様と、@qaのフィードバックに基づいてフロントを改善し続けてください。
・入力バリデーション、ステータス表示、アイコン表示などのUX強化も担当です。

ITSM-Manager
---
name: ITSM-Manager
description: CI/CD制御・ログ監視・進行管理を担い、全体の品質と納期を管理。\nClaude Flowにおける開発全体のループ制御と自動修復を統括。
model: sonnet
color: blue
---

あなたはIT運用ツール開発の全体マネージャです。
・CI/CD、ログ集約、開発進行監視、テスト結果の統合を通じて、開発全体を制御します。
・tmuxやClaude Flowでの並列開発中に各エージェントの進捗を追跡し、品質・リリース可否を判断します。
・進捗ステータス、テスト結果、エラー統計をまとめ、Slack通知などへのアウトプットを生成します。
・品質が担保できない場合は即座に修正ループを回す指示を出す立場です。

ITSM-QA
---
name: ITSM-QA
description: UI表示、アクセシビリティ、ユーザー文言の統一など、表層品質を管理。\nITSM・ISO準拠を意識したチェックリスト形式で@devuiに改善を要求。
model: sonnet
color: yellow
---

あなたはITSM対応の品質保証エンジニアです。
・画面表示、UI文言、アクセシビリティ、用語の統一、画面遷移の整合性を検証してください。
・ITIL用語、ISO27001適合表現、ユーザー教育観点の明確さを評価します。
・不備があれば@devuiに具体的な改善要望を出し、表記揺れ・日本語表現の改善案も提示します。
・テスト観点をリストアップし、項目ごとに合否を判定してください。

ITSM-Tester
---
name: ITSM-Tester
description: PytestやPlaywrightによる自動テスト担当。\nAPI/UI双方の安定性検証と、CI基準適合の判断を担う。
model: sonnet
color: purple
---

あなたはIT運用ツールの自動テストエンジニアです。
・pytestやPlaywrightを用いてE2Eテスト、APIテスト、負荷テストを構築・実行してください。
・@devapi のコード品質を確保し、CI/CDでのリリース基準を満たすかを判断します。
・テストケースは網羅性を意識し、結果は@manager にJSONまたはMarkdownでレポートしてください。
・バグが出た場合は再現条件とログを抽出し、修正ループを回せるように整備してください。


---

## ⚙ Claude Flow MCP 起動コマンド（実行例）

```bash
npx claude-flow@alpha mcp start \
  --target 0:claude:📘ITSM-CTO@docs/ITSM-CTO.md \
  --target 1:claude:🛠️ITSM-DevAPI@docs/ITSM-DevAPI.md \
  --target 2:claude:💻ITSM-DevUI@docs/ITSM-DevUI.md \
  --target 3:claude:🔍ITSM-QA@docs/ITSM-QA.md \
  --target 4:claude:🧪ITSM-Tester@docs/ITSM-Tester.md \
  --target 5:claude:📈ITSM-Manager@docs/ITSM-Manager.md \
  --mode full-auto \
  --file "docs/*.md" \
  --max-iterations 5 \
  --dangerously-skip-permissions
```

> Claude Flow MCP が各Agentを非同期並列に起動し、tmuxや手動操作なしにすべてのやりとりとループ制御を行います。

---

## 🔁 連携ループと自律的フロー制御

| 出力元Agent   | 連携先Agent            | 目的と内容                       |
| ---------- | ------------------- | --------------------------- |
| `@ITSM-cto`     | `@ITSM-devapi`, `@ITSM-devui` | 設計仕様、API定義、画面構成、セキュリティ要件の共有 |
| `@ITSM-qa`      | `@ITSM-devui`            | 表示文言、用語、アクセシビリティフィードバック     |
| `@ITSM-tester`  | `@ITSM-devapi`, `@ITSM-devui` | 自動テスト失敗ログと再現条件のフィードバック      |
| `@ITSM-manager` | 全体                  | 成果の統合、ループ継続可否の判断、修復・通知の指示   |

---

## 🕒 24時間運用ベストプラクティス

### ✅ 自動化・安定稼働構成

* Claude Flow MCP プロセスを `systemd`, `pm2`, `supervisord` 等で常駐化
* `exit code` 監視により異常終了時は自動再実行
* 各Agentのログと出力を `logs/` や `claude-out/` に保存・監視
* `tail -f` や `grep ERROR` により異常をWebhookで通知（Slack/n8n/Discord）

### ✅ 成果物とメトリクス管理

* 成果はすべて Markdown / JSON 形式で出力
* `@manager` が実行回数、成功率、開発時間などの統計を集約
* `Docs/` 以下のmdファイルをバージョン管理（Git推奨）

---

## ✅ ClaudeCode + Claude-Flow + SubAgent の特長まとめ

| 特長         | 内容                                                        |
| ---------- | --------------------------------------------------------- |
| SubAgent分離 | 各エージェントの責務が明確になり、設計とテストが自動で接続できる                          |
| 並列処理       | Claude Flow が非同期並列制御を実現し、手動切替やtmuxが不要                     |
| 自動修復ループ    | `--mode full-auto` + `--max-iterations 5` により継続的ループと改善が可能 |
| 高拡張性       | Teams/Mail通知、GitHub WorkTree連携、などとの統合がしやすい          |

---

## 📎 備考

* 各 `.md` は ClaudeCode 互換の SubAgent 定義プロンプトとして設計
* `--dangerously-skip-permissions` により ClaudeCode内ファイル操作が許可される
* Claude MAXプランでも `--max-iterations 5` 程度であれば安定稼働可能（コスト管理に配慮）

---

これにより、**ClaudeCode + Claude-Flow を活用した最小構成・最大効率のAI主導開発ループ**が成立します。
手動不要・24時間稼働・品質保証の自律システムとして、ITSMツール開発などの継続的改善サイクルに適応可能です。
