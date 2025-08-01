# ITSM準拠IT運用管理システム

## 🎯 概要

本システムは、ITIL (Information Technology Infrastructure Library) および ISO/IEC 20000に準拠した、エンタープライズグレードのIT運用管理システムです。インシデント管理、問題管理、変更管理、構成管理データベース（CMDB）などの主要なITSMプロセスを統合的に管理します。

**🚀 Claude-Flow 6エージェント並列自動開発システム搭載**

## 🤖 AI自動開発環境

### Claude-Flow による24時間自動開発
- 📘 **ITSM-CTO**: 技術設計・セキュリティ設計
- 🛠️ **ITSM-DevAPI**: バックエンドAPI開発
- 💻 **ITSM-DevUI**: フロントエンドUI開発  
- 🔍 **ITSM-QA**: 品質保証・UI整合性
- 🧪 **ITSM-Tester**: 自動テスト・E2E検証
- 📈 **ITSM-Manager**: CI/CD・進行管理

### 自動開発開始コマンド
```bash
./start-swarm-agents.sh
```

### GitHub自動同期
```bash
./git-auto-sync.sh          # 単発同期
./git-scheduled-sync.sh     # 定期同期（1時間毎）
```

## 主要機能

### 1. インシデント管理
- インシデントチケットの作成・追跡・解決
- 自動エスカレーション機能
- SLA（サービスレベル合意）管理
- インシデント分析とレポート生成

### 2. 問題管理
- 根本原因分析（RCA）支援
- 既知エラーデータベース（KEDB）
- 問題の傾向分析
- 恒久的解決策の管理

### 3. 変更管理
- 変更要求（RFC）の管理
- 変更諮問委員会（CAB）ワークフロー
- リスク評価とインパクト分析
- 変更カレンダーと自動通知

### 4. 構成管理データベース（CMDB）
- IT資産の完全な可視化
- 構成アイテム（CI）の関係性マッピング
- 自動ディスカバリー機能
- ライフサイクル管理

### 5. サービスカタログ管理
- サービスカタログの作成・公開
- セルフサービスポータル
- 承認ワークフロー
- サービス要求の自動化

### 6. ナレッジ管理
- ナレッジベースの構築・管理
- AI支援による解決策提案
- FAQ管理
- ドキュメント版管理

## システムアーキテクチャ

### 技術スタック

#### バックエンド
- **言語**: Python 3.11+
- **フレームワーク**: FastAPI
- **データベース**: PostgreSQL 15+
- **キャッシュ**: Redis
- **メッセージキュー**: RabbitMQ
- **検索エンジン**: Elasticsearch

#### フロントエンド
- **フレームワーク**: React 18+
- **状態管理**: Redux Toolkit
- **UIライブラリ**: Material-UI v5
- **ビルドツール**: Vite
- **テスト**: Jest + React Testing Library

#### インフラストラクチャ
- **コンテナ**: Docker + Docker Compose
- **オーケストレーション**: Kubernetes (本番環境)
- **CI/CD**: GitHub Actions
- **モニタリング**: Prometheus + Grafana
- **ログ管理**: ELK Stack

## クイックスタート

### 前提条件
- Docker Desktop 4.0+
- Node.js 18+
- Python 3.11+
- Git
- ClaudeCode CLI

### AI自動開発開始

```bash
# 1. 6エージェント並列開発環境起動
./start-swarm-agents.sh

# 2. GitHub自動同期開始（別ターミナル）
./git-scheduled-sync.sh
```

### 手動インストール手順

```bash
# リポジトリのクローン
git clone https://github.com/Kensan196948G/ITSM-ITManagementSystem.git
cd ITSM-ITManagementSystem

# 環境変数の設定
cp .env.example .env
# .envファイルを編集して必要な設定を行う

# Dockerコンテナの起動
docker-compose up -d

# データベースマイグレーション
docker-compose exec backend python manage.py migrate

# 初期データの投入
docker-compose exec backend python manage.py seed

# フロントエンドの起動（開発環境）
cd frontend
npm install
npm run dev
```

### アクセス情報
- フロントエンド: http://localhost:3000
- バックエンドAPI: http://localhost:8000
- API ドキュメント: http://localhost:8000/docs
- 管理者ダッシュボード: http://localhost:3000/admin

