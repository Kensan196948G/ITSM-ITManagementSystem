#!/bin/bash

# GitHub Actions失敗→Claude自動修復→再実行ループ リアルタイム実況ダッシュボード

show_dashboard() {
    clear
    echo "🔄 GitHub Actions失敗→Claude自動修復→再実行ループ - リアルタイム実況"
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "⏰ $(date '+%Y-%m-%d %H:%M:%S')"
    echo ""
    
    echo "📊 システム状況:"
    if [ -f "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/enhanced_repair_state.json" ]; then
        MONITORING=$(jq -r '.monitoring // false' /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/enhanced_repair_state.json 2>/dev/null)
        REPAIR_CYCLES=$(jq -r '.repair_cycles // 0' /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/enhanced_repair_state.json 2>/dev/null)
        ACTIVE_REPAIRS=$(jq -r '.active_repairs | length' /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/enhanced_repair_state.json 2>/dev/null)
        LAST_UPDATED=$(jq -r '.last_updated // "不明"' /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/enhanced_repair_state.json 2>/dev/null)
        echo "  💻 監視中: $MONITORING | 🔧 修復サイクル: $REPAIR_CYCLES | 🚀 アクティブ修復: $ACTIVE_REPAIRS"
        echo "  📅 最終更新: $LAST_UPDATED"
    else
        echo "  ❌ enhanced_repair_state.json 読み込みエラー"
    fi
    echo ""
    
    echo "📈 無限Loop監視:"
    if [ -f "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/infinite_loop_state.json" ]; then
        LOOP_COUNT=$(jq -r '.loop_count // 0' /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/infinite_loop_state.json 2>/dev/null)
        TOTAL_FIXED=$(jq -r '.total_errors_fixed // 0' /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/infinite_loop_state.json 2>/dev/null)
        LAST_SCAN=$(jq -r '.last_scan // "不明"' /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/infinite_loop_state.json 2>/dev/null)
        echo "  🔄 Loop数: $LOOP_COUNT | 🛠️ 修復完了: $TOTAL_FIXED"
        echo "  📊 最終スキャン: $LAST_SCAN"
    else
        echo "  ❌ infinite_loop_state.json 読み込みエラー"
    fi
    echo ""
    
    echo "🔧 最新アクティビティ:"
    if [ -f "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/logs/enhanced_auto_repair.log" ]; then
        tail -3 /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/logs/enhanced_auto_repair.log 2>/dev/null | sed 's/^/  /' || echo "  ログ読み込み中..."
    else
        echo "  ログファイルが見つかりません"
    fi
    echo ""
    
    echo "💻 実行中プロセス:"
    ENHANCED_PID=$(ps aux | grep enhanced_github_actions_auto_repair | grep -v grep | awk '{print $2}' | head -1)
    INFINITE_PID=$(ps aux | grep infinite_loop_monitor | grep -v grep | awk '{print $2}' | head -1)
    
    if [ ! -z "$ENHANCED_PID" ]; then
        echo "  ✅ Enhanced Auto-Repair: PID $ENHANCED_PID"
    else
        echo "  ❌ Enhanced Auto-Repair: 停止"
    fi
    
    if [ ! -z "$INFINITE_PID" ]; then
        echo "  ✅ Infinite Loop Monitor: PID $INFINITE_PID"
    else
        echo "  ❌ Infinite Loop Monitor: 停止"
    fi
    echo ""
    
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo ""
    
    echo "🔍 GitHub Actions処理状況:"
    if [ -f "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/enhanced_repair_state.json" ]; then
        jq -r '.active_repairs | to_entries | map("  Run " + .key + ": " + .value.status) | join("\n")' /media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/enhanced_repair_state.json 2>/dev/null | head -5
    else
        echo "  状況ファイル読み込み中..."
    fi
    echo ""
    
    echo "📋 提案フロー実行状況:"
    echo "  ① GitHub Actions実行 → ② 失敗検知 → ③ エラーログ抽出"
    echo "  ④ Claude用プロンプト生成 → ⑤ Claude Flow起動 → ⑥ 修正案生成"
    echo "  ⑦ 自動/手動承認 → ⑧ コード修正反映 → ⑨ 再Push → ①ループ継続"
    echo ""
    echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
    echo "Ctrl+C で終了"
}

# メインループ
while true; do
    show_dashboard
    sleep 5
done