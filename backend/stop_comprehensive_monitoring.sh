#!/bin/bash

# 包括的API監視システム停止スクリプト

echo "🛑 包括的API監視システムを停止します..."

# PIDファイルの確認
PID_FILE="comprehensive_monitoring.pid"

if [ -f "$PID_FILE" ]; then
    PID=$(cat "$PID_FILE")
    
    if ps -p "$PID" > /dev/null 2>&1; then
        echo "監視プロセス (PID: $PID) を停止しています..."
        kill "$PID"
        
        # プロセスが完全に停止するまで待機
        count=0
        while ps -p "$PID" > /dev/null 2>&1 && [ $count -lt 10 ]; do
            sleep 1
            count=$((count + 1))
        done
        
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "プロセスが応答しません。強制終了します..."
            kill -9 "$PID"
        fi
        
        echo "✅ 監視プロセスを停止しました"
    else
        echo "⚠️ 監視プロセス (PID: $PID) は既に停止しています"
    fi
    
    rm -f "$PID_FILE"
else
    echo "⚠️ PIDファイルが見つかりません。監視プロセスは実行されていない可能性があります"
    
    # プロセス名で検索して停止
    PIDS=$(pgrep -f "comprehensive_monitoring.py")
    if [ -n "$PIDS" ]; then
        echo "プロセス名で監視プロセスを発見しました。停止します..."
        kill $PIDS
        echo "✅ 監視プロセスを停止しました"
    fi
fi

echo "🧹 クリーンアップ完了"