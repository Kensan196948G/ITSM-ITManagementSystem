#!/bin/bash
# 無限エラー監視・修復システム起動スクリプト

set -e

echo "🚀 ITSM 無限エラー監視・修復システム起動開始"
echo "========================================"

# ログディレクトリ作成
mkdir -p logs
mkdir -p coordination

# 依存関係チェック
echo "📦 依存関係チェック中..."
if ! python3 -c "import aiohttp" 2>/dev/null; then
    echo "aiohttp をインストール中..."
    pip install aiohttp
fi

if ! python3 -c "import pydantic" 2>/dev/null; then
    echo "pydantic をインストール中..."
    pip install pydantic
fi

if ! python3 -c "import requests" 2>/dev/null; then
    echo "requests をインストール中..."
    pip install requests
fi

echo "✅ 依存関係OK"

# バックエンドサーバーの起動確認
echo "🔍 バックエンドサーバー状態確認..."
if ! curl -s http://192.168.3.135:8000/health >/dev/null 2>&1; then
    echo "⚠️ バックエンドサーバーが起動していません"
    echo "別ターミナルで以下を実行してください:"
    echo "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
    echo ""
    echo "フロントエンドサーバーも必要です:"
    echo "cd frontend && npm start"
    echo ""
    read -p "サーバーが起動したら Enter を押してください..."
fi

# フロントエンドサーバーの起動確認
echo "🔍 フロントエンドサーバー状態確認..."
if ! curl -s http://192.168.3.135:3000 >/dev/null 2>&1; then
    echo "⚠️ フロントエンドサーバーが起動していません"
    echo "別ターミナルで以下を実行してください:"
    echo "cd frontend && npm start"
    echo ""
    read -p "サーバーが起動したら Enter を押してください..."
fi

echo "✅ 全サーバー起動確認完了"

# バックエンド監視システム起動
echo "🔧 バックエンド監視システム起動中..."
if [ -f "backend/start_error_monitoring_system.py" ]; then
    cd backend
    python start_error_monitoring_system.py &
    BACKEND_MONITOR_PID=$!
    cd ..
    echo "✅ バックエンド監視システム起動 (PID: $BACKEND_MONITOR_PID)"
else
    echo "⚠️ バックエンド監視システムが見つかりません"
fi

# 起動前最終確認
echo ""
echo "🎯 監視対象URL:"
echo "  - WebUI: http://192.168.3.135:3000"
echo "  - Backend API: http://192.168.3.135:8000"
echo "  - API Docs: http://192.168.3.135:8000/docs"
echo "  - Admin Dashboard: http://192.168.3.135:3000/admin"
echo ""

# PIDファイル作成
echo $$ > logs/infinite_monitoring.pid
echo "📝 PIDファイル作成: logs/infinite_monitoring.pid"

# トラップ設定（Ctrl+C対応）
trap 'echo ""; echo "🛑 停止処理中..."; kill $BACKEND_MONITOR_PID 2>/dev/null || true; exit 0' INT TERM

echo "🚀 無限監視システム開始..."
echo "停止するには Ctrl+C を押してください"
echo ""

# メイン監視システム実行
python3 infinite_error_monitoring_orchestrator.py

# 終了処理
echo "🧹 クリーンアップ中..."
kill $BACKEND_MONITOR_PID 2>/dev/null || true
rm -f logs/infinite_monitoring.pid
echo "✅ システム停止完了"