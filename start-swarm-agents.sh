#!/bin/bash

# Claude-Flow スウォーム・エージェント起動スクリプト
# ruv-swarm MCP を使用した並列エージェント起動

echo "🚀 Starting Claude-Flow Swarm Agents..."
echo "📍 Working Directory: $(pwd)"
echo "⏰ Start Time: $(date)"
echo ""

# ログディレクトリ作成
mkdir -p logs
mkdir -p swarm-out

echo "📝 Directories prepared:"
echo "  📁 logs/ - System logs"
echo "  📁 swarm-out/ - Swarm outputs"
echo ""

# ClaudeCodeでruv-swarmを起動
echo "🎯 Starting ClaudeCode with ruv-swarm MCP..."
echo "🔄 This will initialize a swarm and spawn 6 specialized agents"
echo ""

# ClaudeCodeを起動（ruv-swarm MCPを使用）
claude code --dangerously-skip-permissions << 'EOF'
# スウォーム初期化
mcp__ruv-swarm__swarm_init topology=hierarchical maxAgents=6 strategy=specialized

# 基本エージェント作成（ruv-swarm標準）
mcp__ruv-swarm__agent_spawn type=coordinator name="itsm-cto" capabilities=["architecture","security","design"]

mcp__ruv-swarm__agent_spawn type=coder name="itsm-devapi" capabilities=["backend","api","database"]

mcp__ruv-swarm__agent_spawn type=coder name="itsm-devui" capabilities=["frontend","ui","ux"]

mcp__ruv-swarm__agent_spawn type=analyst name="itsm-qa" capabilities=["quality","testing","validation"]

mcp__ruv-swarm__agent_spawn type=researcher name="itsm-tester" capabilities=["automation","testing","ci"]

mcp__ruv-swarm__agent_spawn type=optimizer name="itsm-manager" capabilities=["coordination","monitoring","management"]

# エージェント一覧確認
mcp__ruv-swarm__agent_list filter=all

# スウォーム状態確認
mcp__ruv-swarm__swarm_status verbose=true

# 開発タスクオーケストレーション開始
mcp__ruv-swarm__task_orchestrate task="ITSM準拠のIT運用ツール自動開発を6エージェント並列で実行" strategy=adaptive priority=high maxAgents=6

# タスク進行状況確認
mcp__ruv-swarm__task_status detailed=true

# エージェントメトリクス確認
mcp__ruv-swarm__agent_metrics metric=all

# 24時間監視開始
mcp__ruv-swarm__swarm_monitor duration=86400 interval=60
EOF

echo ""
echo "⏰ End Time: $(date)"
echo "🏁 Swarm session completed"