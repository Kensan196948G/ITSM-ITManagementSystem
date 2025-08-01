#!/bin/bash
# ブラウザコンソールエラー自動検知システム 実行スクリプト

set -e  # エラー時に終了

echo "======================================"
echo "ブラウザコンソールエラー自動検知システム"
echo "======================================"

# プロジェクトルートディレクトリ
ROOT_DIR="/media/kensan/LinuxHDD/ITSM-ITmanagementSystem"
COORDINATION_DIR="${ROOT_DIR}/coordination"
LOGS_DIR="${ROOT_DIR}/logs"

# ディレクトリ作成
echo "ディレクトリを作成中..."
mkdir -p "$COORDINATION_DIR"
mkdir -p "$LOGS_DIR"
mkdir -p "${ROOT_DIR}/tests/reports"

# 作業ディレクトリを移動
cd "$ROOT_DIR"

echo "現在のディレクトリ: $(pwd)"

# Python仮想環境を有効化
if [ -d "backend/venv" ]; then
    echo "Python仮想環境を有効化..."
    source backend/venv/bin/activate
fi

# 必要なパッケージのインストール確認
echo "テスト用依存関係をインストール..."
pip install -r requirements-test.txt > /dev/null 2>&1 || echo "依存関係インストールで警告がありました"

# Playwrightブラウザーのインストール確認
echo "Playwrightブラウザーをインストール..."
playwright install chromium > /dev/null 2>&1 || echo "Playwrightインストールで警告がありました"

# 引数をチェック
MODE="${1:-once}"  # デフォルトは一度だけ実行

case "$MODE" in
    "once")
        echo "コンソールエラー監視を一度実行..."
        python tests/utils/console_monitor_scheduler.py --once
        ;;
    "continuous")
        echo "継続的なコンソールエラー監視を開始..."
        echo "Ctrl+C で停止できます"
        python tests/utils/console_monitor_scheduler.py
        ;;
    "report")
        echo "監視レポートを生成..."
        python tests/utils/console_monitor_scheduler.py --report
        ;;
    "test")
        echo "コンソールエラーテストを直接実行..."
        python -m pytest tests/e2e/test_console_error_monitor.py -v --tb=short
        ;;
    *)
        echo "使用方法:"
        echo "  $0 once       - 一度だけ監視を実行"
        echo "  $0 continuous - 継続的な監視を実行"
        echo "  $0 report     - 監視レポートを生成"
        echo "  $0 test       - テストを直接実行"
        exit 1
        ;;
esac

echo ""
echo "======================================"
echo "結果ファイル:"
echo "  エラーデータ: ${COORDINATION_DIR}/errors.json"
echo "  通知: ${COORDINATION_DIR}/error_notifications.json"
echo "  緊急通知: ${COORDINATION_DIR}/urgent_errors.json"
echo "  ログ: ${LOGS_DIR}/console_monitor.log"
echo "  レポート: ${ROOT_DIR}/tests/reports/"
echo "======================================"

# 結果ファイルの存在確認と簡易表示
if [ -f "${COORDINATION_DIR}/errors.json" ]; then
    echo ""
    echo "最新のエラー情報:"
    python -c "
import json
import os
from datetime import datetime

try:
    with open('${COORDINATION_DIR}/errors.json', 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    summary = data.get('summary', {})
    errors = data.get('errors', [])
    
    print(f'総エラー数: {summary.get("totalErrors", 0)}')
    print(f'重大エラー: {summary.get("severityCounts", {}).get("high", 0)}件')
    print(f'中程度エラー: {summary.get("severityCounts", {}).get("medium", 0)}件')
    print(f'軽微エラー: {summary.get("severityCounts", {}).get("low", 0)}件')
    print(f'フロントエンドエラー: {summary.get("sourceCounts", {}).get("frontend", 0)}件')
    print(f'バックエンドエラー: {summary.get("sourceCounts", {}).get("backend", 0)}件')
    
    if errors:
        print(f'最新のエラー時刻: {errors[-1].get("timestamp", "N/A")}')
        print(f'最新のエラー: {errors[-1].get("message", "N/A")[:100]}...')
    
except Exception as e:
    print(f'エラーファイルを読み取れませんでした: {e}')
"
fi

echo ""
echo "コンソールエラー監視が完了しました。"
