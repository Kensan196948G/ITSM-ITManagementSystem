# 🎯 ITSMシステム WebUI詳細仕様書 v2.0

## 📋 文書情報

| 項目 | 詳細 |
|------|------|
| **文書タイトル** | ITSMシステム WebUI詳細仕様書 |
| **バージョン** | 2.0 |
| **作成日** | 2025-08-01 |
| **対象システム** | ITSM統合管理システム |
| **対象読者** | 開発者、システム管理者、UI/UXデザイナー |
| **承認者** | ITSM-CTO, ITSM-QA |

---

## 🚀 システム概要

### プロジェクト情報
- **プロジェクト名**: ITSM統合管理システム
- **開発手法**: アジャイル開発 (Claude-Flow エージェント並列開発)
- **ITIL準拠**: ITIL v4完全準拠
- **完成度**: 85% → 本仕様書で100%完成を目指す

### 技術スタック
```typescript
// フロントエンド構成
React: 18.2.0
TypeScript: 5.x
Material-UI: 5.15.x
React Router: 6.22.3
Recharts: 2.12.6
Axios: HTTP通信
Vite: ビルドツール
```

### システム特徴
1. **ITIL v4準拠**: インシデント・問題・変更管理の完全実装
2. **レスポンシブデザイン**: デスクトップ・タブレット・モバイル対応
3. **アクセシビリティ**: WCAG 2.1 AA準拠
4. **パフォーマンス**: 目標読み込み時間 < 3秒
5. **セキュリティ**: JWT認証、RBAC権限管理

---

## 🏗️ アーキテクチャ設計

### フォルダ構成
```
frontend/src/
├── components/           # 再利用可能コンポーネント
│   ├── common/          # 共通コンポーネント
│   │   ├── AccessibilityHelper.tsx
│   │   ├── AdvancedFilters.tsx
│   │   ├── AdvancedAnalytics.tsx
│   │   └── NotificationSystem.tsx
│   ├── layout/          # レイアウト関連
│   │   ├── Header.tsx
│   │   ├── Sidebar.tsx
│   │   └── Layout.tsx
│   ├── dashboard/       # ダッシュボード専用
│   ├── tickets/         # チケット管理専用
│   └── users/           # ユーザー管理専用
├── pages/               # ページコンポーネント
│   ├── Dashboard.tsx
│   ├── tickets/
│   │   ├── TicketList.tsx
│   │   ├── TicketDetail.tsx
│   │   └── CreateTicket.tsx
│   └── users/
│       ├── UserList.tsx
│       ├── UserDetail.tsx
│       └── CreateUser.tsx
├── hooks/               # カスタムフック
├── services/            # API通信層
├── utils/               # ユーティリティ関数
├── theme/               # テーマ設定
├── types/               # TypeScript型定義
└── __tests__/           # テストファイル
```

### 状態管理設計
```typescript
// React Hooks + Context API
interface AppState {
  user: User | null
  theme: 'light' | 'dark'
  notifications: Notification[]
  filters: FilterState
}

// グローバル状態管理パターン
const useGlobalState = () => {
  const [state, setState] = useState<AppState>(initialState)
  // 状態更新ロジック
}
```

---

## 📊 詳細機能仕様

### 1. ダッシュボード機能

#### 1.1 概要ダッシュボード
**コンポーネント**: `Dashboard.tsx`
**API**: `GET /api/v1/dashboard/metrics`

**表示要素**:
```typescript
interface DashboardMetrics {
  // 基本メトリクス
  totalTickets: number          // 総チケット数
  openTickets: number           // 未解決チケット数
  resolvedTickets: number       // 解決済みチケット数
  overdueTickets: number        // 期限超過チケット数
  
  // パフォーマンス指標
  avgResolutionTime: number     // 平均解決時間（時間）
  slaComplianceRate: number     // SLA遵守率（%）
  
  // 分類別統計
  ticketsByPriority: {
    critical: number
    high: number
    medium: number
    low: number
  }
  
  ticketsByStatus: {
    open: number
    in_progress: number
    resolved: number
    closed: number
    on_hold: number
  }
  
  // 最近の活動
  recentTickets: Ticket[]       // 最新10件
}
```

**UI要素**:
- **メトリクスカード**: 数値指標の視覚的表示
- **チャート**: Recharts使用の円グラフ・棒グラフ
- **最近の活動**: テーブル形式の履歴表示
- **リフレッシュボタン**: 手動データ更新

