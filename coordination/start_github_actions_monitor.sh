#!/bin/bash
# GitHub Actions リアルタイムエラー監視と自動修復システム 起動スクリプト

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
NC='\033[0m' # No Color

# プロジェクトルート取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"

echo -e "${BLUE}=" * 80
echo -e "🤖 ITSM GitHub Actions Realtime Error Monitor & Auto-Repair System"
echo -e "🎯 Target: 0 errors with 3 consecutive clean checks"
echo -e "⚡ Real-time monitoring with 30-second intervals"
echo -e "🔧 Automatic repair with smart pattern matching"
echo -e "🚀 Repository: Kensan196948G/ITSM-ITManagementSystem"
echo -e "=" * 80
echo -e "${NC}"

# 前提条件チェック
echo -e "${YELLOW}📋 Checking prerequisites...${NC}"

# Python環境チェック
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 is not installed${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python3 found: $(python3 --version)${NC}"

# GitHub CLI チェック
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI (gh) is not installed${NC}"
    echo -e "${YELLOW}Please install GitHub CLI: https://cli.github.com/manual/installation${NC}"
    exit 1
fi
echo -e "${GREEN}✅ GitHub CLI found: $(gh --version | head -n1)${NC}"

# GitHub CLI 認証チェック
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️ GitHub CLI is not authenticated${NC}"
    echo -e "${BLUE}🔑 Please authenticate with GitHub CLI:${NC}"
    echo -e "   gh auth login"
    echo -e "${YELLOW}Attempting to login...${NC}"
    
    if ! gh auth login; then
        echo -e "${RED}❌ GitHub CLI authentication failed${NC}"
        exit 1
    fi
fi
echo -e "${GREEN}✅ GitHub CLI authenticated${NC}"

# 作業ディレクトリ移動
cd "$SCRIPT_DIR"

# Python依存関係のインストール
echo -e "${YELLOW}📦 Installing Python dependencies...${NC}"
if [ -f "requirements.txt" ]; then
    pip3 install -r requirements.txt
else
    # 必要最小限の依存関係をインストール
    pip3 install asyncio pathlib pyyaml
fi

# ログディレクトリ作成
mkdir -p logs

# 設定ファイルの作成（存在しない場合）
if [ ! -f "github_monitor_config.json" ]; then
    echo -e "${YELLOW}⚙️ Creating default configuration...${NC}"
    cat > github_monitor_config.json << EOF
{
  "github_repo": {
    "owner": "Kensan196948G",
    "name": "ITSM-ITManagementSystem"
  },
  "monitoring": {
    "check_interval": 30,
    "max_repair_cycles": 10,
    "error_threshold": 0,
    "consecutive_clean_required": 3,
    "repair_timeout": 1800
  },
  "notifications": {
    "success_notification": true,
    "failure_notification": true
  },
  "repair_categories": [
    "dependency",
    "config", 
    "database",
    "linting",
    "build",
    "test"
  ]
}
EOF
    echo -e "${GREEN}✅ Configuration file created: github_monitor_config.json${NC}"
fi

# 実行権限付与
chmod +x realtime_repair_controller.py
chmod +x github_actions_monitor.py
chmod +x error_pattern_analyzer.py
chmod +x auto_repair_engine.py

echo -e "${GREEN}🚀 Starting GitHub Actions Realtime Monitor...${NC}"
echo -e "${BLUE}📊 Monitor will run continuously until all errors are resolved${NC}"
echo -e "${YELLOW}⏹️ Press Ctrl+C to stop monitoring${NC}"
echo ""

# メイン監視プログラム実行
python3 realtime_repair_controller.py

echo -e "${BLUE}👋 GitHub Actions Monitor stopped${NC}"