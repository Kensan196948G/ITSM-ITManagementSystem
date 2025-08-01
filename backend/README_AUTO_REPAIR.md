# バックエンドエラー自動修復システム

ITSMバックエンドAPIのエラーを自動検出・修復するシステムです。

## 概要

このシステムは以下の機能を提供します：

- **自動エラー検出**: ログファイルとコードの構文解析によるエラー検出
- **自動修復**: SQLAlchemy、FastAPI、Pydantic関連エラーの自動修正
- **API修復**: フロントエンドとの通信エラー監視・API仕様不整合の自動修正
- **継続監視**: バックグラウンドでの継続的なエラー監視
- **レポート生成**: HTMLレポートによる修復状況の可視化

## インストール

### 1. 依存関係のインストール

```bash
# 仮想環境を作成・アクティベート
python3 -m venv venv
source venv/bin/activate

# 依存関係をインストール
pip install -r requirements.txt
```

### 2. システム初期化

```bash
# ログディレクトリを作成
mkdir -p logs

# 自動修復システムのテスト実行
python3 test_auto_repair.py
```

## 使用方法

### コマンドラインインターフェース

```bash
# 基本的な使用方法
python3 auto_repair_cli.py <command> [options]

# 利用可能なコマンド一覧
python3 auto_repair_cli.py --help
```

### 主要コマンド

#### 1. 1回実行（run-once）

```bash
# 1回だけ修復サイクルを実行
python3 auto_repair_cli.py run-once

# 結果をJSONファイルに保存
python3 auto_repair_cli.py run-once --output repair_result.json
```

#### 2. 継続監視（monitor）

```bash
# デフォルト30秒間隔で継続監視
python3 auto_repair_cli.py monitor

# 60秒間隔で監視
python3 auto_repair_cli.py monitor --interval 60
```

#### 3. システム状態確認（status）

```bash
# 現在のシステム状態を表示
python3 auto_repair_cli.py status
```

#### 4. レポート生成（report）

```bash
# 修復レポートを生成
python3 auto_repair_cli.py report

# ダッシュボードデータも生成
python3 auto_repair_cli.py report --dashboard
```

#### 5. APIテスト実行（test-api）

```bash
# API総合テストを実行
python3 auto_repair_cli.py test-api

# テスト結果をファイルに保存
python3 auto_repair_cli.py test-api --output api_test_results.json
```

#### 6. OpenAPI仕様分析（analyze-openapi）

```bash
# OpenAPI仕様を分析
python3 auto_repair_cli.py analyze-openapi

# 仕様をJSONファイルに保存
python3 auto_repair_cli.py analyze-openapi --output openapi_spec.json
```

### バックグラウンド実行

```bash
# 自動修復システムをバックグラウンドで開始
./start_auto_repair.sh start

# システム状態確認
./start_auto_repair.sh status

# ログ表示
./start_auto_repair.sh logs

# システム停止
./start_auto_repair.sh stop

# システム再起動
./start_auto_repair.sh restart

# レポート生成
./start_auto_repair.sh report

# APIテスト実行
./start_auto_repair.sh test

# 1回だけ実行
./start_auto_repair.sh run-once
```

## 修復対象エラー

### 1. SQLAlchemyモデル定義エラー

- `has no attribute` エラー
- `IntegrityError` データ整合性エラー
- リレーションシップ設定エラー
- 外部キー制約エラー

**修復例:**
```python
# 修復前
relationship("User")

# 修復後  
relationship("User", back_populates="users")
```

### 2. FastAPIエンドポイント定義エラー

- 存在しないエンドポイントエラー
- HTTPメソッドエラー
- レスポンス型エラー

**修復例:**
```python
# 修復前（存在しないエンドポイント）
# 404 Not Found

# 修復後（自動生成）
@router.get("/users/", response_model=List[UserResponse])
async def get_users(db: Session = Depends(get_db)):
    # 実装コードを自動生成
```

### 3. Pydanticバリデーションエラー

- フィールド定義エラー
- バリデーションルールエラー
- 型定義エラー

**修復例:**
```python
# 修復前
name: str

# 修復後
name: str = Field(..., min_length=1)
```

