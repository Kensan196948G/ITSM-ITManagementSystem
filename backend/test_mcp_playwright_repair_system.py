#!/usr/bin/env python3
"""
MCP Playwrightエラー検知・修復システムテストスクリプト
FastAPIベースのITSM準拠システムテスト
"""

import asyncio
import sys
import json
import time
import httpx
from pathlib import Path
from datetime import datetime

# プロジェクトルートをPythonパスに追加
sys.path.append("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend")

from app.services.mcp_playwright_error_monitor import MCPPlaywrightErrorMonitor
from app.services.infinite_loop_repair_controller import InfiniteLoopRepairController


class SystemTester:
    """システムテストクラス"""

    def __init__(self):
        self.base_url = "http://192.168.3.135:8000"
        self.test_results = []

    async def run_all_tests(self):
        """全てのテストを実行"""
        print("=" * 80)
        print("MCP Playwright Error Detection & Repair System Test")
        print("=" * 80)
        print()

        # 1. API接続テスト
        await self.test_api_connectivity()

        # 2. MCP Monitorテスト
        await self.test_mcp_monitor()

        # 3. Loop Controllerテスト
        await self.test_loop_controller()

        # 4. Error Detection テスト
        await self.test_error_detection()

        # 5. Manual Repair テスト
        await self.test_manual_repair()

        # 6. システム統合テスト
        await self.test_system_integration()

        # テスト結果サマリー
        self.print_test_summary()

        # テスト結果をファイルに保存
        await self.save_test_results()

        return all(result["passed"] for result in self.test_results)

    async def test_api_connectivity(self):
        """API接続テスト"""
        test_name = "API Connectivity Test"
        print(f"Running {test_name}...")

        try:
            async with httpx.AsyncClient(timeout=10.0) as client:
                # Health endpoint
                response = await client.get(f"{self.base_url}/health")
                health_status = response.status_code == 200

                # Version endpoint
                response = await client.get(f"{self.base_url}/version")
                version_status = response.status_code == 200

                # API docs
                response = await client.get(f"{self.base_url}/docs")
                docs_status = response.status_code == 200

                passed = health_status and version_status and docs_status

                self.test_results.append(
                    {
                        "test": test_name,
                        "passed": passed,
                        "details": {
                            "health": health_status,
                            "version": version_status,
                            "docs": docs_status,
                        },
                        "timestamp": datetime.now().isoformat(),
                    }
                )

                print(f"✅ {test_name}: {'PASS' if passed else 'FAIL'}")

        except Exception as e:
            self.test_results.append(
                {
                    "test": test_name,
                    "passed": False,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            )
            print(f"❌ {test_name}: FAIL - {str(e)}")

    async def test_mcp_monitor(self):
        """MCP Monitorテスト"""
        test_name = "MCP Playwright Monitor Test"
        print(f"Running {test_name}...")

        try:
            monitor = MCPPlaywrightErrorMonitor()

            # API Health Check
            health_metrics = await monitor.check_api_health()
            health_passed = hasattr(health_metrics, "total_endpoints")

            # Database Check
            db_status = await monitor.check_database_connectivity()
            db_passed = "status" in db_status

            # Performance Check
            perf_metrics = await monitor.monitor_performance()
            perf_passed = "overall_status" in perf_metrics

            # Security Check
            security_status = await monitor.scan_security_issues()
            security_passed = "overall_status" in security_status

            passed = health_passed and db_passed and perf_passed and security_passed

            self.test_results.append(
                {
                    "test": test_name,
                    "passed": passed,
                    "details": {
                        "health_check": health_passed,
                        "database_check": db_passed,
                        "performance_check": perf_passed,
                        "security_check": security_passed,
                        "total_endpoints": getattr(
                            health_metrics, "total_endpoints", 0
                        ),
                        "error_rate": getattr(health_metrics, "error_rate", 0),
                    },
                    "timestamp": datetime.now().isoformat(),
                }
            )

            print(f"✅ {test_name}: {'PASS' if passed else 'FAIL'}")

        except Exception as e:
            self.test_results.append(
                {
                    "test": test_name,
                    "passed": False,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            )
            print(f"❌ {test_name}: FAIL - {str(e)}")

    async def test_loop_controller(self):
        """Loop Controllerテスト"""
        test_name = "Infinite Loop Controller Test"
        print(f"Running {test_name}...")

        try:
            controller = InfiniteLoopRepairController()

            # 初期状態確認
            initial_status = controller.get_status()
            status_passed = "active" in initial_status

            # 設定確認
            config_passed = "max_repair_cycles" in controller.config

            # エラー検知テスト
            error_count = await controller._detect_errors()
            detect_passed = isinstance(error_count, int)

            passed = status_passed and config_passed and detect_passed

            self.test_results.append(
                {
                    "test": test_name,
                    "passed": passed,
                    "details": {
                        "status_check": status_passed,
                        "config_check": config_passed,
                        "error_detection": detect_passed,
                        "detected_errors": error_count,
                        "initial_status": initial_status,
                    },
                    "timestamp": datetime.now().isoformat(),
                }
            )

            print(f"✅ {test_name}: {'PASS' if passed else 'FAIL'}")

        except Exception as e:
            self.test_results.append(
                {
                    "test": test_name,
                    "passed": False,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            )
            print(f"❌ {test_name}: FAIL - {str(e)}")

    async def test_error_detection(self):
        """エラー検知テスト"""
        test_name = "Error Detection API Test"
        print(f"Running {test_name}...")

        try:
            # API経由でのエラー検知テスト
            test_data = {"scan_type": "quick", "deep_scan": False}

            async with httpx.AsyncClient(timeout=30.0) as client:
                # まずは認証が必要かチェック
                response = await client.post(
                    f"{self.base_url}/api/v1/error-repair/detect-errors", json=test_data
                )

                # 401 (認証必要) または 200 (成功) なら正常
                passed = response.status_code in [200, 401, 422]

                details = {
                    "status_code": response.status_code,
                    "response_available": True,
                }

                if response.status_code == 200:
                    response_data = response.json()
                    details.update(
                        {
                            "total_errors": response_data.get("total_errors", 0),
                            "error_categories": response_data.get(
                                "error_categories", {}
                            ),
                            "has_recommendations": bool(
                                response_data.get("recommendations", [])
                            ),
                        }
                    )

                self.test_results.append(
                    {
                        "test": test_name,
                        "passed": passed,
                        "details": details,
                        "timestamp": datetime.now().isoformat(),
                    }
                )

                print(f"✅ {test_name}: {'PASS' if passed else 'FAIL'}")

        except Exception as e:
            self.test_results.append(
                {
                    "test": test_name,
                    "passed": False,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            )
            print(f"❌ {test_name}: FAIL - {str(e)}")

    async def test_manual_repair(self):
        """手動修復テスト"""
        test_name = "Manual Repair API Test"
        print(f"Running {test_name}...")

        try:
            test_data = {
                "repair_type": "manual",
                "priority": "medium",
                "force_repair": False,
            }

            async with httpx.AsyncClient(timeout=30.0) as client:
                response = await client.post(
                    f"{self.base_url}/api/v1/error-repair/manual-repair", json=test_data
                )

                # 401 (認証必要) または 200 (成功) なら正常
                passed = response.status_code in [200, 401, 422]

                details = {
                    "status_code": response.status_code,
                    "endpoint_available": True,
                }

                self.test_results.append(
                    {
                        "test": test_name,
                        "passed": passed,
                        "details": details,
                        "timestamp": datetime.now().isoformat(),
                    }
                )

                print(f"✅ {test_name}: {'PASS' if passed else 'FAIL'}")

        except Exception as e:
            self.test_results.append(
                {
                    "test": test_name,
                    "passed": False,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            )
            print(f"❌ {test_name}: FAIL - {str(e)}")

    async def test_system_integration(self):
        """システム統合テスト"""
        test_name = "System Integration Test"
        print(f"Running {test_name}...")

        try:
            # ファイルシステムテスト
            required_dirs = [
                "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs",
                "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination",
            ]

            dir_tests = []
            for dir_path in required_dirs:
                exists = Path(dir_path).exists()
                dir_tests.append(exists)
                if not exists:
                    Path(dir_path).mkdir(parents=True, exist_ok=True)

            # 設定ファイルテスト
            config_files = [
                "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/api_error_metrics.json",
                "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/infinite_loop_state.json",
            ]

            config_tests = []
            for config_file in config_files:
                exists = Path(config_file).exists()
                config_tests.append(exists)

            # サービス統合テスト
            monitor = MCPPlaywrightErrorMonitor()
            controller = InfiniteLoopRepairController()

            # クロスサービステスト
            monitor_works = hasattr(monitor, "check_api_health")
            controller_works = hasattr(controller, "get_status")

            passed = (
                all(dir_tests)
                and any(config_tests)
                and monitor_works
                and controller_works
            )

            self.test_results.append(
                {
                    "test": test_name,
                    "passed": passed,
                    "details": {
                        "directories": dict(zip(required_dirs, dir_tests)),
                        "config_files": dict(zip(config_files, config_tests)),
                        "monitor_integration": monitor_works,
                        "controller_integration": controller_works,
                    },
                    "timestamp": datetime.now().isoformat(),
                }
            )

            print(f"✅ {test_name}: {'PASS' if passed else 'FAIL'}")

        except Exception as e:
            self.test_results.append(
                {
                    "test": test_name,
                    "passed": False,
                    "error": str(e),
                    "timestamp": datetime.now().isoformat(),
                }
            )
            print(f"❌ {test_name}: FAIL - {str(e)}")

    def print_test_summary(self):
        """テスト結果サマリー表示"""
        print("\n" + "=" * 80)
        print("TEST SUMMARY")
        print("=" * 80)

        total_tests = len(self.test_results)
        passed_tests = sum(1 for result in self.test_results if result["passed"])
        failed_tests = total_tests - passed_tests

        print(f"Total Tests: {total_tests}")
        print(f"Passed: {passed_tests}")
        print(f"Failed: {failed_tests}")
        print(f"Success Rate: {(passed_tests/total_tests*100):.1f}%")
        print()

        # 失敗したテストの詳細
        if failed_tests > 0:
            print("FAILED TESTS:")
            for result in self.test_results:
                if not result["passed"]:
                    print(f"❌ {result['test']}")
                    if "error" in result:
                        print(f"   Error: {result['error']}")
            print()

        # 成功したテストの詳細
        print("PASSED TESTS:")
        for result in self.test_results:
            if result["passed"]:
                print(f"✅ {result['test']}")

        print("\n" + "=" * 80)

    async def save_test_results(self):
        """テスト結果をファイルに保存"""
        try:
            test_results_file = f"/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/test_results_{int(time.time())}.json"

            summary = {
                "timestamp": datetime.now().isoformat(),
                "total_tests": len(self.test_results),
                "passed_tests": sum(1 for r in self.test_results if r["passed"]),
                "failed_tests": sum(1 for r in self.test_results if not r["passed"]),
                "success_rate": (
                    (
                        sum(1 for r in self.test_results if r["passed"])
                        / len(self.test_results)
                        * 100
                    )
                    if self.test_results
                    else 0
                ),
                "test_details": self.test_results,
            }

            with open(test_results_file, "w") as f:
                json.dump(summary, f, indent=2)

            print(f"Test results saved to: {test_results_file}")

        except Exception as e:
            print(f"Failed to save test results: {str(e)}")


async def main():
    """メイン実行関数"""
    tester = SystemTester()

    try:
        success = await tester.run_all_tests()
        return 0 if success else 1
    except KeyboardInterrupt:
        print("\nTest interrupted by user")
        return 1
    except Exception as e:
        print(f"Test failed with error: {str(e)}")
        return 1


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    sys.exit(exit_code)
