#!/bin/bash

# 無限ループ自動エラー監視・修復システム
# WebUI + バックエンドAPI の包括的な監視と自動修復

set -e

# 色付きの出力設定
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ログディレクトリの設定
LOG_DIR="./monitoring-logs"
REPORT_DIR="./validation-reports"
mkdir -p "$LOG_DIR" "$REPORT_DIR"

# ログファイルの設定
MAIN_LOG="$LOG_DIR/infinite-monitoring-$(date +%Y%m%d-%H%M%S).log"
ERROR_LOG="$LOG_DIR/errors-$(date +%Y%m%d-%H%M%S).log"

# PIDファイルの設定
PID_FILE="./infinite-monitoring.pid"

# 設定可能パラメータ
MAX_CYCLES=${MAX_CYCLES:-50}  # 最大監視サイクル数（0=無制限）
INTERVAL_SECONDS=${INTERVAL_SECONDS:-30}  # 監視間隔（秒）
HEALTH_CHECK_TIMEOUT=${HEALTH_CHECK_TIMEOUT:-10}  # ヘルスチェックタイムアウト
MAX_REPAIR_ATTEMPTS=${MAX_REPAIR_ATTEMPTS:-3}  # 最大修復試行回数

# エラーカウンタ
TOTAL_ERRORS=0
REPAIRED_ERRORS=0
FAILED_REPAIRS=0

print_header() {
    echo -e "${CYAN}===============================================${NC}"
    echo -e "${CYAN}   🔄 無限ループ自動エラー監視システム${NC}"
    echo -e "${CYAN}===============================================${NC}"
    echo -e "${BLUE}開始時刻: $(date)${NC}"
    echo -e "${BLUE}最大サイクル数: ${MAX_CYCLES} (0=無制限)${NC}"
    echo -e "${BLUE}監視間隔: ${INTERVAL_SECONDS}秒${NC}"
    echo -e "${BLUE}ログファイル: ${MAIN_LOG}${NC}"
    echo -e "${CYAN}===============================================${NC}"
}

log_message() {
    local level=$1
    local message=$2
    local timestamp=$(date '+%Y-%m-%d %H:%M:%S')
    
    case $level in
        "INFO")
            echo -e "${GREEN}[INFO]${NC} ${timestamp} - $message" | tee -a "$MAIN_LOG"
            ;;
        "WARN")
            echo -e "${YELLOW}[WARN]${NC} ${timestamp} - $message" | tee -a "$MAIN_LOG" "$ERROR_LOG"
            ;;
        "ERROR")
            echo -e "${RED}[ERROR]${NC} ${timestamp} - $message" | tee -a "$MAIN_LOG" "$ERROR_LOG"
            ;;
        "SUCCESS")
            echo -e "${GREEN}[SUCCESS]${NC} ${timestamp} - $message" | tee -a "$MAIN_LOG"
            ;;
        *)
            echo -e "${PURPLE}[DEBUG]${NC} ${timestamp} - $message" | tee -a "$MAIN_LOG"
            ;;
    esac
}

# 依存関係チェック
check_dependencies() {
    log_message "INFO" "依存関係チェック中..."
    
    # Node.js/TypeScript
    if ! command -v ts-node &> /dev/null; then
        log_message "WARN" "ts-node が見つかりません。インストール中..."
        npm install -g ts-node typescript 2>/dev/null || {
            log_message "ERROR" "ts-node のインストールに失敗しました"
            return 1
        }
    fi
    
    # Python仮想環境
    if [ ! -d "backend/venv" ]; then
        log_message "WARN" "Python仮想環境が見つかりません。作成中..."
        cd backend && python3 -m venv venv && source venv/bin/activate && pip install -r requirements.txt
        cd ..
    fi
    
    # MCPPlaywright監視スクリプト
    if [ ! -f "frontend/run-comprehensive-webui-monitor.sh" ]; then
        log_message "ERROR" "WebUI監視スクリプトが見つかりません"
        return 1
    fi
    
    # API監視スクリプト
    if [ ! -f "backend/comprehensive_monitoring.py" ]; then
        log_message "ERROR" "API監視スクリプトが見つかりません"
        return 1
    fi
    
    log_message "SUCCESS" "依存関係チェック完了"
    return 0
}