#### 1.2 詳細分析ダッシュボード
**コンポーネント**: `AdvancedAnalytics.tsx`

**機能要件**:
1. **パフォーマンス分析**
   - チケット処理時間の分布
   - 担当者別パフォーマンス比較
   - 時間帯別処理効率

2. **カテゴリ別分析**
   - インシデント種別統計
   - 問題発生傾向分析
   - 部署別依頼状況

3. **トレンド分析**
   - 月次・週次・日次トレンド
   - 季節性分析
   - 予測分析（将来の需要予測）

**チャート仕様**:
```typescript
// 時系列データ
interface TimeSeriesData {
  date: string
  tickets: number
  resolved: number
  slaViolations: number
}

// 散布図データ
interface ScatterData {
  x: number           // 処理時間
  y: number           // 複雑度
  category: string    // カテゴリ
  assignee: string    // 担当者
}
```

### 2. チケット管理機能

#### 2.1 チケット一覧 (`TicketList.tsx`)

**表示モード**:
1. **テーブルビュー**
   - ソート機能: 作成日時、優先度、ステータス、担当者
   - ページネーション: 10/25/50/100件表示
   - インライン編集: ステータス・担当者・優先度
   - 一括操作: 複数選択での一括更新

2. **カードビュー**
   - グリッドレイアウト
   - ドラッグ&ドロップによるステータス変更
   - 優先度による色分け表示
   - タグによるカテゴリ識別

**高度フィルタリング**:
```typescript
interface AdvancedFilters {
  // 基本フィルタ
  status: TicketStatus[]
  priority: Priority[]
  category: string[]
  assigneeId: string[]
  
  // 日時フィルタ
  dateFrom: Date
  dateTo: Date
  dueDateFrom: Date
  dueDateTo: Date
  
  // 高度フィルタ
  slaStatus: 'compliant' | 'at_risk' | 'violated'
  hasAttachments: boolean
  lastUpdatedDays: number
  
  // 全文検索
  searchQuery: string
  searchFields: ('title' | 'description' | 'comments')[]
}
```

**検索機能**:
- **基本検索**: タイトル・説明文の部分一致検索
- **高度検索**: 正規表現・除外キーワード対応
- **保存された検索**: よく使う検索条件の保存
- **リアルタイム検索**: 入力時の即座結果表示

#### 2.2 チケット作成 (`CreateTicket.tsx`)

**フォーム仕様**:
```typescript
interface CreateTicketForm {
  // 必須項目
  title: string                    // タイトル（最大100文字）
  description: string              // 説明（最大2000文字）
  priority: Priority               // 優先度
  category: string                 // カテゴリ
  
  // オプション項目
  assigneeId?: string              // 担当者
  dueDate?: Date                   // 期限
  tags?: string[]                  // タグ
  attachments?: File[]             // 添付ファイル
  relatedTickets?: string[]        // 関連チケット
  
  // システム項目（自動設定）
  reporterId: string               // 報告者
  slaDeadline: Date                // SLA期限
  estimatedResolutionTime: number  // 予想解決時間
}
```

**バリデーション**:
```typescript
const validationRules = {
  title: {
    required: true,
    maxLength: 100,
    pattern: /^[^\x00-\x1f\x7f]+$/  // 制御文字除外
  },
  description: {
    required: true,
    maxLength: 2000,
    minLength: 10
  },
  priority: {
    required: true,
    enum: ['low', 'medium', 'high', 'critical']
  },
  attachments: {
    maxSize: 10 * 1024 * 1024,      // 10MB
    allowedTypes: ['.pdf', '.doc', '.docx', '.txt', '.png', '.jpg']
  }
}
```

**添付ファイル機能**:
- **ドラッグ&ドロップ**: 直感的なファイルアップロード
- **プレビュー**: 画像・PDFのプレビュー表示
- **プログレスバー**: アップロード進行状況表示
- **ファイル制限**: タイプ・サイズの制限

#### 2.3 チケット詳細 (`TicketDetail.tsx`)

**タブ構成**:
1. **概要タブ**
   - 基本情報表示・編集
   - ステータス変更履歴
   - SLA進捗表示

2. **作業ログタブ**
   - 時系列コメント表示
   - 工数記録機能
   - @メンション通知

3. **関連情報タブ**
   - 関連チケット
   - 添付ファイル管理
   - 変更履歴

