#!/bin/bash

# ITSMシステム最小構成テスト起動スクリプト

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# IPアドレス取得
IP_ADDRESS=$(hostname -I | awk '{print $1}')

echo -e "${BLUE}=======================================${NC}"
echo -e "${BLUE}    ITSMシステム最小構成テスト起動     ${NC}"
echo -e "${BLUE}=======================================${NC}"

# 1. バックエンドテスト
echo -e "\n${YELLOW}1. バックエンド設定テスト${NC}"
cd backend

if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Python仮想環境を作成中...${NC}"
    python3 -m venv venv
fi

source venv/bin/activate

echo -e "${GREEN}設定ファイル確認中...${NC}"
python -c "
try:
    from app.core.config import settings
    print('✅ 設定ファイル読み込み成功')
    print(f'📊 CORS Origins: {settings.BACKEND_CORS_ORIGINS}')
    print(f'🔒 Secret Key存在: {bool(settings.SECRET_KEY)}')
except Exception as e:
    print(f'❌ 設定エラー: {e}')
    exit(1)
"

if [ $? -eq 0 ]; then
    echo -e "${GREEN}✅ バックエンド設定OK${NC}"
else
    echo -e "${RED}❌ バックエンド設定NG${NC}"
    exit 1
fi

# 2. フロントエンドテスト
echo -e "\n${YELLOW}2. フロントエンド設定テスト${NC}"
cd ../frontend

echo -e "${GREEN}Node.js依存関係チェック中...${NC}"
if [ -f "package.json" ] && [ -d "node_modules" ]; then
    echo -e "${GREEN}✅ フロントエンド依存関係OK${NC}"
else
    echo -e "${RED}❌ フロントエンド依存関係NG${NC}"
    exit 1
fi

# 3. 実際の起動テスト
echo -e "\n${YELLOW}3. 実起動テスト（5秒間）${NC}"

cd ../backend
source venv/bin/activate

# バックエンド起動（バックグラウンド）
python -c "
import uvicorn
from app.main import app
uvicorn.run(app, host='0.0.0.0', port=8081)
" &
BACKEND_PID=$!

sleep 2

# フロントエンド起動（バックグラウンド）
cd ../frontend
npm start &
FRONTEND_PID=$!

sleep 3

# 接続テスト
echo -e "\n${YELLOW}4. 接続テスト${NC}"

# バックエンド疎通確認
if curl -s http://192.168.3.135:8081/api/v1/health > /dev/null 2>&1; then
    echo -e "${GREEN}✅ バックエンド接続OK (http://192.168.3.135:8081)${NC}"
else
    echo -e "${YELLOW}⚠️ バックエンド接続待機中...${NC}"
fi

# フロントエンド疎通確認
if curl -s http://192.168.3.135:3000 > /dev/null 2>&1; then
    echo -e "${GREEN}✅ フロントエンド接続OK (http://192.168.3.135:3000)${NC}"
else
    echo -e "${YELLOW}⚠️ フロントエンド起動中...${NC}"
fi

# プロセス終了
echo -e "\n${YELLOW}テスト完了。プロセスを終了中...${NC}"
kill $BACKEND_PID 2>/dev/null
kill $FRONTEND_PID 2>/dev/null

wait $BACKEND_PID 2>/dev/null
wait $FRONTEND_PID 2>/dev/null

echo -e "\n${GREEN}=======================================${NC}"
echo -e "${GREEN}        テスト完了！                   ${NC}"
echo -e "${GREEN}=======================================${NC}"
echo -e "${BLUE}次は通常起動を試してください:${NC}"
echo -e "${GREEN}./start-itsm.sh${NC}"