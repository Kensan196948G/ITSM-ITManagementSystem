#!/bin/bash

# 緊急GitHub Actions自動修復システム起動スクリプト
# 使用方法: ./start_emergency_auto_repair.sh [mode]
# mode: emergency, master, integration, itsm

set -e

# 色定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ロゴ表示
echo -e "${PURPLE}="*100
echo -e "🚨 EMERGENCY GITHUB ACTIONS AUTO-REPAIR SYSTEM 🚨"
echo -e "⚡ 5-Second Detection → Instant Repair → Auto Rerun"
echo -e "🎯 Target: Zero Errors - Infinite Loop Until Success"
echo -e "📊 Current: Loop 179, 537 Errors Fixed"
echo -e "🎫 ITSM-Compliant Incident Management"
echo -e "="*100"${NC}"

# プロジェクトルート設定
PROJECT_ROOT="/media/kensan/LinuxHDD/ITSM-ITmanagementSystem"
COORDINATION_DIR="$PROJECT_ROOT/coordination"

# 動作モード
MODE=${1:-"master"}

echo -e "${CYAN}📁 Project Root: $PROJECT_ROOT${NC}"
echo -e "${CYAN}🎛️  Mode: $MODE${NC}"
echo ""

# 前提条件チェック
echo -e "${YELLOW}🔍 Checking prerequisites...${NC}"

# Python3確認
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}❌ Python3 not found${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Python3 found${NC}"

# GitHub CLI確認
if ! command -v gh &> /dev/null; then
    echo -e "${RED}❌ GitHub CLI not found${NC}"
    echo -e "${YELLOW}💡 Install with: sudo apt install gh${NC}"
    exit 1
fi
echo -e "${GREEN}✅ GitHub CLI found${NC}"

# GitHub認証確認
if ! gh auth status &> /dev/null; then
    echo -e "${YELLOW}⚠️  GitHub CLI not authenticated${NC}"
    echo -e "${YELLOW}🔑 Please run: gh auth login${NC}"
    read -p "Continue anyway? (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
else
    echo -e "${GREEN}✅ GitHub CLI authenticated${NC}"
fi

# ディレクトリ確認
if [[ ! -d "$COORDINATION_DIR" ]]; then
    echo -e "${RED}❌ Coordination directory not found: $COORDINATION_DIR${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Coordination directory found${NC}"

# 必要なファイル確認
case $MODE in
    "emergency")
        SCRIPT_FILE="$COORDINATION_DIR/emergency_auto_repair_loop.py"
        ;;
    "master")
        SCRIPT_FILE="$COORDINATION_DIR/master_auto_repair_controller.py"
        ;;
    "integration")
        SCRIPT_FILE="$COORDINATION_DIR/integration_controller.py"
        ;;
    "itsm")
        SCRIPT_FILE="$COORDINATION_DIR/itsm_incident_manager.py"
        ;;
    "realtime")
        SCRIPT_FILE="$COORDINATION_DIR/realtime_repair_controller.py"
        ;;
    "enhanced")
        SCRIPT_FILE="$COORDINATION_DIR/enhanced_github_actions_auto_repair.py"
        ;;
    *)
        echo -e "${RED}❌ Unknown mode: $MODE${NC}"
        echo -e "${YELLOW}💡 Available modes: emergency, master, integration, itsm, realtime, enhanced${NC}"
        exit 1
        ;;
esac

if [[ ! -f "$SCRIPT_FILE" ]]; then
    echo -e "${RED}❌ Script file not found: $SCRIPT_FILE${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Script file found: $(basename $SCRIPT_FILE)${NC}"

echo ""

# 現在のシステム状況表示
echo -e "${BLUE}📊 Current System Status:${NC}"

# infinite_loop_state.json確認
INFINITE_LOOP_FILE="$COORDINATION_DIR/infinite_loop_state.json"
if [[ -f "$INFINITE_LOOP_FILE" ]]; then
    LOOP_COUNT=$(jq -r '.loop_count // "unknown"' "$INFINITE_LOOP_FILE")
    ERRORS_FIXED=$(jq -r '.total_errors_fixed // "unknown"' "$INFINITE_LOOP_FILE")
    LAST_SCAN=$(jq -r '.last_scan // "unknown"' "$INFINITE_LOOP_FILE")
    echo -e "${GREEN}🔄 Infinite Loop: Loop $LOOP_COUNT, $ERRORS_FIXED errors fixed${NC}"
    echo -e "${GREEN}📅 Last scan: $LAST_SCAN${NC}"
