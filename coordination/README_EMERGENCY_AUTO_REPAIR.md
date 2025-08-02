# 🚨 GitHub Actions 緊急自動修復システム

完全自動化されたGitHub Actionsエラー検知・修復・解決システム

## 📊 システム概要

- **5秒以内のエラー検知**: GitHub Actions APIを5秒間隔で監視
- **即座の自動修復**: エラー検知→修復実行→再プッシュ→再実行
- **無限ループ対応**: エラー0件まで継続実行
- **ITSM準拠**: インシデント管理、SLA追跡、エスカレーション
- **完全統合**: 既存システムとの完全統合制御

## 🏗️ システム構成

### 主要コンポーネント

1. **マスターコントローラー** (`master_auto_repair_controller.py`)
   - 全システムの統合制御
   - 5秒間隔のGitHub Actions監視
   - 自動修復とワークフロー再実行

2. **緊急修復ループ** (`emergency_auto_repair_loop.py`)
   - 5秒以内のエラー検知
   - 即座の修復トリガー
   - ITSM準拠インシデント作成

3. **統合コントローラー** (`integration_controller.py`)
   - 既存システムとの統合
   - システム優先度制御
   - ヘルス監視

4. **ITSMインシデント管理** (`itsm_incident_manager.py`)
   - インシデント自動分類・優先度設定
   - SLA追跡とエスカレーション
   - 根本原因分析

5. **リアルタイム修復** (`realtime_repair_controller.py`)
   - 5秒間隔のリアルタイム修復
   - エラーパターン分析
   - 自動修復実行

6. **拡張GitHub Actions修復** (`enhanced_github_actions_auto_repair.py`)
   - Claude Flow MCP統合
   - セキュリティ隔離
   - 品質ゲート

## 🚀 使用方法

### 基本起動

```bash
# マスターコントローラー起動（推奨）
./start_emergency_auto_repair.sh master

# 緊急修復ループ起動
./start_emergency_auto_repair.sh emergency

# バックグラウンド実行
./start_emergency_auto_repair.sh master background
```

### 個別システム起動

```bash
# 統合コントローラー
./start_emergency_auto_repair.sh integration

# ITSM管理
./start_emergency_auto_repair.sh itsm

# リアルタイム修復
./start_emergency_auto_repair.sh realtime

# 拡張修復
./start_emergency_auto_repair.sh enhanced
```

## ⚙️ 設定オプション

### マスター設定 (`master_auto_repair_controller.py`)

```python
config = {
    "github_check_interval": 5,         # 5秒間隔でGitHub Actions監視
    "max_parallel_repairs": 3,          # 最大3つの修復を並列実行
    "emergency_escalation_time": 300,   # 5分で緊急エスカレーション
    "success_threshold": 0,             # エラー0件で成功
    "consecutive_success_required": 3,   # 連続3回成功で完了
    "auto_rerun_enabled": True,         # 自動再実行有効
    "itsm_integration": True,           # ITSM統合有効
}
```

### 緊急設定 (`emergency_auto_repair_loop.py`)

```python
emergency_config = {
    "error_detection_interval": 5,      # 5秒間隔検知
    "max_auto_repair_attempts": 50,     # 最大50回自動修復
    "critical_error_threshold": 1,      # エラー1件でも即座対応
    "success_threshold": 0,             # エラー0件で成功
    "consecutive_success_required": 3,   # 連続3回成功で完了
    "auto_rerun_delay": 10,             # 修復後10秒でワークフロー再実行
}
```

## 📋 ITSM準拠機能

### インシデント優先度

- **P1_CRITICAL**: 15分以内対応（デプロイメント、セキュリティ）
- **P2_HIGH**: 60分以内対応（ビルド、CI）
- **P3_MEDIUM**: 4時間以内対応（テスト）
- **P4_LOW**: 24時間以内対応（その他）

### 自動分類

- **カテゴリ**: GitHub Actions, Build Failure, Test Failure, Deployment
- **根本原因**: Dependency Management, Code Quality, Infrastructure
- **解決方法**: Auto Repair, Manual Fix, Escalation

### SLA追跡

- 応答時間監視
- 解決時間追跡
- SLA違反時の自動エスカレーション

## 📊 監視とメトリクス

### システム状態ファイル

- `infinite_loop_state.json`: ループ180、540エラー修正
- `realtime_repair_state.json`: リアルタイム修復状態
- `integration_controller_state.json`: 統合システム状態
- `master_controller_state.json`: マスター制御状態

### ログファイル

```bash
coordination/logs/
├── master_20250802_170230.log
├── emergency_20250802_170230.log
├── integration_controller.log
├── itsm_incident_manager.log
└── realtime_repair_controller.log
```

## 🔧 修復アクション

### 依存関係エラー

```bash
pip install -r backend/requirements.txt --upgrade
npm ci --prefix frontend
pip install -e backend/.
```

### テスト失敗

```bash
python -m pytest backend/tests/ --tb=short -x
npm test --prefix frontend -- --watchAll=false
```

### ビルドエラー

```bash
flake8 backend/ --select=E9,F63,F7,F82 --fix
npm run build --prefix frontend
python -m py_compile backend/app/main.py
```

## 📈 成功指標

### 目標達成条件

- **エラー0件**: 連続3回のクリーンチェック
- **応答時間**: 5秒以内のエラー検知
- **修復時間**: 平均2分以内
- **成功率**: 90%以上の自動修復成功率

### 現在の状況

```
📊 現在の統計:
- ループ数: 180
- エラー修正数: 540
- 稼働時間: 継続中
- 最終スキャン: 2025-08-02T17:01:33Z
```

## 🛠️ トラブルシューティング

### よくある問題

1. **GitHub CLI認証エラー**
   ```bash
   gh auth login
   gh auth status
   ```

2. **Python依存関係エラー**
   ```bash
   pip install -r backend/requirements.txt
   ```

3. **権限エラー**
   ```bash
   chmod +x start_emergency_auto_repair.sh
   ```

### ログ確認

```bash
# リアルタイムログ監視
tail -f coordination/logs/master_*.log

# エラーログ検索
grep -i error coordination/logs/*.log

# 成功ログ検索
grep -i "success\|completed" coordination/logs/*.log
```

## 🔒 セキュリティ

### セキュリティレベル

- **LOW**: 自動承認、即座実行
- **MEDIUM**: 自動承認、制限付き実行
- **HIGH**: 手動承認必要
- **CRITICAL**: 手動承認、エスカレーション

### 保護対象ファイル

- `backend/app/core/security.py`
- `backend/app/core/config.py`
- `.github/workflows/`
- `docker-compose.yml`
- `.env*`

## 📞 サポート

### 緊急連絡

- **P1インシデント**: システム管理者へ自動エスカレーション
- **P2インシデント**: シニアエンジニアへエスカレーション
- **手動介入**: チームリーダーへ通知

### 監視ダッシュボード

```bash
# リアルタイムダッシュボード
coordination/realtime_dashboard.sh

# システム状態確認
python3 coordination/itsm_incident_manager.py
```

## 🔄 継続運用

システムは以下の条件まで自動実行を継続します：

1. **成功条件**: エラー0件を連続3回達成
2. **最大試行**: 最大50回の修復試行
3. **エスカレーション**: 10分でエスカレーション
4. **手動停止**: Ctrl+C または `kill <PID>`

---

**🎯 ミッション**: GitHub Actionsエラー完全撲滅  
**⚡ 目標**: 5秒検知、即座修復、ゼロエラー達成  
**📈 現状**: ループ180、540エラー修正済み、継続稼働中