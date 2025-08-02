# APIエラー検知・修復自動化システム

## 概要

バックエンドAPIのエラーを自動的に検知し、修復を試行する包括的な監視システムです。

## 主要機能

### 1. リアルタイム監視
- APIエンドポイントの健全性監視
- HTTPステータスコードエラー検知 (4xx, 5xx)
- レスポンス時間監視
- データベース接続エラー検知

### 2. 自動エラー修復
- StreamingResponseエラーの修正
- データベース接続問題の修復
- 認証・認可エラーの修復
- バリデーションエラーの修正
- ORM関連エラーの修正

### 3. ログ解析システム
- ログファイルの自動解析
- エラーパターン認識
- エラーの重要度分類
- 原因分析とレポート生成

### 4. パフォーマンス監視
- メモリ使用量監視
- CPU負荷監視
- データベースクエリパフォーマンス監視
- キャッシュ効率監視

## システム構成

### コアモジュール

- **`app/services/api_error_monitor.py`**: メイン監視エンジン
- **`app/api/v1/error_monitor.py`**: REST API エンドポイント
- **`monitor_api.py`**: CLI管理ツール
- **`start_monitoring.py`**: 自動起動スクリプト

### 監視対象

- **APIサーバー**: http://192.168.3.135:8000
- **ヘルスチェック**: `/health`
- **API文書**: `/docs`
- **主要エンドポイント**: `/api/v1/*`

## API エンドポイント

### 監視管理
- `GET /api/v1/monitoring/error-monitor/status` - 監視ステータス取得
- `POST /api/v1/monitoring/error-monitor/start-monitoring` - 監視開始
- `POST /api/v1/monitoring/error-monitor/stop-monitoring` - 監視停止

### ヘルスチェック
- `POST /api/v1/monitoring/error-monitor/health-check` - ヘルスチェック実行
- `GET /api/v1/monitoring/error-monitor/health-history` - ヘルスチェック履歴

### エラー管理
- `GET /api/v1/monitoring/error-monitor/errors` - エラー一覧取得
- `GET /api/v1/monitoring/error-monitor/summary` - エラーサマリー取得
- `POST /api/v1/monitoring/error-monitor/fix-errors` - エラー修復実行

### ログ・レポート
- `POST /api/v1/monitoring/error-monitor/analyze-logs` - ログ解析実行
- `GET /api/v1/monitoring/error-monitor/report` - エラーレポート取得
- `GET /api/v1/monitoring/error-monitor/metrics` - メトリクス取得

## CLI コマンド

### 基本操作
```bash
# 監視ステータス確認
python monitor_api.py status

# ヘルスチェック実行
python monitor_api.py health

# ログ解析
python monitor_api.py logs

# エラー修復
python monitor_api.py fix
```

### 監視管理
```bash
# 継続監視開始（30秒間隔）
python monitor_api.py monitor --interval 30

# 時間制限付き監視（60秒間）
python monitor_api.py monitor --interval 10 --duration 60
```

### レポート生成
```bash
# エラーレポート生成
python monitor_api.py report

# エラー一覧表示
python monitor_api.py errors --severity high --limit 10

# 履歴リセット
python monitor_api.py reset
```

## エラーカテゴリ

### DATABASE
- SQLite接続エラー
- テーブル・カラム不存在エラー
- 制約違反エラー

### AUTH
- 認証失敗 (401)
- 権限不足 (403)
- トークン無効エラー

### VALIDATION
- リクエストバリデーションエラー (422)
- 必須フィールド不足
- データ型エラー

### ORM
- SQLAlchemy関連エラー
- リレーションシップエラー
- 外部キー制約エラー

### RESPONSE
- StreamingResponseエラー
- シリアライゼーションエラー
- レスポンス形式エラー

### PERFORMANCE
- 遅いクエリ (>0.5秒)
- メモリ不足
- 高CPU使用率

### SECURITY
- セキュリティヘッダー不足
- CORS設定エラー
- CSP違反

## 重要度レベル

- **CRITICAL**: システム停止レベル
- **HIGH**: 機能影響レベル 
- **MEDIUM**: 警告レベル
- **LOW**: 情報レベル

## 起動方法

### 手動起動
```bash
# APIサーバー起動
source venv/bin/activate
python start_server.py

# 監視システム起動
python start_monitoring.py
```

### 自動起動（推奨）
```bash
# 全サービス自動起動
python start_monitoring.py
```

## 設定

### 監視間隔
- デフォルト: 30秒
- 最小: 10秒
- 推奨: 30-60秒

### ログ保存
- エラーログ: `logs/itsm_error.log`
- メインログ: `logs/itsm.log`
- 監視ログ: `logs/monitoring.log`

### メトリクス出力
- `api_error_metrics.json`: リアルタイムメトリクス
- `api_error_report.json`: 詳細レポート

## 修復機能

### 自動修復対象
1. **StreamingResponse エラー**: body属性問題の修正
2. **データベース初期化**: 存在しないDBの自動作成
3. **モデル関係**: 循環参照・インポート問題の修正
4. **認証設定**: JWT設定の確認
5. **インデックス作成**: パフォーマンス向上

### 修復成功率
- 目標: 80%以上
- 現在: テスト環境で良好な結果

## 監視メトリクス

### ヘルスメトリクス
- 応答時間 (response_time)
- 可用性 (is_healthy)
- HTTPステータス (status_code)

### エラーメトリクス
- 総エラー数 (total_errors)
- カテゴリ別エラー数
- 修復成功率 (fix_success_rate)

### パフォーマンスメトリクス
- CPU使用率
- メモリ使用量
- データベースクエリ時間

## 使用例

### 基本的な使用フロー
1. システム起動
2. 継続監視開始
3. エラー検知時の自動修復
4. レポート確認
5. 必要に応じて手動修復

### 緊急時対応
1. 重大エラー検知
2. 自動修復試行
3. 失敗時はアラート
4. 手動介入推奨

## トラブルシューティング

### よくある問題

**Q: 監視が開始されない**
A: APIサーバーが起動しているか確認
```bash
curl http://localhost:8000/health
```

**Q: エラー修復が失敗する**
A: ログを確認して原因分析
```bash
tail -f logs/itsm_error.log
```

**Q: パフォーマンスが低下する**
A: 監視間隔を調整
```bash
python monitor_api.py monitor --interval 60
```

## システム要件

- Python 3.8+
- FastAPI
- SQLite
- aiohttp
- click

## 今後の拡張予定

1. **メール通知**: 重大エラー時の自動通知
2. **Slack連携**: チャット通知機能
3. **機械学習**: エラーパターン学習機能
4. **自動スケーリング**: 負荷に応じたスケーリング
5. **分散監視**: 複数ノードでの監視

---

このシステムにより、バックエンドAPIの安定性と可用性が大幅に向上し、エラーの早期発見と自動修復が可能になります。