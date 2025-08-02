#!/usr/bin/env python3
"""
GitHub Actions自動化エラー対応システム - メインテスト実行スクリプト
- 包括的テストスイートの自動実行
- レポート生成とCI/CD連携
- 最終品質評価とリリース判定
"""

import asyncio
import sys
import os
from pathlib import Path

# プロジェクトルートを追加
sys.path.append(str(Path(__file__).parent))

from tests.automation.integration_test_runner import IntegrationTestRunner
from tests.automation.test_report_generator import TestReportGenerator

async def main():
    """メイン実行関数"""
    print("🚀 GitHub Actions自動化エラー対応システム - 統合テスト開始")
    print("="*80)
    print("📋 テスト内容:")
    print("  ✅ GitHub Actions API接続テスト")
    print("  ✅ エラーパターン分析テスト")
    print("  ✅ 自動修復エンジンテスト")
    print("  ✅ 自動PR作成機能テスト")
    print("  ✅ Pytestによる統合テスト")
    print("  ✅ Playwrightによる E2Eテスト")
    print("  ✅ パフォーマンス・負荷テスト")
    print("  ✅ API健全性チェック")
    print("="*80)
    
    try:
        # 統合テストランナー実行
        runner = IntegrationTestRunner()
        test_results = await runner.run_full_integration_test_suite()
        
        # レポート生成
        report_generator = TestReportGenerator()
        saved_reports = report_generator.save_all_reports(test_results)
        
        # コンソールサマリー出力
        report_generator.print_summary_to_console(test_results)
        
        print("\n📄 生成されたレポート:")
        for report_type, file_path in saved_reports.items():
            print(f"  {report_type}: {file_path}")
        
        # 最終判定
        overall_status = test_results.get("quality_gates", {}).get("overall_status", "UNKNOWN")
        
        if overall_status == "PASS":
            print("\n🎉 GitHub Actions自動化システム: 全テスト合格！")
            print("✅ システムは本番環境へのデプロイ準備が完了しています。")
            return 0
        elif overall_status == "WARN":
            print("\n⚠️ GitHub Actions自動化システム: 警告付きで合格")
            print("🔍 一部改善推奨事項がありますが、デプロイ可能です。")
            return 1
        else:
            print("\n❌ GitHub Actions自動化システム: テスト失敗")
            print("🛠️ 修正が必要です。詳細はレポートを確認してください。")
            return 2
            
    except Exception as e:
        print(f"\n💥 テスト実行中に致命的なエラーが発生しました: {e}")
        return 3

if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)