else
    echo -e "${YELLOW}⚠️  Infinite loop state file not found${NC}"
fi

# API エラーメトリクス確認
API_METRICS_FILE="$PROJECT_ROOT/backend/api_error_metrics.json"
if [[ -f "$API_METRICS_FILE" ]]; then
    TOTAL_ERRORS=$(jq -r '.total_errors // "unknown"' "$API_METRICS_FILE")
    HEALTH_STATUS=$(jq -r '.health_status // "unknown"' "$API_METRICS_FILE")
    echo -e "${GREEN}🔍 API Metrics: $TOTAL_ERRORS errors, status: $HEALTH_STATUS${NC}"
else
    echo -e "${YELLOW}⚠️  API metrics file not found${NC}"
fi

echo ""

# 実行確認
echo -e "${YELLOW}🚀 Ready to start $MODE mode${NC}"
echo -e "${YELLOW}📝 Script: $(basename $SCRIPT_FILE)${NC}"
echo -e "${YELLOW}⚠️  This will run in emergency mode with 5-second intervals${NC}"
echo ""
read -p "Start the emergency auto-repair system? (Y/n): " -n 1 -r
echo

if [[ $REPLY =~ ^[Nn]$ ]]; then
    echo -e "${YELLOW}🛑 Startup cancelled${NC}"
    exit 0
fi

# ログディレクトリ作成
LOG_DIR="$COORDINATION_DIR/logs"
mkdir -p "$LOG_DIR"

# 実行開始
echo ""
echo -e "${GREEN}🚀 STARTING EMERGENCY AUTO-REPAIR SYSTEM${NC}"
echo -e "${GREEN}🎯 Mode: $MODE${NC}"
echo -e "${GREEN}📝 Script: $(basename $SCRIPT_FILE)${NC}"
echo -e "${GREEN}📁 Working Directory: $PROJECT_ROOT${NC}"
echo -e "${GREEN}⏰ Start Time: $(date)${NC}"
echo ""
echo -e "${CYAN}="*60"${NC}"
echo -e "${CYAN}🎫 Press Ctrl+C to stop the system gracefully${NC}"
echo -e "${CYAN}📊 Logs are saved in: $LOG_DIR/${NC}"
echo -e "${CYAN}=" *60"${NC}"
echo ""

# メイン実行
cd "$PROJECT_ROOT"

# バックグラウンド実行オプション
if [[ "$2" == "background" || "$2" == "bg" ]]; then
    echo -e "${YELLOW}🔄 Starting in background mode...${NC}"
    TIMESTAMP=$(date +%Y%m%d_%H%M%S)
    LOG_FILE="$LOG_DIR/${MODE}_${TIMESTAMP}.log"
    
    nohup python3 "$SCRIPT_FILE" > "$LOG_FILE" 2>&1 &
    PID=$!
    
    echo -e "${GREEN}✅ Started in background with PID: $PID${NC}"
    echo -e "${GREEN}📝 Log file: $LOG_FILE${NC}"
    echo -e "${YELLOW}💡 Monitor with: tail -f $LOG_FILE${NC}"
    echo -e "${YELLOW}🛑 Stop with: kill $PID${NC}"
    
    # PID保存
    echo "$PID" > "$COORDINATION_DIR/.${MODE}_pid"
    
else
    # フォアグラウンド実行
    echo -e "${GREEN}🔄 Starting in foreground mode...${NC}"
    echo ""
    
    python3 "$SCRIPT_FILE"
fi

echo ""
echo -e "${GREEN}🏁 Emergency auto-repair system stopped${NC}"
echo -e "${YELLOW}📊 Check logs in: $LOG_DIR${NC}"
echo -e "${YELLOW}📋 Check state files in: $COORDINATION_DIR${NC}"