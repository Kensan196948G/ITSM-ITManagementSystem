#!/bin/bash
# 無限エラー監視・修復システム 起動スクリプト
# ITSM WebUIとAPIの完全自動エラー検知・修復システム

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ログファイル設定
LOG_DIR="/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/logs"
MONITOR_LOG="$LOG_DIR/infinite-monitor.log"
SYSTEM_LOG="$LOG_DIR/system-monitor.log"

# 作業ディレクトリ
WORK_DIR="/media/kensan/LinuxHDD/ITSM-ITmanagementSystem"

echo -e "${CYAN}================================================${NC}"
echo -e "${CYAN}🚀 ITSM 無限エラー監視・修復システム 起動${NC}"
echo -e "${CYAN}================================================${NC}"

# 関数定義
print_status() {
    echo -e "${BLUE}[$(date '+%Y-%m-%d %H:%M:%S')]${NC} $1"
}

print_success() {
    echo -e "${GREEN}✅ $1${NC}"
}

print_warning() {
    echo -e "${YELLOW}⚠️ $1${NC}"
}

print_error() {
    echo -e "${RED}❌ $1${NC}"
}

print_info() {
    echo -e "${PURPLE}ℹ️ $1${NC}"
}

# 環境チェック
check_environment() {
    print_status "環境チェックを実行中..."
    
    # Pythonバージョンチェック
    if ! python3 --version &> /dev/null; then
        print_error "Python3がインストールされていません"
        exit 1
    fi
    
    PYTHON_VERSION=$(python3 --version | cut -d' ' -f2)
    print_success "Python $PYTHON_VERSION が利用可能"
    
    # 必要なPythonパッケージチェック
    print_status "Pythonパッケージをチェック中..."
    
    REQUIRED_PACKAGES=("aiohttp" "psutil")
    MISSING_PACKAGES=()
    
    for package in "${REQUIRED_PACKAGES[@]}"; do
        if ! python3 -c "import $package" &> /dev/null; then
            MISSING_PACKAGES+=("$package")
        fi
    done
    
    if [ ${#MISSING_PACKAGES[@]} -gt 0 ]; then
        print_warning "不足しているパッケージを自動インストール中..."
        for package in "${MISSING_PACKAGES[@]}"; do
            print_status "インストール中: $package"
            pip3 install "$package" || {
                print_error "$package のインストールに失敗しました"
                exit 1
            }
        done
        print_success "すべての依存関係がインストールされました"
    else
        print_success "すべての依存関係が満たされています"
    fi
    
    # Node.js/npmチェック（フロントエンド用）
    if ! npm --version &> /dev/null; then
        print_warning "npm が見つかりません。フロントエンド監視機能が制限される可能性があります"
    else
        NPM_VERSION=$(npm --version)
        print_success "npm $NPM_VERSION が利用可能"
    fi
    
    # Playwrightチェック
    if ! npx playwright --version &> /dev/null; then
        print_warning "Playwright が見つかりません。フロントエンド詳細監視機能が制限される可能性があります"
    else
        PLAYWRIGHT_VERSION=$(npx playwright --version)
        print_success "$PLAYWRIGHT_VERSION が利用可能"
    fi
}

# ログディレクトリ準備
setup_logging() {
    print_status "ログディレクトリを準備中..."
    
    mkdir -p "$LOG_DIR"
    
    # 既存ログファイルのバックアップ
    if [ -f "$MONITOR_LOG" ]; then
        BACKUP_LOG="$LOG_DIR/infinite-monitor-$(date +%Y%m%d_%H%M%S).log.bak"
        cp "$MONITOR_LOG" "$BACKUP_LOG"
        print_info "既存ログをバックアップ: $(basename $BACKUP_LOG)"
    fi
    
    # 新しいログファイル作成
    touch "$MONITOR_LOG"
    touch "$SYSTEM_LOG"
    
    print_success "ログシステムが準備完了"
}

# サービス状態チェック
check_services() {
    print_status "サービス状態をチェック中..."
    
    # フロントエンドサービスチェック
    if curl -s http://192.168.3.135:3000 > /dev/null 2>&1; then
        print_success "フロントエンドサービス (port 3000) 稼働中"
    else
        print_warning "フロントエンドサービス (port 3000) が応答しません"
        print_info "必要に応じてサービスを起動します"
    fi
    
    # バックエンドサービスチェック
    if curl -s http://192.168.3.135:8000/health > /dev/null 2>&1; then
        print_success "バックエンドサービス (port 8000) 稼働中"
    else
        print_warning "バックエンドサービス (port 8000) が応答しません"
        print_info "必要に応じてサービスを起動します"
    fi
}

# 設定表示
show_configuration() {
    print_status "監視設定を表示中..."
    echo ""
    echo -e "${CYAN}📍 監視対象URL:${NC}"
    echo -e "  • フロントエンド (WebUI): ${YELLOW}http://192.168.3.135:3000${NC}"
    echo -e "  • 管理者ダッシュボード: ${YELLOW}http://192.168.3.135:3000/admin${NC}"
    echo -e "  • バックエンドAPI: ${YELLOW}http://192.168.3.135:8000${NC}"
    echo -e "  • APIドキュメント: ${YELLOW}http://192.168.3.135:8000/docs${NC}"
    echo ""
    echo -e "${CYAN}🔧 監視機能:${NC}"
    echo -e "  • ブラウザコンソールエラー検知 (Playwright)"
    echo -e "  • APIエンドポイント健全性監視"
    echo -e "  • 自動エラー修復"
    echo -e "  • サービス自動再起動"
    echo -e "  • 継続監視ループ (60秒間隔)"
    echo ""
    echo -e "${CYAN}📊 ログ出力:${NC}"
    echo -e "  • メインログ: ${YELLOW}$MONITOR_LOG${NC}"
    echo -e "  • システムログ: ${YELLOW}$SYSTEM_LOG${NC}"
    echo ""
}

# システム監視バックグラウンドプロセス
start_system_monitor() {
    print_status "システム監視を開始中..."
    
    # システムリソース監視スクリプト
    cat > "$WORK_DIR/system-monitor.py" << 'EOF'
#!/usr/bin/env python3
import psutil
import time
import json
import logging
from datetime import datetime

logging.basicConfig(
    filename='/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/logs/system-monitor.log',
    level=logging.INFO,
    format='%(asctime)s - %(message)s'
)

def monitor_system():
    while True:
        try:
            # システムメトリクス収集
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage('/')
            
            metrics = {
                'timestamp': datetime.now().isoformat(),
                'cpu_percent': cpu_percent,
                'memory_percent': memory.percent,
                'memory_available_gb': memory.available / (1024**3),
                'disk_percent': disk.percent,
                'disk_free_gb': disk.free / (1024**3),
                'load_average': psutil.getloadavg() if hasattr(psutil, 'getloadavg') else None
            }
            
            # 警告レベルチェック
            if cpu_percent > 80:
                logging.warning(f"高CPU使用率: {cpu_percent}%")
            if memory.percent > 85:
                logging.warning(f"高メモリ使用率: {memory.percent}%")
            if disk.percent > 90:
                logging.warning(f"高ディスク使用率: {disk.percent}%")
            
            # ネットワーク接続チェック
            try:
                import socket
                socket.create_connection(("192.168.3.135", 3000), timeout=5)
                socket.create_connection(("192.168.3.135", 8000), timeout=5)
                metrics['network_status'] = 'ok'
            except:
                metrics['network_status'] = 'error'
                logging.error("ネットワーク接続エラー")
            
            # メトリクス記録
            logging.info(f"METRICS: {json.dumps(metrics)}")
            
        except Exception as e:
            logging.error(f"システム監視エラー: {str(e)}")
        
        time.sleep(300)  # 5分間隔

if __name__ == "__main__":
    monitor_system()
EOF
    
    # バックグラウンドでシステム監視開始
    python3 "$WORK_DIR/system-monitor.py" &
    SYSTEM_MONITOR_PID=$!
    echo $SYSTEM_MONITOR_PID > "$WORK_DIR/system-monitor.pid"
    
    print_success "システム監視プロセス開始 (PID: $SYSTEM_MONITOR_PID)"
}

# 監視停止関数
stop_monitors() {
    print_status "監視プロセスを停止中..."
    
    # システム監視プロセス停止
    if [ -f "$WORK_DIR/system-monitor.pid" ]; then
        SYSTEM_PID=$(cat "$WORK_DIR/system-monitor.pid")
        if kill -0 $SYSTEM_PID 2>/dev/null; then
            kill $SYSTEM_PID
            print_success "システム監視プロセス停止"
        fi
        rm -f "$WORK_DIR/system-monitor.pid"
    fi
    
    # 無限監視プロセス停止（SIGTERMで正常終了）
    if [ -f "$WORK_DIR/infinite-monitor.pid" ]; then
        MONITOR_PID=$(cat "$WORK_DIR/infinite-monitor.pid")
        if kill -0 $MONITOR_PID 2>/dev/null; then
            kill -TERM $MONITOR_PID
            print_success "無限監視プロセス停止"
        fi
        rm -f "$WORK_DIR/infinite-monitor.pid"
    fi
}

# シグナルハンドラー
cleanup() {
    echo ""
    print_status "シャットダウンシーケンスを開始..."
    stop_monitors
    print_success "すべてのプロセスが正常終了しました"
    exit 0
}

trap cleanup SIGINT SIGTERM

# コマンドライン引数処理
case "${1:-start}" in
    "start")
        # メイン実行
        cd "$WORK_DIR"
        
        check_environment
        setup_logging
        check_services
        show_configuration
        start_system_monitor
        
        print_status "無限エラー監視・修復システムを開始します..."
        echo ""
        print_info "停止するには Ctrl+C を押してください"
        echo ""
        
        # 無限監視プロセス開始
        python3 infinite-error-monitor.py &
        MONITOR_PID=$!
        echo $MONITOR_PID > "$WORK_DIR/infinite-monitor.pid"
        
        print_success "無限監視プロセス開始 (PID: $MONITOR_PID)"
        
        # フォアグラウンドで待機
        wait $MONITOR_PID
        ;;
        
    "stop")
        print_status "監視システムを停止します..."
        stop_monitors
        ;;
        
    "status")
        print_status "監視システムの状態をチェック中..."
        
        if [ -f "$WORK_DIR/infinite-monitor.pid" ]; then
            MONITOR_PID=$(cat "$WORK_DIR/infinite-monitor.pid")
            if kill -0 $MONITOR_PID 2>/dev/null; then
                print_success "無限監視プロセス稼働中 (PID: $MONITOR_PID)"
            else
                print_warning "無限監視プロセスが停止しています"
            fi
        else
            print_warning "無限監視プロセスのPIDファイルが見つかりません"
        fi
        
        if [ -f "$WORK_DIR/system-monitor.pid" ]; then
            SYSTEM_PID=$(cat "$WORK_DIR/system-monitor.pid")
            if kill -0 $SYSTEM_PID 2>/dev/null; then
                print_success "システム監視プロセス稼働中 (PID: $SYSTEM_PID)"
            else
                print_warning "システム監視プロセスが停止しています"
            fi
        else
            print_warning "システム監視プロセスのPIDファイルが見つかりません"
        fi
        ;;
        
    "logs")
        print_status "ログを表示中..."
        echo ""
        echo -e "${CYAN}=== 無限監視ログ (最新50行) ===${NC}"
        if [ -f "$MONITOR_LOG" ]; then
            tail -n 50 "$MONITOR_LOG"
        else
            print_warning "監視ログファイルが見つかりません"
        fi
        
        echo ""
        echo -e "${CYAN}=== システム監視ログ (最新20行) ===${NC}"
        if [ -f "$SYSTEM_LOG" ]; then
            tail -n 20 "$SYSTEM_LOG"
        else
            print_warning "システムログファイルが見つかりません"
        fi
        ;;
        
    "help"|"-h"|"--help")
        echo -e "${CYAN}ITSM 無限エラー監視・修復システム${NC}"
        echo ""
        echo -e "${YELLOW}使用方法:${NC}"
        echo "  ./start-infinite-monitor.sh [コマンド]"
        echo ""
        echo -e "${YELLOW}コマンド:${NC}"
        echo "  start   - 監視システムを開始 (デフォルト)"
        echo "  stop    - 監視システムを停止"
        echo "  status  - 監視システムの状態確認"
        echo "  logs    - ログファイルの表示"
        echo "  help    - このヘルプを表示"
        echo ""
        echo -e "${YELLOW}例:${NC}"
        echo "  ./start-infinite-monitor.sh start    # 監視開始"
        echo "  ./start-infinite-monitor.sh status   # 状態確認"
        echo "  ./start-infinite-monitor.sh logs     # ログ確認"
        echo "  ./start-infinite-monitor.sh stop     # 監視停止"
        ;;
        
    *)
        print_error "不明なコマンド: $1"
        echo "ヘルプを表示するには: ./start-infinite-monitor.sh help"
        exit 1
        ;;
esac