#!/bin/bash

# Claude-Flow MCP 正式起動スクリプト
# 6エージェント並列開発環境（claude-flow MCP使用）

echo "🚀 Starting Claude-Flow MCP 6-Agent Development Environment..."
echo "📍 Working Directory: $(pwd)"
echo "⏰ Start Time: $(date)"
echo ""

# エージェント情報表示
echo "🧩 Agent Configuration:"
echo "  📘 ITSM-CTO     - Technical Design & Security"
echo "  🛠️ ITSM-DevAPI  - Backend API Development"
echo "  💻 ITSM-DevUI   - Frontend UI Development"
echo "  🔍 ITSM-QA      - Quality Assurance"
echo "  🧪 ITSM-Tester  - Automated Testing"
echo "  📈 ITSM-Manager - CI/CD & Progress Management"
echo ""

# ログディレクトリ作成
mkdir -p logs
mkdir -p claude-flow-out

echo "📝 Directories prepared:"
echo "  📁 logs/ - System logs"
echo "  📁 claude-flow-out/ - Agent outputs"
echo ""

# ClaudeCodeでclaude-flow MCPを起動
echo "🎯 Starting ClaudeCode with claude-flow MCP..."
echo "🔄 This will initialize a swarm and coordinate 6 specialized agents"
echo ""

# ClaudeCodeを起動（claude-flow MCPを使用）
claude code --dangerously-skip-permissions << 'EOF'
# スウォーム初期化
mcp__claude-flow__swarm_init topology=hierarchical maxAgents=6 strategy=auto

# 6つの専門エージェント作成
mcp__claude-flow__agent_spawn type=architect name="ITSM-CTO" capabilities=["system-design","security","architecture"]

mcp__claude-flow__agent_spawn type=coder name="ITSM-DevAPI" capabilities=["backend","api","fastapi","database"]

mcp__claude-flow__agent_spawn type=coder name="ITSM-DevUI" capabilities=["frontend","react","ui","ux"]

mcp__claude-flow__agent_spawn type=analyst name="ITSM-QA" capabilities=["quality-assurance","validation","accessibility"]

mcp__claude-flow__agent_spawn type=tester name="ITSM-Tester" capabilities=["automation","pytest","playwright","e2e"]

mcp__claude-flow__agent_spawn type=coordinator name="ITSM-Manager" capabilities=["project-management","ci-cd","monitoring"]

# エージェント一覧確認
mcp__claude-flow__agent_list

# スウォーム状態確認
mcp__claude-flow__swarm_status

# SPARC開発モード起動（ITSM開発）
mcp__claude-flow__sparc_mode mode=dev task_description="ITSM準拠のIT運用管理システム開発" options={"agents":6,"parallel":true,"continuous":true}

# メモリシステム初期化
mcp__claude-flow__memory_usage action=store key="project-info" value="ITSM ITManagement System Development" namespace="itsm-dev"

# 開発タスクオーケストレーション開始
mcp__claude-flow__task_orchestrate task="ITSM準拠のIT運用ツール6エージェント並列自動開発" strategy=adaptive priority=high dependencies=[]

# GitHub連携設定
mcp__claude-flow__github_repo_analyze repo="Kensan196948G/ITSM-ITManagementSystem" analysis_type=code_quality

# ワークフロー作成
mcp__claude-flow__workflow_create name="ITSM-AutoDev-Workflow" steps=["design","implement","test","deploy"] triggers=["code-change","schedule"]

# 24時間監視開始
mcp__claude-flow__swarm_monitor interval=300

# パフォーマンス監視
mcp__claude-flow__performance_report format=summary timeframe=24h

echo "✅ Claude-Flow 6-Agent Development Environment is now running!"
echo "📊 Monitor progress with: tail -f logs/claude-flow.log"
EOF

echo ""
echo "⏰ End Time: $(date)"
echo "🏁 Claude-Flow session completed"