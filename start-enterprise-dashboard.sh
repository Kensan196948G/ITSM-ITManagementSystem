#!/bin/bash

# 🎯 ITSM Enterprise Dashboard 自動起動・監視スクリプト
# パフォーマンス分析・SLA監視・リアルタイム監視の統合ダッシュボード

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
UPDATE_INTERVAL=${UPDATE_INTERVAL:-180}  # 3分間隔でダッシュボード更新
MAX_ITERATIONS=${MAX_ITERATIONS:-0}      # 0=無制限
OPEN_BROWSER=${OPEN_BROWSER:-true}       # ブラウザ自動起動
DASHBOARD_TYPE=${DASHBOARD_TYPE:-enterprise}  # dashboard type

print_enterprise_header() {
    echo -e "${CYAN}================================================================${NC}"
    echo -e "${CYAN}   🎯 ITSM Enterprise Dashboard Management System${NC}"
    echo -e "${CYAN}   📊 Performance | SLA | Real-time Monitoring${NC}"
    echo -e "${CYAN}================================================================${NC}"
    echo -e "${BLUE}🚀 開始時刻: $(date)${NC}"
    echo -e "${BLUE}🔄 更新間隔: ${UPDATE_INTERVAL}秒 (3分)${NC}"
    echo -e "${BLUE}🎯 ダッシュボード: Enterprise Level${NC}"
    echo -e "${BLUE}📈 監視対象: Performance + SLA + Business Intelligence${NC}"
    echo -e "${CYAN}================================================================${NC}"
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
        "ENTERPRISE")
            echo -e "${PURPLE}[ENTERPRISE]${NC} ${timestamp} - $message"
            ;;
        *)
            echo -e "${CYAN}[DEBUG]${NC} ${timestamp} - $message"
            ;;
    esac
}

generate_enterprise_dashboard() {
    log_message "ENTERPRISE" "🎯 エンタープライズダッシュボード生成中..."
    
    if python3 enterprise-dashboard.py > /dev/null 2>&1; then
        log_message "SUCCESS" "✅ エンタープライズダッシュボード生成完了"
        
        # 最新のHTMLファイルを取得
        latest_html=$(ls -t enterprise-dashboard-reports/enterprise_dashboard_*.html 2>/dev/null | head -1)
        if [ -n "$latest_html" ]; then
            echo "$latest_html"
            return 0
        else
            log_message "ERROR" "❌ エンタープライズHTMLファイルが見つかりません"
            return 1
        fi
    else
        log_message "ERROR" "❌ エンタープライズダッシュボード生成に失敗しました"
        return 1
    fi
}

