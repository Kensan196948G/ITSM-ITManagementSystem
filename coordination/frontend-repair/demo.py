#!/usr/bin/env python3
"""
フロントエンドエラー自動修復システム - デモンストレーション
システムの基本機能と修復能力を実演
"""

import json
import time
import subprocess
from pathlib import Path
from typing import Dict, Any

from auto_repair_system import FrontendAutoRepairSystem

def print_header(title: str):
    """ヘッダーを出力"""
    print("\n" + "=" * 60)
    print(f"🎯 {title}")
    print("=" * 60)

def print_section(title: str):
    """セクションヘッダーを出力"""
    print(f"\n📋 {title}")
    print("-" * 40)

def print_results(data: Dict[str, Any], title: str = "Results"):
    """結果をフォーマットして出力"""
    print(f"\n{title}:")
    for key, value in data.items():
        if isinstance(value, dict):
            print(f"  {key}:")
            for k, v in value.items():
                print(f"    {k}: {v}")
        else:
            print(f"  {key}: {value}")

def demo_error_detection():
    """エラー検出デモ"""
    print_header("エラー検出システム デモンストレーション")
    
    print("🔍 フロントエンドのTypeScript、React、Material-UIエラーを検出中...")
    
    repair_system = FrontendAutoRepairSystem(auto_fix=False)
    
    # エラー監視のみ実行
    errors_data = repair_system.monitor.run_check()
    
    print_section("検出されたエラーサマリー")
    summary = errors_data.get('summary', {})
    print_results(summary, "エラー統計")
    
    # エラーカテゴリ別の詳細
    frontend_errors = errors_data.get('frontend', {})
    for category, errors in frontend_errors.items():
        if errors:
            print(f"\n{category.upper()}エラー (上位3件):")
            for i, error in enumerate(errors[:3], 1):
                print(f"  {i}. {error.get('message', '')[:80]}...")
    
    return errors_data

def demo_error_analysis(errors_data: Dict[str, Any]):
    """エラー分析デモ"""
    print_header("エラー分析システム デモンストレーション")
    
    all_errors = errors_data.get('errors', [])
    if not all_errors:
        print("❌ 分析するエラーがありません")
        return None
    
    print(f"🧠 {len(all_errors)}個のエラーを分析中...")
    
    repair_system = FrontendAutoRepairSystem(auto_fix=False)
    analysis_result = repair_system.analyzer.analyze_errors_batch(all_errors)
    
    print_section("分析結果サマリー")
    summary = analysis_result.get('summary', {})
    print_results(summary, "分析統計")
    
    # 修復可能なエラーの詳細
    print_section("修復可能エラー (上位5件)")
    fixable_analyses = [a for a in analysis_result['analyses'] if a['fixable']]
    
    for i, analysis in enumerate(fixable_analyses[:5], 1):
        error = analysis['error']
        print(f"\n{i}. {error.get('type', '').upper()}エラー:")
        print(f"   ファイル: {error.get('file', 'unknown')}")
        print(f"   メッセージ: {error.get('message', '')[:60]}...")
        print(f"   修復戦略: {analysis.get('fix_strategy', 'unknown')}")
        print(f"   信頼度: {analysis.get('confidence', 0):.1f}")
    
    # 推奨事項
    recommendations = analysis_result.get('recommendations', [])
    if recommendations:
        print_section("修復推奨事項")
        for i, rec in enumerate(recommendations[:3], 1):
            print(f"{i}. 優先度: {rec.get('priority', 'medium').upper()}")
            print(f"   ファイル: {rec.get('file', '')}")
            print(f"   修復戦略: {rec.get('fix_strategy', '')}")
    
    return analysis_result

def demo_test_validation():
    """テスト・検証デモ"""
    print_header("テスト・検証システム デモンストレーション")
    
    repair_system = FrontendAutoRepairSystem(auto_fix=False)
    
    print("🧪 フロントエンドの健全性チェック中...")
    
    # TypeScriptチェック
    print_section("TypeScriptコンパイルチェック")
    ts_result = repair_system.test_runner.run_typescript_check()
    print(f"結果: {'✅ 成功' if ts_result['success'] else '❌ 失敗'}")
    print(f"所要時間: {ts_result['duration']:.1f}秒")
    if not ts_result['success']:
        print(f"エラー数: {len(ts_result.get('errors', []))}")
    
    # ESLintチェック
    print_section("ESLintチェック")
    eslint_result = repair_system.test_runner.run_eslint_check()
    print(f"結果: {'✅ 成功' if eslint_result['success'] else '⚠️ 警告あり'}")
    print(f"所要時間: {eslint_result['duration']:.1f}秒")
    print(f"エラー数: {len(eslint_result.get('errors', []))}")
    print(f"警告数: {len(eslint_result.get('warnings', []))}")
    
    return {
        'typescript': ts_result,
        'eslint': eslint_result
    }

