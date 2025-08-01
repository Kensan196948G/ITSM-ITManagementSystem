# 📤 GitHub自動同期・連携ガイド

## 📋 概要

ITSM開発プロジェクトとGitHubリポジトリの自動同期システムの使用方法を説明します。開発進捗の自動コミット・プッシュ、競合解決、継続的インテグレーションを実現します。

## 🔗 リポジトリ情報

- **リポジトリURL**: https://github.com/Kensan196948G/ITSM-ITManagementSystem.git
- **メインブランチ**: `main`
- **開発者**: Kensan196948G

## 🚀 初期設定

### 1. Git設定確認

```bash
# Git設定の確認
git config --list | grep user
git config --list | grep credential

# 設定されていない場合
git config --global user.name "Kensan196948G"
git config --global user.email "kensan196948g@gmail.com"
git config --global credential.helper store
```

### 2. GitHub認証設定

#### 方法1: GitHub CLI（推奨）

```bash
# GitHub CLI のインストール（Ubuntu/Debian）
sudo apt install gh

# 認証
gh auth login
# -> GitHub.com を選択
# -> HTTPS を選択  
# -> Yes（authenticate Git with credentials）を選択
# -> Login with a web browser を選択
```

#### 方法2: Personal Access Token

1. https://github.com/settings/tokens にアクセス
2. "Generate new token (classic)" をクリック
3. スコープを選択：
   - ✅ `repo` (Full control of private repositories)
   - ✅ `workflow` (Update GitHub Action workflows)
4. トークンをコピーして保存

```bash
# トークンを使用した認証（初回プッシュ時に入力）
# Username: Kensan196948G
# Password: [生成したトークンを貼り付け]
```

## 📤 自動同期スクリプト

### 1. 単発同期

```bash
./git-auto-sync.sh
```

**機能**:
- 変更の自動検出
- 自動コミット（タイムスタンプ付き）
- GitHubへの自動プッシュ
- エラーハンドリング

### 2. 定期同期

```bash
# デフォルト（1時間毎）
./git-scheduled-sync.sh

# カスタム間隔
./git-scheduled-sync.sh 300   # 5分毎
./git-scheduled-sync.sh 900   # 15分毎  
./git-scheduled-sync.sh 1800  # 30分毎
```

### 3. バックグラウンド実行

```bash
# バックグラウンドで定期同期開始
nohup ./git-scheduled-sync.sh 900 > logs/git-sync-background.log 2>&1 &

# プロセス確認
ps aux | grep git-scheduled-sync

# 停止
pkill -f git-scheduled-sync
```

## 📊 ログ監視

### ログファイル

```bash
# 同期ログの確認
tail -f logs/git-sync.log

# スケジュール同期ログ
tail -f logs/scheduled-sync.log

# エラーのみ確認
grep "❌\|ERROR\|Failed" logs/git-sync.log
```

### 同期状況の確認

```bash
# 最新コミット確認
git log --oneline -10

# リモートとの差分確認
git status
git diff origin/main

# プッシュ履歴確認
git log --grep="Auto-sync" --oneline
```

## 🔧 高度な設定

### 自動コミットメッセージのカスタマイズ

`git-auto-sync.sh` を編集：

```bash
# カスタムコミットメッセージテンプレート
commit_message="🤖 ITSM Auto-Dev: $(date '+%Y-%m-%d %H:%M:%S')

📊 Development Progress Update:
$(git diff --cached --name-status | head -15)

🎯 Features:
- Agent-driven development
- Continuous integration
- Quality assurance

🚀 Generated with Claude Code
Co-Authored-By: Claude <noreply@anthropic.com>"
```

### 同期除外設定

`.gitignore` の確認・編集：

```bash
# 同期から除外するファイル・ディレクトリ
logs/
*.log
*.pid
nohup.out
.swarm/
node_modules/
__pycache__/
*.pyc
.env
*.key
*.pem
```

### ブランチ戦略

```bash
# 開発ブランチでの作業
git checkout -b feature/agent-development
./git-auto-sync.sh

# メインブランチへのマージ
git checkout main
git merge feature/agent-development
git push origin main
```

## 🛡️ セキュリティ対策

### 機密情報の保護