# URLヘルスチェック
check_url_health() {
    local url=$1
    local timeout=${2:-$HEALTH_CHECK_TIMEOUT}
    
    if curl -f -s --connect-timeout "$timeout" "$url" > /dev/null 2>&1; then
        return 0
    else
        return 1
    fi
}

# システム全体のヘルスチェック
system_health_check() {
    log_message "INFO" "システムヘルスチェック実行中..."
    
    local urls=(
        "http://192.168.3.135:3000"          # WebUI
        "http://192.168.3.135:3000/admin"    # Admin Dashboard
        "http://192.168.3.135:8000"          # Backend API
        "http://192.168.3.135:8000/docs"     # API Docs
    )
    
    local failed_urls=()
    
    for url in "${urls[@]}"; do
        if check_url_health "$url"; then
            log_message "SUCCESS" "✅ $url - ヘルシー"
        else
            log_message "WARN" "❌ $url - 応答なし"
            failed_urls+=("$url")
        fi
    done
    
    if [ ${#failed_urls[@]} -eq 0 ]; then
        log_message "SUCCESS" "🟢 全システムがヘルシーです"
        return 0
    else
        log_message "WARN" "🟡 ${#failed_urls[@]}個のURLで問題が検出されました"
        return 1
    fi
}

# WebUI監視・修復
run_webui_monitoring() {
    log_message "INFO" "📱 WebUI監視・修復開始..."
    
    local repair_attempt=0
    local max_attempts=$MAX_REPAIR_ATTEMPTS
    
    while [ $repair_attempt -lt $max_attempts ]; do
        # WebUI監視実行
        if timeout 60 bash "./frontend/run-comprehensive-webui-monitor.sh" --once 2>&1 | tee -a "$MAIN_LOG"; then
            log_message "SUCCESS" "WebUI監視完了 (試行 $((repair_attempt + 1))/$max_attempts)"
            
            # エラーが検出されたかチェック
            if grep -q "error\|Error\|ERROR" "$MAIN_LOG" 2>/dev/null; then
                log_message "WARN" "WebUIエラーが検出されました。修復を実行します..."
                
                # 自動修復実行
                if timeout 120 bash "./frontend/run-comprehensive-webui-monitor.sh" --repair-only 2>&1 | tee -a "$MAIN_LOG"; then
                    log_message "SUCCESS" "WebUI自動修復完了"
                    ((REPAIRED_ERRORS++))
                else
                    log_message "ERROR" "WebUI自動修復に失敗しました"
                    ((FAILED_REPAIRS++))
                fi
            else
                log_message "SUCCESS" "WebUIにエラーは検出されませんでした"
                break
            fi
        else
            log_message "ERROR" "WebUI監視の実行に失敗しました (試行 $((repair_attempt + 1))/$max_attempts)"
            ((FAILED_REPAIRS++))
        fi
        
        ((repair_attempt++))
        
        if [ $repair_attempt -lt $max_attempts ]; then
            log_message "INFO" "5秒後に再試行します..."
            sleep 5
        fi
    done
}

# API監視・修復
run_api_monitoring() {
    log_message "INFO" "🔌 API監視・修復開始..."
    
    local repair_attempt=0
    local max_attempts=$MAX_REPAIR_ATTEMPTS
    
    while [ $repair_attempt -lt $max_attempts ]; do
        # API監視実行
        if timeout 60 bash -c "cd backend && source venv/bin/activate && python comprehensive_monitoring.py --once" 2>&1 | tee -a "$MAIN_LOG"; then
            log_message "SUCCESS" "API監視完了 (試行 $((repair_attempt + 1))/$max_attempts)"
            
            # エラーが検出されたかチェック
            if grep -q "error\|Error\|ERROR\|CRITICAL\|FAILED" "$MAIN_LOG" 2>/dev/null; then
                log_message "WARN" "APIエラーが検出されました。修復を実行します..."
                
                # 自動修復実行
                if timeout 120 bash -c "cd backend && source venv/bin/activate && python comprehensive_monitoring.py --repair" 2>&1 | tee -a "$MAIN_LOG"; then
                    log_message "SUCCESS" "API自動修復完了"
                    ((REPAIRED_ERRORS++))
                else
                    log_message "ERROR" "API自動修復に失敗しました"
                    ((FAILED_REPAIRS++))
                fi
            else
                log_message "SUCCESS" "APIにエラーは検出されませんでした"
                break
            fi
        else
            log_message "ERROR" "API監視の実行に失敗しました (試行 $((repair_attempt + 1))/$max_attempts)"
            ((FAILED_REPAIRS++))
        fi
        
        ((repair_attempt++))
        
        if [ $repair_attempt -lt $max_attempts ]; then
            log_message "INFO" "5秒後に再試行します..."
            sleep 5
        fi
    done
}

# 統合検証システム実行
run_integrated_validation() {
    log_message "INFO" "🔍 統合検証システム実行中..."
    
    if timeout 90 ts-node integrated-error-validation-system.ts --once 2>&1 | tee -a "$MAIN_LOG"; then
        log_message "SUCCESS" "統合検証完了"
        
        # 検証結果を解析
        local validation_result=$(tail -20 "$MAIN_LOG" | grep -E "総エラー数|残存エラー|検証結果" || echo "結果不明")
        log_message "INFO" "検証結果: $validation_result"
        
        return 0
    else
        log_message "ERROR" "統合検証に失敗しました"
        return 1
    fi
}

# 監視サイクル実行
run_monitoring_cycle() {
    local cycle_number=$1
    
    log_message "INFO" "🔄 監視サイクル $cycle_number 開始"
    log_message "INFO" "⏰ $(date)"
    
    # システムヘルスチェック
    if ! system_health_check; then
        log_message "WARN" "システムヘルスチェックで問題が検出されました"
        ((TOTAL_ERRORS++))
    fi
    
    # WebUI監視・修復
    run_webui_monitoring
    
    # API監視・修復
    run_api_monitoring
    
    # 統合検証
    run_integrated_validation
    
    # サイクル完了
    log_message "SUCCESS" "✅ 監視サイクル $cycle_number 完了"
    
    # 統計情報表示
    log_message "INFO" "📊 累計統計 - 総エラー: $TOTAL_ERRORS, 修復済み: $REPAIRED_ERRORS, 修復失敗: $FAILED_REPAIRS"
}

# 無限ループ監視の開始
start_infinite_monitoring() {
    local cycle=0
    
    while true; do
        ((cycle++))
        
        # 最大サイクル数チェック（0は無制限）
        if [ "$MAX_CYCLES" -gt 0 ] && [ $cycle -gt "$MAX_CYCLES" ]; then
            log_message "INFO" "最大サイクル数 ($MAX_CYCLES) に到達しました。監視を終了します。"
            break
        fi
        
        # 監視サイクル実行
        run_monitoring_cycle $cycle
        
        # 健全性チェック - エラーがない場合は監視を終了
        if [ $TOTAL_ERRORS -eq 0 ] && [ $cycle -gt 1 ]; then
            log_message "SUCCESS" "🎉 システムが完全に健全な状態です。監視を終了します。"
            break
        fi
        
        # 次のサイクルまでの待機
        if [ "$MAX_CYCLES" -eq 0 ] || [ $cycle -lt "$MAX_CYCLES" ]; then
            log_message "INFO" "⏳ ${INTERVAL_SECONDS}秒後に次のサイクルを開始します..."
            sleep "$INTERVAL_SECONDS"
        fi
    done
}

# 最終統計レポート生成
generate_final_report() {
    local end_time=$(date)
    local total_cycles=${1:-0}
    
    log_message "INFO" "📊 最終レポート生成中..."
    
    cat > "$REPORT_DIR/final-monitoring-report-$(date +%Y%m%d-%H%M%S).md" << EOF
# 無限ループ自動エラー監視 最終レポート

## 実行サマリー
- **開始時刻**: $(head -1 "$MAIN_LOG" | grep -o '[0-9]\{4\}-[0-9]\{2\}-[0-9]\{2\} [0-9]\{2\}:[0-9]\{2\}:[0-9]\{2\}' || echo "不明")
- **終了時刻**: $end_time
- **総監視サイクル数**: $total_cycles
- **総検出エラー数**: $TOTAL_ERRORS
- **修復成功数**: $REPAIRED_ERRORS
- **修復失敗数**: $FAILED_REPAIRS

## 監視対象URL
- WebUI: http://192.168.3.135:3000
- Admin Dashboard: http://192.168.3.135:3000/admin
- Backend API: http://192.168.3.135:8000
- API Docs: http://192.168.3.135:8000/docs

## 実行ログファイル
- メインログ: $MAIN_LOG
- エラーログ: $ERROR_LOG

## 成功率
- エラー修復成功率: $(( TOTAL_ERRORS > 0 ? (REPAIRED_ERRORS * 100) / TOTAL_ERRORS : 100 ))%
- システム全体健全性: $([ $TOTAL_ERRORS -eq $REPAIRED_ERRORS ] && echo "健全" || echo "要注意")

---
*レポート生成時刻: $(date)*
EOF

    log_message "SUCCESS" "最終レポートを生成しました: $REPORT_DIR/final-monitoring-report-$(date +%Y%m%d-%H%M%S).md"
}

# シグナルハンドラ
cleanup() {
    log_message "INFO" "🛑 監視システムを停止しています..."
    
    # PIDファイル削除
    [ -f "$PID_FILE" ] && rm -f "$PID_FILE"
    
    # 最終レポート生成
    generate_final_report
    
    log_message "SUCCESS" "🏁 無限ループ監視システムが正常終了しました"
    exit 0
}

# シグナルトラップ設定
trap cleanup SIGINT SIGTERM EXIT

# 使用方法表示
show_usage() {
    echo "使用方法: $0 [オプション]"
    echo ""
    echo "オプション:"
    echo "  --once              一回のみ監視サイクルを実行"
    echo "  --cycles NUM        最大監視サイクル数を設定 (デフォルト: $MAX_CYCLES)"
    echo "  --interval SECONDS  監視間隔を設定 (デフォルト: $INTERVAL_SECONDS)"
    echo "  --timeout SECONDS   ヘルスチェックタイムアウト (デフォルト: $HEALTH_CHECK_TIMEOUT)"
    echo "  --help, -h          このヘルプを表示"
    echo ""
    echo "環境変数:"
    echo "  MAX_CYCLES            最大監視サイクル数 (0=無制限)"
    echo "  INTERVAL_SECONDS      監視間隔(秒)"
    echo "  HEALTH_CHECK_TIMEOUT  ヘルスチェックタイムアウト(秒)"
    echo "  MAX_REPAIR_ATTEMPTS   最大修復試行回数"
    echo ""
    echo "例:"
    echo "  $0                          # 無限ループ監視開始"
    echo "  $0 --once                   # 一回のみ実行"
    echo "  $0 --cycles 10              # 10サイクルで終了"
    echo "  MAX_CYCLES=20 $0            # 環境変数で設定"
}

# メイン実行部分
main() {
    # コマンドライン引数解析
    while [[ $# -gt 0 ]]; do
        case $1 in
            --once)
                MAX_CYCLES=1
                shift
                ;;
            --cycles)
                MAX_CYCLES="$2"
                shift 2
                ;;
            --interval)
                INTERVAL_SECONDS="$2"
                shift 2
                ;;
            --timeout)
                HEALTH_CHECK_TIMEOUT="$2"
                shift 2
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
    
    # ヘッダー表示
    print_header
    
    # PIDファイル作成
    echo $$ > "$PID_FILE"
    
    # 依存関係チェック
    if ! check_dependencies; then
        log_message "ERROR" "依存関係チェックに失敗しました"
        exit 1
    fi
    
    # 無限ループ監視開始
    start_infinite_monitoring
    
    # 最終レポート生成
    generate_final_report
    
    log_message "SUCCESS" "🎉 監視システムが正常完了しました"
}

# スクリプトが直接実行された場合のみmainを実行
if [[ "${BASH_SOURCE[0]}" == "${0}" ]]; then
    main "$@"
fi