#!/bin/bash

# MCP Playwright WebUI 包括的監視・修復システム実行スクリプト
# http://192.168.3.135:3000 と http://192.168.3.135:3000/admin の完全自動監視・修復

set -e

echo "🚀 MCP Playwright WebUI 包括的監視・修復システムを開始します..."

# プロジェクトディレクトリに移動
cd "$(dirname "$0")"

# 色付きログ関数（拡張版）
log_info() { echo -e "\033[0;32m[INFO]\033[0m $1"; }
log_warn() { echo -e "\033[0;33m[WARN]\033[0m $1"; }
log_error() { echo -e "\033[0;31m[ERROR]\033[0m $1"; }
log_step() { echo -e "\033[0;36m[STEP]\033[0m $1"; }
log_success() { echo -e "\033[0;32m[SUCCESS]\033[0m $1"; }
log_critical() { echo -e "\033[1;31m[CRITICAL]\033[0m $1"; }

# エラーハンドリング
handle_error() {
    log_error "スクリプト実行中にエラーが発生しました (行: $1)"
    log_error "ログファイルを確認してください: ./logs/"
    exit 1
}

trap 'handle_error $LINENO' ERR

# ログディレクトリの作成
mkdir -p logs

# 環境確認関数
check_environment() {
    log_step "環境確認中..."
    
    # Node.js確認
    if ! command -v node &> /dev/null; then
        log_error "Node.jsが見つかりません。Node.jsをインストールしてください。"
        exit 1
    fi
    log_info "Node.js: $(node --version)"
    
    # npm確認
    if ! command -v npm &> /dev/null; then
        log_error "npmが見つかりません。npmをインストールしてください。"
        exit 1
    fi
    log_info "npm: $(npm --version)"
    
    # TypeScript確認
    if ! command -v npx &> /dev/null; then
        log_error "npxが見つかりません。"
        exit 1
    fi
    
    # package.jsonの確認
    if [ ! -f "package.json" ]; then
        log_error "package.jsonが見つかりません。frontendディレクトリで実行してください。"
        exit 1
    fi
    
    log_info "✅ 環境確認完了"
}

# 依存関係インストール関数
install_dependencies() {
    log_step "依存関係を確認・インストール中..."
    
    # package.jsonの依存関係をチェック
    if [ ! -d "node_modules" ] || [ ! -f "node_modules/.bin/playwright" ]; then
        log_info "依存関係をインストール中..."
        npm install
    fi
    
    # Playwrightブラウザのインストール
    log_info "Playwrightブラウザをインストール中..."
    npx playwright install chromium --with-deps
    
    log_info "✅ 依存関係の準備完了"
}

# TypeScriptコンパイル関数（MCP Playwright対応）
compile_typescript() {
    log_step "MCP Playwright TypeScriptファイルをコンパイル中..."
    
    # 新しいMCP Playwrightファイルを含める
    local compile_files=(
        "mcp-webui-error-monitor.ts"
        "webui-auto-repair.ts"
        "admin-dashboard-monitor.ts"
        "comprehensive-webui-monitor.ts"
        "webui-error-monitor.ts"
        "component-error-fixer.ts"
        "ui-error-detector.ts"
    )
    
    for file in "${compile_files[@]}"; do
        if [ -f "$file" ]; then
            log_info "コンパイル中: $file"
            npx tsc "$file" --target es2020 --module commonjs --moduleResolution node \
                --esModuleInterop --allowSyntheticDefaultImports --resolveJsonModule \
                --skipLibCheck --strict false || {
                log_warn "$file のコンパイルでエラーが発生しましたが続行します"
            }
        else
            log_warn "$file が見つかりません"
        fi
    done
    
    log_success "✅ MCP Playwright TypeScriptコンパイル完了"
}

# WebUIサーバー確認関数
check_webui_server() {
    log_step "WebUIサーバーの稼働状況を確認中..."
    
    local urls=(
        "http://192.168.3.135:3000"
        "http://192.168.3.135:3000/admin"
    )
    
    for url in "${urls[@]}"; do
        log_info "確認中: $url"
        if curl -sSf "$url" > /dev/null 2>&1; then
            log_info "✅ $url は稼働中"
        else
            log_warn "⚠️ $url への接続に失敗しました"
            log_warn "WebUIサーバーが起動していることを確認してください"
        fi
    done
}

# メイン監視実行関数
run_monitoring() {
    local mode="$1"
    local interval="$2"
    
    log_step "WebUIエラー監視・修復システムを実行中..."
    
    # ログファイル設定
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local log_file="logs/comprehensive_monitor_${timestamp}.log"
    
    # 実行コマンドの構築
    local cmd="node comprehensive-webui-monitor.js"
    
    if [ "$mode" == "once" ]; then
        cmd="$cmd --once"
        log_info "一回のみの監視を実行します"
    else
        if [ -n "$interval" ]; then
            cmd="$cmd --interval=$interval"
            log_info "継続監視を開始します (間隔: ${interval}分)"
        else
            log_info "継続監視を開始します (デフォルト間隔: 30分)"
        fi
        log_info "停止するには Ctrl+C を押してください"
    fi
    
    # 監視実行
    log_info "実行コマンド: $cmd"
    echo "$(date): 監視開始" >> "$log_file"
    
    # 実行 (ログファイルにも出力)
    $cmd 2>&1 | tee -a "$log_file"
    
    echo "$(date): 監視終了" >> "$log_file"
    log_info "ログファイル: $log_file"
}

