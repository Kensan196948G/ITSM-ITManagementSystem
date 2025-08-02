#!/bin/bash

# 🎯 ITSMシステム パフォーマンスダッシュボード自動起動スクリプト

set -e

# 色付きの出力設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# 設定
UPDATE_INTERVAL=${UPDATE_INTERVAL:-300}  # 5分間隔でダッシュボード更新
MAX_ITERATIONS=${MAX_ITERATIONS:-0}      # 0=無制限
OPEN_BROWSER=${OPEN_BROWSER:-true}       # ブラウザ自動起動

print_header() {
    echo -e "${CYAN}=============================================${NC}"
    echo -e "${CYAN}   🎯 ITSMパフォーマンスダッシュボード${NC}"
    echo -e "${CYAN}=============================================${NC}"
    echo -e "${BLUE}開始時刻: $(date)${NC}"
    echo -e "${BLUE}更新間隔: ${UPDATE_INTERVAL}秒${NC}"
    echo -e "${BLUE}最大反復回数: ${MAX_ITERATIONS} (0=無制限)${NC}"
    echo -e "${CYAN}=============================================${NC}"
}

log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} ${timestamp} - $message"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} ${timestamp} - $message"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} ${timestamp} - $message"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} ${timestamp} - $message"
            ;;
        *)
            echo -e "${PURPLE}[DEBUG]${NC} ${timestamp} - $message"
            ;;
    esac
}

generate_dashboard() {
    log_message "INFO" "📊 ダッシュボード生成中..."
    
    if python3 lightweight-dashboard.py > /dev/null 2>&1; then
        log_message "SUCCESS" "✅ ダッシュボード生成完了"
        
        # 最新のHTMLファイルを取得
        latest_html=$(ls -t dashboard-reports/performance_dashboard_*.html 2>/dev/null | head -1)
        if [ -n "$latest_html" ]; then
            echo "$latest_html"
            return 0
        else
            log_message "ERROR" "❌ HTMLファイルが見つかりません"
            return 1
        fi
    else
        log_message "ERROR" "❌ ダッシュボード生成に失敗しました"
        return 1
    fi
}

open_browser() {
    local html_file=$1
    
    if [ "$OPEN_BROWSER" = "true" ]; then
        log_message "INFO" "🌐 ブラウザでダッシュボードを開いています..."
        
        # 利用可能なブラウザを検索
        if command -v google-chrome &> /dev/null; then
            google-chrome "file://$(realpath "$html_file")" &
        elif command -v firefox &> /dev/null; then
            firefox "file://$(realpath "$html_file")" &
        elif command -v chromium-browser &> /dev/null; then
            chromium-browser "file://$(realpath "$html_file")" &
        elif command -v xdg-open &> /dev/null; then
            xdg-open "file://$(realpath "$html_file")" &
        else
            log_message "WARN" "⚠️ ブラウザが見つかりません。手動で以下のファイルを開いてください:"
            log_message "INFO" "   file://$(realpath "$html_file")"
        fi
    fi
}

