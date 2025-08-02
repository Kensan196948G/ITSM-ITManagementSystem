#!/bin/bash

# ITSMシステム無限ループ自動化実行スクリプト
# WebUIとバックエンドAPIの統合エラー検知・修復システム

set -e

# ベースディレクトリ
BASE_DIR="/media/kensan/LinuxHDD/ITSM-ITmanagementSystem"
SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

# ログファイル
LOG_FILE="${BASE_DIR}/infinite-loop-automation.log"
PID_FILE="${BASE_DIR}/infinite-loop-automation.pid"

# 色付きログ出力
log_info() {
    echo -e "\033[32m[INFO]\033[0m $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_warn() {
    echo -e "\033[33m[WARN]\033[0m $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

log_error() {
    echo -e "\033[31m[ERROR]\033[0m $(date '+%Y-%m-%d %H:%M:%S') - $1" | tee -a "$LOG_FILE"
}

# ヘルプ表示
show_help() {
    cat << EOF
ITSM無限ループ自動化システム

使用方法:
    $0 [オプション]

オプション:
    start       無限ループ監視を開始
    stop        無限ループ監視を停止
    restart     無限ループ監視を再起動
    status      システム状態を表示
    report      包括的レポートを生成
    health      サービス健全性チェック
    emergency   緊急修復モードを実行
    help        このヘルプを表示

例:
    $0 start              # 無限ループ監視開始
    $0 status             # システム状態確認
    $0 report             # 包括的レポート生成
    $0 emergency          # 緊急修復実行

EOF
}

# Python環境確認
check_python_env() {
    log_info "Python環境を確認しています..."
    
    if ! command -v python3 &> /dev/null; then
        log_error "Python3が見つかりません"
        exit 1
    fi
    
    # 必要なパッケージ確認
    local required_packages=(
        "aiohttp"
        "psutil"
    )
    
    for package in "${required_packages[@]}"; do
        if ! python3 -c "import $package" &> /dev/null; then
            log_warn "パッケージ '$package' が見つかりません。インストールしています..."
            pip3 install "$package" || {
                log_error "パッケージ '$package' のインストールに失敗しました"
                exit 1
            }
        fi
    done
    
    log_info "Python環境の確認が完了しました"
}

# プロセス確認
check_process() {
    if [ -f "$PID_FILE" ]; then
        local pid=$(cat "$PID_FILE")
        if ps -p "$pid" > /dev/null 2>&1; then
            return 0  # プロセス実行中
        else
            rm -f "$PID_FILE"
            return 1  # プロセス停止
        fi
    fi
    return 1  # PIDファイル不存在
}

# サービス健全性チェック
check_service_health() {
    log_info "サービス健全性チェックを実行しています..."
    
    local services=(
        "http://192.168.3.135:3000"
        "http://192.168.3.135:8000"
        "http://192.168.3.135:3000/admin"
        "http://192.168.3.135:8000/docs"
    )
    
    local healthy_count=0
    local total_count=${#services[@]}
    
    for service in "${services[@]}"; do
        if curl -s --max-time 10 "$service" > /dev/null; then
            log_info "✅ $service - 正常"
            ((healthy_count++))
        else
            log_warn "❌ $service - 異常"
        fi
    done
    
    log_info "健全性チェック結果: $healthy_count/$total_count サービスが正常"
    
    if [ "$healthy_count" -eq 0 ]; then
        log_error "すべてのサービスが停止しています。サービスを開始してください。"
        return 1
    fi
    
    return 0
}

# 無限ループ監視開始
start_monitoring() {
    log_info "無限ループ監視を開始しています..."
    
    if check_process; then
        log_warn "監視プロセスは既に実行中です (PID: $(cat "$PID_FILE"))"
        return 1
    fi
    
    # Python環境確認
    check_python_env
    
    # サービス健全性チェック
    if ! check_service_health; then
        log_error "サービス健全性チェックに失敗しました"
        return 1
    fi
    
    # バックグラウンドで実行
    cd "$BASE_DIR"
    nohup python3 master-infinite-loop-automation.py > "$LOG_FILE" 2>&1 &
    local pid=$!
    echo "$pid" > "$PID_FILE"
    
    log_info "無限ループ監視を開始しました (PID: $pid)"
    log_info "ログファイル: $LOG_FILE"
    
    # しばらく待ってプロセス確認
    sleep 3
    if check_process; then
        log_info "✅ 無限ループ監視が正常に開始されました"
        
        # ステータス表示
        sleep 2
        show_status
        
        return 0
    else
        log_error "❌ 無限ループ監視の開始に失敗しました"
        return 1
    fi
}

# 無限ループ監視停止
stop_monitoring() {
    log_info "無限ループ監視を停止しています..."
    
    if ! check_process; then
        log_warn "監視プロセスは実行されていません"
        return 1
    fi
    
    local pid=$(cat "$PID_FILE")
    
    # プロセス終了
    kill "$pid" 2>/dev/null || {
        log_warn "プロセス終了シグナル送信に失敗しました。強制終了を試行します..."
        kill -9 "$pid" 2>/dev/null || true
    }
    
    # 終了確認
    local timeout=10
    while [ $timeout -gt 0 ] && ps -p "$pid" > /dev/null 2>&1; do
        sleep 1
        ((timeout--))
    done
    
    rm -f "$PID_FILE"
    
    if ps -p "$pid" > /dev/null 2>&1; then
        log_error "❌ プロセス停止に失敗しました (PID: $pid)"
        return 1
    else
        log_info "✅ 無限ループ監視を停止しました"
        return 0
    fi
}

# システム状態表示
show_status() {
    log_info "システム状態を確認しています..."
    
    echo "==============================================="
    echo "ITSM無限ループ自動化システム状態"
    echo "==============================================="
    
    # プロセス状態
    if check_process; then
        local pid=$(cat "$PID_FILE")
        echo "🟢 監視プロセス: 実行中 (PID: $pid)"
        
        # プロセス詳細
        local memory_usage=$(ps -p "$pid" -o rss= 2>/dev/null | awk '{print $1/1024 " MB"}')
        local cpu_usage=$(ps -p "$pid" -o %cpu= 2>/dev/null | awk '{print $1 "%"}')
        echo "   メモリ使用量: $memory_usage"
        echo "   CPU使用率: $cpu_usage"
    else
        echo "🔴 監視プロセス: 停止中"
    fi
    
    # サービス状態
    echo ""
    echo "サービス状態:"
    check_service_health > /dev/null 2>&1
    
    # Python環境状態
    echo ""
    if python3 -c "import sys; print(f'Python環境: {sys.version}')" 2>/dev/null; then
        echo "🟢 Python環境: 正常"
    else
        echo "🔴 Python環境: 異常"
    fi
    
    # ログファイル状態
    echo ""
    if [ -f "$LOG_FILE" ]; then
        local log_size=$(du -h "$LOG_FILE" | cut -f1)
        local log_lines=$(wc -l < "$LOG_FILE")
        echo "📄 ログファイル: $LOG_FILE ($log_size, $log_lines 行)"
        echo "   最新ログ:"
        tail -3 "$LOG_FILE" | sed 's/^/   /'
    else
        echo "📄 ログファイル: なし"
    fi
    
    echo "==============================================="
    
    # 詳細状態取得
    if check_process; then
        log_info "詳細状態を取得しています..."
        cd "$BASE_DIR"
        python3 master-infinite-loop-automation.py status 2>/dev/null | head -20
    fi
}

# 包括的レポート生成
generate_report() {
    log_info "包括的レポートを生成しています..."
    
    cd "$BASE_DIR"
    python3 master-infinite-loop-automation.py report
    
    log_info "レポート生成が完了しました"
}

# 緊急修復実行
emergency_repair() {
    log_info "緊急修復モードを実行しています..."
    
    # 既存監視停止
    if check_process; then
        log_info "既存監視プロセスを停止しています..."
        stop_monitoring
        sleep 2
    fi
    
    # サービス再起動
    log_info "サービス再起動を試行しています..."
    
    # フロントエンド緊急修復
    if [ -d "${BASE_DIR}/frontend" ]; then
        log_info "フロントエンド緊急修復を実行..."
        cd "${BASE_DIR}/frontend"
        if [ -f "run-comprehensive-webui-monitoring.sh" ]; then
            chmod +x run-comprehensive-webui-monitoring.sh
            ./run-comprehensive-webui-monitoring.sh --emergency-repair &
        fi
    fi
    
    # バックエンド緊急修復
    log_info "バックエンド緊急修復を実行..."
    curl -X POST "http://192.168.3.135:8000/error-monitor/emergency-repair" \
         -H "Content-Type: application/json" \
         --max-time 30 2>/dev/null || true
    
    sleep 5
    
    # サービス健全性再確認
    if check_service_health; then
        log_info "✅ 緊急修復が成功しました"
        
        # 監視再開
        log_info "監視を再開しています..."
        start_monitoring
    else
        log_error "❌ 緊急修復に失敗しました"
        return 1
    fi
}

# メイン処理
main() {
    # ログディレクトリ作成
    mkdir -p "$(dirname "$LOG_FILE")"
    
    local command="${1:-help}"
    
    case "$command" in
        "start")
            start_monitoring
            ;;
        "stop")
            stop_monitoring
            ;;
        "restart")
            stop_monitoring
            sleep 2
            start_monitoring
            ;;
        "status")
            show_status
            ;;
        "report")
            generate_report
            ;;
        "health")
            check_service_health
            ;;
        "emergency")
            emergency_repair
            ;;
        "help"|"--help"|"-h")
            show_help
            ;;
        *)
            log_error "不明なコマンド: $command"
            show_help
            exit 1
            ;;
    esac
}

# スクリプト実行
main "$@"