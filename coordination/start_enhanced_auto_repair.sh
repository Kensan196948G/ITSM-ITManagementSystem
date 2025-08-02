#!/bin/bash

# Enhanced GitHub Actions Auto-Repair System Startup Script
# 拡張GitHub Actions自動修復システム起動スクリプト

set -euo pipefail

# スクリプトのディレクトリを取得
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
LOG_DIR="$SCRIPT_DIR/logs"
PID_FILE="$SCRIPT_DIR/enhanced_auto_repair.pid"

# ログディレクトリ作成
mkdir -p "$LOG_DIR"

# カラー出力の定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ログ関数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

log_debug() {
    echo -e "${CYAN}[DEBUG]${NC} $(date '+%Y-%m-%d %H:%M:%S') - $1"
}

# バナー表示
show_banner() {
    echo -e "${PURPLE}"
    echo "╔══════════════════════════════════════════════════════════════════╗"
    echo "║          Enhanced GitHub Actions Auto-Repair System             ║"
    echo "║                                                                  ║"
    echo "║  🚀 Claude Flow MCP Integration                                  ║"
    echo "║  🔒 Security Isolation & Approval System                        ║"
    echo "║  ⚡ Real-time Monitoring & Auto-Recovery                        ║"
    echo "║  📊 Quality Gates & Metrics Collection                          ║"
    echo "║                                                                  ║"
    echo "╚══════════════════════════════════════════════════════════════════╝"
    echo -e "${NC}"
}

# 依存関係チェック
check_dependencies() {
    log_info "依存関係をチェックしています..."
    
    # Python環境チェック
    if ! command -v python3 &> /dev/null; then
        log_error "Python3が見つかりません"
        exit 1
    fi
    
    # GitHub CLI チェック
    if ! command -v gh &> /dev/null; then
        log_error "GitHub CLI (gh) が見つかりません"
        log_info "インストール方法: https://cli.github.com/"
        exit 1
    fi
    
    # GitHub CLI認証チェック
    if ! gh auth status &> /dev/null; then
        log_error "GitHub CLI認証が必要です"
        log_info "認証方法: gh auth login"
        exit 1
    fi
    
    # Git設定チェック
    if ! git config user.name &> /dev/null || ! git config user.email &> /dev/null; then
        log_error "Git設定が不完全です"
        log_info "設定方法:"
        log_info "  git config --global user.name 'Your Name'"
        log_info "  git config --global user.email 'your.email@example.com'"
        exit 1
    fi
    
    # Node.js & npm チェック（Claude Flow用）
    if ! command -v npm &> /dev/null; then
        log_warn "npm が見つかりません。Claude Flow統合が制限される可能性があります"
    fi
    
    # Python依存パッケージチェック
    local required_packages=(
        "asyncio"
        "aiohttp" 
        "pyyaml"
        "requests"
        "pytest"
        "flake8"
    )
    
    for package in "${required_packages[@]}"; do
        if ! python3 -c "import $package" &> /dev/null; then
            log_warn "Python package '$package' が見つかりません"
        fi
    done
    
    log_info "✅ 依存関係チェック完了"
}

# 設定ファイル検証
validate_config() {
    log_info "設定ファイルを検証しています..."
    
    local config_file="$SCRIPT_DIR/enhanced_repair_config.json"
    local security_policy="$SCRIPT_DIR/security_policy.yaml"
    
    # 設定ファイル存在チェック
    if [[ ! -f "$config_file" ]]; then
        log_error "設定ファイルが見つかりません: $config_file"
        exit 1
    fi
    
    if [[ ! -f "$security_policy" ]]; then
        log_error "セキュリティポリシーファイルが見つかりません: $security_policy"
        exit 1
    fi
    
    # JSON形式チェック
    if ! python3 -m json.tool "$config_file" > /dev/null 2>&1; then
        log_error "設定ファイルの形式が無効です: $config_file"
        exit 1
    fi
    
    # YAML形式チェック
    if ! python3 -c "import yaml; yaml.safe_load(open('$security_policy'))" > /dev/null 2>&1; then
        log_error "セキュリティポリシーファイルの形式が無効です: $security_policy"
        exit 1
    fi
    
    log_info "✅ 設定ファイル検証完了"
}

