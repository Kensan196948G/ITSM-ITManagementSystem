#!/bin/bash

# ITSMシステム一括起動スクリプト
# バックエンド: http://192.168.3.135:8081
# フロントエンド: http://192.168.3.135:3000

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

# IPアドレス取得
IP_ADDRESS=$(hostname -I | awk '{print $1}')

echo -e "${BLUE}===========================================${NC}"
echo -e "${BLUE}       ITSMシステム一括起動スクリプト        ${NC}"
echo -e "${BLUE}===========================================${NC}"
echo -e "${GREEN}システムIPアドレス: ${IP_ADDRESS}${NC}"
echo -e "${GREEN}バックエンドURL: http://${IP_ADDRESS}:8081${NC}"
echo -e "${GREEN}フロントエンドURL: http://${IP_ADDRESS}:3000${NC}"
echo ""

# プロセス終了関数
cleanup() {
    echo -e "\n${YELLOW}システムを終了しています...${NC}"
    if [ ! -z "$BACKEND_PID" ]; then
        kill $BACKEND_PID 2>/dev/null
        echo -e "${GREEN}バックエンドプロセス ($BACKEND_PID) を終了しました${NC}"
    fi
    if [ ! -z "$FRONTEND_PID" ]; then
        kill $FRONTEND_PID 2>/dev/null
        echo -e "${GREEN}フロントエンドプロセス ($FRONTEND_PID) を終了しました${NC}"
    fi
    exit 0
}

# Ctrl+C でクリーンアップ
trap cleanup SIGINT

# 必要な依存関係チェック
echo -e "${YELLOW}依存関係をチェックしています...${NC}"

# Python チェック
if ! command -v python3 &> /dev/null; then
    echo -e "${RED}エラー: Python3 がインストールされていません${NC}"
    exit 1
fi

# Node.js チェック
if ! command -v node &> /dev/null; then
    echo -e "${RED}エラー: Node.js がインストールされていません${NC}"
    exit 1
fi

# npm チェック
if ! command -v npm &> /dev/null; then
    echo -e "${RED}エラー: npm がインストールされていません${NC}"
    exit 1
fi

echo -e "${GREEN}依存関係チェック完了${NC}"

# バックエンド起動
echo -e "\n${YELLOW}バックエンドを起動しています...${NC}"
cd backend

# 仮想環境の確認と作成
if [ ! -d "venv" ]; then
    echo -e "${YELLOW}Python仮想環境を作成しています...${NC}"
    python3 -m venv venv
fi

# 仮想環境をアクティベート
source venv/bin/activate

# 依存関係インストール
if [ -f "requirements.txt" ]; then
    echo -e "${YELLOW}Python依存関係をインストールしています...${NC}"
    pip install -r requirements.txt > /dev/null 2>&1
fi

# バックエンドサーバー起動（IPアドレス指定、ポート8081）
echo -e "${GREEN}バックエンドサーバーを起動中... (http://${IP_ADDRESS}:8081)${NC}"
source venv/bin/activate && python -c "
import uvicorn
from app.main import app

if __name__ == '__main__':
    uvicorn.run(app, host='0.0.0.0', port=8081)
" &
BACKEND_PID=$!

# バックエンド起動待機
sleep 3

# フロントエンド起動
echo -e "\n${YELLOW}フロントエンドを起動しています...${NC}"
cd ../frontend

# Node.js依存関係インストール
if [ ! -d "node_modules" ]; then
    echo -e "${YELLOW}Node.js依存関係をインストールしています...${NC}"
    npm install > /dev/null 2>&1
fi

# 念のため、package-lock.jsonが存在しない場合は再インストール
if [ ! -f "package-lock.json" ]; then
    echo -e "${YELLOW}依存関係を再インストールしています...${NC}"
    rm -rf node_modules
    npm install > /dev/null 2>&1
fi

# 環境変数設定
export REACT_APP_API_URL="http://${IP_ADDRESS}:8081/api/v1"
export HOST="${IP_ADDRESS}"
export PORT=3000

# フロントエンドサーバー起動
echo -e "${GREEN}フロントエンドサーバーを起動中... (http://${IP_ADDRESS}:3000)${NC}"
npm start &
FRONTEND_PID=$!

# 起動完了メッセージ
sleep 5
echo -e "\n${GREEN}===========================================${NC}"
echo -e "${GREEN}      ITSMシステム起動完了！               ${NC}"
echo -e "${GREEN}===========================================${NC}"
echo -e "${BLUE}📊 管理画面URL:${NC}"
echo -e "  ${GREEN}🖥️  WebUI: http://${IP_ADDRESS}:3000${NC}"
echo -e "  ${GREEN}🔧 API Docs: http://${IP_ADDRESS}:8081/api/v1/docs${NC}"
echo -e "  ${GREEN}📚 ReDoc: http://${IP_ADDRESS}:8081/api/v1/redoc${NC}"
echo -e "\n${BLUE}🔑 初期ログイン情報:${NC}"
echo -e "  ${YELLOW}ユーザー名: admin${NC}"
echo -e "  ${YELLOW}パスワード: secret${NC}"
echo -e "\n${RED}終了するには Ctrl+C を押してください${NC}"

# プロセス監視
while true; do
    # バックエンドプロセスチェック
    if ! kill -0 $BACKEND_PID 2>/dev/null; then
        echo -e "\n${RED}バックエンドプロセスが停止しました${NC}"
        cleanup
    fi
    
    # フロントエンドプロセスチェック
    if ! kill -0 $FRONTEND_PID 2>/dev/null; then
        echo -e "\n${RED}フロントエンドプロセスが停止しました${NC}"
        cleanup
    fi
    
    sleep 5
done