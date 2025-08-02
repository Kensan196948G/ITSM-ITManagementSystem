# MCP Playwright エラー検知・修復システム

## 概要

MCP Playwright を使用したバックエンドAPI（http://192.168.3.135:8000）のエラー検知・修復システムです。FastAPIベースでITSM準拠の堅牢なAPIを実装し、無限ループでの自動修復を提供します。

## 主要機能

### 1. APIエンドポイントのエラー検知
- **対象URL**: http://192.168.3.135:8000
- **監視エンドポイント**: /health, /version, /api/v1/* など
- **検知項目**: 応答時間、エラー率、ステータスコード
- **アラート**: リアルタイム通知とログ記録

### 2. データベース接続エラーの検知・修復
- **接続監視**: SQLAlchemy コネクションプール監視
- **自動修復**: 接続リトライ、プール設定調整
- **対応エラー**: タイムアウト、接続拒否、認証失敗

### 3. API応答時間・パフォーマンス監視
- **メトリクス**: 応答時間、スループット、リソース使用率
- **閾値監視**: 設定可能なパフォーマンス閾値
- **最適化提案**: 自動的なパフォーマンス改善案

### 4. セキュリティ関連エラーの検知・修復
- **検知パターン**: SQLインジェクション、XSS、ブルートフォース
- **自動対応**: IPブロック、レート制限、アラート送信
- **コンプライアンス**: ITSM セキュリティ要件準拠

### 5. エラーログの自動分析・修復提案
- **ログパターン**: 正規表現ベースの自動分類
- **修復提案**: エラーカテゴリ別の具体的な解決策
- **学習機能**: 過去の修復履歴からの改善

### 6. 無限ループでの自動修復実行
- **継続監視**: 24時間365日の無人監視
- **自動修復**: 検知されたエラーの自動修復実行
- **エスカレーション**: 修復失敗時の人的介入要求

## システム構成

```
backend/app/services/
├── mcp_api_error_monitor.py          # APIエラー監視
├── database_error_repair.py          # DB接続エラー修復
├── performance_monitor.py            # パフォーマンス監視
├── security_error_monitor.py         # セキュリティ監視
├── log_analysis_repair.py            # ログ分析・修復提案
├── infinite_auto_repair_system.py    # 無限ループ統合システム
└── enhanced_security_exceptions.py   # 強化セキュリティ・例外処理
```

## API エンドポイント

### エラー監視システム管理
- `GET /api/v1/error-monitoring/status` - 監視状態取得
- `GET /api/v1/error-monitoring/health` - システムヘルス取得
- `POST /api/v1/error-monitoring/start` - 監視開始
- `POST /api/v1/error-monitoring/stop` - 監視停止

### エラー分析・修復
- `POST /api/v1/error-monitoring/analyze-error` - エラー分析
- `POST /api/v1/error-monitoring/repair-task` - 修復タスク作成
- `GET /api/v1/error-monitoring/repair-history` - 修復履歴

### メトリクス・監視
- `GET /api/v1/error-monitoring/metrics` - 監視メトリクス
- `POST /api/v1/error-monitoring/emergency-stop` - 緊急停止

## セキュリティ機能

### データ保護
- **暗号化**: センシティブデータの自動暗号化
- **サニタイゼーション**: PII情報の自動除去
- **アクセス制御**: ロールベースの権限管理

### 脅威検知
- **異常検知**: 不正アクセスパターンの検出
- **ブルートフォース**: 試行回数制限とIP自動ブロック
- **セキュリティログ**: 詳細な監査ログ

### コンプライアンス
- **ITSM準拠**: ITIL v4 準拠のインシデント管理
- **監査要件**: 完全な操作履歴とトレーサビリティ
- **データ保持**: セキュリティ要件に応じたログ保持

## インストール・設定

### 1. 依存関係インストール
```bash
cd backend
pip install -r requirements.txt
pip install aiohttp aiofiles psutil cryptography
```

### 2. 環境設定
```bash
# .env ファイルの設定例
DATABASE_URL=sqlite:///./itsm.db
ASYNC_DATABASE_URL=sqlite+aiosqlite:///./itsm.db
SECRET_KEY=your-secret-key-here
ENCRYPTION_KEY=your-encryption-key-here
LOG_LEVEL=INFO
```

### 3. システム起動
```bash
# 手動起動
python start_error_monitoring_system.py

# デーモン起動
python start_error_monitoring_system.py --daemon --log-file logs/monitoring.log

# FastAPI サーバーと同時起動（別ターミナル）
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

## 設定オプション

### 監視間隔設定
```python
monitoring_intervals = {
    "api_monitoring": 30,        # 30秒間隔
    "database_check": 300,       # 5分間隔  
    "performance_check": 60,     # 1分間隔
    "security_scan": 300,        # 5分間隔
    "log_analysis": 300          # 5分間隔
}
```

### パフォーマンス閾値
```python
performance_thresholds = {
    "response_time_critical": 10.0,  # 10秒以上
    "response_time_high": 5.0,       # 5秒以上
    "error_rate_critical": 0.5,     # 50%以上
    "cpu_usage_critical": 95,       # 95%以上
    "memory_usage_critical": 95     # 95%以上
}
```

### セキュリティ設定
```python
security_config = {
    "max_login_attempts": 5,
    "brute_force_threshold": 5,
    "rate_limit_requests": 100,
    "rate_limit_window": 60,
    "auto_block_enabled": True,
    "block_duration_hours": 24
}
```

## ログ・レポート

### ログファイル
- `logs/error_monitoring_system.log` - システム全体ログ
- `logs/api_errors.log` - APIエラーログ
- `logs/security_events.log` - セキュリティイベント
- `logs/repair_operations.log` - 修復作業ログ

### レポート生成
- **システムヘルスレポート**: 1時間ごと自動生成
- **パフォーマンスレポート**: 24時間サマリー
- **セキュリティレポート**: 脅威分析とトレンド
- **修復サマリー**: 週次/月次の修復統計

## 監視ダッシュボード

### リアルタイム監視
- システム全体の稼働状況
- アクティブなエラー・アラート
- パフォーマンスメトリクス
- セキュリティ状態

### 分析ビュー
- エラートレンド分析
- パフォーマンス推移
- セキュリティインシデント履歴
- 修復効果分析

## 運用・保守

### 日次運用
1. システムヘルス確認
2. 新規エラー・アラートの確認
3. 修復タスクの進捗確認
4. パフォーマンス指標の確認

### 週次保守
1. ログファイルのローテーション
2. データベースの最適化
3. 修復履歴のアーカイブ
4. セキュリティ設定の見直し

### 月次分析
1. 全体的なシステム安定性評価
2. 修復効果の分析
3. パフォーマンス改善の検討
4. セキュリティ脅威の傾向分析

## トラブルシューティング

### よくある問題

#### 1. 監視システムが起動しない
```bash
# ログ確認
tail -f logs/error_monitoring_system.log

# 依存関係確認
pip check

# 設定ファイル確認
python -c "from app.core.config import settings; print(settings)"
```

#### 2. APIエラー検知が機能しない
```bash
# ネットワーク接続確認
curl -I http://192.168.3.135:8000/health

# 権限確認
ls -la logs/

# データベース接続確認
python -c "from app.services.mcp_api_error_monitor import DatabaseManager; db = DatabaseManager(); print('DB OK')"
```

#### 3. 修復タスクが実行されない
```bash
# 修復コーディネーター状態確認
grep "repair_coordinator" logs/error_monitoring_system.log

# 権限・認証確認
grep "permission" logs/error_monitoring_system.log
```

## パフォーマンス最適化

### システムリソース
- **CPU**: 最低2コア、推奨4コア以上
- **メモリ**: 最低4GB、推奨8GB以上
- **ディスク**: SSD推奨、50GB以上の空き容量
- **ネットワーク**: 安定した内部ネットワーク接続

### データベース最適化
```sql
-- インデックス最適化
CREATE INDEX idx_errors_timestamp ON errors(timestamp);
CREATE INDEX idx_performance_endpoint ON performance_metrics(endpoint);
CREATE INDEX idx_security_events_ip ON security_events(source_ip);
```

### ログ管理
```bash
# ログローテーション設定
/etc/logrotate.d/itsm-monitoring
```

## 拡張性

### カスタム監視の追加
```python
from app.services.mcp_api_error_monitor import APIErrorMonitor

class CustomMonitor(APIErrorMonitor):
    def __init__(self):
        super().__init__()
        self.custom_endpoints = ["/custom/api"]
    
    async def custom_check(self):
        # カスタム監視ロジック
        pass
```

### カスタム修復アクションの追加
```python
from app.services.infinite_auto_repair_system import RepairCoordinator

class CustomRepairCoordinator(RepairCoordinator):
    async def _perform_custom_repair(self, task):
        # カスタム修復ロジック
        pass
```

## ライセンス・サポート

このシステムはITSM統合システムの一部として提供されます。

### 技術サポート
- システム導入支援
- カスタマイゼーション対応
- 運用トレーニング
- 24/7 緊急サポート

### アップデート
- セキュリティパッチの定期配信
- 機能追加・改善のアップデート
- パフォーマンス最適化
- 新しい脅威パターンの対応

---

## 注意事項

1. **セキュリティ**: 本システムは重要なセキュリティ機能を含むため、適切な権限管理が必要です。
2. **パフォーマンス**: 監視間隔の設定により、システムパフォーマンスに影響を与える可能性があります。
3. **データ保護**: ログとメトリクスには機密情報が含まれる可能性があるため、適切な保護が必要です。
4. **依存関係**: 定期的な依存ライブラリの更新とセキュリティパッチの適用が必要です。

本システムの詳細な技術仕様や運用ガイドラインについては、個別の技術ドキュメントを参照してください。