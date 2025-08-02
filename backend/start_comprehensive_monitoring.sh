#!/bin/bash

# 包括的API監視システム起動スクリプト

echo "🚀 包括的API監視システムを開始します..."

# 現在のディレクトリ設定
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$SCRIPT_DIR"

# 依存関係のインストール確認
echo "📦 依存関係を確認しています..."
if ! python3 -c "import psutil, aiofiles, aiohttp" 2>/dev/null; then
    echo "依存関係をインストールしています..."
    pip install -r requirements.txt
fi

# ログディレクトリ作成
mkdir -p logs

# 監視システム開始
echo "🔍 監視システムを開始しています..."

# 引数のチェック
if [ "$1" = "--once" ]; then
    echo "ワンタイムスキャンモードで実行します"
    python3 comprehensive_monitoring.py --once
elif [ "$1" = "--help" ] || [ "$1" = "-h" ]; then
    echo "使用方法:"
    echo "  $0                    # 継続監視モード（60秒間隔）"
    echo "  $0 --once            # ワンタイムスキャンモード"
    echo "  $0 --interval 30     # 継続監視モード（30秒間隔）"
    echo "  $0 --daemon          # デーモンモード"
    exit 0
elif [ "$1" = "--daemon" ]; then
    echo "デーモンモードで実行します"
    nohup python3 comprehensive_monitoring.py > logs/comprehensive_monitoring.log 2>&1 &
    echo $! > comprehensive_monitoring.pid
    echo "監視システムをバックグラウンドで開始しました (PID: $(cat comprehensive_monitoring.pid))"
    echo "ログファイル: logs/comprehensive_monitoring.log"
    echo "停止するには: ./stop_comprehensive_monitoring.sh"
elif [ "$1" = "--interval" ] && [ -n "$2" ]; then
    echo "継続監視モード（${2}秒間隔）で実行します"
    python3 comprehensive_monitoring.py --interval "$2"
else
    echo "継続監視モード（60秒間隔）で実行します"
    echo "停止するには Ctrl+C を押してください"
    python3 comprehensive_monitoring.py
fi

echo "✅ 監視システムが完了しました"