def demo_system_status():
    """システム状態デモ"""
    print_header("システム状態監視 デモンストレーション")
    
    repair_system = FrontendAutoRepairSystem()
    status = repair_system.get_system_status()
    
    print_section("システム設定")
    settings = {
        'ステータス': status.get('status', 'unknown'),
        '自動修復': '有効' if status.get('auto_fix_enabled', False) else '無効',
        '監視間隔': f"{status.get('monitor_interval', 0)}秒",
        '最大修復試行回数': status.get('max_fix_attempts', 0),
        '実行中': '実行中' if status.get('is_running', False) else '停止中'
    }
    
    for key, value in settings.items():
        print(f"  {key}: {value}")
    
    print_section("統計情報")
    stats = {
        '総エラー発見数': status.get('total_errors_found', 0),
        '総修復適用数': status.get('total_fixes_applied', 0),
        '成功率': f"{status.get('success_rate', 0):.1%}",
        '最終チェック': status.get('last_check', '未実行'),
        '最終修復': status.get('last_fix', '未実行')
    }
    
    for key, value in stats.items():
        print(f"  {key}: {value}")
    
    return status

def demo_comprehensive():
    """包括的デモンストレーション"""
    print_header("フロントエンドエラー自動修復システム 包括デモ")
    
    print("""
このデモンストレーションでは、以下の機能を順次実演します：

1️⃣ エラー検出システム
   - TypeScript コンパイルエラー
   - React Hooks エラー  
   - Material-UI 互換性エラー
   - インポート/エクスポートエラー

2️⃣ エラー分析システム
   - 修復可能性評価
   - 修復戦略決定
   - 信頼度スコア算出

3️⃣ テスト・検証システム
   - TypeScript コンパイルチェック
   - ESLint チェック
   - ビルド検証

4️⃣ システム状態監視
   - 設定情報表示
   - 統計情報表示
    """)
    
    input("\n続行するには Enter キーを押してください...")
    
    # 1. エラー検出
    errors_data = demo_error_detection()
    input("\n次のステップに進むには Enter キーを押してください...")
    
    # 2. エラー分析
    if errors_data.get('errors'):
        analysis_result = demo_error_analysis(errors_data)
        input("\n次のステップに進むには Enter キーを押してください...")
    else:
        print("❌ エラーが検出されなかったため、分析をスキップします")
        analysis_result = None
    
    # 3. テスト・検証
    test_results = demo_test_validation()
    input("\n次のステップに進むには Enter キーを押してください...")
    
    # 4. システム状態
    system_status = demo_system_status()
    
    # サマリー
    print_header("デモンストレーション サマリー")
    print(f"""
✅ デモ完了！以下の機能を確認しました：

🔍 エラー検出: {errors_data.get('summary', {}).get('total', 0)}個のエラーを検出
🧠 エラー分析: 修復可能性を評価・戦略決定
🧪 テスト検証: TypeScript・ESLintチェック実行
📊 状態監視: システム設定・統計情報表示

📋 次のステップ:
1. ./start_repair_system.sh でシステム起動
2. 継続監視モードで自動修復を有効化
3. 定期的な修復結果の確認

詳細は README.md をご確認ください。
    """)

def main():
    """メイン関数"""
    print("🚀 フロントエンドエラー自動修復システム デモ")
    print("\n利用可能なデモ:")
    print("1. エラー検出デモ")
    print("2. エラー分析デモ")
    print("3. テスト・検証デモ")
    print("4. システム状態デモ")
    print("5. 包括デモ（全機能）")
    print("6. 終了")
    
    while True:
        try:
            choice = input("\n選択してください (1-6): ").strip()
            
            if choice == '1':
                demo_error_detection()
            elif choice == '2':
                # エラー検出を先に実行
                errors_data = demo_error_detection()
                if errors_data.get('errors'):
                    demo_error_analysis(errors_data)
                else:
                    print("❌ 分析するエラーがありません")
            elif choice == '3':
                demo_test_validation()
            elif choice == '4':
                demo_system_status()
            elif choice == '5':
                demo_comprehensive()
            elif choice == '6':
                print("👋 デモを終了します")
                break
            else:
                print("❌ 無効な選択です。1-6を入力してください。")
                
        except KeyboardInterrupt:
            print("\n\n👋 デモを終了します")
            break
        except Exception as e:
            print(f"❌ エラーが発生しました: {e}")

if __name__ == "__main__":
    main()