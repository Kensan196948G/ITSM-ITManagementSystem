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
mcp__ruv-swarm__swarm_init --topology hierarchical --maxAgents 6 --strategy specialized

# DAA (Decentralized Autonomous Agents) 初期化
mcp__ruv-swarm__daa_init --enableCoordination true --enableLearning true --persistenceMode auto

# 6つのエージェントを作成
mcp__ruv-swarm__daa_agent_create --id "itsm-cto" --cognitivePattern "systems" --capabilities '["architecture", "security", "design"]' --enableMemory true

mcp__ruv-swarm__daa_agent_create --id "itsm-devapi" --cognitivePattern "convergent" --capabilities '["backend", "api", "database"]' --enableMemory true

mcp__ruv-swarm__daa_agent_create --id "itsm-devui" --cognitivePattern "divergent" --capabilities '["frontend", "ui", "ux"]' --enableMemory true

mcp__ruv-swarm__daa_agent_create --id "itsm-qa" --cognitivePattern "critical" --capabilities '["quality", "testing", "validation"]' --enableMemory true

mcp__ruv-swarm__daa_agent_create --id "itsm-tester" --cognitivePattern "convergent" --capabilities '["automation", "testing", "ci"]' --enableMemory true

mcp__ruv-swarm__daa_agent_create --id "itsm-manager" --cognitivePattern "adaptive" --capabilities '["coordination", "monitoring", "management"]' --enableMemory true

# スウォーム状態確認
mcp__ruv-swarm__swarm_status --verbose true

# 開発タスクオーケストレーション開始
mcp__ruv-swarm__task_orchestrate --task "ITSM準拠のIT運用ツール自動開発を6エージェント並列で実行" --strategy adaptive --priority high

# DAA学習状況確認
mcp__ruv-swarm__daa_learning_status --detailed true

# 24時間監視開始
mcp__ruv-swarm__swarm_monitor --duration 86400 --interval 60
EOF

echo ""
echo "⏰ End Time: $(date)"
echo "🏁 Swarm session completed"