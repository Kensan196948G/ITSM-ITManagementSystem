#!/bin/bash

# 強化された無限ループ自動化システム実行スクリプト
# WebUI対応 (http://192.168.3.135:3000)

set -e

# カラー出力設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# ログディレクトリ設定
LOG_DIR="./enhanced-infinite-loop-reports/logs"
mkdir -p "$LOG_DIR"

# PIDファイル
PID_FILE="./enhanced-infinite-loop.pid"

echo -e "${GREEN}🚀 強化された無限ループ自動化システム起動${NC}"
echo -e "${BLUE}📊 対象: WebUI (http://192.168.3.135:3000)${NC}"
echo -e "${BLUE}📊 管理者ダッシュボード: (http://192.168.3.135:3000/admin)${NC}"

# 既存プロセスの確認・停止
if [ -f "$PID_FILE" ]; then
    OLD_PID=$(cat "$PID_FILE")
    if ps -p "$OLD_PID" > /dev/null 2>&1; then
        echo -e "${YELLOW}⚠️ 既存プロセス (PID: $OLD_PID) を停止中...${NC}"
        kill "$OLD_PID"
        sleep 2
    fi
    rm -f "$PID_FILE"
fi

# Node.js依存関係の確認
echo -e "${BLUE}🔍 Node.js依存関係を確認中...${NC}"
if [ ! -d "frontend/node_modules" ]; then
    echo -e "${YELLOW}📦 Node modules をインストール中...${NC}"
    cd frontend
    npm install
    cd ..
fi

# Playwright依存関係の確認
echo -e "${BLUE}🔍 Playwright依存関係を確認中...${NC}"
cd frontend
if ! npm list @playwright/test > /dev/null 2>&1; then
    echo -e "${YELLOW}📦 Playwright をインストール中...${NC}"
    npm install @playwright/test
fi

# Playwrightブラウザの確認
if ! npx playwright --version > /dev/null 2>&1; then
    echo -e "${YELLOW}🌐 Playwrightブラウザをインストール中...${NC}"
    npx playwright install chromium
fi
cd ..

# TypeScript コンパイル
echo -e "${BLUE}🔧 TypeScript コンパイル中...${NC}"
cd frontend
npx tsc enhanced-infinite-loop-automation.ts --outDir ../compiled --target es2020 --lib es2020,dom --moduleResolution node --allowSyntheticDefaultImports
cd ..

# WebUIサーバーの確認
echo -e "${BLUE}🔍 WebUIサーバー状態確認...${NC}"
if ! curl -s "http://192.168.3.135:3000" > /dev/null; then
    echo -e "${YELLOW}⚠️ WebUIサーバーが応答しません。サーバーを起動してください。${NC}"
    echo -e "${BLUE}💡 バックエンド起動: cd backend && python3 -m uvicorn app.main:app --host 0.0.0.0 --port 8000${NC}"
    echo -e "${BLUE}💡 フロントエンド起動: cd frontend && npm run dev${NC}"
    # サーバー起動を継続（自動修復で対応）
fi

# システム権限確認
echo -e "${BLUE}🔐 システム権限確認...${NC}"
if ! groups | grep -q sudo; then
    echo -e "${YELLOW}⚠️ sudo権限が必要な場合があります${NC}"
fi

# ログローテーション
if [ -f "$LOG_DIR/infinite-loop.log" ]; then
    BACKUP_LOG="$LOG_DIR/infinite-loop-$(date +%Y%m%d_%H%M%S).log.backup"
    mv "$LOG_DIR/infinite-loop.log" "$BACKUP_LOG"
    echo -e "${BLUE}📝 ログファイルをバックアップ: $BACKUP_LOG${NC}"
fi

# システム起動
echo -e "${GREEN}🚀 強化された無限ループ自動化システム開始...${NC}"

# バックグラウンド実行
nohup node compiled/enhanced-infinite-loop-automation.js > "$LOG_DIR/infinite-loop.log" 2>&1 &
SYSTEM_PID=$!

# PID保存
echo $SYSTEM_PID > "$PID_FILE"

echo -e "${GREEN}✅ システム開始完了${NC}"
echo -e "${BLUE}📊 PID: $SYSTEM_PID${NC}"
echo -e "${BLUE}📝 ログ: $LOG_DIR/infinite-loop.log${NC}"
echo -e "${BLUE}📄 レポート: ./enhanced-infinite-loop-reports/${NC}"

# 監視状態の表示
echo -e "${YELLOW}📊 監視状態表示（30秒間）...${NC}"
for i in {1..30}; do
    echo -n "."
    sleep 1
done
echo ""

# ログの最初の部分を表示
if [ -f "$LOG_DIR/infinite-loop.log" ]; then
    echo -e "${BLUE}📋 最新ログ（最初の20行）:${NC}"
    head -20 "$LOG_DIR/infinite-loop.log"
fi

echo -e "${GREEN}🎯 システムが正常に実行中です${NC}"
echo -e "${BLUE}💡 ログ監視: tail -f $LOG_DIR/infinite-loop.log${NC}"
echo -e "${BLUE}💡 システム停止: kill $(cat $PID_FILE)${NC}"
echo -e "${BLUE}💡 状態確認: cat infinite-loop-state.json${NC}"

# オプション: リアルタイム監視モード
if [ "$1" = "--monitor" ]; then
    echo -e "${YELLOW}👁️ リアルタイム監視モード開始...${NC}"
    echo -e "${BLUE}💡 Ctrl+C で監視を停止${NC}"
    tail -f "$LOG_DIR/infinite-loop.log"
fi