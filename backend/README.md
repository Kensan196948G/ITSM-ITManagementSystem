# ITSM Backend API

FastAPIを使用したITSM（IT Service Management）システムのバックエンドAPIです。

## 機能

- **インシデント管理**: インシデントのCRUD操作、作業ノート、履歴管理
- **問題管理**: 問題のCRUD操作、根本原因分析（RCA）、既知のエラー管理
- **変更管理**: 変更要求のCRUD操作、承認フロー、変更カレンダー
- **認証・認可**: JWT認証、ロールベースアクセス制御
- **監査ログ**: 全ユーザー操作の監査証跡
- **バリデーション**: Pydanticによる厳密なデータバリデーション
- **例外処理**: カスタム例外とエラーハンドリング

## 技術スタック

- **FastAPI**: 高性能なWeb APIフレームワーク
- **SQLAlchemy**: ORM（Object-Relational Mapping）
- **PostgreSQL**: メインデータベース
- **Redis**: キャッシュとセッション管理
- **Pydantic**: データバリデーション
- **JWT**: 認証トークン
- **Uvicorn**: ASGIサーバー

## セットアップ

### 1. 依存関係のインストール

```bash
cd backend
pip install -r requirements.txt
```

### 2. 環境変数の設定

`.env`ファイルが既に作成されており、SQLite用の設定が含まれています。
本番環境では、PostgreSQL用に設定を変更してください。

### 3. データベースの初期化

SQLiteデータベースとテーブルを初期化します：

```bash
# データベース初期化（テーブル作成と初期データ投入）
python init_sqlite_db.py
```

### 4. アプリケーションの起動

```bash
# 開発環境での起動（自動的にデータベースを初期化）
python start_server.py

# または手動起動
uvicorn app.main:app --host 0.0.0.0 --port 8000 --reload
```

### 5. 初期ログイン情報

デフォルトの管理者アカウント：
- **ユーザー名**: `admin`
- **パスワード**: `secret`

**注意**: 本番環境では必ずパスワードを変更してください。

## API ドキュメント

アプリケーション起動後、以下のURLでAPI仕様を確認できます：

- **Swagger UI**: http://localhost:8000/api/v1/docs
- **ReDoc**: http://localhost:8000/api/v1/redoc
- **OpenAPI JSON**: http://localhost:8000/api/v1/openapi.json

## API エンドポイント

### インシデント管理
- `POST /api/v1/incidents` - インシデント作成
- `GET /api/v1/incidents` - インシデント一覧取得
- `GET /api/v1/incidents/{id}` - インシデント詳細取得
- `PATCH /api/v1/incidents/{id}` - インシデント更新
- `POST /api/v1/incidents/{id}/work-notes` - 作業ノート追加
- `GET /api/v1/incidents/{id}/history` - インシデント履歴取得

### 問題管理
- `POST /api/v1/problems` - 問題作成
- `GET /api/v1/problems` - 問題一覧取得
- `GET /api/v1/problems/{id}` - 問題詳細取得
- `PATCH /api/v1/problems/{id}` - 問題更新
- `PUT /api/v1/problems/{id}/rca` - 根本原因分析更新
- `POST /api/v1/problems/{id}/known-errors` - 既知のエラー作成

### 変更管理
- `POST /api/v1/changes` - 変更要求作成
- `GET /api/v1/changes` - 変更要求一覧取得
- `GET /api/v1/changes/{id}` - 変更要求詳細取得
- `PATCH /api/v1/changes/{id}` - 変更要求更新
- `POST /api/v1/changes/{id}/approve` - 変更承認
- `GET /api/v1/changes/calendar` - 変更カレンダー取得

## プロジェクト構成