**アクション機能**:
```typescript
interface TicketActions {
  updateStatus: (status: TicketStatus) => Promise<void>
  assignTo: (userId: string) => Promise<void>
  addComment: (comment: string, isInternal: boolean) => Promise<void>
  addAttachment: (file: File) => Promise<void>
  linkTicket: (ticketId: string, linkType: string) => Promise<void>
  escalate: (reason: string) => Promise<void>
  clone: () => Promise<string>
  merge: (targetTicketId: string) => Promise<void>
}
```

### 3. ユーザー管理機能

#### 3.1 ユーザー一覧 (`UserList.tsx`)

**表示情報**:
```typescript
interface UserListItem {
  id: string
  fullName: string
  email: string
  role: UserRole
  department: string
  lastLogin: Date
  isActive: boolean
  
  // 統計情報
  assignedTickets: number
  resolvedTickets: number
  avgResolutionTime: number
  slaComplianceRate: number
}
```

**フィルタリング**:
- **ロール別**: 管理者、マネージャー、オペレーター、閲覧者
- **部署別**: 組織階層に基づくフィルタ
- **活動状況**: アクティブ/非アクティブ
- **パフォーマンス**: SLA遵守率による絞り込み

#### 3.2 ユーザー作成・編集 (`CreateUser.tsx`, `UserDetail.tsx`)

**フォーム項目**:
```typescript
interface UserForm {
  // 個人情報
  firstName: string
  lastName: string
  email: string
  phone?: string
  
  // 組織情報
  department: string
  role: UserRole
  manager?: string
  location?: string
  
  // 権限設定
  permissions: Permission[]
  accessLevel: 'full' | 'limited' | 'readonly'
  dataScope: 'all' | 'department' | 'team' | 'own'
  
  // システム設定
  isActive: boolean
  passwordExpiry?: Date
  twoFactorEnabled: boolean
}
```

**権限管理 (RBAC)**:
```typescript
interface Permission {
  resource: string        // 'tickets', 'users', 'reports'
  actions: string[]      // ['create', 'read', 'update', 'delete']
  conditions?: {         // 条件付きアクセス
    department?: string[]
    priority?: Priority[]
    own_only?: boolean
  }
}

const rolePermissions: Record<UserRole, Permission[]> = {
  admin: [
    { resource: '*', actions: ['*'] }
  ],
  manager: [
    { resource: 'tickets', actions: ['create', 'read', 'update', 'delete'] },
    { resource: 'users', actions: ['read', 'update'], conditions: { department: ['own'] } },
    { resource: 'reports', actions: ['read'] }
  ],
  operator: [
    { resource: 'tickets', actions: ['create', 'read', 'update'] },
    { resource: 'users', actions: ['read'], conditions: { own_only: true } }
  ],
  viewer: [
    { resource: 'tickets', actions: ['read'] },
    { resource: 'reports', actions: ['read'] }
  ]
}
```

---

## ♿ アクセシビリティ仕様

### WCAG 2.1 AA準拠

#### コントラスト比
```scss
// 最小コントラスト比 4.5:1
$text-primary: #1a1a1a    // 対背景白 コントラスト比 12.63:1
$text-secondary: #616161  // 対背景白 コントラスト比 4.54:1
$link-color: #1976d2      // 対背景白 コントラスト比 4.51:1
```

#### キーボードナビゲーション
```typescript
// フォーカス管理
const keyboardHandlers = {
  'Tab': focusNext,
  'Shift+Tab': focusPrevious,
  'Enter': activateElement,
  'Space': toggleElement,
  'Escape': closeModal,
  'ArrowUp/Down': navigateList,
  'Home/End': navigateToExtreme
}
```

#### スクリーンリーダー対応
```typescript
// ARIA属性の適切な設定
interface AriaProps {
  'aria-label': string
  'aria-describedby': string
  'aria-expanded': boolean
  'aria-haspopup': boolean
  'aria-live': 'polite' | 'assertive'
  'role': 'button' | 'dialog' | 'alert' | 'status'
}
```

### AccessibilityHelper機能
```typescript
interface AccessibilitySettings {
  fontSize: number          // 80% - 150%
  highContrast: boolean     // ハイコントラストモード
  reduceMotion: boolean     // アニメーション削減
  screenReader: boolean     // スクリーンリーダー最適化
  keyboardOnly: boolean     // キーボード専用モード
}
```

---

## 📱 レスポンシブデザイン仕様