# プロセス状態チェック
check_process_status() {
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            log_warn "Enhanced Auto-Repair System は既に動作中です (PID: $pid)"
            echo -e "${YELLOW}停止しますか? [y/N]:${NC} "
            read -r response
            if [[ "$response" =~ ^[Yy]$ ]]; then
                stop_system
            else
                log_info "既存のプロセスを継続します"
                exit 0
            fi
        else
            log_warn "古いPIDファイルを削除します"
            rm -f "$PID_FILE"
        fi
    fi
}

# システム停止
stop_system() {
    log_info "Enhanced Auto-Repair System を停止しています..."
    
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            kill -TERM "$pid"
            
            # グレースフルシャットダウンを待機
            local count=0
            while ps -p "$pid" > /dev/null 2>&1 && [[ $count -lt 30 ]]; do
                sleep 1
                ((count++))
            done
            
            # 強制終了
            if ps -p "$pid" > /dev/null 2>&1; then
                log_warn "強制終了を実行します"
                kill -KILL "$pid"
            fi
            
            log_info "✅ システムを停止しました"
        fi
        rm -f "$PID_FILE"
    else
        log_warn "PIDファイルが見つかりません"
    fi
}

# バックアップディレクトリ作成
setup_backup_dirs() {
    log_info "バックアップディレクトリを設定しています..."
    
    local backup_dirs=(
        "$SCRIPT_DIR/backups"
        "$SCRIPT_DIR/backups/repair_history"
        "$SCRIPT_DIR/backups/config_snapshots"
        "$LOG_DIR"
        "$LOG_DIR/archived"
    )
    
    for dir in "${backup_dirs[@]}"; do
        mkdir -p "$dir"
    done
    
    log_info "✅ バックアップディレクトリ設定完了"
}

# ログローテーション
rotate_logs() {
    log_debug "ログローテーションを実行しています..."
    
    local log_files=(
        "$LOG_DIR/enhanced_github_actions_repair.log"
        "$LOG_DIR/audit.log"
        "$LOG_DIR/security.log"
    )
    
    for log_file in "${log_files[@]}"; do
        if [[ -f "$log_file" ]] && [[ $(stat -f%z "$log_file" 2>/dev/null || stat -c%s "$log_file" 2>/dev/null) -gt 10485760 ]]; then
            # 10MB以上の場合ローテーション
            local timestamp=$(date +%Y%m%d_%H%M%S)
            mv "$log_file" "${log_file}.${timestamp}"
            gzip "${log_file}.${timestamp}"
            log_debug "ログをローテーションしました: $(basename "$log_file")"
        fi
    done
}

# システム起動前チェック
pre_startup_checks() {
    log_info "起動前チェックを実行しています..."
    
    # ディスク容量チェック
    local available_space=$(df "$SCRIPT_DIR" | awk 'NR==2 {print $4}')
    local required_space=1048576  # 1GB in KB
    
    if [[ $available_space -lt $required_space ]]; then
        log_error "ディスク容量が不足しています (必要: 1GB, 利用可能: $((available_space/1024))MB)"
        exit 1
    fi
    
    # プロジェクトルートチェック
    if [[ ! -d "$PROJECT_ROOT/.git" ]]; then
        log_error "Gitリポジトリではありません: $PROJECT_ROOT"
        exit 1
    fi
    
    # 書き込み権限チェック
    if [[ ! -w "$SCRIPT_DIR" ]]; then
        log_error "書き込み権限がありません: $SCRIPT_DIR"
        exit 1
    fi
    
    log_info "✅ 起動前チェック完了"
}

