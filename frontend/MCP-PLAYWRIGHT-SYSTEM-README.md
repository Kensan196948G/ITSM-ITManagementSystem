# MCP Playwright ブラウザエラー検知・修復システム

MCP Playwrightを使用した自動ブラウザエラー検知・修復システムです。WebUIのエラーをリアルタイムで検知し、自動修復を行い、エラーがなくなるまで無限ループで実行します。

## 🌟 主な機能

### 1. リアルタイムエラー検知
- **コンソールエラー**: JavaScriptエラー、警告、ログを監視
- **ネットワークエラー**: HTTP 4xx/5xx エラーを検知
- **JavaScriptエラー**: 例外とスタックトレースを追跡
- **セキュリティエラー**: リクエスト失敗とセキュリティ問題を監視
- **アクセシビリティエラー**: WAI-ARIAガイドライン違反を検知

### 2. 自動修復機能
- **Null/Undefined チェック**: プロパティアクセスエラーを防止
- **ネットワークリトライ**: HTTP エラーに対する自動再試行
- **CSS レイアウト修復**: レイアウト問題の自動修正
- **アクセシビリティ改善**: ARIA属性とalt属性の自動追加
- **メモリリーク対策**: イベントリスナーとタイマーの自動クリーンアップ

### 3. 内部検証システム
- **機能テスト**: ページ読み込み、ナビゲーション、フォームバリデーション
- **パフォーマンステスト**: 読み込み時間、メモリ使用量の測定
- **アクセシビリティテスト**: alt属性、ARIA ラベルの確認
- **総合レポート**: 詳細な検証結果とMarkdownサマリーを生成

### 4. 無限ループ制御
- **自動継続実行**: エラーがなくなるまで自動的に監視・修復を継続
- **緊急停止条件**: 連続失敗、同一エラー繰り返し、修復試行上限での自動停止
- **ヘルススコア**: システム状態を数値化して監視
- **統計とレポート**: 詳細な実行統計と包括的レポートを生成

### 5. 管理者ダッシュボード
- **リアルタイム監視**: 現在のエラー状況をリアルタイム表示
- **修復状況**: 修復活動の詳細な履歴と成功率
- **検証結果**: 最新の検証レポートとカテゴリ別スコア
- **ループ制御**: 無限ループの実行状況と制御機能
- **アクセシビリティ対応**: WAI-ARIA準拠のUI設計

## 🚀 セットアップ

### 前提条件
- Node.js 18+
- npm または yarn
- Playwright ブラウザ（Chromium、Firefox、WebKit）

### インストール
```bash
# 依存関係をインストール
cd frontend
npm install

# Playwright ブラウザをインストール
npm run playwright:install
```

## 📋 使用方法

### 1. システム開始
```bash
# システム全体を開始（無限ループ監視）
npm run mcp-playwright:start
```

### 2. ステータス確認
```bash
# 現在のシステム状態を確認
npm run mcp-playwright:status
```

### 3. システム停止
```bash
# 実行中のシステムを Ctrl+C で正常停止
# または緊急停止
npm run mcp-playwright:emergency
```

### 4. 管理者ダッシュボード
```bash
# Reactアプリケーションを起動
npm start

# ブラウザで以下にアクセス
# http://192.168.3.135:3000/admin
```

## ⚙️ 設定

### 監視対象URL
```typescript
const SYSTEM_CONFIG = {
  detectorConfig: {
    targetUrls: [
      'http://192.168.3.135:3000',          // メインアプリケーション
      'http://192.168.3.135:3000/admin'     // 管理者ダッシュボード
    ],
    browsers: ['chromium', 'firefox'],
    monitoringInterval: 10000,              // 10秒間隔
  }
};
```

### 無限ループ設定
```typescript
const LOOP_CONFIG = {
  maxIterations: 500,                       // 最大500回のイテレーション
  iterationDelay: 15000,                    // 15秒間隔
  timeoutMinutes: 180,                      // 3時間でタイムアウト
  errorThreshold: 3,                        // エラー閾値
  successThreshold: 3,                      // 成功閾値
};
```

### 緊急停止条件
```typescript
const EMERGENCY_CONDITIONS = {
  maxConsecutiveFailures: 5,                // 連続失敗5回で停止
  maxSameErrorRepeats: 10,                  // 同一エラー10回繰り返しで停止
  maxRepairAttempts: 100,                   // 修復試行100回で停止
};
```

## 📊 レポートとログ

### 生成されるレポート
- `comprehensive-reports/`: 包括的システムレポート（JSON）
- `validation-reports/`: 検証レポート（JSON + Markdown）
- `console-error-reports/`: 個別エラーレポート（JSON）
- `infinite-monitoring-reports/`: 無限ループレポート（JSON）

