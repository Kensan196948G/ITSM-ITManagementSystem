# フロントエンドエラー自動修復システム

TypeScript、React、Material-UIエラーを自動検出・分析・修復するインテリジェントシステムです。

## 🎯 機能概要

### 自動修復対象エラー
- **TypeScript型エラー**: 未定義変数、型不整合、null/undefined安全性
- **React Hooksエラー**: 依存関係不足、条件付きHook呼び出し
- **Material-UI互換性**: 非推奨コンポーネント・プロパティ、インポートパス
- **インポート/エクスポートエラー**: モジュール解決、名前付きエクスポート
- **Propsタイプエラー**: 必須プロパティ不足、型不整合

### システム構成
```
coordination/frontend-repair/
├── auto_repair_system.py    # メインコントローラー
├── error_monitor.py         # エラー監視システム
├── error_analyzer.py        # エラー分析エンジン
├── code_fixer.py           # 修復コード生成・適用
├── test_runner.py          # 動作確認システム
├── start_repair_system.sh  # 起動スクリプト
└── README.md              # このファイル
```

## 🚀 使用方法

### 1. システム起動
```bash
# インタラクティブメニュー
./start_repair_system.sh

# 1回だけの修復実行
./start_repair_system.sh single

# 継続監視モード（30秒間隔）
./start_repair_system.sh monitor

# カスタム間隔での継続監視
./start_repair_system.sh monitor 60

# システム状態確認
./start_repair_system.sh status

# エラー監視のみ（修復なし）
./start_repair_system.sh no-fix
```

### 2. Python直接実行
```bash
# メインシステム
python3 auto_repair_system.py --mode single
python3 auto_repair_system.py --mode monitor --interval 30
python3 auto_repair_system.py --mode status

# 個別コンポーネント
python3 error_monitor.py --once
python3 error_analyzer.py
python3 test_runner.py
```

## 📊 監視・修復プロセス

### Phase 1: エラー監視
- TypeScriptコンパイルチェック (`tsc --noEmit`)
- ESLintチェック (React/JSX ルール含む)
- ビルドエラーチェック (`npm run build`)

### Phase 2: エラー分析
- エラーパターンマッチング
- 修復可能性評価
- 信頼度スコア算出
- 修復戦略決定

### Phase 3: 自動修復
- バックアップ作成
- 修復コード生成
- ファイル内容更新
- 修復結果記録

### Phase 4: 動作確認
- TypeScriptコンパイル確認
- ESLint再チェック
- ビルド成功確認
- ユニットテスト実行

## 📁 出力ファイル

### coordination/errors.json
```json
{
  "errors": [...],
  "lastCheck": "2025-08-01T14:30:00",
  "frontend": {
    "typescript": [...],
    "react": [...],
    "materialUI": [...],
    "imports": [...],
    "props": [...]
  },
  "status": "monitoring"
}
```

### coordination/fixes.json
```json
{
  "fixes": [...],
  "lastUpdate": "2025-08-01T14:35:00",
  "statistics": {
    "totalFixes": 15,
    "successfulFixes": 12,
    "failedFixes": 3,
    "categories": {
      "typescript": 5,
      "react": 4,
      "materialUI": 2,
      "imports": 1,
      "props": 0
    }
  },
  "status": "ready"
}
```

## 🔧 修復パターン例

### TypeScript型エラー
```typescript
// 修復前
interface User {
  name: string;
}
const user: User = { name: "John", age: 30 }; // Property 'age' does not exist

// 修復後
interface User {
  name: string;
  age?: number; // Auto-added property
}
const user: User = { name: "John", age: 30 };
```

### React Hooks依存関係
```jsx
// 修復前
useEffect(() => {
  fetchData(userId);
}, []); // Missing dependency: 'userId'

// 修復後
useEffect(() => {
  fetchData(userId);
}, [userId]); // Dependency added
```

### Material-UI v5移行
```jsx
// 修復前
import { Button } from '@material-ui/core';

// 修復後
import { Button } from '@mui/material';
```

## ⚙️ システム設定

### 修復試行制限
- 最大試行回数: 3回/エラー
- 再試行間隔: 1時間
- リセット期間: 24時間

### 監視間隔
- デフォルト: 30秒
- カスタマイズ可能: 10秒〜3600秒

### バックアップ
- 修復前に自動バックアップ作成
- 保存場所: `coordination/frontend-repair/backups/`
- ファイル名: `{original_name}_{timestamp}.backup`

## 📋 ログ・状態確認

### ログファイル
```
coordination/frontend-repair/
├── auto_repair.log      # メインシステムログ
├── monitor.log          # エラー監視ログ  
├── analyzer.log         # 分析エンジンログ
├── fixer.log           # 修復システムログ
├── test_runner.log     # テスト実行ログ
└── system_state.json   # システム状態
```

### 状態確認コマンド
```bash
# システム全体の状態
python3 auto_repair_system.py --mode status

# 最新エラー確認
cat ../errors.json | jq '.summary'

# 修復統計確認
cat ../fixes.json | jq '.statistics'
```

## 🛠️ トラブルシューティング

### よくある問題

#### 1. TypeScriptコンパイルエラー
```bash
# tsconfig.json確認
cat ../../frontend/tsconfig.json

# 手動コンパイルテスト
cd ../../frontend && npx tsc --noEmit
```

#### 2. npm依存関係エラー
```bash
# 依存関係再インストール
cd ../../frontend
rm -rf node_modules package-lock.json
npm install
```

#### 3. 修復無限ループ
```bash
# システム状態リセット
rm system_state.json
python3 auto_repair_system.py --mode single
```

### デバッグモード
```bash
# 詳細ログ出力
PYTHONPATH=/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/frontend-repair python3 -u auto_repair_system.py --mode single 2>&1 | tee debug.log
```

## 🔄 継続監視運用

### systemdサービス化（推奨）
```bash
# サービスファイル作成
sudo tee /etc/systemd/system/frontend-repair.service > /dev/null <<EOF
[Unit]
Description=Frontend Auto Repair System
After=network.target

[Service]
Type=simple
User=kensan
WorkingDirectory=/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/frontend-repair
ExecStart=/usr/bin/python3 auto_repair_system.py --mode monitor --interval 30
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

# サービス開始
sudo systemctl enable frontend-repair
sudo systemctl start frontend-repair
sudo systemctl status frontend-repair
```

### cronジョブ設定
```bash
# crontabに追加（5分間隔でチェック）
*/5 * * * * cd /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/frontend-repair && python3 auto_repair_system.py --mode single >> cron.log 2>&1
```

## 📈 パフォーマンス監視

### メトリクス
- エラー検出率
- 修復成功率
- 修復所要時間
- システム負荷

### レポート生成
```bash
# 日次サマリー
python3 -c "
import json
with open('../fixes.json') as f:
    data = json.load(f)
    stats = data['statistics']
    print(f'修復成功率: {stats[\"successfulFixes\"]}/{stats[\"totalFixes\"]} ({stats[\"successfulFixes\"]/stats[\"totalFixes\"]*100:.1f}%)')
"
```

## 🚨 アラート設定

### 修復失敗通知
システムが修復に失敗した場合、ログファイルに詳細を記録し、必要に応じて外部通知システムと連携可能です。

---

## 📞 サポート

### 問題報告
- エラーログの内容
- システム状態 (`--mode status`)
- 実行環境情報

### 機能拡張
新しいエラーパターンの追加や修復ロジックの改善は、各コンポーネントファイルを編集して対応できます。

---

**重要**: このシステムは開発環境での使用を想定しています。本番環境での使用前には十分なテストを実施してください。