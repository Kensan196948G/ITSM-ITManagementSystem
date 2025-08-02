#!/bin/bash

# ライブモニタリング - システム状況リアルタイム表示

show_live_status() {
    clear
    echo "🔄 GitHub Actions→Claude自動修復→再実行ループ LIVE監視"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⏰ $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    # GitHub Actions状況
    echo "📊 GitHub Actions状況:"
    if command -v gh &> /dev/null; then
        gh run list --limit 3 --json status,conclusion,workflowName,createdAt 2>/dev/null | jq -r '.[] | "  🔗 " + .workflowName + ": " + .status + " (" + (.conclusion // "進行中") + ")"' 2>/dev/null || echo "  📡 GitHub API接続中..."
    else
        echo "  ❌ GitHub CLI未インストール"
    fi
    echo ""
    
    # システム稼働状況
    echo "🚀 システム稼働状況:"
    ENHANCED_PID=$(ps aux | grep "enhanced_github_actions_auto_repair" | grep -v grep | awk '{print $2}' | head -1)
    INFINITE_PID=$(ps aux | grep "infinite_loop_monitor" | grep -v grep | awk '{print $2}' | head -1)
    
    if [ ! -z "$ENHANCED_PID" ]; then
        echo "  ✅ Enhanced Auto-Repair: 稼働中 (PID: $ENHANCED_PID)"
        # メモリ使用量
        MEM=$(ps -p $ENHANCED_PID -o rss= 2>/dev/null | awk '{print int($1/1024)"MB"}')
        echo "     💾 メモリ使用: $MEM"
    else
        echo "  ❌ Enhanced Auto-Repair: 停止中"
    fi
    
    if [ ! -z "$INFINITE_PID" ]; then
        echo "  ✅ Infinite Loop Monitor: 稼働中 (PID: $INFINITE_PID)"
    else
        echo "  ❌ Infinite Loop Monitor: 停止中"
    fi
    echo ""
    
    # 修復統計
    echo "📈 修復統計:"
    if [ -f "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/infinite_loop_state.json" ]; then
        LOOP_COUNT=$(jq -r '.loop_count // 0' /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/infinite_loop_state.json 2>/dev/null)
        TOTAL_FIXED=$(jq -r '.total_errors_fixed // 0' /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/infinite_loop_state.json 2>/dev/null)
        LAST_SCAN=$(jq -r '.last_scan // "不明"' /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/infinite_loop_state.json 2>/dev/null)
        echo "  🔄 Loop数: $LOOP_COUNT | 🛠️ 修復完了: $TOTAL_FIXED"
        echo "  📅 最終スキャン: $LAST_SCAN"
    else
        echo "  ❌ 統計データ読み込みエラー"
    fi
    echo ""
    
    # Enhanced Repair詳細状況
    echo "🔧 Enhanced Repair詳細:"
    if [ -f "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/enhanced_repair_state.json" ]; then
        MONITORING=$(jq -r '.monitoring // false' /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/enhanced_repair_state.json 2>/dev/null)
        ACTIVE_REPAIRS=$(jq -r '.active_repairs | length' /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/enhanced_repair_state.json 2>/dev/null)
        echo "  📡 監視状態: $MONITORING | 🔄 処理中: $ACTIVE_REPAIRS件"
    else
        echo "  ❌ Enhanced状態データなし"
    fi
    echo ""
    
    # 最新アクティビティ
    echo "📋 最新アクティビティ (Enhanced Auto-Repair):"
    if [ -f "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/logs/enhanced_auto_repair.log" ]; then
        tail -3 /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/logs/enhanced_auto_repair.log 2>/dev/null | sed 's/^/  📝 /' || echo "  ❌ ログ読み込みエラー"
    else
        echo "  ❌ ログファイルなし"
    fi
    echo ""
    
    # フロー状況
    echo "🔀 実行フロー:"
    echo "  ① GitHub Actions失敗検知 → ② エラーログ抽出 → ③ Claude用プロンプト生成"
    echo "  ④ Claude Flow起動 → ⑤ 修正案生成 → ⑥ 自動/手動承認 → ⑦ コード修正反映"
    echo "  ⑧ 再Push → ⑨ GitHub Actions再実行 → ①ループ継続"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "🔄 3秒毎自動更新 | Ctrl+C で終了"
}

# メインループ
while true; do
    show_live_status
    sleep 3
done