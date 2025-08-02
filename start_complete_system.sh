#!/bin/bash
# MCP Playwright 無限ループエラー検知・修復システム 完全起動スクリプト

set -e

echo "🚀 MCP Playwright 無限ループエラー検知・修復システム"
echo "=================================================="
echo "対象URL:"
echo "  - フロントエンド: http://192.168.3.135:3000"
echo "  - バックエンドAPI: http://192.168.3.135:8000"
echo "  - API ドキュメント: http://192.168.3.135:8000/docs"
echo "  - 管理者ダッシュボード: http://192.168.3.135:3000/admin"
echo ""

# 統合テスト実行
echo "🧪 システム統合テスト実行中..."
python3 test_infinite_loop_system.py
test_result=$?

if [ $test_result -eq 0 ]; then
    echo "✅ 統合テスト完了 - システム利用可能"
else
    echo "⚠️ 統合テスト警告 - 一部機能に制限あり"
fi

echo ""
echo "📊 システム選択メニュー"
echo "1) フロントエンド + バックエンド統合起動"
echo "2) フロントエンドのみ起動"
echo "3) バックエンドのみ起動"
echo "4) 統合オーケストレーター起動"
echo "5) システム状態確認"
echo "6) 終了"

read -p "選択してください (1-6): " choice

case $choice in
    1)
        echo "🔄 フロントエンド + バックエンド統合起動"
        echo ""
        echo "ターミナル1: バックエンド起動"
        echo "cd backend && python -m uvicorn app.main:app --host 0.0.0.0 --port 8000"
        echo ""
        echo "ターミナル2: フロントエンド起動"
        echo "cd frontend && npm start"
        echo ""
        echo "ターミナル3: 統合オーケストレーター起動"
        echo "./start_infinite_monitoring.sh"
        echo ""
        echo "準備ができたら統合オーケストレーターを起動します..."
        read -p "Enter を押してください..."
        ./start_infinite_monitoring.sh
        ;;
    2)
        echo "🎨 フロントエンドのみ起動"
        if [ -d "frontend" ]; then
            cd frontend
            echo "npm start を実行します..."
            npm start
        else
            echo "❌ frontendディレクトリが見つかりません"
        fi
        ;;
    3)
        echo "⚙️ バックエンドのみ起動"
        if [ -d "backend" ]; then
            cd backend
            echo "バックエンドAPIサーバーを起動します..."
            python -m uvicorn app.main:app --host 0.0.0.0 --port 8000
        else
            echo "❌ backendディレクトリが見つかりません"
        fi
        ;;
    4)
        echo "🔄 統合オーケストレーター起動"
        ./start_infinite_monitoring.sh
        ;;
    5)
        echo "📊 システム状態確認"
        echo ""
        echo "=== システムファイル状態 ==="
        echo "統合オーケストレーター: $([ -f infinite_error_monitoring_orchestrator.py ] && echo '✅' || echo '❌')"
        echo "起動スクリプト: $([ -f start_infinite_monitoring.sh ] && echo '✅' || echo '❌')"
        echo "テストスクリプト: $([ -f test_infinite_loop_system.py ] && echo '✅' || echo '❌')"
        echo ""
        echo "=== 最新メトリクス ==="
        if [ -f "backend/api_error_metrics.json" ]; then
            echo "API エラーメトリクス:"
            cat backend/api_error_metrics.json | jq '.' 2>/dev/null || cat backend/api_error_metrics.json
        fi
        echo ""
        if [ -f "coordination/realtime_repair_state.json" ]; then
            echo "リアルタイム修復状態:"
            cat coordination/realtime_repair_state.json | jq '.' 2>/dev/null || head -5 coordination/realtime_repair_state.json
        fi
        echo ""
        echo "=== URL接続テスト ==="
        echo -n "フロントエンド (http://192.168.3.135:3000): "
        curl -s -o /dev/null -w "%{http_code}" http://192.168.3.135:3000 --connect-timeout 3 || echo "接続失敗"
        echo ""
        echo -n "バックエンドAPI (http://192.168.3.135:8000): "
        curl -s -o /dev/null -w "%{http_code}" http://192.168.3.135:8000 --connect-timeout 3 || echo "接続失敗"
        echo ""
        ;;
    6)
        echo "👋 システム終了"
        exit 0
        ;;
    *)
        echo "❌ 無効な選択です"
        exit 1
        ;;
esac