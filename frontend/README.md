# ITSM Management System - Frontend

ITSMシステムのReact + Material-UIベースのフロントエンドアプリケーションです。

## 🚀 機能概要

### 主要機能
- **ダッシュボード**: システム全体のメトリクス、グラフ、アラート表示
- **チケット管理**: インシデント・問題・変更要求の管理
- **ユーザー管理**: ユーザーアカウント、権限、組織管理
- **レスポンシブ対応**: デスクトップ・タブレット・モバイル対応
- **アクセシビリティ**: WAI-ARIA準拠、キーボードナビゲーション対応

### 技術スタック
- **React 18** - TypeScriptベースのモダンReact
- **Material-UI v5** - Googleマテリアルデザインコンポーネント
- **Vite** - 高速ビルドツール
- **React Router v6** - クライアントサイドルーティング
- **Recharts** - データ可視化ライブラリ
- **Material-UI Data Grid** - 高機能データテーブル

## 📁 プロジェクト構造

```
frontend/
├── public/
├── src/
│   ├── components/          # 再利用可能コンポーネント
│   │   ├── common/         # 共通コンポーネント
│   │   └── layout/         # レイアウトコンポーネント
│   ├── pages/              # ページコンポーネント
│   │   ├── tickets/        # チケット関連ページ
│   │   └── users/          # ユーザー関連ページ
│   ├── theme/              # Material-UIテーマ設定
│   ├── types/              # TypeScript型定義
│   ├── App.tsx             # メインアプリケーション
│   └── main.tsx            # エントリーポイント
├── package.json
├── vite.config.ts
└── tsconfig.json
```

## 🛠️ セットアップ手順

### 前提条件
- Node.js 18以上
- npm または yarn

### インストール
```bash
# 依存関係のインストール
cd frontend
npm install

# 開発サーバーの起動
npm run dev
```

### 利用可能なコマンド
```bash
# 開発サーバー起動（ホットリロード付き）
npm run dev

# プロダクションビルド
npm run build

# ビルド結果のプレビュー
npm run preview

# TypeScript型チェック
npm run type-check

# ESLintによるコード検証
npm run lint

# テスト実行
npm run test
```

## 🎨 デザインシステム

### カラーパレット
- **Primary**: `#1976d2` - 信頼性を表現するブルー
- **Secondary**: `#9c27b0` - アクション要素用パープル
- **Error**: `#d32f2f` - Critical優先度用の赤
- **Warning**: `#ff9800` - High優先度用のオレンジ
- **Success**: `#2e7d32` - 解決済み・成功用のグリーン
- **Info**: `#0288d1` - 情報表示用のライトブルー

### コンポーネント設計原則
- **一貫性**: 全画面で統一されたUI/UX
- **アクセシビリティ**: WCAG 2.1 AA準拠
- **レスポンシブ**: モバイルファースト設計
- **パフォーマンス**: 遅延読み込み、仮想化対応

## 📱 画面構成

### ダッシュボード (`/dashboard`)
- システムメトリクス表示
- チケット統計グラフ
- SLA遵守率表示
- 最近のチケット一覧

### チケット管理
- **一覧画面** (`/tickets`): フィルター・検索・一覧表示
- **作成画面** (`/tickets/create`): 新規チケット作成フォーム
- **詳細画面** (`/tickets/:id`): チケット詳細・コメント・添付ファイル

### ユーザー管理
- **一覧画面** (`/users`): ユーザー検索・フィルター・一覧表示
- **作成画面** (`/users/create`): 新規ユーザー作成・権限設定
- **詳細画面** (`/users/:id`): ユーザー情報・担当チケット・ログイン履歴

## 🔧 カスタマイズ

### テーマのカスタマイズ
`src/theme/theme.ts`でMaterial-UIテーマをカスタマイズできます：

```typescript
export const theme = createTheme({
  palette: {
    primary: {
      main: '#1976d2', // プライマリカラーの変更
    },
    // その他のカラー設定...
  },
  // コンポーネントスタイルのオーバーライド...
})
```

### 新しいページの追加
1. `src/pages/`に新しいコンポーネントを作成
2. `src/App.tsx`にルートを追加
3. `src/components/layout/Sidebar.tsx`にナビゲーションを追加

## 🔐 セキュリティ