```bash
# 機密ファイルの確認
find . -name "*.key" -o -name "*.pem" -o -name ".env*"

# .gitignore に追加済みか確認
git check-ignore .env config/secrets.json
```

### アクセストークンの管理

```bash
# 保存されたトークンの確認
cat ~/.git-credentials

# トークンの削除（必要時）
rm ~/.git-credentials
git config --global --unset credential.helper
```

## 🔄 CI/CD統合

### GitHub Actions との連携

`.github/workflows/itsm-auto-dev.yml` の設定：

```yaml
name: ITSM Auto Development

on:
  push:
    branches: [ main ]
  schedule:
    - cron: '0 */6 * * *'  # 6時間毎

jobs:
  development:
    runs-on: ubuntu-latest
    steps:
    - uses: actions/checkout@v3
    - name: Setup Claude Environment
      run: |
        # Claude CLI setup
        # Agent environment setup
    - name: Run 6-Agent Development
      run: ./start-simple-agents.sh
    - name: Auto-commit results
      run: ./git-auto-sync.sh
```

### Webhook通知

```bash
# Slack通知設定（例）
curl -X POST -H 'Content-type: application/json' \
  --data '{"text":"🤖 ITSM Auto-sync completed: '"$(git log -1 --pretty=format:'%s')"'"}' \
  $SLACK_WEBHOOK_URL
```

## 📈 パフォーマンス監視

### 同期統計

```bash
# 今日のコミット数
git log --since="today" --oneline | wc -l

# 過去7日間の活動
git log --since="7 days ago" --pretty=format:"%h %ad %s" --date=short

# ファイル変更統計
git log --since="24 hours ago" --stat
```

### 容量管理

```bash
# リポジトリサイズ確認
du -sh .git/

# 大きなファイルの確認
find . -type f -size +10M | grep -v .git/

# 履歴クリーンアップ（必要時）
git gc --aggressive --prune=now
```

## 🛠️ トラブルシューティング

### よくある問題

#### 1. 認証エラー

```bash
# 解決策
gh auth login
# または
./setup-github-auth.sh
```

#### 2. マージ競合

```bash
# 手動解決
git pull origin main --allow-unrelated-histories
# 競合ファイルを編集
git add .
git commit -m "Resolve merge conflict"
git push origin main
```

#### 3. 大量の未コミット変更

```bash
# 段階的コミット
git add -A
git commit -m "Bulk commit: Development checkpoint $(date)"
git push origin main
```

#### 4. 同期スクリプトの停止

```bash
# プロセス確認
ps aux | grep git-scheduled-sync

# 強制停止
pkill -f git-scheduled-sync.sh

# ログ確認
tail -f logs/scheduled-sync.log
```

## 📊 監視ダッシュボード

### 開発状況の可視化

```bash
# 開発進捗レポート生成
echo "# ITSM Development Progress Report"
echo "Generated: $(date)"
echo ""
echo "## Recent Commits"
git log --oneline -10
echo ""
echo "## File Changes (24h)"
git log --since="24 hours ago" --name-only --pretty=format: | sort | uniq -c | sort -rn
echo ""
echo "## Repository Statistics"
echo "Total commits: $(git log --oneline | wc -l)"
echo "Total files: $(find . -type f ! -path './.git/*' | wc -l)"
echo "Code files: $(find . -name '*.py' -o -name '*.js' -o -name '*.tsx' | wc -l)"
```

## 🔗 関連ドキュメント

- [エージェント起動ガイド](エージェント起動ガイド.md)
- [GitHub Repository](https://github.com/Kensan196948G/ITSM-ITManagementSystem)
- [GitHub Issues](https://github.com/Kensan196948G/ITSM-ITManagementSystem/issues)

## 🆘 サポート

### 緊急時の対応

1. **同期停止**: `pkill -f git-scheduled-sync`
2. **ログ確認**: `tail -f logs/git-sync.log`
3. **手動同期**: `./git-auto-sync.sh`
4. **状態確認**: `git status`

### 問題報告

GitHub Issues にログファイルと共に報告：
https://github.com/Kensan196948G/ITSM-ITManagementSystem/issues

---

🤖 **GitHub自動同期システム**  
📅 Last Updated: 2025-08-01  
🔗 Repository: https://github.com/Kensan196948G/ITSM-ITManagementSystem