### ブレークポイント
```scss
$breakpoints: (
  xs: 0px,
  sm: 600px,
  md: 960px,
  lg: 1280px,
  xl: 1920px
);
```

### デバイス別最適化

#### モバイル (〜768px)
- **ナビゲーション**: ハンバーガーメニュー
- **テーブル**: 横スクロール + 重要列固定
- **フォーム**: 単一カラムレイアウト
- **タッチ**: 最小44pxタップターゲット

#### タブレット (769px〜1024px)
- **レイアウト**: フレックスブルグリッド
- **サイドバー**: 折りたたみ式
- **カード**: 2カラムグリッド

#### デスクトップ (1025px〜)
- **フルレイアウト**: サイドバー固定表示
- **マルチカラム**: 情報密度最大化
- **高度機能**: すべての機能利用可能

---

## 🎨 デザインシステム

### カラーパレット
```typescript
const theme = {
  palette: {
    primary: {
      main: '#1976d2',      // プライマリブルー
      light: '#42a5f5',     // ライトブルー
      dark: '#1565c0',      // ダークブルー
      contrastText: '#fff'
    },
    secondary: {
      main: '#dc004e',      // アクセントレッド
      light: '#e91e63',
      dark: '#c51162'
    },
    success: {
      main: '#2e7d32',      // 成功グリーン
      light: '#4caf50',
      dark: '#1b5e20'
    },
    warning: {
      main: '#ed6c02',      // 警告オレンジ
      light: '#ff9800',
      dark: '#e65100'
    },
    error: {
      main: '#d32f2f',      // エラーレッド
      light: '#ef5350',
      dark: '#c62828'
    },
    grey: {
      50: '#fafafa',
      100: '#f5f5f5',
      200: '#eeeeee',
      300: '#e0e0e0',
      400: '#bdbdbd',
      500: '#9e9e9e',
      600: '#757575',
      700: '#616161',
      800: '#424242',
      900: '#212121'
    }
  }
}
```

### タイポグラフィ
```typescript
const typography = {
  fontFamily: [
    'Roboto',
    'Noto Sans JP',
    '-apple-system',
    'BlinkMacSystemFont',
    '"Segoe UI"',
    'Arial',
    'sans-serif'
  ].join(','),
  
  h1: { fontSize: '2.125rem', fontWeight: 300 },
  h2: { fontSize: '1.5rem', fontWeight: 400 },
  h3: { fontSize: '1.25rem', fontWeight: 500 },
  h4: { fontSize: '1.125rem', fontWeight: 500 },
  h5: { fontSize: '1rem', fontWeight: 500 },
  h6: { fontSize: '0.875rem', fontWeight: 500 },
  
  body1: { fontSize: '1rem', lineHeight: 1.5 },
  body2: { fontSize: '0.875rem', lineHeight: 1.43 },
  
  button: { fontSize: '0.875rem', fontWeight: 500, textTransform: 'none' },
  caption: { fontSize: '0.75rem', lineHeight: 1.66 }
}
```

### コンポーネント設計原則
1. **原子設計**: Atoms → Molecules → Organisms → Templates → Pages
2. **再利用性**: DRY原則に基づく共通コンポーネント
3. **一貫性**: デザイントークンによる統一
4. **拡張性**: props による柔軟なカスタマイズ

---

## 🔔 通知システム仕様

### NotificationSystem コンポーネント
```typescript
interface Notification {
  id: string
  type: 'success' | 'error' | 'warning' | 'info'
  title: string
  message: string
  duration?: number         // 表示時間（ms）
  persistent?: boolean      // 手動削除のみ
  actions?: NotificationAction[]
}

interface NotificationAction {
  label: string
  handler: () => void
  color?: 'primary' | 'secondary'
}
```

### グローバル通知API
```typescript
// ウィンドウオブジェクトへの追加
declare global {
  interface Window {
    notifications: {
      success: (message: string, options?: Partial<Notification>) => void
      error: (message: string, options?: Partial<Notification>) => void
      warning: (message: string, options?: Partial<Notification>) => void
      info: (message: string, options?: Partial<Notification>) => void
      custom: (notification: Notification) => void
    }
  }
}
```

### 通知パターン
1. **操作完了**: 緑色、3秒自動消去
2. **エラー**: 赤色、手動消去必須
3. **警告**: 黄色、5秒自動消去、アクション付き
4. **情報**: 青色、3秒自動消去

---

