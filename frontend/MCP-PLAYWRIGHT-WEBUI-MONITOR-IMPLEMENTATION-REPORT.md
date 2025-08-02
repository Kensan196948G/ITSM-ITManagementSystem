# MCP Playwright WebUI エラー監視・自動修復システム 実装レポート

## 📋 実装概要

本プロジェクトでは、IT運用ツールのWebUI向けに、MCP Playwrightを使用した包括的なブラウザ自動化システムと、開発者コンソールエラーの自動検知・修復機能を実装しました。

### 🎯 対象URL
- **メインWebUI**: `http://192.168.3.135:3000`
- **管理者ダッシュボード**: `http://192.168.3.135:3000/admin`

### 🛠 主要技術スタック
- **MCP Playwright**: ブラウザ自動化・E2Eテスト
- **TypeScript**: 型安全性とコード品質の確保
- **Node.js**: 実行環境
- **Axe-core**: アクセシビリティテスト
- **Bash**: 統合実行スクリプト

## 🔧 実装コンポーネント

### 1. メインWebUI監視システム (`mcp-webui-error-monitor.ts`)

#### 機能概要
- ブラウザ自動化による包括的エラー検知
- 開発者コンソールエラーの実時間監視
- React/UI関連エラーハンドリング
- アクセシビリティエラー検知
- パフォーマンス監視

#### 主要クラス
```typescript
class MCPWebUIErrorMonitor {
  // ブラウザ自動化とエラー検知の統合管理
  // - Browser Context管理
  // - エラーリスナー設定
  // - 監視レポート生成
}
```

#### 検知対象エラー
- **コンソールエラー**: JavaScript実行エラー、型エラー、未定義関数コール
- **ネットワークエラー**: API呼び出し失敗、404/500エラー
- **アクセシビリティエラー**: WCAG準拠チェック（axe-core統合）
- **UIエラー**: React Error Boundary、コンポーネント描画エラー
- **パフォーマンス**: ロード時間、FCP（First Contentful Paint）

### 2. 自動修復システム (`webui-auto-repair.ts`)

#### 機能概要
- 検知されたエラーの分類と優先度付け
- エラータイプ別の自動修復ロジック
- ファイルバックアップ・復元機能
- 修復アクションの記録・レポート

#### 主要クラス
```typescript
class WebUIAutoRepair {
  // 自動修復エンジンの実装
  // - エラー分析・分類
  // - ファイル自動編集
  // - 修復アクション追跡
}
```

#### 修復対象
- **TypeScriptエラー**: Optional chaining追加、null/undefinedチェック
- **Reactエラー**: key props追加、useEffect依存配列修正
- **ネットワークエラー**: API endpoint修正、CORS設定
- **アクセシビリティエラー**: alt属性追加、aria-label設定、色コントラスト改善
- **パフォーマンス**: チャンク分割、ビルド最適化

### 3. 管理者ダッシュボード専用監視 (`admin-dashboard-monitor.ts`)

#### 機能概要
- 管理者権限が必要な機能の監視
- セキュリティ設定の検証
- データ整合性チェック
- 設定値の矛盾検出

#### 主要クラス
```typescript
class AdminDashboardMonitor {
  // 管理者専用の高度な監視機能
  // - 権限チェック
  // - セキュリティ監査
  // - データ整合性検証
}
```

#### 検知対象
- **権限エラー**: 認証失敗、アクセス権限不足
- **セキュリティ問題**: CSP設定、機密情報露出、XSS脆弱性
- **データエラー**: 表示データの欠損、チャート描画エラー
- **設定エラー**: 設定値の矛盾、必須フィールド未入力

### 4. 包括的統合システム (`comprehensive-webui-monitor.ts`)

#### 機能概要
- 全監視システムの統合制御
- 段階的な監視・修復プロセス
- 包括的レポート生成
- 継続監視モード

#### 実行フロー
1. **Phase 1**: エラー検知・監視
2. **Phase 2**: 自動修復実行
3. **Phase 3**: 修復後再検証
4. **Phase 4**: 包括的レポート生成

### 5. 統合実行スクリプト (`run-comprehensive-webui-monitor.sh`)

#### 実行モード
- `--once`: 一回のみ完全監視・修復
- `--admin-only`: 管理者ダッシュボードのみ監視
- `--monitor-only`: 監視のみ（修復なし）
- `--repair-only <report.json>`: 指定レポートでの修復のみ
- `--status`: 最新監視状況の表示
- `継続監視`: 指定間隔での自動監視

