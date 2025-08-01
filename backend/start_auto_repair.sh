#!/bin/bash

# 自動修復システム起動スクリプト
# バックグラウンドで継続監視を実行

set -e

# プロジェクトディレクトリに移動
cd "$(dirname "$0")"

PROJECT_ROOT="/media/kensan/LinuxHDD/ITSM-ITmanagementSystem"
BACKEND_DIR="$PROJECT_ROOT/backend"
LOG_DIR="$BACKEND_DIR/logs"
PID_FILE="$BACKEND_DIR/auto_repair.pid"

# ログディレクトリ作成
mkdir -p "$LOG_DIR"

# 関数定義
log() {
    echo "[$(date '+%Y-%m-%d %H:%M:%S')] $1" | tee -a "$LOG_DIR/auto_repair.log"
}

start_auto_repair() {
    log "自動修復システム開始"
    
    # 既存プロセスのチェック
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            log "自動修復システムは既に実行中です (PID: $PID)"
            exit 1
        else
            log "古いPIDファイルを削除: $PID_FILE"
            rm -f "$PID_FILE"
        fi
    fi
    
    # Python仮想環境の確認・アクティベート
    if [ -d "$BACKEND_DIR/venv" ]; then
        log "Python仮想環境をアクティベート"
        source "$BACKEND_DIR/venv/bin/activate"
    else
        log "警告: Python仮想環境が見つかりません"
    fi
    
    # 依存関係のインストール
    log "依存関係を確認・インストール"
    pip install -q aiofiles aiohttp jinja2 2>/dev/null || log "警告: 依存関係のインストールに失敗"
    
    # バックグラウンドで自動修復システムを開始
    log "バックグラウンドで自動修復システムを開始"
    nohup python3 auto_repair_cli.py monitor --interval 30 > "$LOG_DIR/auto_repair_output.log" 2>&1 &
    
    # PIDを保存
    echo $! > "$PID_FILE"
    log "自動修復システム開始完了 (PID: $(cat $PID_FILE))"
    
    # 初回実行
    log "初回修復実行"
    python3 auto_repair_cli.py run-once --output "$LOG_DIR/initial_repair.json" || log "警告: 初回修復実行に失敗"
    
    log "自動修復システムの起動が完了しました"
    echo "監視ログ: tail -f $LOG_DIR/auto_repair_output.log"
    echo "停止方法: $0 stop"
}

stop_auto_repair() {
    log "自動修復システム停止"
    
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            log "プロセスを終了: PID $PID"
            kill -TERM "$PID"
            
            # プロセス終了を待機
            sleep 5
            if ps -p "$PID" > /dev/null 2>&1; then
                log "強制終了: PID $PID"
                kill -KILL "$PID"
            fi
            
            rm -f "$PID_FILE"
            log "自動修復システム停止完了"
        else
            log "プロセスは既に停止しています"
            rm -f "$PID_FILE"
        fi
    else
        log "PIDファイルが見つかりません。プロセスは実行されていない可能性があります"
    fi
}

status_auto_repair() {
    if [ -f "$PID_FILE" ]; then
        PID=$(cat "$PID_FILE")
        if ps -p "$PID" > /dev/null 2>&1; then
            echo "🟢 自動修復システム実行中 (PID: $PID)"
            python3 auto_repair_cli.py status
        else
            echo "🔴 自動修復システム停止中 (古いPIDファイル: $PID)"
            rm -f "$PID_FILE"
        fi
    else
        echo "🔴 自動修復システム停止中"
    fi
}

restart_auto_repair() {
    log "自動修復システム再起動"
    stop_auto_repair
    sleep 3
    start_auto_repair
}

show_logs() {
    echo "=== 自動修復システムログ ==="
    if [ -f "$LOG_DIR/auto_repair_output.log" ]; then
        tail -n 50 "$LOG_DIR/auto_repair_output.log"
    else
        echo "ログファイルが見つかりません"
    fi
}

generate_report() {
    log "修復レポート生成"
    python3 auto_repair_cli.py report --dashboard
    
    # レポートファイルの場所を表示
    REPORT_DIR="$PROJECT_ROOT/tests/reports"
    echo "レポート生成完了:"
    echo "  HTML: $REPORT_DIR/auto-repair-report.html"
    echo "  JSON: $REPORT_DIR/auto-repair-report.json"
    echo "  Markdown: $REPORT_DIR/auto-repair-report.md"
}

# メイン処理
case "${1:-start}" in
    start)
        start_auto_repair
        ;;
    stop)
        stop_auto_repair
        ;;
    restart)
        restart_auto_repair
        ;;
    status)
        status_auto_repair
        ;;
    logs)
        show_logs
        ;;
    report)
        generate_report
        ;;
    test)
        log "APIテスト実行"
        python3 auto_repair_cli.py test-api --output "$LOG_DIR/api_test_results.json"
        ;;
    run-once)
        log "1回実行"
        python3 auto_repair_cli.py run-once --output "$LOG_DIR/single_repair.json"
        ;;
    *)
        echo "使用方法: $0 {start|stop|restart|status|logs|report|test|run-once}"
        echo ""
        echo "コマンド:"
        echo "  start     - 自動修復システムを開始"
        echo "  stop      - 自動修復システムを停止"
        echo "  restart   - 自動修復システムを再起動"
        echo "  status    - 実行状態を確認"
        echo "  logs      - ログを表示"
        echo "  report    - 修復レポートを生成"
        echo "  test      - APIテストを実行"
        echo "  run-once  - 1回だけ修復を実行"
        exit 1
        ;;
esac