## 🚀 パフォーマンス要件

### 読み込み時間目標
- **初回読み込み**: < 3秒 (3G回線)
- **ページ遷移**: < 1秒
- **API応答**: < 500ms
- **検索結果**: < 200ms

### 最適化手法
```typescript
// 1. コンポーネント最適化
const TicketCard = React.memo(({ ticket }: { ticket: Ticket }) => {
  // レンダリング最適化
})

// 2. 遅延ローディング
const LazyReports = lazy(() => import('./pages/Reports'))

// 3. 仮想化
import { FixedSizeList as List } from 'react-window'

// 4. キャッシュ
const useTickets = () => {
  return useSWR('/api/v1/tickets', fetcher, {
    dedupingInterval: 5000,
    revalidateOnFocus: false
  })
}
```

---

## 🔒 セキュリティ仕様

### フロントエンドセキュリティ
```typescript
// JWT トークン管理
interface AuthState {
  accessToken: string
  refreshToken: string
  expiresAt: Date
  user: User
}

// XSS防止
const sanitizeInput = (input: string): string => {
  return DOMPurify.sanitize(input)
}

// CSRF防止
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.getAttribute('content')
```

### Content Security Policy
```
Content-Security-Policy: 
  default-src 'self'; 
  script-src 'self' 'unsafe-inline'; 
  style-src 'self' 'unsafe-inline' fonts.googleapis.com; 
  font-src 'self' fonts.gstatic.com; 
  img-src 'self' data: https:;
```

---

## 📋 開発・テスト要件

### コード品質基準
```typescript
// ESLint設定
{
  "extends": [
    "@typescript-eslint/recommended",
    "react-hooks/recommended"
  ],
  "rules": {
    "complexity": ["error", 10],
    "max-lines-per-function": ["error", 50],
    "no-console": "warn"
  }
}
```

### テスト要件
1. **単体テスト**: 85%以上のカバレッジ
2. **統合テスト**: 主要ユーザーフローの検証
3. **E2Eテスト**: クリティカルパス保証
4. **パフォーマンステスト**: Lighthouse スコア90以上

### 本番リリース基準
✅ **必須条件**:
- [ ] すべてのコンポーネントが仕様通り実装
- [ ] レスポンシブデザイン動作確認
- [ ] アクセシビリティ基準クリア
- [ ] パフォーマンス目標達成
- [ ] セキュリティチェック完了
- [ ] テストスイート全通過
- [ ] ドキュメント整備完了

---

## 🔧 デプロイ・運用仕様

### ビルド設定
```bash
# 本番ビルド
npm run build

# 成果物検証
npm run preview

# バンドルサイズ分析
npm run analyze
```

### 環境変数
```env
# .env.production
REACT_APP_API_BASE_URL=https://api.itsm.example.com
REACT_APP_VERSION=$npm_package_version
REACT_APP_BUILD_TIME=$BUILD_TIME
```

### 監視・ログ
```typescript
// エラー監視
window.addEventListener('error', (event) => {
  analytics.track('Frontend Error', {
    message: event.error.message,
    stack: event.error.stack,
    url: window.location.href
  })
})

// パフォーマンス監視
new PerformanceObserver((list) => {
  const entries = list.getEntries()
  entries.forEach(entry => {
    if (entry.entryType === 'navigation') {
      analytics.track('Page Load', {
        loadTime: entry.loadEventEnd - entry.loadEventStart
      })
    }
  })
}).observe({ entryTypes: ['navigation'] })
```

---

## 📈 今後の拡張計画

### Phase 2 機能追加予定
1. **リアルタイム通信**: WebSocket による即座更新
2. **PWA対応**: オフライン機能、プッシュ通知
3. **高度分析**: AI/ML による予測・推奨機能
4. **多言語対応**: i18n完全対応
5. **テーマカスタマイズ**: 企業ブランド対応

### 技術的改善
1. **Server-Side Rendering**: Next.js移行検討
2. **状態管理強化**: Redux Toolkit導入
3. **マイクロフロントエンド**: Module Federation
4. **エッジ配信**: CDN最適化

---

この詳細仕様書に基づき、ITSM-DevUI エージェントはフロントエンド実装を、ITSM-DevAPI エージェントはバックエンドAPI実装を進め、本番リリース可能なレベルまで完成させてください。

**承認者**: ITSM-CTO ✅ | ITSM-QA ✅ | ITSM-Manager ✅