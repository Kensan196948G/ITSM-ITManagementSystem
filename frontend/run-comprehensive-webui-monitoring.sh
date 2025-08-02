#!/bin/bash

# WebUI包括監視システム実行スクリプト
# MCP Playwright ベースエラー検知・修復システム

set -e

# カラー定義
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
PURPLE='\033[0;35m'
CYAN='\033[0;36m'
NC='\033[0m' # No Color

# ロゴ表示
echo -e "${BLUE}"
echo "╔════════════════════════════════════════════════════════════════════╗"
echo "║               WebUI 包括監視・修復システム v1.0                      ║"
echo "║           MCP Playwright ベースエラー検知・修復システム               ║"
echo "╚════════════════════════════════════════════════════════════════════╝"
echo -e "${NC}"

# 設定
FRONTEND_DIR=$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)
ROOT_DIR=$(dirname "$FRONTEND_DIR")
LOG_DIR="$FRONTEND_DIR/monitoring-logs"
REPORT_DIR="$FRONTEND_DIR/monitoring-reports"
PID_FILE="$FRONTEND_DIR/webui-monitoring.pid"

# デフォルト設定
MODE="full-cycle"
INTERVAL=30
INFINITE=false
SKIP_DEPS=false
VERBOSE=false
API_ONLY=false

# ヘルプ関数
show_help() {
    echo -e "${CYAN}WebUI包括監視システム実行スクリプト${NC}"
    echo ""
    echo -e "${YELLOW}使用方法:${NC}"
    echo "  $0 [オプション]"
    echo ""
    echo -e "${YELLOW}オプション:${NC}"
    echo "  --mode MODE          実行モード (full-cycle, detection, repair, verification, report)"
    echo "  --infinite           無限ループ監視モード"
    echo "  --interval MINUTES   監視間隔（分）[デフォルト: 30]"
    echo "  --api-only           APIサーバーのみ起動"
    echo "  --skip-deps          依存関係チェックをスキップ"
    echo "  --verbose            詳細ログ出力"
    echo "  --stop               実行中の監視を停止"
    echo "  --status             現在のステータス確認"
    echo "  --help               このヘルプを表示"
    echo ""
    echo -e "${YELLOW}実行モード:${NC}"
    echo "  full-cycle    - 完全サイクル（検知→修復→検証→レポート）"
    echo "  detection     - エラー検知のみ"
    echo "  repair        - 自動修復のみ"
    echo "  verification  - 検証のみ"
    echo "  report        - レポート生成のみ"
    echo ""
    echo -e "${YELLOW}例:${NC}"
    echo "  $0                                # 完全サイクル実行"
    echo "  $0 --infinite --interval 15       # 15分間隔で無限監視"
    echo "  $0 --mode detection --verbose      # エラー検知のみ（詳細ログ）"
    echo "  $0 --api-only                      # APIサーバーのみ起動"
    echo "  $0 --stop                          # 監視停止"
}

# 引数解析
while [[ $# -gt 0 ]]; do
    case $1 in
        --mode)
            MODE="$2"
            shift 2
            ;;
        --interval)
            INTERVAL="$2"
            shift 2
            ;;
        --infinite)
            INFINITE=true
            shift
            ;;
        --api-only)
            API_ONLY=true
            shift
            ;;
        --skip-deps)
            SKIP_DEPS=true
            shift
            ;;
        --verbose)
            VERBOSE=true
            shift
            ;;
        --stop)
            stop_monitoring
            exit 0
            ;;
        --status)
            show_status
            exit 0
            ;;
        --help)
            show_help
            exit 0
            ;;
        *)
            echo -e "${RED}不明なオプション: $1${NC}"
            show_help
            exit 1
            ;;
    esac
done

# ログ関数
log_info() {
    echo -e "${GREEN}[INFO]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_warn() {
    echo -e "${YELLOW}[WARN]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
}

log_debug() {
    if [[ "$VERBOSE" == "true" ]]; then
        echo -e "${BLUE}[DEBUG]${NC} $(date '+%Y-%m-%d %H:%M:%S') $1"
    fi
}

# ディレクトリ作成
ensure_directories() {
    log_info "必要なディレクトリを作成中..."
    mkdir -p "$LOG_DIR" "$REPORT_DIR"
    mkdir -p "$FRONTEND_DIR/console-error-reports"
    mkdir -p "$FRONTEND_DIR/page-monitor-reports"
    mkdir -p "$FRONTEND_DIR/repair-reports"
    mkdir -p "$FRONTEND_DIR/verification-reports"
    mkdir -p "$FRONTEND_DIR/infinite-monitoring-reports"
    mkdir -p "$FRONTEND_DIR/enhanced-reports"
}

# 依存関係チェック
check_dependencies() {
    if [[ "$SKIP_DEPS" == "true" ]]; then
        log_warn "依存関係チェックをスキップします"
        return 0
    fi

    log_info "依存関係をチェック中..."

    # Node.js
    if ! command -v node &> /dev/null; then
        log_error "Node.js が見つかりません"
        exit 1
    fi

    # npm
    if ! command -v npm &> /dev/null; then
        log_error "npm が見つかりません"
        exit 1
    fi

    # TypeScript
    if ! command -v npx &> /dev/null; then
        log_error "npx が見つかりません"
        exit 1
    fi

    # package.json の確認
    if [[ ! -f "$FRONTEND_DIR/package.json" ]]; then
        log_error "package.json が見つかりません"
        exit 1
    fi

    # npm install（必要な場合）
    if [[ ! -d "$FRONTEND_DIR/node_modules" ]]; then
        log_info "依存関係をインストール中..."
        cd "$FRONTEND_DIR"
        npm install
    fi

    # TypeScript コンパイル
    log_debug "TypeScriptファイルをコンパイル中..."
    cd "$FRONTEND_DIR"
    npx tsc --noEmit --skipLibCheck

    log_info "依存関係チェック完了"
}