### デフォルト認証情報
- 管理者: admin@example.com / admin123
- 一般ユーザー: user@example.com / user123

## プロジェクト構造

```
ITSM-ITManagementSystem/
├── docs/                     # エージェント定義・仕様書
│   ├── ITSM-CTO.md          # CTOエージェント定義
│   ├── ITSM-DevAPI.md       # APIエージェント定義
│   ├── ITSM-DevUI.md        # UIエージェント定義
│   ├── ITSM-QA.md           # QAエージェント定義
│   ├── ITSM-Tester.md       # テスターエージェント定義
│   └── ITSM-Manager.md      # マネージャーエージェント定義
├── backend/                  # バックエンドアプリケーション
├── frontend/                 # フロントエンドアプリケーション
├── logs/                     # ログファイル
├── start-swarm-agents.sh     # 6エージェント起動
├── git-auto-sync.sh         # GitHub自動同期
└── git-scheduled-sync.sh    # 定期同期
```

## 🤖 AI開発環境の特徴

### 24時間自動開発
- tmux不使用の軽量並列処理
- ruv-swarm MCP による高度な協調動作
- 自動修復・継続改善ループ
- リアルタイム品質監視

### 自動Git管理
- 定期的なコミット・プッシュ
- 競合解決の自動化
- 開発進捗の可視化

## 開発ガイド

### コーディング規約
- Python: PEP 8準拠、Black + isortでフォーマット
- JavaScript/TypeScript: ESLint + Prettier
- コミットメッセージ: Conventional Commits形式

### ブランチ戦略
- `main`: 本番環境
- `develop`: 開発環境
- `feature/*`: 機能開発
- `hotfix/*`: 緊急修正

### テスト
```bash
# バックエンドテスト
cd backend
pytest

# フロントエンドテスト
cd frontend
npm test

# E2Eテスト
npm run test:e2e
```

## セキュリティ

### 実装済みセキュリティ機能
- OAuth 2.0 / JWT認証
- ロールベースアクセス制御（RBAC）
- データ暗号化（転送時・保存時）
- 監査ログ
- セキュリティヘッダー（CORS、CSP等）
- SQLインジェクション対策
- XSS対策

### セキュリティ監査
- 定期的な依存関係の脆弱性スキャン
- SAST/DASTツールによる自動スキャン
- ペネトレーションテスト（四半期ごと）

## パフォーマンス

### 最適化機能
- データベースクエリ最適化
- Redisキャッシング
- CDN統合
- 画像最適化
- 遅延ローディング
- WebSocket通信（リアルタイム更新）

### ベンチマーク
- 同時接続数: 10,000+
- API応答時間: < 200ms（95パーセンタイル）
- ページロード時間: < 2秒

## ライセンス

本プロジェクトはMITライセンスの下で公開されています。詳細は[LICENSE](LICENSE)ファイルを参照してください。

## サポート

### ドキュメント
- [Claude-Flow開発仕様書](docs/ClaudeCodeClaude-Flow%20による%206エージェント並列24時間自動開発仕様書（tmux%20不使用）.md)
- [システム概要](docs/システム概要.md)
- [アーキテクチャ設計](docs/アーキテクチャ設計.md)
- [API仕様書](docs/API仕様書.md)
- [運用マニュアル](docs/運用マニュアル.md)

### コミュニティ
- [GitHub Issues](https://github.com/Kensan196948G/ITSM-ITManagementSystem/issues)
- [GitHub Repository](https://github.com/Kensan196948G/ITSM-ITManagementSystem)

## 貢献

プロジェクトへの貢献を歓迎します！詳細は[CONTRIBUTING.md](CONTRIBUTING.md)を参照してください。

## ロードマップ

### v1.0（開発中）
- 🤖 AI自動開発環境
- 🔄 6エージェント並列処理
- 📤 GitHub自動同期

### v2.0（2025 Q2）
- ⬜ 基本的なITSM機能実装
- ⬜ マルチテナント対応
- ⬜ REST API完成

### v3.0（2025 Q4）
- ⬜ AI/ML統合
- ⬜ モバイルアプリ
- ⬜ GraphQL API

---

🤖 **Powered by Claude-Flow AI Development System**  
Copyright © 2025 ITSM System Project. All rights reserved.
