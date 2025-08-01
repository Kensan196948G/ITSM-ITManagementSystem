#!/bin/bash

# 簡単な6エージェント起動スクリプト
# エラー回避版・基本機能重視

echo "🚀 Starting Simple 6-Agent Development Environment..."
echo "📍 Working Directory: $(pwd)"
echo "⏰ Start Time: $(date)"
echo ""

# ログディレクトリ作成
mkdir -p logs
mkdir -p agent-output

echo "📝 Directories prepared:"
echo "  📁 logs/ - System logs"
echo "  📁 agent-output/ - Agent outputs"
echo ""

echo "🧩 Agent Configuration:"
echo "  📘 ITSM-CTO     - Technical Design & Security"
echo "  🛠️ ITSM-DevAPI  - Backend API Development"
echo "  💻 ITSM-DevUI   - Frontend UI Development"
echo "  🔍 ITSM-QA      - Quality Assurance"
echo "  🧪 ITSM-Tester  - Automated Testing"
echo "  📈 ITSM-Manager - CI/CD & Progress Management"
echo ""

echo "🎯 Starting ClaudeCode with basic agent coordination..."

# ClaudeCodeでTaskツールを使用した6エージェント起動
claude code --dangerously-skip-permissions << 'EOF'

# 1. CTOエージェント - システム設計
Task subagent_type=ITSM-CTO description="System Architecture Design" prompt="ITSM準拠のシステム全体設計を行ってください。技術スタック、セキュリティ要件、データベース設計、API仕様を含む包括的な設計書を作成してください。"

# 2. DevAPIエージェント - バックエンド開発
Task subagent_type=ITSM-DevAPI description="Backend API Development" prompt="FastAPIを使用してITSM機能のバックエンドAPIを実装してください。インシデント管理、問題管理、変更管理の基本的なCRUD操作を含む REST APIを作成してください。"

# 3. DevUIエージェント - フロントエンド開発
Task subagent_type=ITSM-DevUI description="Frontend UI Development" prompt="ReactとMaterial-UIを使用してITSMシステムのユーザーインターフェースを実装してください。ダッシュボード、チケット管理画面、ユーザー管理画面を含む直感的なUIを作成してください。"

# 4. QAエージェント - 品質保証
Task subagent_type=ITSM-QA description="Quality Assurance" prompt="開発されたUIとAPIの品質を検証してください。アクセシビリティ、ユーザビリティ、用語統一、画面遷移の整合性を評価し、改善点をレポートしてください。"

# 5. Testerエージェント - 自動テスト
Task subagent_type=ITSM-Tester description="Automated Testing" prompt="PytestとPlaywrightを使用してAPIテストとE2Eテストを実装してください。テストケースの作成、自動実行、結果レポートの生成を行ってください。"

# 6. Managerエージェント - プロジェクト管理
Task subagent_type=ITSM-Manager description="Project Management" prompt="6エージェントの開発進捗を監視し、品質チェック、統合テスト、デプロイメント準備を管理してください。開発状況のレポートとリリース判定を行ってください。"

# 開発進捗確認
echo "✅ All 6 agents have been tasked with ITSM development"
echo "📊 Check logs/ directory for detailed progress"
echo "🔄 Development is running in parallel across all agents"

EOF

echo ""
echo "⏰ End Time: $(date)"
echo "🏁 Simple 6-Agent session initiated"
echo ""
echo "📊 To monitor progress:"
echo "  - Check logs/ directory for agent outputs"
echo "  - Watch agent-output/ for generated code"
echo "  - Use 'tail -f logs/*.log' for real-time monitoring"