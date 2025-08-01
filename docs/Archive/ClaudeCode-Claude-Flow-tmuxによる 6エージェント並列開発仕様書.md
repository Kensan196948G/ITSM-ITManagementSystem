# ClaudeCode + Claude-Flow + tmux による 6エージェント並列開発仕様書

## 🎯 目的

ClaudeCode の Agent 機能と Claude-Flow MCP、自動修復ループ、tmux の 6ペイン構成を組み合わせ、以下の6つの役割をもつエージェントが**完全自動並列開発**できる実行環境を構築する。

---

## 🧩 構成エージェント一覧（6Agent）

| Agent名     | 役割内容                     | mdファイル名           |
| ---------- | ------------------------ | ----------------- |
| `@cto`     | 要件定義・設計仕様・セキュリティ設計       | `ITSM-CTO.md`     |
| `@devapi`  | バックエンドAPI実装（FastAPI等）    | `ITSM-DevAPI.md`  |
| `@devui`   | UI実装（React/HTML、UX設計）    | `ITSM-DevUI.md`   |
| `@qa`      | 表示文言・UI整合性・アクセシビリティ評価    | `ITSM-QA.md`      |
| `@tester`  | 自動テスト（Pytest/Playwright） | `ITSM-Tester.md`  |
| `@manager` | CI/CD制御・ログ統合・品質管理・修復制御   | `ITSM-Manager.md` |

---

## ⚙ Claude Flow MCP 起動コマンド（例）

```bash
npx claude-flow@alpha mcp start \
  --target 0:claude:📘CTO@ITSM-CTO.md \
  --target 1:claude:🛠️API@ITSM-DevAPI.md \
  --target 2:claude:💻UI@ITSM-DevUI.md \
  --target 3:claude:🔍QA@ITSM-QA.md \
  --target 4:claude:🧪Tester@ITSM-Tester.md \
  --target 5:claude:📈Manager@ITSM-Manager.md \
  --mode full-auto \
  --file "Docs/*.md" \
  --max-iterations 7 \
  --dangerously-skip-permissions
```

---

## 🪟 tmux：6ペイン構成

### ✅ ペイン割り当て

```
┌──────────────┬──────────────┬──────────────┐
│ 📈 Manager    │ 💻 DevUI      │ 🛠️ DevAPI      │
├──────────────┤──────────────┤──────────────┤
│ 📘 CTO        │ 🔍 QA         │ 🧪 Tester      │
└──────────────┴──────────────┴──────────────┘
```

### ✅ 起動スクリプト（例）

```bash
tmux new-session -d -s itsm_dev

# 左側：上下分割
tmux split-window -v -t itsm_dev:0

# 右側：3分割構成（DevUI, DevAPI, QA+Tester）
tmux select-pane -t 1
for i in 1 2; do tmux split-window -h; done
tmux select-pane -t 3
for i in 1; do tmux split-window -v; done

# 各ペインへコマンド送信
tmux select-pane -t 0; tmux send-keys "claude --dangerously-skip-permissions --target 5:claude:📈Manager@ITSM-Manager.md" C-m
tmux select-pane -t 1; tmux send-keys "claude --dangerously-skip-permissions --target 0:claude:📘CTO@ITSM-CTO.md" C-m
tmux select-pane -t 2; tmux send-keys "claude --dangerously-skip-permissions --target 2:claude:💻UI@ITSM-DevUI.md" C-m
tmux select-pane -t 3; tmux send-keys "claude --dangerously-skip-permissions --target 1:claude:🛠️API@ITSM-DevAPI.md" C-m
tmux select-pane -t 4; tmux send-keys "claude --dangerously-skip-permissions --target 3:claude:🔍QA@ITSM-QA.md" C-m
tmux select-pane -t 5; tmux send-keys "claude --dangerously-skip-permissions --target 4:claude:🧪Tester@ITSM-Tester.md" C-m

tmux attach-session -t itsm_dev
```

---

## 🔁 連携ループとフロー構造

| 出力元Agent   | 連携先Agent        | 内容と目的                |
| ---------- | --------------- | -------------------- |
| `@cto`     | `@devapi`       | API定義・認証構造・バリデーション   |
| `@cto`     | `@devui`        | UI構造・入力仕様・画面遷移フロー    |
| `@qa`      | `@devui`        | UI改善・アクセシビリティ文言統一指摘  |
| `@tester`  | `@devapi/devui` | テスト失敗ログのフィードバック      |
| `@manager` | `全体`            | テスト統合・CI判定・自動修復ループ制御 |

---

## ✅ 完全自動ループの到達点

* Claude Flow による自動実装 + テスト + 修正ループ（最大7回）
* 各ペイン間の ClaudeCode CLI 経由メッセージ連携
* CLI結果の JSON/Markdown 出力をベースに `@manager` がループ判定

---

## 📎 備考

* 各 `.md` ファイルは ClaudeCode による Agent定義として読み込まれます。
* `--dangerously-skip-permissions` は ClaudeFlow 実行時に必要な設定です。
* 仕様ファイルは `Docs/*.md` や任意の要件仕様ディレクトリで管理できます。

---

以上が、ClaudeCode + Claude-Flow + tmux による 6つのエージェントの完全並列開発・運用構成です。
必要に応じて、GitHub WorkTree連携、Slack通知、ログ統合も組み込めます。
