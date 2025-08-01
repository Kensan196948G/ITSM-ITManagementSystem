# 📁 スクリプトアーカイブ

## 概要

このディレクトリには、開発過程で作成されたが現在使用されていないスクリプトファイルが保管されています。

## 📂 アーカイブされたスクリプト

### Claude-Flow 関連スクリプト

| ファイル名 | 説明 | 移動理由 |
|-----------|------|----------|
| `start-claude-flow.sh` | 初期版Claude-Flow起動スクリプト | stdio モードで対話型でない |
| `start-claude-flow-interactive.sh` | 対話モード版起動スクリプト | ClaudeCode連携が複雑 |
| `start-claude-flow-proper.sh` | 正式版Claude-Flow起動スクリプト | MCPエラーが多発 |

### Swarm関連スクリプト

| ファイル名 | 説明 | 移動理由 |
|-----------|------|----------|
| `start-swarm-agents.sh` | ruv-swarm MCP使用版 | `neuralNetworks.map is not a function` エラー |

### セットアップスクリプト

| ファイル名 | 説明 | 移動理由 |
|-----------|------|----------|
| `setup-github-auth.sh` | GitHub認証設定スクリプト | 手動設定が完了済み |

## 🚀 現在の推奨スクリプト

### メイン起動スクリプト
- **`start-simple-agents.sh`** - 安定した6エージェント起動スクリプト（推奨）

### GitHub連携スクリプト  
- **`git-auto-sync.sh`** - 単発GitHub同期
- **`git-scheduled-sync.sh`** - 定期GitHub同期

## 🔄 復元方法

必要に応じて、アーカイブされたスクリプトを復元できます：

```bash
# 特定スクリプトの復元
cp scripts/archives/[ファイル名] ./

# 実行権限の付与
chmod +x [ファイル名]
```

## 📊 開発履歴

### v1.0 開発過程

1. **初期実装**: `start-claude-flow.sh` - Claude-Flow MCP の基本実装
2. **対話型改良**: `start-claude-flow-interactive.sh` - ユーザー操作性の向上
3. **ruv-swarm試行**: `start-swarm-agents.sh` - より高度なスウォーム機能
4. **正式版作成**: `start-claude-flow-proper.sh` - 本格的な機能統合
5. **安定版採用**: `start-simple-agents.sh` - エラーを回避した実用版

### 学習事項

- **MCP連携の複雑さ**: 高機能なMCPほどエラーが発生しやすい
- **Taskツールの安定性**: Claude標準のTaskツールが最も安定
- **段階的アプローチ**: シンプルな実装から始めることの重要性

## 🔧 技術的な問題

### 発生したエラー

1. **ruv-swarm MCP**: 
   - `neuralNetworks.map is not a function`
   - `recentEvents.map is not a function`
   - データ構造の不整合

2. **Claude CLI設定**:
   - 無効な `$schema` フィールド
   - 設定ファイルの互換性問題

3. **GitHub認証**:
   - Personal Access Token の複雑な設定
   - 競合解決の自動化

## 🎯 今後の開発方針

1. **安定性優先**: `start-simple-agents.sh` を基盤として開発継続
2. **段階的改良**: 新機能は小さなテストから開始
3. **エラー処理強化**: 各スクリプトにより詳細なエラーハンドリングを追加
4. **ドキュメント充実**: 使用方法と問題解決方法の詳細化

## 🔗 関連ドキュメント

- [エージェント起動ガイド](../../docs/エージェント起動ガイド.md)
- [GitHub連携ガイド](../../docs/GitHub連携ガイド.md)
- [開発仕様書](../../docs/ClaudeCodeClaude-Flow%20による%206エージェント並列24時間自動開発仕様書（tmux%20不使用）.md)

---

📅 Archive Created: 2025-08-01  
🏷️ Version: 1.0  
📝 Maintained by: ITSM Development Team