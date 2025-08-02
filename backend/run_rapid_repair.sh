#!/bin/bash
"""
Rapid Repair System 実行スクリプト
5秒間隔でエラーを完全除去するまで継続実行
"""

set -e

# カラー出力設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# プロジェクトディレクトリ
PROJECT_ROOT="/media/kensan/LinuxHDD/ITSM-ITmanagementSystem"
BACKEND_DIR="$PROJECT_ROOT/backend"

echo -e "${BLUE}========================================${NC}"
echo -e "${BLUE}🔧 ITSM Rapid Repair System${NC}"
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}⚡ 5秒間隔でエラー完全除去${NC}"
echo -e "${GREEN}🛡️  ITSM準拠セキュリティ${NC}"
echo -e "${GREEN}📊 完全監査対応${NC}"
echo -e "${BLUE}========================================${NC}"

# 環境確認
echo -e "${YELLOW}📋 環境確認中...${NC}"
cd "$BACKEND_DIR"

# Python仮想環境確認
if [ ! -d "venv" ]; then
    echo -e "${RED}❌ Python仮想環境が見つかりません${NC}"
    echo -e "${YELLOW}🔧 仮想環境を作成中...${NC}"
    python3 -m venv venv
    source venv/bin/activate
    pip install -r requirements.txt
else
    echo -e "${GREEN}✅ Python仮想環境確認完了${NC}"
    source venv/bin/activate
fi

# ログディレクトリ作成
mkdir -p logs
echo -e "${GREEN}✅ ログディレクトリ準備完了${NC}"

# coordinationディレクトリ確認
if [ ! -d "$PROJECT_ROOT/coordination" ]; then
    echo -e "${YELLOW}🔧 coordinationディレクトリを作成中...${NC}"
    mkdir -p "$PROJECT_ROOT/coordination"
fi

# 必要ファイル初期化
echo -e "${YELLOW}📁 エラーファイル初期化中...${NC}"

# errors.json初期化
cat > "$PROJECT_ROOT/coordination/errors.json" << 'EOF'
{
  "backend_errors": [],
  "api_errors": [],
  "database_errors": [],
  "validation_errors": [],
  "cors_errors": [],
  "authentication_errors": [],
  "last_check": "$(date -u +%Y-%m-%dT%H:%M:%S).000000",
  "error_count": 0
}
EOF

# infinite_loop_state.json初期化
cat > "$PROJECT_ROOT/coordination/infinite_loop_state.json" << 'EOF'
{
  "loop_count": 0,
  "total_errors_fixed": 0,
  "last_scan": "$(date -u +%Y-%m-%dT%H:%M:%S).000000",
  "repair_history": []
}
EOF

# realtime_repair_state.json初期化
cat > "$PROJECT_ROOT/coordination/realtime_repair_state.json" << 'EOF'
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S).000000",
  "config": {
    "check_interval": 5,
    "max_repair_cycles": 1000,
    "error_threshold": 0,
    "consecutive_clean_required": 3,
    "repair_timeout": 300,
    "success_notification": true,
    "failure_notification": true
  },
  "state": {
    "start_time": "$(date -u +%Y-%m-%dT%H:%M:%S).000000",
    "is_active": false,
    "repairs_completed": 0,
    "last_repair_timestamp": null,
    "success_rate": 0,
    "status": "initializing",
    "next_check": "$(date -u -d '+5 seconds' +%Y-%m-%dT%H:%M:%S).000000"
  }
}
EOF

# api_error_metrics.json初期化
cat > "api_error_metrics.json" << 'EOF'
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S).000000",
  "total_errors": 0,
  "error_categories": {},
  "error_severities": {},
  "fix_success_rate": 0,
  "health_status": "initializing"
}
EOF

echo -e "${GREEN}✅ エラーファイル初期化完了${NC}"

# 実行モード選択
echo ""
echo -e "${BLUE}🚀 実行モード選択:${NC}"
echo -e "${YELLOW}1) 単発修復 (協調エラーのみ)${NC}"
echo -e "${YELLOW}2) 高速修復 (5秒間隔ループ)${NC}"
echo -e "${YELLOW}3) 包括修復 (完全エラー除去)${NC}"
echo -e "${YELLOW}4) API監視モード${NC}"
echo ""
read -p "選択してください (1-4): " mode

case $mode in
    1)
        echo -e "${GREEN}📋 単発修復モード開始${NC}"
        python -c "
import asyncio
import sys
sys.path.insert(0, '.')
from app.services.coordination_repair import coordination_repair_service

async def main():
    result = await coordination_repair_service.comprehensive_repair_cycle()
    print('修復結果:', result)

asyncio.run(main())
"
        ;;
    2)
        echo -e "${GREEN}⚡ 高速修復モード開始 (5秒間隔)${NC}"
        echo -e "${YELLOW}Ctrl+C で停止${NC}"
        python -c "
import asyncio
import sys
sys.path.insert(0, '.')
from app.services.rapid_repair_engine import rapid_repair_engine

async def main():
    try:
        await rapid_repair_engine.start_rapid_repair_loop()
    except KeyboardInterrupt:
        print('\n🛑 修復システム停止')
        rapid_repair_engine.stop_repair_loop()

asyncio.run(main())
"
        ;;
    3)
        echo -e "${GREEN}🎯 包括修復モード開始 (完全エラー除去)${NC}"
        echo -e "${YELLOW}Ctrl+C で停止${NC}"
        python rapid_repair_main.py
        ;;
    4)
        echo -e "${GREEN}📊 API監視モード開始${NC}"
        echo -e "${YELLOW}API サーバーとセットで実行${NC}"
        python -c "
import asyncio
import sys
sys.path.insert(0, '.')
from app.services.api_error_monitor import api_monitor

async def main():
    try:
        await api_monitor.start_monitoring(interval=5)
    except KeyboardInterrupt:
        print('\n🛑 監視システム停止')
        api_monitor.stop_monitoring()

asyncio.run(main())
"
        ;;
    *)
        echo -e "${RED}❌ 無効な選択です${NC}"
        exit 1
        ;;
esac

echo ""
echo -e "${BLUE}========================================${NC}"
echo -e "${GREEN}🏁 Rapid Repair System 完了${NC}"
echo -e "${BLUE}========================================${NC}"