## 📊 実装ファイル一覧

| ファイル名 | 機能概要 | 行数 |
|-----------|----------|------|
| `mcp-webui-error-monitor.ts` | メインWebUI監視システム | 400+ |
| `webui-auto-repair.ts` | 自動修復エンジン | 600+ |
| `admin-dashboard-monitor.ts` | 管理者ダッシュボード監視 | 350+ |
| `comprehensive-webui-monitor.ts` | 統合制御システム | 300+ |
| `run-comprehensive-webui-monitor.sh` | 統合実行スクリプト | 450+ |

## 🔍 検知・修復機能詳細

### コンソールエラー検知・修復

#### 検知例
```javascript
// TypeError: Cannot read property 'length' of undefined
items.length // エラー発生
```

#### 自動修復
```javascript
// Optional chainingを追加
items?.length || 0
```

### React関連エラー修復

#### 検知例
```jsx
// Warning: Each child in a list should have a unique "key" prop
items.map(item => <div>{item.name}</div>)
```

#### 自動修復
```jsx
// keyプロパティを追加
items.map((item, index) => <div key={index}>{item.name}</div>)
```

### アクセシビリティ修復

#### 検知例
```html
<!-- color-contrast: Insufficient color contrast -->
<p style="color: #888;">テキスト</p>
```

#### 自動修復
```html
<!-- コントラスト比を改善 -->
<p style="color: #666;">テキスト</p>
```

### ネットワークエラー修復

#### 検知例
```javascript
// 404 Error: /api/incident not found
fetch('/api/incident')
```

#### 自動修復
```javascript
// 正しいエンドポイントに修正
fetch('/api/incidents')
```

## 📈 監視・レポート機能

### エラー分類システム
- **タイプ**: console, network, accessibility, ui, performance, security
- **重要度**: low, medium, high, critical
- **ソース**: browser_console, page_error, network_request, axe_core, etc.

### レポート生成
- **JSON形式**: 機械可読な詳細データ
- **Markdown形式**: 人間が読みやすいサマリー
- **スクリーンショット**: エラー発生時の画面キャプチャ
- **動画録画**: 検知プロセスの記録

### 成功指標
- **修復成功率**: 検知エラーの自動修復成功割合
- **エラー削減率**: 修復前後のエラー数比較
- **品質向上度**: クリティカル・高重要度エラーの削減

## 🚀 使用方法

### 基本実行
```bash
# 一回のみ完全監視・修復
./run-comprehensive-webui-monitor.sh --once

# 30分間隔で継続監視
./run-comprehensive-webui-monitor.sh

# 管理者ダッシュボードのみ監視
./run-comprehensive-webui-monitor.sh --admin-only

# 監視のみ（修復なし）
./run-comprehensive-webui-monitor.sh --monitor-only

# 最新ステータス確認
./run-comprehensive-webui-monitor.sh --status
```

### 高度な使用例
```bash
# 60分間隔で継続監視
./run-comprehensive-webui-monitor.sh --interval=60

# 指定レポートで修復のみ実行
./run-comprehensive-webui-monitor.sh --repair-only report.json

# 依存関係チェックをスキップして実行
./run-comprehensive-webui-monitor.sh --once --skip-deps
```

## 📁 生成ファイル

### レポートディレクトリ
```
frontend/
├── webui-error-reports/          # メインWebUI監視レポート
│   ├── screenshots/              # エラー時スクリーンショット
│   └── videos/                   # 監視プロセス動画
├── admin-monitoring-reports/      # 管理者ダッシュボードレポート
│   ├── screenshots/              # 管理画面スクリーンショット
│   └── admin-videos/             # 管理画面監視動画
├── comprehensive-reports/         # 包括的統合レポート
├── backups/auto-repair/          # 自動修復バックアップ
└── logs/                         # 実行ログ
```

### レポートファイル例
- `webui-error-report-[timestamp].json`
- `admin-dashboard-report-[timestamp].json`
- `comprehensive-report-[timestamp].json`
- `summary-[timestamp].md`

## ⚙️ 設定・カスタマイズ