# メインシステム起動
start_enhanced_system() {
    log_info "Enhanced GitHub Actions Auto-Repair System を起動しています..."
    
    cd "$PROJECT_ROOT"
    
    # Python環境を設定
    export PYTHONPATH="$PROJECT_ROOT:$PYTHONPATH"
    export ITSM_PROJECT_ROOT="$PROJECT_ROOT"
    export ITSM_CONFIG_DIR="$SCRIPT_DIR"
    
    # システム起動
    nohup python3 "$SCRIPT_DIR/enhanced_github_actions_auto_repair.py" \
        > "$LOG_DIR/enhanced_auto_repair.log" 2>&1 &
    
    local pid=$!
    echo $pid > "$PID_FILE"
    
    # 起動確認
    sleep 3
    if ps -p "$pid" > /dev/null 2>&1; then
        log_info "✅ Enhanced Auto-Repair System が起動しました (PID: $pid)"
        log_info "📋 ログファイル: $LOG_DIR/enhanced_auto_repair.log"
        log_info "📋 状態ファイル: $SCRIPT_DIR/enhanced_repair_state.json"
        log_info "📋 設定ファイル: $SCRIPT_DIR/enhanced_repair_config.json"
        
        # 状態監視を開始
        monitor_system_startup
        
    else
        log_error "システムの起動に失敗しました"
        rm -f "$PID_FILE"
        exit 1
    fi
}