### 4. データベース接続エラー

- SQLite接続エラー
- セッション管理エラー

**修復例:**
```bash
# 自動実行される修復コマンド
python init_sqlite_db.py
```

### 5. CORS設定エラー

- フロントエンドアクセスエラー
- オリジン設定エラー

**修復例:**
```python
# CORS設定の自動追加
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
```

## ファイル構成

```
backend/
├── auto_repair_cli.py           # CLI インターフェース
├── start_auto_repair.sh         # バックグラウンド実行スクリプト
├── test_auto_repair.py          # テストスクリプト
├── app/services/
│   ├── auto_repair.py           # メイン修復システム
│   ├── api_repair.py            # API修復機能
│   └── repair_reporter.py       # レポート生成機能
└── coordination/
    ├── errors.json              # エラー情報
    └── fixes.json               # 修復履歴
```

## 設定ファイル

### coordination/errors.json
```json
{
  "backend_errors": [],
  "api_errors": [],
  "database_errors": [],
  "validation_errors": [],
  "cors_errors": [],
  "authentication_errors": [],
  "last_check": "2025-08-01T16:00:00",
  "error_count": 0
}
```

### coordination/fixes.json
```json
{
  "fixes_applied": [],
  "last_fix": null,
  "total_fixes": 0,
  "success_rate": 0.0,
  "failed_fixes": []
}
```

## レポート機能

修復システムは以下のレポートを生成します：

### HTML レポート
- `tests/reports/auto-repair-report.html`
- ブラウザで表示可能な詳細レポート

### JSON レポート  
- `tests/reports/auto-repair-report.json`
- 機械処理可能な構造化データ

### Markdown レポート
- `tests/reports/auto-repair-report.md`
- GitHub等で表示可能なテキストレポート

### ダッシュボード データ
- `tests/reports/dashboard.json`
- システムヘルス情報とアラート

## 監視ログ

システムのログは以下の場所に出力されます：

- `logs/auto_repair.log` - 一般ログ
- `logs/auto_repair_output.log` - バックグラウンド実行ログ
- `logs/itsm.log` - アプリケーションログ
- `logs/itsm_error.log` - エラーログ

## トラブルシューティング

### よくある問題

#### 1. 依存関係エラー
```bash
# 解決方法
pip install aiofiles aiohttp jinja2 requests
```

#### 2. 権限エラー
```bash
# 実行権限を付与
chmod +x auto_repair_cli.py
chmod +x start_auto_repair.sh
```

#### 3. ログファイルが見つからない
```bash
# ログディレクトリを作成
mkdir -p logs
```

#### 4. バックグラウンド実行が動かない
```bash
# プロセス確認
ps aux | grep auto_repair

# 強制停止
pkill -f auto_repair_cli.py
```

### デバッグモード

```bash
# デバッグログレベルで実行
python3 auto_repair_cli.py run-once --log-level DEBUG
```

## API仕様

システムの動作状況は以下のエンドポイントで確認できます：

```bash
# ヘルスチェック
curl http://localhost:8000/health

# API仕様確認
curl http://localhost:8000/api/v1/docs
```

## 高度な使用方法

### カスタム修復ルール

`app/services/auto_repair.py` の修復ロジックを編集して、独自の修復ルールを追加できます。

### 監視間隔の調整

```python
# auto_repair_cli.py 内で調整
self.repair_system.monitoring_interval = 60  # 秒
```

### エラー検出パターンのカスタマイズ

```python
# error_patterns を編集して検出ルールを追加
error_patterns = {
    ErrorType.CUSTOM: [
        r"custom_error_pattern: (.+)"
    ]
}
```

## 貢献

バグ報告や機能提案は以下の方法で受け付けています：

1. Issues でバグ報告・機能提案
2. Pull Request で修正・機能追加
3. ドキュメントの改善

## ライセンス

このプロジェクトは MIT ライセンスの下で公開されています。

---

**注意事項:**
- 本システムはテスト・開発環境での使用を想定しています
- 本番環境での使用前に十分なテストを実施してください
- 自動修復により既存のコードが変更される可能性があります
- 重要なファイルは事前にバックアップを取ることを推奨します