### エラー検知閾値
```typescript
// パフォーマンス閾値（ミリ秒）
const PERFORMANCE_THRESHOLDS = {
  domContentLoaded: 3000,     // DOM読み込み完了時間
  firstContentfulPaint: 2500, // 初回描画時間
  loadComplete: 5000          // 完全ロード時間
};
```

### 監視対象URL設定
```typescript
const MONITORING_URLS = [
  'http://192.168.3.135:3000',      // メインWebUI
  'http://192.168.3.135:3000/admin' // 管理者ダッシュボード
];
```

### ブラウザ設定
```typescript
const BROWSER_OPTIONS = {
  headless: false,              // UI表示モード
  viewport: { width: 1920, height: 1080 },
  recordVideo: true,            // 動画録画有効
  screenshot: 'only-on-failure' // 失敗時のみスクリーンショット
};
```

## 🛡️ セキュリティ考慮事項

### 実装されたセキュリティチェック
- CSP (Content Security Policy) 検証
- 機密情報露出検査
- XSS脆弱性パターン検知
- HTTPS通信確認
- 認証・認可状態検証

### セキュリティベストプラクティス
- パスワード・APIキーの検索除外
- スクリーンショット・動画の機密情報マスキング
- 実行ログの適切な権限設定
- 自動修復時のバックアップ作成

## 🔧 トラブルシューティング

### よくある問題と解決策

#### 1. Playwrightブラウザ未インストール
```bash
# 解決方法
npx playwright install chromium --with-deps
```

#### 2. TypeScriptコンパイルエラー
```bash
# 解決方法
npm install --save-dev typescript @types/node
npx tsc --skipLibCheck
```

#### 3. WebUIサーバー接続エラー
```bash
# WebUIサーバー起動確認
curl http://192.168.3.135:3000
```

#### 4. 権限エラー
```bash
# スクリプト実行権限付与
chmod +x run-comprehensive-webui-monitor.sh
```

## 📊 実装成果

### 機能達成度
- ✅ MCP Playwright ブラウザ自動化システム
- ✅ 開発者コンソールエラー自動検知
- ✅ React/UI関連エラーハンドリング
- ✅ アクセシビリティエラー検知
- ✅ 自動修復機能
- ✅ 管理者ダッシュボード包括的監視
- ✅ エラー検知結果報告機能

### 検知可能なエラータイプ（50+種類）
- JavaScript/TypeScript エラー
- React コンポーネントエラー
- ネットワーク・API エラー
- アクセシビリティ問題
- パフォーマンス問題
- セキュリティ問題
- UI/UX 問題
- データ整合性問題

### 自動修復可能な問題（30+パターン）
- Optional chaining追加
- null/undefined チェック
- React key props追加
- アクセシビリティ属性追加
- CORS設定修正
- パフォーマンス最適化設定

## 🎯 今後の拡張可能性

### 短期的改善
- より詳細なパフォーマンス分析
- 追加のアクセシビリティチェック
- React 18 Concurrent Features対応
- モバイル・タブレット対応

### 中長期的展開
- AI/MLベースのエラー予測
- 多言語対応エラーメッセージ
- リアルタイム監視ダッシュボード
- CI/CD統合自動テスト

## 📞 サポート・メンテナンス

### 定期実行推奨
```bash
# crontabでの定期実行例
# 毎日9時に実行
0 9 * * * /path/to/run-comprehensive-webui-monitor.sh --once

# 毎時実行（継続監視）
0 * * * * /path/to/run-comprehensive-webui-monitor.sh --once
```

### ログ監視
```bash
# 最新ログの確認
tail -f logs/mcp_comprehensive_monitor_*.log

# エラーログの検索
grep -r "ERROR\|CRITICAL" logs/
```

---

## 🏆 結論

本実装により、IT運用ツールのWebUIに対する包括的なエラー監視・自動修復システムが構築されました。MCP Playwrightの強力なブラウザ自動化機能と、TypeScriptによる型安全性を活用することで、高品質で保守性の高いコードベースを実現しています。

このシステムにより、WebUIの品質向上、ユーザー体験の改善、そして運用負荷の軽減が期待できます。定期的な監視により、問題の早期発見・解決が可能となり、IT運用ツール全体の信頼性向上に貢献します。

**実装完了日**: 2025年8月2日  
**担当**: DevUI (IT運用ツールのユーザーインタフェース開発担当)  
**技術スタック**: MCP Playwright + TypeScript + Node.js + Bash