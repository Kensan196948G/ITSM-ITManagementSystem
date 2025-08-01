#!/bin/bash
"""
包括的エラー監視システム起動スクリプト
Playwright MCPと統合したフロントエンド・バックエンドエラー継続監視
"""

set -e

# 色付きログ出力
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
BLUE='\033[0;34m'
NC='\033[0m' # No Color

log_info() {
    echo -e "${BLUE}[INFO]${NC} $1"
}

log_success() {
    echo -e "${GREEN}[SUCCESS]${NC} $1"
}

log_warning() {
    echo -e "${YELLOW}[WARNING]${NC} $1"
}

log_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# 基本パス設定
COORDINATION_DIR="/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination"
PROJECT_ROOT="/media/kensan/LinuxHDD/ITSM-ITmanagementSystem"

cd "$PROJECT_ROOT"

log_info "包括的エラー監視システムを起動しています..."

# Python環境の確認とセットアップ
log_info "Python環境を確認中..."

# 必要なPythonパッケージをインストール
log_info "必要なパッケージをインストール中..."
pip install playwright requests asyncio dataclasses pathlib faker pytest pytest-html pytest-json-report pytest-cov pytest-benchmark || {
    log_error "パッケージインストールに失敗しました"
    exit 1
}

# Playwrightブラウザをインストール
log_info "Playwrightブラウザをインストール中..."
python -m playwright install chromium || {
    log_warning "Playwrightブラウザのインストールに失敗しました。手動でインストールしてください。"
}

# ディレクトリ作成
log_info "必要なディレクトリを作成中..."
mkdir -p "$COORDINATION_DIR/logs"
mkdir -p "$COORDINATION_DIR/reports"
mkdir -p "$PROJECT_ROOT/tests/reports"

# 初期エラーファイルを作成
log_info "初期エラーファイルを作成中..."
cat > "$COORDINATION_DIR/error_status.json" << 'EOF'
{
  "timestamp": "$(date -Iseconds)",
  "status": "initializing",
  "frontend_errors": 0,
  "backend_errors": 0,
  "api_errors": 0,
  "console_errors": 0,
  "network_errors": 0,
  "total_errors": 0,
  "pages_checked": 0,
  "api_endpoints_checked": 0,
  "last_check_duration": 0.0,
  "consecutive_clean_checks": 0,
  "required_clean_checks": 3,
  "completion_status": "in_progress"
}
EOF

# 引数解析
MODE="continuous"
if [ "$1" = "--single" ]; then
    MODE="single"
    log_info "単発チェックモードで実行します"
else
    log_info "継続監視モードで実行します"
fi

# システム状態確認
log_info "システム状態を確認中..."

# フロントエンドサーバーの確認
if curl -s --connect-timeout 5 "http://192.168.3.135:3000" > /dev/null; then
    log_success "フロントエンドサーバー (http://192.168.3.135:3000) は稼働中です"
else
    log_warning "フロントエンドサーバー (http://192.168.3.135:3000) に接続できません"
fi

# バックエンドサーバーの確認
if curl -s --connect-timeout 5 "http://192.168.3.135:8081/api/health" > /dev/null; then
    log_success "バックエンドサーバー (http://192.168.3.135:8081) は稼働中です"
else
    log_warning "バックエンドサーバー (http://192.168.3.135:8081) に接続できません"
fi

# 包括的エラー監視システムを実行
log_info "包括的エラー監視システムを開始します..."

if [ "$MODE" = "single" ]; then
    # 単発チェック実行
    python "$COORDINATION_DIR/comprehensive_error_monitor.py" --single
    
    log_info "単発チェック完了。結果を確認中..."
    
    # 結果ファイルが存在するかチェック
    if [ -f "$COORDINATION_DIR/errors.json" ]; then
        ERROR_COUNT=$(python -c "import json; data=json.load(open('$COORDINATION_DIR/errors.json')); print(data.get('total_count', 0))")
        if [ "$ERROR_COUNT" -eq 0 ]; then
            log_success "エラーは検出されませんでした！"
        else
            log_warning "$ERROR_COUNT 個のエラーが検出されました"
            log_info "詳細は $COORDINATION_DIR/errors.json を確認してください"
        fi
    fi
    
