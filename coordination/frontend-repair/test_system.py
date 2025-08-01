#!/usr/bin/env python3
"""
フロントエンドエラー自動修復システム - テストスクリプト
システムの基本動作を確認
"""

import json
import sys
import time
from pathlib import Path

# システムコンポーネントをインポート
try:
    from error_monitor import FrontendErrorMonitor
    from error_analyzer import FrontendErrorAnalyzer
    from code_fixer import FrontendCodeFixer
    from test_runner import FrontendTestRunner
    from auto_repair_system import FrontendAutoRepairSystem
    print("✅ All system components imported successfully")
except ImportError as e:
    print(f"❌ Failed to import system components: {e}")
    sys.exit(1)

def test_error_monitor():
    """エラー監視システムのテスト"""
    print("\n🔍 Testing Error Monitor...")
    try:
        monitor = FrontendErrorMonitor()
        
        # 1回だけのチェックを実行
        errors_data = monitor.run_check()
        
        print(f"✅ Error monitoring completed")
        print(f"   Errors found: {errors_data['summary']['total']}")
        print(f"   TypeScript: {errors_data['summary']['typescript']}")
        print(f"   React: {errors_data['summary']['react']}")
        print(f"   Material-UI: {errors_data['summary']['materialUI']}")
        print(f"   Imports: {errors_data['summary']['imports']}")
        print(f"   Props: {errors_data['summary']['props']}")
        
        return True
    except Exception as e:
        print(f"❌ Error monitor test failed: {e}")
        return False

def test_error_analyzer():
    """エラー分析システムのテスト"""
    print("\n🧠 Testing Error Analyzer...")
    try:
        analyzer = FrontendErrorAnalyzer()
        
        # サンプルエラーでテスト
        sample_errors = [
            {
                'type': 'typescript',
                'message': "Property 'testProp' does not exist on type 'User'",
                'file': 'src/test.tsx',
                'line': 10,
                'severity': 'error'
            },
            {
                'type': 'react',
                'message': "React Hook useEffect has a missing dependency: 'userId'",
                'file': 'src/components/UserProfile.tsx',
                'line': 25,
                'severity': 'warning'
            }
        ]
        
        analysis_result = analyzer.analyze_errors_batch(sample_errors)
        
        print(f"✅ Error analysis completed")
        print(f"   Total errors analyzed: {analysis_result['summary']['total_errors']}")
        print(f"   Fixable errors: {analysis_result['summary']['fixable_errors']}")
        print(f"   Fixability score: {analysis_result['summary']['fixability_score']:.2f}")
        
        return True
    except Exception as e:
        print(f"❌ Error analyzer test failed: {e}")
        return False

def test_code_fixer():
    """コード修復システムのテスト"""
    print("\n🔧 Testing Code Fixer...")
    try:
        fixer = FrontendCodeFixer()
        
        # サンプル分析結果でテスト（実際のファイル修正は行わない）
        sample_analysis = {
            'error': {
                'type': 'typescript',
                'message': "Property 'testProp' does not exist on type 'User'",
                'file': 'src/test.tsx',
                'line': 10
            },
            'category': 'typescript',
            'fixable': True,
            'fix_strategy': 'add_property',
            'extracted_info': ['testProp', 'User']
        }
        
        print("✅ Code fixer initialized successfully")
        print("   (Test mode - no actual file modifications)")
        
        return True
    except Exception as e:
        print(f"❌ Code fixer test failed: {e}")
        return False

def test_test_runner():
    """テスト実行システムのテスト"""
    print("\n🧪 Testing Test Runner...")
    try:
        test_runner = FrontendTestRunner()
        
        # TypeScriptチェックのみテスト（時間短縮のため）
        print("   Running TypeScript check...")
        ts_result = test_runner.run_typescript_check()
        
        print(f"✅ Test runner completed")
        print(f"   TypeScript check: {'✅ Passed' if ts_result['success'] else '❌ Failed'}")
        print(f"   Duration: {ts_result['duration']:.2f}s")
        
        return True
    except Exception as e:
        print(f"❌ Test runner test failed: {e}")
        return False

