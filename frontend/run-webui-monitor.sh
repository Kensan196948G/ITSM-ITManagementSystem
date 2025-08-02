#!/bin/bash

# WebUIエラー監視システム実行スクリプト
# http://192.168.3.135:3000 と http://192.168.3.135:3000/admin の監視・修復を自動化

echo "🚀 WebUIエラー監視・修復システムを開始します..."

# プロジェクトディレクトリに移動
cd "$(dirname "$0")"

# Node.js とnpmが利用可能か確認
if ! command -v node &> /dev/null; then
    echo "❌ Node.jsが見つかりません。Node.jsをインストールしてください。"
    exit 1
fi

if ! command -v npm &> /dev/null; then
    echo "❌ npmが見つかりません。npmをインストールしてください。"
    exit 1
fi

# Playwrightブラウザのインストール状況を確認
echo "🔍 Playwrightブラウザの準備を確認中..."
if ! npx playwright --version &> /dev/null; then
    echo "⚠️ Playwrightが見つかりません。インストール中..."
    npm install @playwright/test
fi

# Playwrightブラウザをインストール
echo "📦 Playwrightブラウザをインストール中..."
npx playwright install chromium

# TypeScriptファイルをJavaScriptにコンパイル
echo "🔨 TypeScriptファイルをコンパイル中..."
if ! npx tsc webui-error-monitor.ts --target es2020 --module commonjs --moduleResolution node --esModuleInterop --allowSyntheticDefaultImports --resolveJsonModule --skipLibCheck; then
    echo "❌ TypeScriptコンパイルに失敗しました"
    exit 1
fi

# 監視システムを実行
echo "🔍 WebUIエラー監視システムを実行中..."

# 引数の処理
MODE="continuous"
INTERVAL=30000

while [[ $# -gt 0 ]]; do
    case $1 in
        --once)
            MODE="once"
            shift
            ;;
        --interval=*)
            INTERVAL="${1#*=}"
            shift
            ;;
        --help)
            echo "使用方法: $0 [オプション]"
            echo ""
            echo "オプション:"
            echo "  --once              一回のみ監視を実行"
            echo "  --interval=MILLIS   継続監視の間隔（ミリ秒、デフォルト: 30000）"
            echo "  --help              このヘルプを表示"
            echo ""
            echo "例:"
            echo "  $0                       # 30秒間隔で継続監視"
            echo "  $0 --once               # 一回のみ実行"
            echo "  $0 --interval=60000     # 60秒間隔で継続監視"
            exit 0
            ;;
        *)
            echo "不明なオプション: $1"
            echo "$0 --help を実行してヘルプを確認してください"
            exit 1
            ;;
    esac
done

# 実行時のメッセージ
if [[ "$MODE" == "once" ]]; then
    echo "📊 一回のみの監視を実行します..."
    node webui-error-monitor.js --once
else
    echo "🔄 継続監視を開始します（間隔: ${INTERVAL}ms）..."
    echo "⏹️  停止するには Ctrl+C を押してください"
    node webui-error-monitor.js --interval=$INTERVAL
fi

# 結果の確認
if [[ $? -eq 0 ]]; then
    echo "✅ WebUIエラー監視が正常に完了しました"
    echo "📊 レポートファイル:"
    echo "   - JSON: webui-error-monitoring-report.json"
    echo "   - HTML: webui-error-monitoring-report.html"
else
    echo "❌ WebUIエラー監視中にエラーが発生しました"
    exit 1
fi