#!/usr/bin/env python3
"""
自動修復システムのテスト実行スクリプト
"""

import asyncio
import json
import logging
import sys
from datetime import datetime
from pathlib import Path

# プロジェクトのルートパスを追加
sys.path.insert(0, str(Path(__file__).parent))

from app.services.auto_repair import AutoRepairSystem, DetectedError, ErrorType
from app.services.repair_reporter import RepairReporter


async def create_sample_errors():
    """テスト用のサンプルエラーを作成"""
    sample_errors = {
        "backend_errors": [
            {
                "id": "error_test_001",
                "error_type": "import_error",
                "severity": "high",
                "message": "ModuleNotFoundError: No module named 'missing_module'",
                "file_path": "/test/path/test.py",
                "line_number": 10,
                "stack_trace": "Traceback...",
                "detected_at": datetime.now().isoformat(),
                "context": {"test": True}
            }
        ],
        "api_errors": [
            {
                "id": "error_test_002",
                "error_type": "fastapi_endpoint",
                "severity": "medium",
                "message": "FastAPI endpoint error: 404 Not Found",
                "file_path": "/test/api/test.py",
                "line_number": 25,
                "stack_trace": "FastAPI error...",
                "detected_at": datetime.now().isoformat(),
                "context": {"endpoint": "/api/v1/test"}
            }
        ],
        "database_errors": [
            {
                "id": "error_test_003",
                "error_type": "sqlalchemy_model",
                "severity": "critical",
                "message": "sqlalchemy.exc.IntegrityError: constraint violation",
                "file_path": "/test/models/test.py",
                "line_number": 15,
                "stack_trace": "SQLAlchemy error...",
                "detected_at": datetime.now().isoformat(),
                "context": {"table": "test_table"}
            }
        ],
        "validation_errors": [],
        "cors_errors": [],
        "authentication_errors": [],
        "last_check": datetime.now().isoformat(),
        "error_count": 3
    }
    
    # エラーファイルに保存
    errors_file = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/errors.json")
    errors_file.parent.mkdir(parents=True, exist_ok=True)
    
    with open(errors_file, 'w', encoding='utf-8') as f:
        json.dump(sample_errors, f, indent=2, ensure_ascii=False)
    
    print(f"✅ サンプルエラーを作成: {errors_file}")
    return sample_errors


async def test_auto_repair_system():
    """自動修復システムのテスト"""
    print("🧪 自動修復システムテスト開始")
    
    # サンプルエラーを作成
    await create_sample_errors()
    
    # 自動修復システムを初期化
    repair_system = AutoRepairSystem()
    
    try:
        # 1回実行テスト
        print("\n🔧 1回実行テスト")
        result = await repair_system.run_once()
        
        print(f"検出エラー数: {result['errors_detected']}")
        print(f"修復試行数: {result['fixes_attempted']}")
        print(f"修復成功数: {result['fixes_successful']}")
        
        # 結果を保存
        test_results_file = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/tests/reports/test_auto_repair_results.json")
        test_results_file.parent.mkdir(parents=True, exist_ok=True)
        
        with open(test_results_file, 'w', encoding='utf-8') as f:
            json.dump(result, f, indent=2, ensure_ascii=False)
        
        print(f"✅ テスト結果を保存: {test_results_file}")
        
        return result
        
    except Exception as e:
        print(f"❌ テスト実行エラー: {e}")
        logging.error(f"Test execution error: {e}", exc_info=True)
        return None


async def test_reporter():
    """レポート機能のテスト"""
    print("\n📋 レポート機能テスト")
    
    reporter = RepairReporter("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem")
    
    try:
        # レポート生成
        result = await reporter.generate_comprehensive_report()
        
        print("レポート生成完了:")
        print(f"  HTML: {result['html_path']}")
        print(f"  JSON: {result['json_path']}")
        print(f"  Markdown: {result['markdown_path']}")
        
        # ダッシュボードデータ生成
        dashboard = await reporter.generate_summary_dashboard()
        print(f"システムヘルス: {dashboard['system_health']['status']}")
        
        return result
        
    except Exception as e:
        print(f"❌ レポートテストエラー: {e}")
        logging.error(f"Reporter test error: {e}", exc_info=True)
        return None


async def cleanup_test_data():
    """テストデータのクリーンアップ"""
    print("\n🧹 テストデータクリーンアップ")
    
    test_files = [
        "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/errors.json",
        "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/fixes.json"
    ]
    
    for file_path in test_files:
        try:
            path = Path(file_path)
            if path.exists():
                # バックアップを作成
                backup_path = path.with_suffix('.json.backup')
                path.rename(backup_path)
                print(f"✅ {file_path} をバックアップ: {backup_path}")
        except Exception as e:
            print(f"⚠️ {file_path} のクリーンアップに失敗: {e}")


async def main():
    """メインテスト実行"""
    print("🚀 自動修復システム 統合テスト")
    print("=" * 50)
    
    # ログ設定
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    
    try:
        # 自動修復システムテスト
        repair_result = await test_auto_repair_system()
        
        # レポート機能テスト
        report_result = await test_reporter()
        
        # 結果サマリー
        print("\n" + "=" * 50)
        print("📊 テスト結果サマリー")
        print("=" * 50)
        
        if repair_result:
            print("✅ 自動修復システム: テスト成功")
        else:
            print("❌ 自動修復システム: テスト失敗")
        
        if report_result:
            print("✅ レポート機能: テスト成功")
        else:
            print("❌ レポート機能: テスト失敗")
        
        # テストファイルの場所を表示
        print("\n📁 生成されたファイル:")
        test_reports_dir = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/tests/reports")
        if test_reports_dir.exists():
            for file in test_reports_dir.glob("*auto*repair*"):
                print(f"  {file}")
        
        print("\n🎉 統合テスト完了")
        
    except Exception as e:
        print(f"\n❌ 統合テストでエラーが発生: {e}")
        logging.error(f"Integration test error: {e}", exc_info=True)
    
    finally:
        # テストデータのクリーンアップ（オプション）
        # await cleanup_test_data()
        pass


if __name__ == "__main__":
    asyncio.run(main())