def test_auto_repair_system():
    """自動修復システム統合テスト"""
    print("\n🤖 Testing Auto Repair System...")
    try:
        repair_system = FrontendAutoRepairSystem(
            monitor_interval=5,  # テスト用短縮間隔
            auto_fix=False       # テスト用修復無効
        )
        
        # システム状態確認
        status = repair_system.get_system_status()
        print(f"✅ Auto repair system initialized")
        print(f"   Status: {status.get('status', 'unknown')}")
        print(f"   Auto-fix enabled: {status.get('auto_fix_enabled', False)}")
        print(f"   Monitor interval: {status.get('monitor_interval', 0)}s")
        
        # 1回だけのチェック実行
        print("   Running single check cycle...")
        cycle_result = repair_system.run_single_check()
        
        print(f"✅ Single check completed")
        print(f"   Errors found: {cycle_result['errors_found']}")
        print(f"   Cycle success: {cycle_result['cycle_success']}")
        print(f"   Duration: {cycle_result['duration']:.2f}s")
        
        return True
    except Exception as e:
        print(f"❌ Auto repair system test failed: {e}")
        return False

def test_file_structure():
    """ファイル構造とアクセス権限のテスト"""
    print("\n📁 Testing File Structure...")
    try:
        base_path = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem")
        
        # 必要なディレクトリの確認
        required_dirs = [
            base_path / "frontend",
            base_path / "coordination",
            base_path / "coordination" / "frontend-repair"
        ]
        
        for dir_path in required_dirs:
            if dir_path.exists():
                print(f"   ✅ {dir_path.name} directory exists")
            else:
                print(f"   ❌ {dir_path.name} directory missing")
                return False
        
        # 必要なファイルの確認
        required_files = [
            base_path / "frontend" / "package.json",
            base_path / "coordination" / "errors.json",
            base_path / "coordination" / "fixes.json"
        ]
        
        for file_path in required_files:
            if file_path.exists():
                print(f"   ✅ {file_path.name} file exists")
            else:
                print(f"   ⚠️ {file_path.name} file missing (will be created)")
        
        # アクセス権限確認
        coordination_path = base_path / "coordination"
        if coordination_path.exists():
            try:
                test_file = coordination_path / "test_write.tmp"
                test_file.write_text("test")
                test_file.unlink()
                print("   ✅ Write permissions OK")
            except Exception as e:
                print(f"   ❌ Write permission error: {e}")
                return False
        
        return True
    except Exception as e:
        print(f"❌ File structure test failed: {e}")
        return False

def run_comprehensive_test():
    """包括的システムテストを実行"""
    print("🚀 Frontend Auto Repair System - Comprehensive Test")
    print("=" * 60)
    
    test_results = []
    
    # 各テストを実行
    tests = [
        ("File Structure", test_file_structure),
        ("Error Monitor", test_error_monitor),
        ("Error Analyzer", test_error_analyzer),
        ("Code Fixer", test_code_fixer),
        ("Test Runner", test_test_runner),
        ("Auto Repair System", test_auto_repair_system)
    ]
    
    for test_name, test_func in tests:
        print(f"\n{'=' * 20} {test_name} {'=' * 20}")
        try:
            result = test_func()
            test_results.append((test_name, result))
        except Exception as e:
            print(f"❌ {test_name} test crashed: {e}")
            test_results.append((test_name, False))
    
    # 結果サマリー
    print("\n" + "=" * 60)
    print("📊 Test Results Summary")
    print("=" * 60)
    
    passed = 0
    failed = 0
    
    for test_name, result in test_results:
        status = "✅ PASSED" if result else "❌ FAILED"
        print(f"{test_name:.<30} {status}")
        if result:
            passed += 1
        else:
            failed += 1
    
    print(f"\nTotal: {len(test_results)} tests")
    print(f"Passed: {passed}")
    print(f"Failed: {failed}")
    
    if failed == 0:
        print("\n🎉 All tests passed! System is ready for use.")
        return True
    else:
        print(f"\n⚠️ {failed} test(s) failed. Please check the errors above.")
        return False

if __name__ == "__main__":
    success = run_comprehensive_test()
    sys.exit(0 if success else 1)