# レポート表示関数
show_results() {
    log_step "実行結果を表示中..."
    
    # 最新のレポートファイルを探す
    if [ -f "latest-comprehensive-webui-report.json" ]; then
        log_info "📊 最新のレポートが生成されました:"
        echo "  JSON: latest-comprehensive-webui-report.json"
        echo "  HTML: latest-comprehensive-webui-report.html"
        
        # JSONレポートの要約を表示
        if command -v jq &> /dev/null; then
            log_info "📈 実行サマリー:"
            jq -r '
                "  ステータス: " + .execution.status + 
                "\n  実行時間: " + (.execution.duration / 1000 | tostring) + "秒" +
                "\n  エラー数: " + (.monitoring.totalErrors | tostring) +
                "\n  警告数: " + (.monitoring.totalWarnings | tostring) +
                "\n  修復数: " + (.componentFixes.totalFixes | tostring)
            ' latest-comprehensive-webui-report.json
        fi
    else
        log_warn "レポートファイルが見つかりませんでした"
    fi
    
    # 個別レポートファイルの確認
    local report_files=(
        "webui-error-monitoring-report.html"
        "component-fix-report.html"
        "ui-error-detection-report.html"
    )
    
    log_info "📋 生成されたレポートファイル:"
    for file in "${report_files[@]}"; do
        if [ -f "$file" ]; then
            echo "  ✅ $file"
        else
            echo "  ❌ $file (生成されませんでした)"
        fi
    done
}

# クリーンアップ関数
cleanup() {
    log_info "🧹 クリーンアップ中..."
    
    # 一時ファイルの削除
    find . -name "*.js" -type f -newer package.json -exec rm -f {} \; 2>/dev/null || true
    
    # 古いログファイルの削除 (7日以上古い)
    find logs/ -name "*.log" -type f -mtime +7 -delete 2>/dev/null || true
    
    log_info "✅ クリーンアップ完了"
}

# メイン処理
main() {
    local mode="continuous"
    local interval=""
    local skip_deps=false
    local cleanup_only=false
    
    # コマンドライン引数の解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            --once)
                mode="once"
                shift
                ;;
            --interval=*)
                interval="${1#*=}"
                shift
                ;;
            --skip-deps)
                skip_deps=true
                shift
                ;;
            --cleanup)
                cleanup_only=true
                shift
                ;;
            --help)
                echo "使用方法: $0 [オプション]"
                echo ""
                echo "オプション:"
                echo "  --once              一回のみ監視を実行"
                echo "  --interval=MINUTES  継続監視の間隔（分、デフォルト: 30）"
                echo "  --skip-deps         依存関係のインストールをスキップ"
                echo "  --cleanup           クリーンアップのみ実行"
                echo "  --help              このヘルプを表示"
                echo ""
                echo "例:"
                echo "  $0                           # 30分間隔で継続監視"
                echo "  $0 --once                    # 一回のみ実行"
                echo "  $0 --interval=60             # 60分間隔で継続監視"
                echo "  $0 --once --skip-deps        # 依存関係チェックをスキップして一回実行"
                echo ""
                echo "監視対象URL:"
                echo "  - http://192.168.3.135:3000"
                echo "  - http://192.168.3.135:3000/admin"
                echo ""
                echo "生成されるレポート:"
                echo "  - 包括的監視レポート (HTML/JSON)"
                echo "  - WebUIエラー監視レポート"
                echo "  - コンポーネント修復レポート"
                echo "  - UI/UXエラー検出レポート"
                exit 0
                ;;
            *)
                log_error "不明なオプション: $1"
                echo "$0 --help を実行してヘルプを確認してください"
                exit 1
                ;;
        esac
    done
    
    # クリーンアップのみの場合
    if [ "$cleanup_only" = true ]; then
        cleanup
        exit 0
    fi
    
    # メイン処理の実行
    echo "🎯 包括的WebUIエラー監視・修復システム v1.0"
    echo "📅 実行開始: $(date)"
    echo "🌐 監視対象: http://192.168.3.135:3000, http://192.168.3.135:3000/admin"
    echo ""
    
    # 1. 環境確認
    check_environment
    
    # 2. 依存関係インストール
    if [ "$skip_deps" = false ]; then
        install_dependencies
    else
        log_info "依存関係のインストールをスキップしました"
    fi
    
    # 3. TypeScriptコンパイル
    compile_typescript
    
    # 4. WebUIサーバー確認
    check_webui_server
    
    # 5. 監視実行
    run_monitoring "$mode" "$interval"
    
    # 6. 結果表示
    show_results
    
    echo ""
    echo "✅ 包括的WebUIエラー監視・修復システムが完了しました"
    echo "📅 実行終了: $(date)"
    
    # 継続監視でない場合のみクリーンアップ
    if [ "$mode" == "once" ]; then
        cleanup
    fi
}

# Ctrl+Cでの中断処理
trap 'echo -e "\n⏹️ 監視を中断しています..."; cleanup; exit 0' INT

# メイン関数実行
main "$@"