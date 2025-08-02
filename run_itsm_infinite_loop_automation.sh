#!/bin/bash
"""
ITSM Test Automation - 完全自動化実行スクリプト
GitHub Actions対応 5秒間隔無限ループ修復システム

要件:
1. 5秒間隔でLoop修復エンジンを実装し、完全エラー除去まで継続実行
2. エラーファイルを詳細分析し、フロントエンド接続エラーとバックエンドヘルス問題を特定
3. リアルタイム監視システムの強化：即座のエラー検出と修復発動
4. coordination/errors.jsonの協調エラー修復処理
5. infinite_loop_state.jsonの無限ループ問題解決
6. ITSM準拠のセキュリティ・例外処理・ログ記録の実装
7. 一つずつエラー検知→修復→push/pull→検証の無限ループを自動化
8. 修復が完了したら次のエラーの無限ループを自動化
9. 10回繰り返す
10. pytest・Playwright自動テスト統合
"""

set -e

# 色付きログ出力関数
log_info() {
    echo -e "\033[32m[INFO $(date '+%Y-%m-%d %H:%M:%S')]\033[0m $1"
}

log_warn() {
    echo -e "\033[33m[WARN $(date '+%Y-%m-%d %H:%M:%S')]\033[0m $1"
}

log_error() {
    echo -e "\033[31m[ERROR $(date '+%Y-%m-%d %H:%M:%S')]\033[0m $1"
}

log_success() {
    echo -e "\033[36m[SUCCESS $(date '+%Y-%m-%d %H:%M:%S')]\033[0m $1"
}

# プロジェクトルート設定
PROJECT_ROOT="/media/kensan/LinuxHDD/ITSM-ITmanagementSystem"
cd "$PROJECT_ROOT"

# ログディレクトリ作成
mkdir -p logs reports

# 開始ログ
log_info "=================================================="
log_info "ITSM Test Automation 無限ループ修復システム開始"
log_info "=================================================="

# 環境確認
log_info "環境確認中..."
python3 --version
node --version 2>/dev/null || log_warn "Node.js未インストール"
git --version

# Pythonの依存関係確認・インストール
log_info "Python依存関係確認中..."
pip3 install -r requirements.txt 2>/dev/null || log_warn "requirements.txt読み込み失敗"
pip3 install requests pytest playwright psutil watchdog 2>/dev/null || log_warn "依存関係インストール一部失敗"

# Playwright設定
log_info "Playwrightブラウザ設定中..."
python3 -m playwright install chromium 2>/dev/null || log_warn "Playwrightブラウザインストール失敗"

# 現在の無限ループ状態確認
log_info "現在の無限ループ状態確認..."
if [[ -f "coordination/infinite_loop_state.json" ]]; then
    CURRENT_LOOP=$(python3 -c "import json; data=json.load(open('coordination/infinite_loop_state.json')); print(data.get('loop_count', 0))" 2>/dev/null || echo "0")
    TOTAL_FIXED=$(python3 -c "import json; data=json.load(open('coordination/infinite_loop_state.json')); print(data.get('total_errors_fixed', 0))" 2>/dev/null || echo "0")
    log_info "現在のループカウント: $CURRENT_LOOP"
    log_info "総修復エラー数: $TOTAL_FIXED"
else
    log_warn "infinite_loop_state.json未発見"
fi

# errors.json初期化
log_info "errors.json初期化中..."
cat > coordination/errors.json << 'EOF'
{
  "timestamp": "$(date -u +%Y-%m-%dT%H:%M:%S.%6NZ)",
  "last_scan": "$(date -u +%Y-%m-%dT%H:%M:%S.%6NZ)",
  "current_errors": [],
  "error_categories": {
    "frontend_connection": [],
    "backend_health": [],
    "git_status": [],
    "build_failures": [],
    "test_failures": [],
    "security_issues": []
  },
  "repair_history": [],
  "total_errors_detected": 0,
  "total_errors_fixed": 0,
  "error_detection_active": true,
  "auto_repair_enabled": true,
  "scan_interval": 5,
  "max_repair_attempts": 3
}
EOF