show_dashboard_info() {
    local html_file=$1
    
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 ダッシュボードが利用可能です！${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${BLUE}📊 HTMLダッシュボード:${NC} $(realpath "$html_file")"
    echo -e "${BLUE}📁 レポートディレクトリ:${NC} dashboard-reports/"
    echo -e "${BLUE}🔄 自動更新間隔:${NC} ${UPDATE_INTERVAL}秒"
    echo ""
    echo -e "${YELLOW}💡 ブラウザで以下のURLを開いてください:${NC}"
    echo -e "${GREEN}   file://$(realpath "$html_file")${NC}"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

monitor_system_status() {
    log_message "INFO" "🔍 システム状況監視中..."
    
    # 無限ループ状態確認
    if [ -f "coordination/infinite_loop_state.json" ]; then
        local loop_count=$(jq -r '.loop_count // 0' coordination/infinite_loop_state.json 2>/dev/null || echo "0")
        local total_fixes=$(jq -r '.total_errors_fixed // 0' coordination/infinite_loop_state.json 2>/dev/null || echo "0")
        log_message "INFO" "📈 ループ実行回数: ${loop_count}, 修復済みエラー: ${total_fixes}"
    fi
    
    # URL健全性チェック
    local urls=("http://192.168.3.135:3000" "http://192.168.3.135:8000" "http://192.168.3.135:3000/admin")
    local healthy_count=0
    
    for url in "${urls[@]}"; do
        if curl -f -s --connect-timeout 5 "$url" > /dev/null 2>&1; then
            ((healthy_count++))
        fi
    done
    
    log_message "INFO" "🌐 健全なURL: ${healthy_count}/${#urls[@]}"
}

main() {
    local iteration=0
    
    # ヘッダー表示
    print_header
    
    # 依存関係チェック
    if ! command -v python3 &> /dev/null; then
        log_message "ERROR" "❌ Python3が見つかりません"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_message "WARN" "⚠️ jqが見つかりません。システム監視機能が制限されます"
    fi
    
    # 初回ダッシュボード生成
    log_message "INFO" "🚀 初回ダッシュボード生成を開始します..."
    html_file=$(generate_dashboard)
    
    if [ $? -eq 0 ] && [ -n "$html_file" ]; then
        show_dashboard_info "$html_file"
        open_browser "$html_file"
    else
        log_message "ERROR" "❌ 初回ダッシュボード生成に失敗しました"
        exit 1
    fi
    
    # 自動更新ループ
    while true; do
        ((iteration++))
        
        # 最大反復回数チェック
        if [ "$MAX_ITERATIONS" -gt 0 ] && [ $iteration -gt "$MAX_ITERATIONS" ]; then
            log_message "INFO" "📋 最大反復回数 ($MAX_ITERATIONS) に到達しました"
            break
        fi
        
        log_message "INFO" "⏳ ${UPDATE_INTERVAL}秒後に更新します... (反復 $iteration)"
        sleep "$UPDATE_INTERVAL"
        
        # システム状況監視
        monitor_system_status
        
        # ダッシュボード更新
        log_message "INFO" "🔄 ダッシュボード更新中... (反復 $iteration)"
        new_html_file=$(generate_dashboard)
        
        if [ $? -eq 0 ] && [ -n "$new_html_file" ]; then
            html_file="$new_html_file"
            log_message "SUCCESS" "✅ ダッシュボード更新完了: $html_file"
            
            # 更新情報表示
            echo -e "${BLUE}🔄 更新時刻: $(date)${NC}"
            echo -e "${BLUE}📊 最新ダッシュボード: $html_file${NC}"
        else
            log_message "WARN" "⚠️ ダッシュボード更新に失敗しました"
        fi
    done
    
    log_message "SUCCESS" "🏁 ダッシュボード監視が完了しました"
}

# 使用方法表示
show_usage() {
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  --interval SECONDS    更新間隔を設定 (デフォルト: $UPDATE_INTERVAL)"
    echo "  --max-iterations NUM  最大反復回数を設定 (デフォルト: $MAX_ITERATIONS, 0=無制限)"
    echo "  --no-browser         ブラウザ自動起動を無効化"
    echo "  --help, -h           このヘルプを表示"
    echo ""
    echo "環境変数:"
    echo "  UPDATE_INTERVAL      更新間隔(秒)"
    echo "  MAX_ITERATIONS       最大反復回数"
    echo "  OPEN_BROWSER         ブラウザ自動起動 (true/false)"
    echo ""
    echo "例:"
    echo "  $0                           # デフォルト設定で起動"
    echo "  $0 --interval 60             # 1分間隔で更新"
    echo "  $0 --max-iterations 10       # 10回更新後に終了"
    echo "  $0 --no-browser              # ブラウザ自動起動なし"
}

# シグナルハンドラ
cleanup() {
    log_message "INFO" "🛑 ダッシュボード監視を停止しています..."
    exit 0
}

trap cleanup SIGINT SIGTERM

# コマンドライン引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --interval)
            UPDATE_INTERVAL="$2"
            shift 2
            ;;
        --max-iterations)
            MAX_ITERATIONS="$2"
            shift 2
            ;;
        --no-browser)
            OPEN_BROWSER=false
            shift
            ;;
        --help|-h)
            show_usage
            exit 0
            ;;
        *)
            echo "不明なオプション: $1"
            show_usage
            exit 1
            ;;
    esac
done

# メイン実行
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi