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

# MCP Playwright監視実行関数
run_mcp_monitoring() {
    local mode="$1"
    local interval="$2"
    
    log_step "MCP Playwright WebUIエラー監視・修復システムを実行中..."
    
    # ログファイル設定
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local log_file="logs/mcp_comprehensive_monitor_${timestamp}.log"
    
    # 実行モードに応じた処理
    if [ "$mode" == "once" ]; then
        log_info "🔍 一回のみの包括的監視・修復を実行します"
        
        # Phase 1: メインWebUI監視
        log_step "Phase 1: メインWebUI監視 (MCP Playwright)"
        npx ts-node mcp-webui-error-monitor.ts 2>&1 | tee -a "$log_file" || log_warn "メインWebUI監視で警告が発生しました"
        
        # Phase 2: 管理者ダッシュボード監視
        log_step "Phase 2: 管理者ダッシュボード監視"
        npx ts-node admin-dashboard-monitor.ts 2>&1 | tee -a "$log_file" || log_warn "管理者ダッシュボード監視で警告が発生しました"
        
        # Phase 3: 包括的分析・修復
        log_step "Phase 3: 包括的分析・修復実行"
        npx ts-node comprehensive-webui-monitor.ts run 2>&1 | tee -a "$log_file" || log_warn "包括的分析で警告が発生しました"
        
        log_success "✅ 一回のみの監視・修復が完了しました"
    else
        log_info "🔄 継続監視を開始します"
        if [ -n "$interval" ]; then
            log_info "監視間隔: ${interval}分"
            npx ts-node comprehensive-webui-monitor.ts continuous "$interval" 2>&1 | tee -a "$log_file"
        else
            log_info "監視間隔: 30分（デフォルト）"
            npx ts-node comprehensive-webui-monitor.ts continuous 2>&1 | tee -a "$log_file"
        fi
        log_info "停止するには Ctrl+C を押してください"
    fi
    
    echo "$(date): 監視終了" >> "$log_file"
    log_info "📋 ログファイル: $log_file"
}

# 管理者専用監視関数
run_admin_only_monitoring() {
    log_step "🔐 管理者ダッシュボード専用監視を実行中..."
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local log_file="logs/admin_monitor_${timestamp}.log"
    
    npx ts-node admin-dashboard-monitor.ts 2>&1 | tee -a "$log_file"
    
    log_success "✅ 管理者ダッシュボード監視が完了しました"
    log_info "📋 ログファイル: $log_file"
}

# 修復のみ実行関数
run_repair_only() {
    local report_file="$1"
    
    log_step "🔧 エラー修復のみを実行中..."
    
    if [ -z "$report_file" ]; then
        log_error "修復用のレポートファイルを指定してください"
        echo "使用方法: $0 --repair-only <report_file.json>"
        return 1
    fi
    
    if [ ! -f "$report_file" ]; then
        log_error "指定されたレポートファイルが見つかりません: $report_file"
        return 1
    fi
    
    local timestamp=$(date +"%Y%m%d_%H%M%S")
    local log_file="logs/repair_only_${timestamp}.log"
    
    log_info "📁 使用するレポート: $report_file"
    
    # 修復スクリプトを実行
    npx ts-node -e "
        import { WebUIAutoRepair } from './webui-auto-repair';
        import * as fs from 'fs';
        
        async function runRepair() {
            try {
                const report = JSON.parse(fs.readFileSync('$report_file', 'utf8'));
                const repair = new WebUIAutoRepair();
                
                if (report.errors && Array.isArray(report.errors)) {
                    console.log('🔧 修復を開始します...');
                    const actions = await repair.repairMultipleErrors(report.errors);
                    const repairReport = repair.getRepairReport();
                    
                    console.log('✅ 修復完了:');
                    console.log('  - 成功:', actions.filter(a => a.success).length, '件');
                    console.log('  - 失敗:', actions.filter(a => !a.success).length, '件');
                    
                    // 修復レポートを保存
                    const reportPath = 'repair-only-report-' + Date.now() + '.json';
                    fs.writeFileSync(reportPath, JSON.stringify(repairReport, null, 2));
                    console.log('📋 修復レポート:', reportPath);
                } else {
                    console.log('⚠️ レポートにエラー情報が見つかりません');
                }
            } catch (error) {
                console.error('❌ 修復エラー:', error);
                process.exit(1);
            }
        }
        
        runRepair();
    " 2>&1 | tee -a "$log_file"
    
    log_success "✅ 修復処理が完了しました"
    log_info "📋 ログファイル: $log_file"
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
    
    # コマンドライン引数の解析（MCP Playwright拡張版）
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
            --admin-only)
                mode="admin-only"
                shift
                ;;
            --repair-only)
                mode="repair-only"
                shift
                repair_file="$1"
                shift
                ;;
            --monitor-only)
                mode="monitor-only"
                shift
                ;;
            --status)
                mode="status"
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
                echo "MCP Playwright WebUI 包括的監視・修復システム"
                echo "使用方法: $0 [オプション] [引数]"
                echo ""
                echo "🎯 実行モード:"
                echo "  --once                      一回のみ完全監視・修復を実行（デフォルト）"
                echo "  --admin-only                管理者ダッシュボードのみ監視"
                echo "  --monitor-only              監視のみ実行（修復なし）"
                echo "  --repair-only <report.json> 指定レポートに基づく修復のみ"
                echo "  --status                    最新の監視状況を表示"
                echo "  (引数なし)                  30分間隔で継続監視"
                echo ""
                echo "⚙️  オプション:"
                echo "  --interval=MINUTES          継続監視の間隔（分、デフォルト: 30）"
                echo "  --skip-deps                 依存関係のインストールをスキップ"
                echo "  --cleanup                   クリーンアップのみ実行"
                echo "  --help                      このヘルプを表示"
                echo ""
                echo "📝 実行例:"
                echo "  $0                                    # 30分間隔で継続監視"
                echo "  $0 --once                             # 完全な監視・修復を1回実行"
                echo "  $0 --admin-only                       # 管理者ダッシュボードのみ監視"
                echo "  $0 --monitor-only                     # 監視のみ（修復なし）"
                echo "  $0 --repair-only report.json          # 指定レポートで修復のみ"
                echo "  $0 --interval=60                      # 60分間隔で継続監視"
                echo "  $0 --status                           # 最新の監視状況確認"
                echo ""
                echo "🌐 監視対象URL:"
                echo "  - メインWebUI: http://192.168.3.135:3000"
                echo "  - 管理者ダッシュボード: http://192.168.3.135:3000/admin"
                echo ""
                echo "📊 生成されるレポート:"
                echo "  - MCP Playwright WebUIエラー監視レポート"
                echo "  - 管理者ダッシュボード専用レポート"
                echo "  - 包括的監視・修復レポート (HTML/JSON)"
                echo "  - 自動修復アクションレポート"
                echo ""
                echo "🔧 修復機能:"
                echo "  - JavaScriptエラーの自動修復"
                echo "  - ネットワークエラーの対応"
                echo "  - アクセシビリティ問題の改善"
                echo "  - UIコンポーネントエラーの修正"
                echo "  - パフォーマンス最適化"
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
    
    # 5. MCP Playwright監視実行
    case "$mode" in
        "once")
            run_mcp_monitoring "once" "$interval"
            ;;
        "continuous")
            run_mcp_monitoring "continuous" "$interval"
            ;;
        "admin-only")
            run_admin_only_monitoring
            ;;
        "monitor-only")
            log_info "🔍 監視のみを実行します（修復なし）"
            npx ts-node mcp-webui-error-monitor.ts
            npx ts-node admin-dashboard-monitor.ts
            ;;
        "repair-only")
            run_repair_only "$repair_file"
            ;;
        "status")
            log_info "📊 最新の監視状況を表示します"
            npx ts-node comprehensive-webui-monitor.ts status
            ;;
        *)
            log_error "不明な実行モード: $mode"
            exit 1
            ;;
    esac
    
    # 6. 結果表示（ステータス以外）
    if [ "$mode" != "status" ]; then
        show_results
    fi
    
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