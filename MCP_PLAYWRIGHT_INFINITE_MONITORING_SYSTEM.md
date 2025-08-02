# MCP Playwright 無限エラー監視・修復システム

## 🎯 システム概要

MCP Playwrightを活用した、WebUIとバックエンドAPIの自動エラー検知・修復・検証を無限ループで実行するシステムです。

### 監視対象URL
- **フロントエンド（WebUI）**: `http://192.168.3.135:3000`
- **バックエンドAPI**: `http://192.168.3.135:8000`
- **API ドキュメント**: `http://192.168.3.135:8000/docs`
- **管理者ダッシュボード**: `http://192.168.3.135:3000/admin`

## 🏗️ システム構成

### 1. フロントエンド監視・修復システム
```
frontend/src/components/error-monitoring/
├── BrowserErrorMonitor.tsx           # メイン監視画面
├── AdminBrowserErrorMonitor.tsx      # 管理者ダッシュボード
├── BrowserErrorMonitorManager.tsx    # 統合管理コンポーネント
├── hooks/
│   └── useBrowserErrorMonitor.ts     # 監視ロジックフック
└── types/
    └── browser-error-monitor.types.ts # 型定義
```

**主要機能:**
- ブラウザ開発者コンソールエラーの自動検知
- 6種類のエラータイプに対応した修復戦略
- 10種類の検証テストによる修復後検証
- リアルタイムタイムライン表示

### 2. バックエンド監視・修復システム
```
backend/app/services/
├── mcp_api_error_monitor.py          # APIエラー監視
├── database_error_repair.py          # DB修復
├── performance_monitor.py            # パフォーマンス監視
├── security_error_monitor.py         # セキュリティ監視
├── log_analysis_repair.py            # ログ分析・修復提案
├── infinite_auto_repair_system.py    # 統合システム
└── enhanced_security_exceptions.py   # セキュリティ強化
```

**主要機能:**
- APIエンドポイント監視
- データベース接続監視・修復
- パフォーマンス監視・最適化
- セキュリティ脅威検知・対応

### 3. 統合オーケストレーター
```
infinite_error_monitoring_orchestrator.py  # メイン統合システム
start_infinite_monitoring.sh              # 起動スクリプト
```

**主要機能:**
- フロントエンド・バックエンド統合監視
- 無限ループでの自動実行
- 状態管理・復元機能
- グレースフルシャットダウン

## 🚀 システム起動方法

### 1. 依存関係のインストール
```bash
# Python依存関係
pip install aiohttp pydantic requests

# フロントエンド依存関係
cd frontend && npm install
```

### 2. サーバー起動

#### バックエンドサーバー
```bash
cd backend
python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
```

#### フロントエンドサーバー
```bash
cd frontend
npm start
```

### 3. 無限監視システム起動
```bash
# 自動起動スクリプト使用（推奨）
./start_infinite_monitoring.sh

# または手動起動
python3 infinite_error_monitoring_orchestrator.py
```

## 🔧 システム設定

### 監視間隔設定
```python
# infinite_error_monitoring_orchestrator.py 内
self.monitoring_interval = 10  # 監視間隔（秒）
self.repair_interval = 30     # 修復間隔（秒）
self.max_consecutive_failures = 5  # 連続失敗許容回数
```

### 対象URL設定
```python
self.targets = [
    MonitoringTarget(name="WebUI", url="http://192.168.3.135:3000", type="frontend"),
    MonitoringTarget(name="Backend API", url="http://192.168.3.135:8000", type="backend"),
    # 追加監視対象をここに設定
]
```

## 📊 監視・修復機能詳細

### フロントエンド監視項目
- **HTTP ステータスコード**: 200以外の応答検知
- **コンテンツエラー**: エラーメッセージの検出
- **接続エラー**: ネットワーク接続問題
- **ブラウザコンソールエラー**: JavaScript実行エラー

### バックエンド監視項目
- **APIエンドポイント**: ヘルスチェック・応答時間
- **データベース接続**: 接続プール状態
- **パフォーマンス**: レスポンス時間・リソース使用率
- **セキュリティ**: 脅威検知・不正アクセス

### 自動修復戦略

#### フロントエンド修復
1. **ページリロード**: キャッシュクリア
2. **状態リセット**: React状態初期化
3. **コンポーネント再マウント**: DOM再構築
4. **ルーティング修復**: React Router修復
5. **APIコール リトライ**: 失敗したAPI呼び出し再実行
6. **エラー境界リセット**: Error Boundary復旧

#### バックエンド修復
1. **接続プール再作成**: DB接続修復
2. **キャッシュクリア**: メモリキャッシュ削除
3. **プロセス再起動**: ワーカープロセス再開
4. **設定リロード**: 設定ファイル再読み込み
5. **ログローテーション**: ディスク容量確保
6. **セキュリティルール更新**: 脅威対策強化

## 📈 監視ダッシュボード

### WebUI アクセス
- **メイン監視**: `http://192.168.3.135:3000/browser-error-monitor`
- **管理者画面**: `http://192.168.3.135:3000/admin/browser-error-monitor`

### API エンドポイント
```bash
# システム状態確認
curl http://192.168.3.135:8000/api/v1/error-monitoring/status

# ヘルスチェック
curl http://192.168.3.135:8000/api/v1/error-monitoring/health

# メトリクス取得
curl http://192.168.3.135:8000/api/v1/error-monitoring/metrics
```

## 🔄 無限ループ実行フロー

```
1. システム初期化
   ↓
2. 全監視対象チェック（並行実行）
   ├─ フロントエンド監視
   └─ バックエンド監視
   ↓
3. エラー検知
   ↓
4. 自動修復実行
   ↓
5. 修復後検証
   ↓
6. 結果記録・状態保存
   ↓
7. 待機期間（10秒）
   ↓
8. 2に戻る（無限ループ）
```

## 📝 ログ・状態管理

### ログファイル
- `infinite_monitoring.log`: メインシステムログ
- `logs/infinite_monitoring.pid`: プロセスID
- `coordination/infinite_loop_state.json`: システム状態

### 状態復元機能
システム再起動時に前回の統計情報と設定を自動復元します。

## 🛑 システム停止

### グレースフルシャットダウン
```bash
# Ctrl+C または
kill -TERM $(cat logs/infinite_monitoring.pid)
```

### 緊急停止
```bash
kill -KILL $(cat logs/infinite_monitoring.pid)
```

## 🔒 セキュリティ機能

- **データ暗号化**: センシティブ情報の保護
- **アクセス制御**: ロールベース認証
- **脅威検知**: リアルタイムセキュリティ監視
- **監査ログ**: 全操作の記録・追跡

## 📊 統計・レポート機能

### リアルタイム統計
- 総チェック回数
- 検知エラー数
- 修復実行回数
- 修復成功率
- サイクル完了回数

### パフォーマンスメトリクス
- 平均応答時間
- システムリソース使用率
- エラー発生傾向
- 修復効果分析

## 🎯 運用のベストプラクティス

1. **定期的な状態確認**: ダッシュボードでの監視
2. **ログ分析**: 定期的なエラーパターン分析
3. **設定調整**: 監視間隔・閾値の最適化
4. **バックアップ**: 状態ファイルの定期バックアップ
5. **アップデート**: 修復戦略の継続的改善

このシステムにより、24時間365日の自動エラー監視・修復・検証が実現され、システムの高可用性と安定性が確保されます。