else
    # 継続監視モード
    log_info "継続監視を開始します。Ctrl+Cで停止できます。"
    
    # バックグラウンドで監視システムを実行
    python "$COORDINATION_DIR/comprehensive_error_monitor.py" &
    MONITOR_PID=$!
    
    log_info "監視システムがPID $MONITOR_PID で開始されました"
    
    # 監視ループ
    while true; do
        sleep 30
        
        # 監視プロセスが生きているかチェック
        if ! kill -0 $MONITOR_PID 2>/dev/null; then
            log_error "監視システムが予期せず終了しました"
            break
        fi
        
        # 現在の状態を表示
        if [ -f "$COORDINATION_DIR/error_status.json" ]; then
            STATUS=$(python -c "import json; data=json.load(open('$COORDINATION_DIR/error_status.json')); print(data.get('status', 'unknown'))")
            TOTAL_ERRORS=$(python -c "import json; data=json.load(open('$COORDINATION_DIR/error_status.json')); print(data.get('total_errors', 0))")
            CLEAN_CHECKS=$(python -c "import json; data=json.load(open('$COORDINATION_DIR/error_status.json')); print(data.get('consecutive_clean_checks', 0))")
            
            log_info "現在の状態: $STATUS | エラー数: $TOTAL_ERRORS | 連続クリーン: $CLEAN_CHECKS/3"
            
            # 完了チェック
            if [ "$STATUS" = "healthy" ] && [ "$CLEAN_CHECKS" -ge 3 ]; then
                log_success "エラーゼロを達成しました！監視を完了します。"
                kill $MONITOR_PID 2>/dev/null || true
                break
            fi
        fi
    done
    
    # クリーンアップ
    log_info "クリーンアップ中..."
    kill $MONITOR_PID 2>/dev/null || true
fi

# 最終レポートの生成
log_info "最終レポートを生成中..."

if [ -f "$COORDINATION_DIR/errors.json" ] && [ -f "$COORDINATION_DIR/error_status.json" ]; then
    python << 'EOL'
import json
from datetime import datetime
import os

coordination_dir = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination"

# エラーデータを読み込み
try:
    with open(f"{coordination_dir}/errors.json", 'r', encoding='utf-8') as f:
        errors = json.load(f)
    
    with open(f"{coordination_dir}/error_status.json", 'r', encoding='utf-8') as f:
        status = json.load(f)
    
    # 最終レポートを生成
    report = {
        "monitoring_session": {
            "end_time": datetime.now().isoformat(),
            "status": status.get("status", "unknown"),
            "completion_status": status.get("completion_status", "unknown"),
            "total_errors_detected": status.get("total_errors", 0),
            "consecutive_clean_checks": status.get("consecutive_clean_checks", 0),
            "pages_checked": status.get("pages_checked", 0),
            "api_endpoints_checked": status.get("api_endpoints_checked", 0)
        },
        "error_summary": {
            "frontend_errors": status.get("frontend_errors", 0),
            "backend_errors": status.get("backend_errors", 0),
            "api_errors": status.get("api_errors", 0),
            "console_errors": status.get("console_errors", 0),
            "network_errors": status.get("network_errors", 0)
        },
        "latest_errors": errors.get("errors", [])[:10],  # 最新10件
        "recommendations": []
    }
    
    # 推奨事項を追加
    if status.get("total_errors", 0) == 0:
        report["recommendations"].append("システムは正常です。定期的な監視を継続してください。")
    else:
        if status.get("frontend_errors", 0) > 0:
            report["recommendations"].append("フロントエンドエラーが検出されました。ITSM-DevUIエージェントによる修復が必要です。")
        if status.get("backend_errors", 0) > 0:
            report["recommendations"].append("バックエンドエラーが検出されました。ITSM-DevAPIエージェントによる修復が必要です。")
        if status.get("api_errors", 0) > 0:
            report["recommendations"].append("APIエンドポイントエラーが検出されました。接続とレスポンス形式を確認してください。")
    
    # レポートを保存
    with open(f"{coordination_dir}/final_monitoring_report.json", 'w', encoding='utf-8') as f:
        json.dump(report, f, ensure_ascii=False, indent=2)
    
    print(f"最終レポートを {coordination_dir}/final_monitoring_report.json に保存しました")
    
    # コンソール出力
    print("\n" + "="*60)
    print("監視セッション完了サマリー")
    print("="*60)
    print(f"ステータス: {report['monitoring_session']['status']}")
    print(f"完了状況: {report['monitoring_session']['completion_status']}")
    print(f"総エラー数: {report['monitoring_session']['total_errors_detected']}")
    print(f"チェックしたページ数: {report['monitoring_session']['pages_checked']}")
    print(f"チェックしたAPIエンドポイント数: {report['monitoring_session']['api_endpoints_checked']}")
    print(f"連続クリーンチェック: {report['monitoring_session']['consecutive_clean_checks']}/3")
    print("\nエラー分類:")
    for error_type, count in report['error_summary'].items():
        print(f"  {error_type}: {count}")
    print("\n推奨事項:")
    for rec in report['recommendations']:
        print(f"  - {rec}")
    print("="*60)

except Exception as e:
    print(f"レポート生成エラー: {e}")
EOL
else
    log_warning "エラーファイルが見つからないため、最終レポートを生成できませんでした"
fi

log_success "包括的エラー監視システムが完了しました"
log_info "結果ファイル:"
log_info "  - エラー詳細: $COORDINATION_DIR/errors.json"
log_info "  - システム状態: $COORDINATION_DIR/error_status.json"
log_info "  - 修復指示: $COORDINATION_DIR/fixes.json"
log_info "  - 最終レポート: $COORDINATION_DIR/final_monitoring_report.json"