# システム起動監視
monitor_system_startup() {
    log_info "システム起動を監視しています..."
    
    local count=0
    local max_wait=30
    local state_file="$SCRIPT_DIR/enhanced_repair_state.json"
    
    while [[ $count -lt $max_wait ]]; do
        if [[ -f "$state_file" ]]; then
            local monitoring_status=$(python3 -c "
import json
try:
    with open('$state_file', 'r') as f:
        data = json.load(f)
    print(data.get('monitoring', False))
except:
    print('False')
" 2>/dev/null)
            
            if [[ "$monitoring_status" == "True" ]]; then
                log_info "✅ システムが正常に起動し、監視を開始しました"
                show_status
                return 0
            fi
        fi
        
        sleep 1
        ((count++))
    done
    
    log_warn "⚠️ システム起動の確認に時間がかかっています"
    log_info "ログを確認してください: $LOG_DIR/enhanced_auto_repair.log"
}

# システム状態表示
show_status() {
    echo -e "\n${BLUE}📊 システム状態:${NC}"
    
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            echo -e "  状態: ${GREEN}実行中${NC} (PID: $pid)"
            
            # メモリ使用量表示
            local memory_usage=$(ps -p "$pid" -o rss= 2>/dev/null || echo "0")
            echo -e "  メモリ使用量: $((memory_usage/1024))MB"
            
            # CPU使用率表示
            local cpu_usage=$(ps -p "$pid" -o %cpu= 2>/dev/null || echo "0.0")
            echo -e "  CPU使用率: ${cpu_usage}%"
            
        else
            echo -e "  状態: ${RED}停止中${NC}"
        fi
    else
        echo -e "  状態: ${RED}停止中${NC}"
    fi
    
    # 設定情報表示
    if [[ -f "$SCRIPT_DIR/enhanced_repair_config.json" ]]; then
        echo -e "\n${BLUE}⚙️ 設定情報:${NC}"
        local poll_interval=$(python3 -c "
import json
try:
    with open('$SCRIPT_DIR/enhanced_repair_config.json', 'r') as f:
        data = json.load(f)
    print(data.get('monitoring', {}).get('poll_interval', 30))
except:
    print('30')
" 2>/dev/null)
        echo -e "  監視間隔: ${poll_interval}秒"
        
        local max_repairs=$(python3 -c "
import json
try:
    with open('$SCRIPT_DIR/enhanced_repair_config.json', 'r') as f:
        data = json.load(f)
    print(data.get('repair', {}).get('max_repair_cycles', 15))
except:
    print('15')
" 2>/dev/null)
        echo -e "  最大修復サイクル: ${max_repairs}回"
    fi
    
    # 最新ログの末尾表示
    if [[ -f "$LOG_DIR/enhanced_auto_repair.log" ]]; then
        echo -e "\n${BLUE}📝 最新ログ (末尾5行):${NC}"
        tail -5 "$LOG_DIR/enhanced_auto_repair.log" | sed 's/^/  /'
    fi
}

# リアルタイム監視表示
show_live_monitoring() {
    log_info "リアルタイム監視を開始します (Ctrl+C で終了)"
    
    while true; do
        clear
        show_banner
        show_status
        
        # 状態ファイルから詳細情報を表示
        if [[ -f "$SCRIPT_DIR/enhanced_repair_state.json" ]]; then
            echo -e "\n${BLUE}🔍 詳細状態:${NC}"
            python3 -c "
import json
from datetime import datetime
try:
    with open('$SCRIPT_DIR/enhanced_repair_state.json', 'r') as f:
        data = json.load(f)
    
    print(f'  修復サイクル数: {data.get(\"repair_cycles\", 0)}')
    print(f'  連続クリーンサイクル: {data.get(\"consecutive_clean_cycles\", 0)}')
    print(f'  アクティブ修復: {len(data.get(\"active_repairs\", {}))}')
    
    metrics = data.get('metrics', {})
    if metrics:
        total = metrics.get('total_repairs', 0)
        successful = metrics.get('successful_repairs', 0)
        success_rate = (successful / total * 100) if total > 0 else 0
        print(f'  成功率: {success_rate:.1f}% ({successful}/{total})')
    
    last_check = data.get('last_check')
    if last_check:
        print(f'  最終チェック: {last_check}')
        
except Exception as e:
    print(f'  状態ファイル読み取りエラー: {e}')
"
        fi
        
        echo -e "\n${CYAN}更新: $(date '+%Y-%m-%d %H:%M:%S')${NC}"
        sleep 5
    done
}

# ヘルプ表示
show_help() {
    echo -e "${BLUE}Enhanced GitHub Actions Auto-Repair System${NC}"
    echo ""
    echo "使用方法:"
    echo "  $0 [COMMAND]"
    echo ""
    echo "コマンド:"
    echo "  start       システムを起動"
    echo "  stop        システムを停止"
    echo "  restart     システムを再起動"
    echo "  status      システム状態を表示"
    echo "  monitor     リアルタイム監視を表示"
    echo "  logs        ログを表示"
    echo "  check       依存関係をチェック"
    echo "  help        このヘルプを表示"
    echo ""
    echo "例:"
    echo "  $0 start              # システム起動"
    echo "  $0 status             # 状態確認"
    echo "  $0 monitor            # リアルタイム監視"
    echo "  $0 logs --follow      # ログ追跡"
}

# ログ表示
show_logs() {
    local log_file="$LOG_DIR/enhanced_auto_repair.log"
    
    if [[ ! -f "$log_file" ]]; then
        log_error "ログファイルが見つかりません: $log_file"
        exit 1
    fi
    
    if [[ "$1" == "--follow" ]] || [[ "$1" == "-f" ]]; then
        log_info "ログを追跡しています (Ctrl+C で終了)"
        tail -f "$log_file"
    else
        log_info "最新ログを表示しています"
        tail -50 "$log_file"
    fi
}

# メイン処理
main() {
    case "${1:-start}" in
        "start")
            show_banner
            check_dependencies
            validate_config
            check_process_status
            pre_startup_checks
            setup_backup_dirs
            rotate_logs
            start_enhanced_system
            ;;
        "stop")
            stop_system
            ;;
        "restart")
            stop_system
            sleep 2
            main start
            ;;
        "status")
            show_status
            ;;
        "monitor")
            show_live_monitoring
            ;;
        "logs")
            show_logs "${2:-}"
            ;;
        "check")
            check_dependencies
            validate_config
            log_info "✅ 全てのチェックが完了しました"
            ;;
        "help"|"-h"|"--help")
            show_help
            ;;
        *)
            log_error "不明なコマンド: $1"
            show_help
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"