### 実装済み機能
- XSSフィルタリング
- CSRFトークン対応準備
- 入力検証・サニタイゼーション
- 権限ベースのUI表示制御

### 今後の実装予定
- OAuth 2.0 / OpenID Connect統合
- MFA（多要素認証）対応
- セッション管理
- API認証トークン管理

## 📊 パフォーマンス最適化

### 実装済み最適化
- コンポーネントのコード分割
- 画像の遅延読み込み
- データグリッドの仮想化
- Material-UIのTree Shaking

### 測定・監視
```bash
# バンドルサイズ分析
npm run build
npm run analyze

# Lighthouse監査
npm run lighthouse
```

## 🧪 テスト

### テスト構成
- **Unit Tests**: Vitest + Testing Library
- **Integration Tests**: ページレベルの統合テスト
- **E2E Tests**: Playwright（今後実装予定）

```bash
# テスト実行
npm run test

# カバレッジレポート生成
npm run test:coverage
```

## 🚀 デプロイ

### 静的サイトとしてのデプロイ
```bash
# プロダクションビルド
npm run build

# dist/フォルダを静的ホスティングにデプロイ
# (Netlify, Vercel, AWS S3 + CloudFront等)
```

### Docker化
```dockerfile
FROM node:18-alpine AS builder
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM nginx:alpine
COPY --from=builder /app/dist /usr/share/nginx/html
COPY nginx.conf /etc/nginx/nginx.conf
EXPOSE 80
CMD ["nginx", "-g", "daemon off;"]
```

## 🤝 開発ガイドライン

### コーディング規約
- **TypeScript**: 厳密型チェック有効
- **ESLint**: Airbnb設定ベース
- **Prettier**: コードフォーマット統一
- **Conventional Commits**: コミットメッセージ規約

### ブランチ戦略
- `main`: プロダクション環境
- `develop`: 開発環境
- `feature/*`: 機能開発ブランチ
- `hotfix/*`: 緊急修正ブランチ

## 📝 API連携

現在はモックデータを使用していますが、以下のAPIエンドポイントとの統合を予定：

```typescript
// API エンドポイント例
const API_ENDPOINTS = {
  // チケット管理
  tickets: '/api/v1/tickets',
  ticketCreate: '/api/v1/tickets',
  ticketUpdate: '/api/v1/tickets/:id',
  
  // ユーザー管理
  users: '/api/v1/users',
  userCreate: '/api/v1/users',
  userUpdate: '/api/v1/users/:id',
  
  // ダッシュボード
  metrics: '/api/v1/dashboard/metrics',
  charts: '/api/v1/dashboard/charts',
}
```

## 📞 サポート

### トラブルシューティング
- **依存関係の問題**: `npm ci`で再インストール
- **ビルドエラー**: `npm run type-check`で型エラーを確認
- **スタイルの問題**: ブラウザキャッシュをクリア

### 開発者向けリソース
- [Material-UI Documentation](https://mui.com/)
- [React Router Documentation](https://reactrouter.com/)
- [Vite Documentation](https://vitejs.dev/)
- [TypeScript Documentation](https://www.typescriptlang.org/)

---

## 🏗️ ロードマップ

### Phase 1 (完了)
- ✅ 基本UI実装
- ✅ ダッシュボード画面
- ✅ チケット管理画面
- ✅ ユーザー管理画面
- ✅ レスポンシブ対応

### Phase 2 (完了)
- ✅ 高度な検索・フィルタリング機能
- ✅ 詳細分析ダッシュボード
- ✅ アクセシビリティ機能（フォントサイズ調整、ハイコントラスト、キーボードナビゲーション）
- ✅ リアルタイム通知システム
- ✅ マルチビュー対応（テーブル・カード表示）

### Phase 3 (今後実装)
- 🔄 リアルタイム更新 (WebSocket)
- 🔄 オフライン対応 (PWA)
- 🔄 多言語対応 (i18n)
- 🔄 ダークモード対応
- 🔄 詳細な権限管理

### Phase 4 (将来)
- 📊 カスタマイズ可能ダッシュボード
- 🔌 プラグインシステム
- 📱 モバイルアプリ化
- 🤖 AI支援機能
- 🔗 サードパーティツール統合

本フロントエンドは、ITSMベストプラクティスに基づいた直感的で効率的なユーザーエクスペリエンスの提供を目指しています。