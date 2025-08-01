#!/bin/bash

# Claude-Flow による 6エージェント並列開発環境起動スクリプト
# tmux不使用版

echo "🚀 Starting Claude-Flow 6-Agent Parallel Development Environment..."
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

# エージェント定義ファイルの存在確認
required_files=(
    "docs/ITSM-CTO.md"
    "docs/ITSM-DevAPI.md"
    "docs/ITSM-DevUI.md"
    "docs/ITSM-QA.md"
    "docs/ITSM-Tester.md"
    "docs/ITSM-Manager.md"
)

echo "🔍 Checking agent definition files..."
for file in "${required_files[@]}"; do
    if [ ! -f "$file" ]; then
        echo "❌ Error: $file not found"
        exit 1
    else
        echo "  ✅ $file"
    fi
done
echo ""

# ログディレクトリ作成
mkdir -p logs
mkdir -p claude-out

echo "📝 Log directories prepared:"
echo "  📁 logs/ - System logs"
echo "  📁 claude-out/ - Agent outputs"
echo ""

echo "🎯 Starting Claude-Flow MCP with 6 agents..."
echo "⚙️  Mode: full-auto"
echo "🔄 Max Iterations: 5"
echo "🔒 Permissions: dangerously-skip-permissions enabled"
echo ""

# Claude-Flow MCP起動
npx claude-flow@alpha mcp start \
    --target 0:claude:📘ITSM-CTO@docs/ITSM-CTO.md \
    --target 1:claude:🛠️ITSM-DevAPI@docs/ITSM-DevAPI.md \
    --target 2:claude:💻ITSM-DevUI@docs/ITSM-DevUI.md \
    --target 3:claude:🔍ITSM-QA@docs/ITSM-QA.md \
    --target 4:claude:🧪ITSM-Tester@docs/ITSM-Tester.md \
    --target 5:claude:📈ITSM-Manager@docs/ITSM-Manager.md \
    --mode full-auto \
    --file "docs/*.md" \
    --max-iterations 5 \
    --dangerously-skip-permissions

# 終了時の処理
echo ""
echo "⏰ End Time: $(date)"
echo "🏁 Claude-Flow session completed"