### ログ出力
```
[10:30:15] ヘルス: 95.2% | エラー: 0 | 修復: 12 | イテレーション: 45
🔍 [console] JavaScript エラーを検知: Cannot read property 'data' of undefined
🔧 修復を試行: null/undefined チェックを追加
✅ 修復成功: null/undefined チェックを追加
✅ 検証合格: アクセシビリティテスト (スコア: 98)
```

## 🎯 アーキテクチャ

### コアコンポーネント
1. **MCPPlaywrightErrorDetector**: エラー検知エンジン
2. **AutoRepairEngine**: 自動修復エンジン  
3. **InfiniteLoopController**: 無限ループ制御
4. **ValidationSystem**: 内部検証システム
5. **MCPPlaywrightMasterController**: 統合制御システム

### データフロー
```
ブラウザ監視 → エラー検知 → 自動修復 → 検証 → ループ継続
     ↓             ↓          ↓        ↓         ↓
  ページ読み込み → コンソール → 修復ルール → テスト → 次イテレーション
```

## 🛡️ セキュリティ

### 安全な実行
- **サンドボックス化**: Playwrightブラウザはサンドボックス環境で実行
- **権限制限**: 必要最小限の権限でブラウザを起動
- **入力検証**: 修復コードの実行前に安全性をチェック
- **緊急停止**: 異常検知時の自動停止機能

### 修復コードの安全性
- **eval()の制限**: 信頼できるコードのみ実行
- **DOM操作の制限**: 安全なDOM操作のみ許可
- **XSS対策**: スクリプト注入を防止

## 🔧 トラブルシューティング

### よくある問題

#### 1. ブラウザ起動エラー
```bash
# Playwrightブラウザを再インストール
npm run playwright:install
```

#### 2. ポート競合
```bash
# ポート使用状況を確認
netstat -tlnp | grep :3000
```

#### 3. メモリ不足
```bash
# メモリ使用量を確認
free -h
# システム設定でブラウザ数を削減
```

#### 4. 権限エラー
```bash
# ファイル権限を確認
ls -la comprehensive-reports/
chmod 755 comprehensive-reports/
```

### ログレベル設定
```typescript
// 詳細ログを有効化
const config = {
  systemSettings: {
    enableDetailedLogging: true,
    enablePerformanceMonitoring: true,
  }
};
```

## 📈 パフォーマンス最適化

### リソース管理
- **メモリ使用量**: 定期的なガベージコレクション
- **CPU使用率**: イテレーション間隔の調整
- **ディスク容量**: 古いレポートの自動削除
- **ネットワーク**: 並列リクエストの制限

### 推奨設定
```typescript
// 高パフォーマンス設定
const optimizedConfig = {
  monitoringInterval: 30000,    // 30秒間隔
  maxConcurrentRepairs: 3,      // 同時修復数制限
  browsers: ['chromium'],       // 単一ブラウザ
  enableTrace: false,           // トレース無効化
};
```

## 🤝 貢献

### 修復ルールの追加
```typescript
// カスタム修復ルールの例
const customRule: RepairRule = {
  id: 'custom-fix',
  name: 'カスタム修復',
  description: '特定の問題に対するカスタム修復',
  errorPattern: /特定のエラーパターン/i,
  errorType: ['console'],
  priority: 1,
  generateFix: (error) => [/* 修復アクション */]
};

repairEngine.addCustomRule(customRule);
```

### 検証テストの追加
```typescript
// カスタム検証テストの例
const customTest: ValidationTest = {
  id: 'custom-validation',
  name: 'カスタム検証',
  description: '特定の機能を検証',
  category: 'functional',
  priority: 'high',
  execute: async (page) => {
    // 検証ロジック
    return {
      testId: 'custom-validation',
      passed: true,
      score: 100,
      message: '検証成功',
      details: {},
      duration: 1000,
      timestamp: new Date(),
    };
  }
};

validationSystem.addCustomTest('functional-tests', customTest);
```

## 📞 サポート

### 問題報告
- **GitHub Issues**: 機能要求とバグレポート
- **ログファイル**: `comprehensive-reports/` の最新レポートを添付
- **システム情報**: `npm run mcp-playwright:status` の出力を添付

### 詳細設定
システムの詳細設定については、各サービスクラスのJSDocコメントを参照してください。

---

## 📄 ライセンス

このプロジェクトはMITライセンスの下で提供されています。

## 🙏 謝辞

このシステムは以下の技術を基盤としています：
- [Playwright](https://playwright.dev/) - ブラウザ自動化
- [React](https://reactjs.org/) - UI フレームワーク  
- [Material-UI](https://mui.com/) - UI コンポーネント
- [TypeScript](https://www.typescriptlang.org/) - 型安全性