# WebUIサーバー状態確認
check_webui_server() {
    log_info "WebUIサーバーの状態を確認中..."
    
    for url in "http://192.168.3.135:3000" "http://localhost:3000"; do
        if curl -s --max-time 5 "$url" > /dev/null 2>&1; then
            log_info "WebUIサーバーが稼働中: $url"
            return 0
        fi
    done

    log_warn "WebUIサーバーが応答しません"
    log_warn "監視を開始する前にWebUIサーバーを起動してください:"
    log_warn "  cd $ROOT_DIR/frontend && npm run dev"
    
    read -p "続行しますか？ (y/N): " -n 1 -r
    echo
    if [[ ! $REPLY =~ ^[Yy]$ ]]; then
        exit 1
    fi
}

# プロセス管理
save_pid() {
    echo $$ > "$PID_FILE"
    log_debug "PID $$ を保存: $PID_FILE"
}

stop_monitoring() {
    log_info "監視システムを停止中..."
    
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            log_info "プロセス $pid を停止中..."
            kill -TERM "$pid" 2>/dev/null || true
            sleep 3
            
            # 強制終了が必要な場合
            if kill -0 "$pid" 2>/dev/null; then
                log_warn "プロセス $pid を強制終了..."
                kill -KILL "$pid" 2>/dev/null || true
            fi
        fi
        rm -f "$PID_FILE"
    fi

    # API サーバーの停止
    local api_pid=$(pgrep -f "webui-master-controller" 2>/dev/null || true)
    if [[ -n "$api_pid" ]]; then
        log_info "APIサーバー ($api_pid) を停止中..."
        kill -TERM "$api_pid" 2>/dev/null || true
    fi

    log_info "監視システムが停止されました"
}

# ステータス確認
show_status() {
    echo -e "${CYAN}=== WebUI監視システム ステータス ===${NC}"
    
    # PIDファイル確認
    if [[ -f "$PID_FILE" ]]; then
        local pid=$(cat "$PID_FILE")
        if kill -0 "$pid" 2>/dev/null; then
            echo -e "${GREEN}✅ 監視システム実行中 (PID: $pid)${NC}"
        else
            echo -e "${RED}❌ 監視システム停止中 (古いPIDファイル)${NC}"
            rm -f "$PID_FILE"
        fi
    else
        echo -e "${YELLOW}⏹️ 監視システム停止中${NC}"
    fi

    # APIサーバー確認
    if curl -s --max-time 3 http://localhost:8080/api/status > /dev/null 2>&1; then
        echo -e "${GREEN}✅ APIサーバー稼働中 (http://localhost:8080)${NC}"
        
        # ステータス情報取得
        local status=$(curl -s http://localhost:8080/api/status 2>/dev/null || echo "{}")
        local overall=$(echo "$status" | grep -o '"overall":"[^"]*"' | cut -d'"' -f4 2>/dev/null || echo "unknown")
        echo -e "${BLUE}   システム状態: $overall${NC}"
    else
        echo -e "${RED}❌ APIサーバー停止中${NC}"
    fi

    # WebUIサーバー確認
    if curl -s --max-time 3 http://192.168.3.135:3000 > /dev/null 2>&1; then
        echo -e "${GREEN}✅ WebUIサーバー稼働中 (http://192.168.3.135:3000)${NC}"
    else
        echo -e "${RED}❌ WebUIサーバー停止中${NC}"
    fi

    # 最新レポート確認
    local latest_report=$(find "$REPORT_DIR" -name "*.html" -type f -exec ls -t {} + | head -1 2>/dev/null || true)
    if [[ -n "$latest_report" ]]; then
        echo -e "${BLUE}📊 最新レポート: $(basename "$latest_report")${NC}"
    fi
}

# シグナルハンドラー
cleanup() {
    log_info "クリーンアップ中..."
    stop_monitoring
    exit 0
}

trap cleanup SIGINT SIGTERM

# メイン実行関数
run_monitoring() {
    save_pid
    
    log_info "WebUI包括監視システムを開始 [モード: $MODE]"
    
    cd "$FRONTEND_DIR"
    
    case "$MODE" in
        "full-cycle")
            log_info "完全サイクル実行中..."
            if [[ "$INFINITE" == "true" ]]; then
                node -r ts-node/register webui-master-controller.ts --infinite
            else
                node -r ts-node/register webui-master-controller.ts --full-cycle
            fi
            ;;
        
        "detection")
            log_info "エラー検知実行中..."
            node -r ts-node/register enhanced-console-error-detector.ts
            ;;
        
        "repair")
            log_info "自動修復実行中..."
            node -r ts-node/register auto-error-repair-engine.ts
            ;;
        
        "verification")
            log_info "検証実行中..."
            node -r ts-node/register auto-verification-system.ts
            ;;
        
        "report")
            log_info "レポート生成中..."
            node -r ts-node/register enhanced-report-generator.ts
            ;;
        
        *)
            log_error "不明なモード: $MODE"
            exit 1
            ;;
    esac
}

# API専用モード
run_api_only() {
    save_pid
    log_info "APIサーバーのみを起動中..."
    cd "$FRONTEND_DIR"
    node -r ts-node/register webui-master-controller.ts
}

# メイン処理
main() {
    log_info "WebUI包括監視システム v1.0 を開始..."
    
    ensure_directories
    check_dependencies
    check_webui_server
    
    if [[ "$API_ONLY" == "true" ]]; then
        run_api_only
    else
        run_monitoring
    fi
}

# スクリプト実行
main "$@"