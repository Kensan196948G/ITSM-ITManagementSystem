#!/bin/bash
"""
フロントエンドエラー自動修復システム起動スクリプト
"""

set -e

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
FRONTEND_DIR="$PROJECT_ROOT/frontend"

# ログディレクトリを作成
mkdir -p "$SCRIPT_DIR/logs"

echo "🔧 Frontend Auto Repair System Startup"
echo "======================================"
echo "Project Root: $PROJECT_ROOT"
echo "Frontend Dir: $FRONTEND_DIR"
echo "Script Dir: $SCRIPT_DIR"
echo ""

# Python環境確認
if ! command -v python3 &> /dev/null; then
    echo "❌ Python3 not found. Please install Python 3.8+."
    exit 1
fi

echo "✅ Python3 found: $(python3 --version)"

# Node.js環境確認
if ! command -v npm &> /dev/null; then
    echo "❌ npm not found. Please install Node.js and npm."
    exit 1
fi

echo "✅ npm found: $(npm --version)"

# フロントエンドディレクトリ確認
if [ ! -d "$FRONTEND_DIR" ]; then
    echo "❌ Frontend directory not found: $FRONTEND_DIR"
    exit 1
fi

# package.json確認
if [ ! -f "$FRONTEND_DIR/package.json" ]; then
    echo "❌ package.json not found in frontend directory"
    exit 1
fi

echo "✅ Frontend directory validated"

# 依存関係インストール確認
if [ ! -d "$FRONTEND_DIR/node_modules" ]; then
    echo "📦 Installing frontend dependencies..."
    cd "$FRONTEND_DIR"
    npm install
    cd "$SCRIPT_DIR"
fi

echo "✅ Frontend dependencies ready"

# 実行モード選択
MODE=${1:-"menu"}

if [ "$MODE" = "menu" ]; then
    echo ""
    echo "🚀 Select operation mode:"
    echo "1) Single check and repair"
    echo "2) Continuous monitoring (30s interval)"
    echo "3) Continuous monitoring (custom interval)"
    echo "4) Status check only"
    echo "5) Monitor errors only (no auto-fix)"
    echo "6) Exit"
    echo ""
    read -p "Enter your choice (1-6): " choice
    
    case $choice in
        1)
            echo "🔍 Running single check and repair..."
            python3 "$SCRIPT_DIR/auto_repair_system.py" --mode single
            ;;
        2)
            echo "🔄 Starting continuous monitoring (30s interval)..."
            python3 "$SCRIPT_DIR/auto_repair_system.py" --mode monitor --interval 30
            ;;
        3)
            read -p "Enter monitoring interval in seconds (default: 60): " interval
            interval=${interval:-60}
            echo "🔄 Starting continuous monitoring (${interval}s interval)..."
            python3 "$SCRIPT_DIR/auto_repair_system.py" --mode monitor --interval "$interval"
            ;;
        4)
            echo "📊 Checking system status..."
            python3 "$SCRIPT_DIR/auto_repair_system.py" --mode status
            ;;
        5)
            echo "👀 Starting error monitoring only (no auto-fix)..."
            python3 "$SCRIPT_DIR/auto_repair_system.py" --mode monitor --no-auto-fix
            ;;
        6)
            echo "👋 Goodbye!"
            exit 0
            ;;
        *)
            echo "❌ Invalid choice. Please run the script again."
            exit 1
            ;;
    esac
elif [ "$MODE" = "single" ]; then
    echo "🔍 Running single check and repair..."
    python3 "$SCRIPT_DIR/auto_repair_system.py" --mode single
elif [ "$MODE" = "monitor" ]; then
    INTERVAL=${2:-30}
    echo "🔄 Starting continuous monitoring (${INTERVAL}s interval)..."
    python3 "$SCRIPT_DIR/auto_repair_system.py" --mode monitor --interval "$INTERVAL"
elif [ "$MODE" = "status" ]; then
    echo "📊 Checking system status..."
    python3 "$SCRIPT_DIR/auto_repair_system.py" --mode status
elif [ "$MODE" = "no-fix" ]; then
    echo "👀 Starting error monitoring only (no auto-fix)..."
    python3 "$SCRIPT_DIR/auto_repair_system.py" --mode monitor --no-auto-fix
else
    echo "❌ Unknown mode: $MODE"
    echo "Usage: $0 [single|monitor|status|no-fix] [interval]"
    exit 1
fi