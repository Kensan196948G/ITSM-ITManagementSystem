# 統合システム検証レポート

## 🟡 総合ステータス: WARNING

### 📊 検証サマリー
- **総エラー数**: 4
- **クリティカルエラー**: 0
- **修復済みエラー**: 0
- **残存エラー**: 4
- **検証サイクル**: 4
- **最終検証時刻**: 2025-08-02T04:17:36.020Z

### 🔍 コンポーネント別結果

#### ❌ WEBUI
- **URL**: http://192.168.3.135:3000
- **ステータス**: error
- **エラー数**: 1
- **修復アクション**: 0

**検出されたエラー**:
1. [HIGH] validation_error: WebUI検証エラー: Command failed: Command failed: ./frontend/run-comprehensive-webui-monitor.sh --status
sudo: a terminal is required to read the password; either use the -S option to read from standard input or configure an askpass helper
sudo: パスワードが必要です


#### ❌ ADMIN
- **URL**: http://192.168.3.135:3000/admin
- **ステータス**: error
- **エラー数**: 1
- **修復アクション**: 0

**検出されたエラー**:
1. [HIGH] admin_validation_error: 管理者ダッシュボード検証エラー: Command failed: Command failed: ./frontend/run-comprehensive-webui-monitor.sh --admin-only
sudo: a terminal is required to read the password; either use the -S option to read from standard input or configure an askpass helper
sudo: パスワードが必要です


#### ❌ API
- **URL**: http://192.168.3.135:8000
- **ステータス**: error
- **エラー数**: 1
- **修復アクション**: 0

**検出されたエラー**:
1. [HIGH] api_validation_error: API検証エラー: Command failed: Command failed: cd backend && source venv/bin/activate && python comprehensive_monitoring.py --once
/bin/sh: 1: source: not found


#### ❌ DOCS
- **URL**: http://192.168.3.135:8000/docs
- **ステータス**: error
- **エラー数**: 1
- **修復アクション**: 0

**検出されたエラー**:
1. [MEDIUM] docs_validation_error: ドキュメント検証エラー: Request failed with status code 404


---
*レポート生成時刻: 2025-08-02T04:17:36.031Z*
