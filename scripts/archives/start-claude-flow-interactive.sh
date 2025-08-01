#!/bin/bash

# Claude-Flow 対話モード起動スクリプト
# ClaudeCodeとの連携用

echo "🚀 Starting Claude-Flow Interactive Mode..."
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

# 必要なディレクトリの確認
if [ ! -d "docs" ]; then
    echo "❌ Error: docs/ directory not found"
    exit 1
fi

# ログディレクトリ作成
mkdir -p logs
mkdir -p claude-out

echo "📝 Log directories prepared:"
echo "  📁 logs/ - System logs"
echo "  📁 claude-out/ - Agent outputs"
echo ""

# Claude-Flow を対話モードで起動
echo "🎯 Starting Claude-Flow in interactive mode..."
echo "💡 Use 'claude code' to connect to this MCP server"
echo ""

# バックグラウンドでMCPサーバーを起動
nohup npx claude-flow@alpha mcp start \
    --target 0:claude:📘ITSM-CTO@docs/ITSM-CTO.md \
    --target 1:claude:🛠️ITSM-DevAPI@docs/ITSM-DevAPI.md \
    --target 2:claude:💻ITSM-DevUI@docs/ITSM-DevUI.md \
    --target 3:claude:🔍ITSM-QA@docs/ITSM-QA.md \
    --target 4:claude:🧪ITSM-Tester@docs/ITSM-Tester.md \
    --target 5:claude:📈ITSM-Manager@docs/ITSM-Manager.md \
    --mode full-auto \
    --file "docs/*.md" \
    --max-iterations 5 \
    --dangerously-skip-permissions > logs/claude-flow.log 2>&1 &

CLAUDE_FLOW_PID=$!
echo "🆔 Claude-Flow MCP Server PID: $CLAUDE_FLOW_PID"
echo "$CLAUDE_FLOW_PID" > logs/claude-flow.pid

# 少し待ってからClaudeCodeを起動
sleep 3

echo ""
echo "🔗 Starting ClaudeCode to connect to MCP server..."
echo "📊 MCP Server logs: tail -f logs/claude-flow.log"
echo ""

# ClaudeCodeを起動してMCPサーバーに接続
claude code --mcp-server claude-flow

# 終了処理
echo ""
echo "🛑 Shutting down Claude-Flow MCP server..."
if [ -f logs/claude-flow.pid ]; then
    kill $(cat logs/claude-flow.pid) 2>/dev/null
    rm -f logs/claude-flow.pid
fi

echo "⏰ End Time: $(date)"
echo "🏁 Session completed"