```
backend/
├── app/
│   ├── __init__.py
│   ├── main.py                 # FastAPIアプリケーション
│   ├── api/                    # APIエンドポイント
│   │   ├── __init__.py
│   │   └── v1/
│   │       ├── __init__.py
│   │       ├── incidents.py   # インシデント管理API
│   │       ├── problems.py    # 問題管理API
│   │       └── changes.py     # 変更管理API
│   ├── core/                   # コア機能
│   │   ├── config.py          # 設定管理
│   │   ├── security.py        # 認証・セキュリティ
│   │   ├── exceptions.py      # カスタム例外
│   │   ├── logging.py         # ログ設定
│   │   └── middleware.py      # ミドルウェア
│   ├── db/                     # データベース
│   │   └── base.py            # データベース接続
│   ├── models/                 # SQLAlchemyモデル
│   │   ├── __init__.py
│   │   ├── user.py            # ユーザーモデル
│   │   ├── incident.py        # インシデントモデル
│   │   ├── problem.py         # 問題モデル
│   │   ├── change.py          # 変更モデル
│   │   └── common.py          # 共通モデル
│   ├── schemas/                # Pydanticスキーマ
│   │   ├── __init__.py
│   │   ├── incident.py        # インシデントスキーマ
│   │   ├── problem.py         # 問題スキーマ
│   │   ├── change.py          # 変更スキーマ
│   │   └── common.py          # 共通スキーマ
│   └── services/               # ビジネスロジック
│       └── incident_service.py # インシデントサービス
├── tests/                      # テストコード
├── logs/                       # ログファイル
├── requirements.txt            # 依存関係
├── .env.example               # 環境変数テンプレート
├── run.py                     # 起動スクリプト
└── README.md                  # このファイル
```

## セキュリティ機能

### 認証・認可
- JWT Bearer Token認証
- ロールベースアクセス制御
- パスワードハッシュ化（bcrypt）

### セキュリティヘッダー
- X-Content-Type-Options: nosniff
- X-Frame-Options: DENY
- X-XSS-Protection: 1; mode=block
- Strict-Transport-Security
- Content-Security-Policy

### レート制限
- IPベースのレート制限
- 1時間あたり1000リクエスト（デフォルト）

### 監査ログ
- 全ユーザー操作の記録
- セキュリティイベントの記録
- JSON形式での構造化ログ

## ログ管理

### ログファイル
- `logs/itsm.log` - アプリケーションログ
- `logs/itsm_error.log` - エラーログ
- `logs/itsm_audit.log` - 監査ログ

### ログローテーション
- 最大ファイルサイズ: 10MB
- バックアップファイル数: 5-10個

## エラーハンドリング

### カスタム例外
- `ITSMException` - ITSM基底例外
- `ValidationException` - バリデーションエラー
- `NotFoundError` - リソース未発見
- `PermissionDeniedError` - 権限不足
- `BusinessRuleViolationError` - ビジネスルール違反

### エラーレスポンス形式
```json
{
  "error": {
    "code": "ERROR_CODE",
    "message": "エラーメッセージ",
    "details": [
      {
        "field": "フィールド名",
        "message": "フィールドエラーメッセージ"
      }
    ],
    "request_id": "リクエストID"
  }
}
```

## 開発時の注意事項

### データベース
- PostgreSQL 12以上を推奨
- UUIDを主キーとして使用
- タイムゾーン対応（TIMESTAMP WITH TIME ZONE）
- 論理削除（deleted_at）を実装

### コーディング規約
- PEP 8に準拠
- 型ヒントを積極的に使用
- Docstringによる関数・クラスの説明
- 適切な例外処理とログ記録

### パフォーマンス
- データベースクエリの最適化
- ページネーション実装
- 適切なインデックス設計
- SQLAlchemyのeager loadingを活用

## 本番環境への展開

### 環境変数
```env
ENVIRONMENT=production
LOG_LEVEL=WARNING
DATABASE_URL=postgresql://...
SECRET_KEY=強力なシークレットキー
```

### Docker化
```dockerfile
FROM python:3.11-slim
WORKDIR /app
COPY requirements.txt .
RUN pip install -r requirements.txt
COPY . .
EXPOSE 8000
CMD ["python", "run.py"]
```

### ロードバランサー
- Nginx + Gunicorn/Uvicorn
- ヘルスチェック: `/health`
- プロセス管理: Supervisord

## ライセンス

このプロジェクトは内部利用のためのものです。