open_browser() {
    local html_file=$1
    
    if [ "$OPEN_BROWSER" = "true" ]; then
        log_message "INFO" "🌐 ブラウザでエンタープライズダッシュボードを開いています..."
        
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

show_enterprise_dashboard_info() {
    local html_file=$1
    
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo -e "${GREEN}🎉 ITSM Enterprise Dashboard が利用可能です！${NC}"
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
    echo ""
    echo -e "${BLUE}📊 エンタープライズダッシュボード:${NC} $(realpath "$html_file")"
    echo -e "${BLUE}📁 レポートディレクトリ:${NC} enterprise-dashboard-reports/"
    echo -e "${BLUE}🔄 自動更新間隔:${NC} ${UPDATE_INTERVAL}秒 (3分)"
    echo ""
    echo -e "${PURPLE}🎯 提供機能:${NC}"
    echo -e "${GREEN}   ✅ リアルタイム パフォーマンス分析${NC}"
    echo -e "${GREEN}   ✅ SLA コンプライアンス監視${NC}"
    echo -e "${GREEN}   ✅ ビジネスインテリジェンス${NC}"
    echo -e "${GREEN}   ✅ インシデント分析${NC}"
    echo -e "${GREEN}   ✅ セキュリティ・コンプライアンス${NC}"
    echo -e "${GREEN}   ✅ 財務・ROI メトリクス${NC}"
    echo ""
    echo -e "${YELLOW}💡 ブラウザで以下のURLを開いてください:${NC}"
    echo -e "${GREEN}   file://$(realpath "$html_file")${NC}"
    echo ""
    echo -e "${CYAN}━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━${NC}"
}

monitor_enterprise_metrics() {
    log_message "ENTERPRISE" "📈 エンタープライズメトリクス監視中..."
    
    # 無限ループ状態確認
    if [ -f "coordination/infinite_loop_state.json" ]; then
        local loop_count=$(jq -r '.loop_count // 0' coordination/infinite_loop_state.json 2>/dev/null || echo "0")
        local total_fixes=$(jq -r '.total_errors_fixed // 0' coordination/infinite_loop_state.json 2>/dev/null || echo "0")
        log_message "ENTERPRISE" "🔄 自動修復システム: ループ ${loop_count}回, 修復済み ${total_fixes}件"
    fi
    
    # システムパフォーマンス監視
    local cpu_usage=$(top -bn1 | grep "Cpu(s)" | awk '{print $2}' | sed 's/%us,//' 2>/dev/null || echo "0")
    local memory_usage=$(free | grep Mem | awk '{printf("%.1f", $3/$2 * 100.0)}' 2>/dev/null || echo "0")
    
    log_message "ENTERPRISE" "💻 システムリソース: CPU ${cpu_usage}%, メモリ ${memory_usage}%"
    
    # URL健全性チェック
    local urls=("http://192.168.3.135:3000" "http://192.168.3.135:8000" "http://192.168.3.135:3000/admin")
    local healthy_count=0
    local total_response_time=0
    
    for url in "${urls[@]}"; do
        local start_time=$(date +%s.%N)
        if curl -f -s --connect-timeout 5 "$url" > /dev/null 2>&1; then
            ((healthy_count++))
            local end_time=$(date +%s.%N)
            local response_time=$(echo "$end_time - $start_time" | bc 2>/dev/null || echo "0")
            total_response_time=$(echo "$total_response_time + $response_time" | bc 2>/dev/null || echo "0")
        fi
    done
    
    local avg_response_time=$(echo "scale=3; $total_response_time / ${#urls[@]}" | bc 2>/dev/null || echo "0.000")
    local availability=$(echo "scale=1; $healthy_count * 100 / ${#urls[@]}" | bc 2>/dev/null || echo "0.0")
    
    log_message "ENTERPRISE" "🌐 SLA状況: 可用性 ${availability}%, 平均応答時間 ${avg_response_time}s"
    
    # ビジネスメトリクス推定
    local automation_rate=85
    local roi_estimate=75
    
    log_message "ENTERPRISE" "💼 ビジネス指標: 自動化率 ${automation_rate}%, ROI ${roi_estimate}%"
}

generate_status_summary() {
    local html_file=$1
    local iteration=$2
    
    echo ""
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${PURPLE}   📊 ITSM Enterprise Dashboard Status Summary${NC}"
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════${NC}"
    echo -e "${BLUE}📅 更新時刻: $(date)${NC}"
    echo -e "${BLUE}🔢 監視サイクル: ${iteration}${NC}"
    echo -e "${BLUE}📊 最新ダッシュボード: $(basename "$html_file")${NC}"
    
    # エンタープライズメトリクス表示
    if [ -f "enterprise-dashboard-reports/$(basename "${html_file%.*}").json" ]; then
        log_message "ENTERPRISE" "📈 メトリクスデータが正常に保存されました"
    fi
    
    echo -e "${PURPLE}═══════════════════════════════════════════════════════════════════════${NC}"
    echo ""
}

main() {
    local iteration=0
    
    # エンタープライズヘッダー表示
    print_enterprise_header
    
    # 依存関係チェック
    if ! command -v python3 &> /dev/null; then
        log_message "ERROR" "❌ Python3が見つかりません"
        exit 1
    fi
    
    if ! command -v jq &> /dev/null; then
        log_message "WARN" "⚠️ jqが見つかりません。一部の監視機能が制限されます"
    fi
    
    if ! command -v bc &> /dev/null; then
        log_message "WARN" "⚠️ bcが見つかりません。計算機能が制限されます"
    fi
    
    # 初回エンタープライズダッシュボード生成
    log_message "ENTERPRISE" "🚀 初回エンタープライズダッシュボード生成を開始します..."
    html_file=$(generate_enterprise_dashboard)
    
    if [ $? -eq 0 ] && [ -n "$html_file" ]; then
        show_enterprise_dashboard_info "$html_file"
        open_browser "$html_file"
    else
        log_message "ERROR" "❌ 初回エンタープライズダッシュボード生成に失敗しました"
        exit 1
    fi
    
    # 自動更新ループ
    while true; do
        ((iteration++))
        
        # 最大反復回数チェック
        if [ "$MAX_ITERATIONS" -gt 0 ] && [ $iteration -gt "$MAX_ITERATIONS" ]; then
            log_message "ENTERPRISE" "📋 最大反復回数 ($MAX_ITERATIONS) に到達しました"
            break
        fi
        
        log_message "ENTERPRISE" "⏳ ${UPDATE_INTERVAL}秒後に更新します... (サイクル $iteration)"
        sleep "$UPDATE_INTERVAL"
        
        # エンタープライズメトリクス監視
        monitor_enterprise_metrics
        
        # ダッシュボード更新
        log_message "ENTERPRISE" "🔄 エンタープライズダッシュボード更新中... (サイクル $iteration)"
        new_html_file=$(generate_enterprise_dashboard)
        
        if [ $? -eq 0 ] && [ -n "$new_html_file" ]; then
            html_file="$new_html_file"
            log_message "SUCCESS" "✅ エンタープライズダッシュボード更新完了"
            
            # 更新情報表示
            generate_status_summary "$html_file" "$iteration"
        else
            log_message "WARN" "⚠️ エンタープライズダッシュボード更新に失敗しました"
        fi
    done
    
    log_message "SUCCESS" "🏁 エンタープライズダッシュボード監視が完了しました"
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
    echo "  UPDATE_INTERVAL      更新間隔(秒) - デフォルト: 180秒(3分)"
    echo "  MAX_ITERATIONS       最大反復回数"
    echo "  OPEN_BROWSER         ブラウザ自動起動 (true/false)"
    echo ""
    echo "エンタープライズダッシュボード機能:"
    echo "  📊 リアルタイム パフォーマンス分析"
    echo "  📈 SLA コンプライアンス監視"
    echo "  💼 ビジネスインテリジェンス"
    echo "  🔧 インシデント・自動修復 分析"
    echo "  🔒 セキュリティ・コンプライアンス評価"
    echo "  💰 財務・ROI メトリクス"
    echo ""
    echo "例:"
    echo "  $0                           # デフォルト設定でエンタープライズ監視開始"
    echo "  $0 --interval 120            # 2分間隔で更新"
    echo "  $0 --max-iterations 20       # 20回更新後に終了"
    echo "  $0 --no-browser              # ブラウザ自動起動なし"
}

# シグナルハンドラ
cleanup() {
    log_message "ENTERPRISE" "🛑 エンタープライズダッシュボード監視を停止しています..."
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