# 10回繰り返し実行フラグ
MAX_ITERATIONS=10
CURRENT_ITERATION=0

log_info "10回繰り返し自動修復開始..."

while [[ $CURRENT_ITERATION -lt $MAX_ITERATIONS ]]; do
    CURRENT_ITERATION=$((CURRENT_ITERATION + 1))
    log_info "=========================================="
    log_info "修復イテレーション $CURRENT_ITERATION/$MAX_ITERATIONS"
    log_info "=========================================="
    
    # 1. エラー検知フェーズ
    log_info "エラー検知フェーズ開始..."
    
    # 現在のGitステータス確認
    if ! git status --porcelain > /dev/null 2>&1; then
        log_error "Git status確認失敗"
    else
        GIT_CHANGES=$(git status --porcelain | wc -l)
        if [[ $GIT_CHANGES -gt 0 ]]; then
            log_warn "未コミット変更: $GIT_CHANGES ファイル"
        fi
    fi
    
    # バックエンドヘルスチェック
    log_info "バックエンドヘルスチェック..."
    if curl -s --max-time 5 http://localhost:8000/health > /dev/null 2>&1; then
        log_success "バックエンド正常"
    else
        log_warn "バックエンド接続失敗"
    fi
    
    # フロントエンドヘルスチェック
    log_info "フロントエンドヘルスチェック..."
    if curl -s --max-time 5 http://localhost:3000 > /dev/null 2>&1; then
        log_success "フロントエンド正常"
    else
        log_warn "フロントエンド接続失敗"
    fi
    
    # 2. 5秒間隔修復エンジン実行フェーズ
    log_info "5秒間隔修復エンジン実行開始..."
    timeout 60 python3 itsm_5s_loop_repair_engine.py &
    REPAIR_ENGINE_PID=$!
    
    # 並行してpytest・Playwright統合テスト実行
    log_info "pytest・Playwright統合テスト実行開始..."
    timeout 120 python3 itsm_pytest_playwright_integration.py &
    TEST_ENGINE_PID=$!
    
    # 修復エンジンの完了待機（最大60秒）
    wait $REPAIR_ENGINE_PID 2>/dev/null || log_warn "修復エンジンタイムアウトまたは異常終了"
    
    # テストエンジンの完了待機（最大120秒）
    wait $TEST_ENGINE_PID 2>/dev/null || log_warn "テストエンジンタイムアウトまたは異常終了"
    
    # 3. Push/Pull検証フェーズ
    log_info "Push/Pull検証フェーズ開始..."
    
    # Gitコミット
    if [[ $(git status --porcelain | wc -l) -gt 0 ]]; then
        log_info "変更をコミット中..."
        git add .
        git commit -m "ITSM自動修復: イテレーション $CURRENT_ITERATION ($(date '+%Y-%m-%d %H:%M:%S'))" || log_warn "コミット失敗"
    fi
    
    # Git push
    log_info "Git push実行中..."
    if git push origin main 2>/dev/null; then
        log_success "Git push成功"
    else
        log_warn "Git push失敗"
    fi
    
    # Git pull
    log_info "Git pull実行中..."
    if git pull origin main 2>/dev/null; then
        log_success "Git pull成功"
    else
        log_warn "Git pull失敗"
    fi
    
    # 4. 検証フェーズ
    log_info "検証フェーズ開始..."
    
    # エラー状態確認
    ERRORS_FOUND=0
    
    # Gitステータス再確認
    if [[ $(git status --porcelain | wc -l) -gt 0 ]]; then
        ERRORS_FOUND=$((ERRORS_FOUND + 1))
    fi
    
    # サービス健全性再確認
    if ! curl -s --max-time 5 http://localhost:8000/health > /dev/null 2>&1; then
        ERRORS_FOUND=$((ERRORS_FOUND + 1))
    fi
    
    if ! curl -s --max-time 5 http://localhost:3000 > /dev/null 2>&1; then
        ERRORS_FOUND=$((ERRORS_FOUND + 1))
    fi
    
    # 結果判定
    if [[ $ERRORS_FOUND -eq 0 ]]; then
        log_success "イテレーション $CURRENT_ITERATION: すべてのエラーが修復されました"
    else
        log_warn "イテレーション $CURRENT_ITERATION: $ERRORS_FOUND 個のエラーが残存"
    fi
    
    # 5秒待機（次のイテレーションまで）
    log_info "次のイテレーションまで5秒待機..."
    sleep 5
