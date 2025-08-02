#!/bin/bash
# 無限Loop監視・修復システム起動スクリプト

echo "🚀 無限Loop監視・修復システム起動中..."

# ディレクトリ移動
cd /media/kensan/LinuxHDD/ITSM-ITmanagementSystem

# Python実行権限設定
chmod +x coordination/infinite_loop_monitor.py

# バックグラウンドで無限監視実行
echo "⚙️ 無限監視プロセス開始..."
python3 coordination/infinite_loop_monitor.py &

# プロセスIDを記録
echo $! > coordination/infinite_loop_monitor.pid

echo "✅ 無限Loop監視・修復システムが正常に起動しました"
echo "📋 プロセスID: $(cat coordination/infinite_loop_monitor.pid)"
echo "📊 ログファイル: coordination/infinite_loop_monitor.log"
echo "🔄 5秒間隔でエラー検知・修復を実行します"
echo ""
echo "停止するには: kill $(cat coordination/infinite_loop_monitor.pid)"