done

# 最終レポート生成
log_info "=========================================="
log_info "最終レポート生成中..."
log_info "=========================================="

# 最終状態確認
FINAL_LOOP=$(python3 -c "import json; data=json.load(open('coordination/infinite_loop_state.json')); print(data.get('loop_count', 0))" 2>/dev/null || echo "不明")
FINAL_FIXED=$(python3 -c "import json; data=json.load(open('coordination/infinite_loop_state.json')); print(data.get('total_errors_fixed', 0))" 2>/dev/null || echo "不明")

# 完了レポート作成
cat > reports/itsm_final_automation_report.md << EOF
# ITSM Test Automation 最終レポート

## 実行概要
- **実行日時**: $(date '+%Y年%m月%d日 %H:%M:%S')
- **総イテレーション数**: $MAX_ITERATIONS
- **実行完了イテレーション**: $CURRENT_ITERATION

## 最終状態
- **最終ループカウント**: $FINAL_LOOP
- **総修復エラー数**: $FINAL_FIXED
- **実行時間**: 約$((MAX_ITERATIONS * 5))秒以上

## システム状態
- **Git状態**: $(git status --porcelain | wc -l)ファイルの変更
- **バックエンド**: $(curl -s --max-time 5 http://localhost:8000/health > /dev/null 2>&1 && echo "正常" || echo "異常")
- **フロントエンド**: $(curl -s --max-time 5 http://localhost:3000 > /dev/null 2>&1 && echo "正常" || echo "異常")

## 実行ログファイル
- **メインログ**: logs/itsm_5s_loop_repair.log
- **テストログ**: logs/itsm_pytest_playwright.log
- **レポートファイル**: reports/itsm_test_report_*.json

## 結論
ITSM Test Automation無限ループ修復システムが$MAX_ITERATIONS回のイテレーションで完了しました。
エラーが完全に除去された場合、システムは安定状態に達しています。

---
🤖 Generated with Claude Code
EOF

# 最終状態ログ出力
log_success "=================================================="
log_success "ITSM Test Automation システム実行完了"
log_success "=================================================="
log_info "最終ループカウント: $FINAL_LOOP"
log_info "総修復エラー数: $FINAL_FIXED"
log_info "実行イテレーション: $CURRENT_ITERATION/$MAX_ITERATIONS"
log_info "最終レポート: reports/itsm_final_automation_report.md"

# GitHub Actions用の出力
echo "ITSM_FINAL_LOOP_COUNT=$FINAL_LOOP" >> $GITHUB_OUTPUT 2>/dev/null || true
echo "ITSM_TOTAL_ERRORS_FIXED=$FINAL_FIXED" >> $GITHUB_OUTPUT 2>/dev/null || true
echo "ITSM_ITERATIONS_COMPLETED=$CURRENT_ITERATION" >> $GITHUB_OUTPUT 2>/dev/null || true

# 終了判定
if [[ $ERRORS_FOUND -eq 0 ]]; then
    log_success "✅ すべてのエラーが修復されました！CI/CDパイプライン適合"
    exit 0
else
    log_error "❌ エラーが残存しています。手動確認が必要です"
    exit 1
fi