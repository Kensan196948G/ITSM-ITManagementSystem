#!/usr/bin/env python3
"""
統合テストランナー
- GitHub Actions自動化システムの包括的テスト実行
- Pytest、Playwright、API テストの統合
- CI/CD品質ゲート検証
- 最終レポート生成
"""

import asyncio
import json
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import sys
import os
import tempfile
import shutil

# プロジェクトルートをパスに追加
sys.path.append(str(Path(__file__).parent.parent.parent))

# テストスイートのインポート
from tests.automation.github_actions_test_suite import GitHubActionsTestSuite
from tests.automation.pytest_integration_suite import TestGitHubActionsAutomation
from tests.automation.playwright_e2e_suite import PlaywrightE2ETestSuite


class IntegrationTestRunner:
    """統合テストランナー"""

    def __init__(self):
        self.base_path = Path(__file__).parent
        self.project_root = self.base_path.parent.parent
        self.start_time = datetime.now()

        # テスト結果
        self.test_suites = {}
        self.overall_results = {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "error_tests": 0,
            "warning_tests": 0,
            "skipped_tests": 0,
        }

        # 品質ゲート基準
        self.quality_gates = {
            "min_success_rate": 0.80,  # 80%以上の成功率
            "max_duration_minutes": 15,  # 15分以内での完了
            "required_test_categories": [
                "github_api",
                "error_detection",
                "auto_repair",
                "integration",
            ],
            "max_critical_failures": 0,  # クリティカル失敗は0件
            "min_coverage_percentage": 70,  # 70%以上のカバレッジ
        }

    async def setup_test_environment(self):
        """テスト環境セットアップ"""
        print("🛠️ Setting up integration test environment...")

        # テスト結果ディレクトリ作成
        test_dirs = ["reports", "logs", "screenshots", "artifacts"]

        for dir_name in test_dirs:
            (self.base_path / dir_name).mkdir(exist_ok=True)

        # テスト設定ファイル生成
        test_config = {
            "environment": "test",
            "github_repo": "Kensan196948G/ITSM-ITManagementSystem",
            "test_timeout": 30,
            "max_retries": 2,
            "enable_screenshots": True,
            "enable_videos": False,
            "parallel_execution": False,
        }

        config_file = self.base_path / "test_config.json"
        with open(config_file, "w") as f:
            json.dump(test_config, f, indent=2)

        print("✅ Test environment setup completed")

    async def run_github_actions_test_suite(self) -> Dict[str, Any]:
        """GitHub Actions テストスイート実行"""
        print("\n" + "=" * 60)
        print("🔍 Running GitHub Actions Test Suite")
        print("=" * 60)

        try:
            suite = GitHubActionsTestSuite()
            results = await suite.run_all_tests()

            self.test_suites["github_actions"] = results
            return results

        except Exception as e:
            error_result = {
                "test_suite": "GitHub Actions Test Suite",
                "status": "ERROR",
                "message": str(e),
                "timestamp": datetime.now().isoformat(),
            }
            self.test_suites["github_actions"] = error_result
            print(f"💥 GitHub Actions test suite failed: {e}")
            return error_result

    async def run_pytest_integration_suite(self) -> Dict[str, Any]:
        """Pytest統合テストスイート実行"""
        print("\n" + "=" * 60)
        print("🧪 Running Pytest Integration Suite")
        print("=" * 60)

        try:
            # Pytestを別プロセスで実行
            pytest_command = [
                "python",
                "-m",
                "pytest",
                str(self.base_path / "pytest_integration_suite.py"),
                "-v",
                "--tb=short",
                "--maxfail=10",
                "--durations=10",
                f"--junitxml={self.base_path}/reports/pytest_results.xml",
                f"--json-report",
                f"--json-report-file={self.base_path}/reports/pytest_results.json",
            ]

            result = subprocess.run(
                pytest_command,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=600,  # 10分タイムアウト
            )

            # 結果ファイルから詳細を読み取り
            pytest_results_file = self.base_path / "reports" / "pytest_results.json"
            if pytest_results_file.exists():
                with open(pytest_results_file, "r") as f:
                    pytest_data = json.load(f)

                suite_results = {
                    "test_suite": "Pytest Integration Suite",
                    "status": "PASS" if result.returncode == 0 else "FAIL",
                    "total_tests": pytest_data.get("summary", {}).get("total", 0),
                    "passed": pytest_data.get("summary", {}).get("passed", 0),
                    "failed": pytest_data.get("summary", {}).get("failed", 0),
                    "errors": pytest_data.get("summary", {}).get("error", 0),
                    "skipped": pytest_data.get("summary", {}).get("skipped", 0),
                    "duration": pytest_data.get("duration", 0),
                    "success_rate": pytest_data.get("summary", {}).get("passed", 0)
                    / max(pytest_data.get("summary", {}).get("total", 1), 1),
                    "output": result.stdout,
                    "timestamp": datetime.now().isoformat(),
                }
            else:
                # フォールバック：標準出力から結果を解析
                suite_results = {
                    "test_suite": "Pytest Integration Suite",
                    "status": "PASS" if result.returncode == 0 else "FAIL",
                    "return_code": result.returncode,
                    "output": result.stdout,
                    "error": result.stderr,
                    "timestamp": datetime.now().isoformat(),
                }

            self.test_suites["pytest_integration"] = suite_results
            return suite_results

        except subprocess.TimeoutExpired:
            timeout_result = {
                "test_suite": "Pytest Integration Suite",
                "status": "TIMEOUT",
                "message": "Test execution timed out after 10 minutes",
                "timestamp": datetime.now().isoformat(),
            }
            self.test_suites["pytest_integration"] = timeout_result
            return timeout_result

        except Exception as e:
            error_result = {
                "test_suite": "Pytest Integration Suite",
                "status": "ERROR",
                "message": str(e),
                "timestamp": datetime.now().isoformat(),
            }
            self.test_suites["pytest_integration"] = error_result
            print(f"💥 Pytest integration suite failed: {e}")
            return error_result

    async def run_playwright_e2e_suite(self) -> Dict[str, Any]:
        """Playwright E2Eテストスイート実行"""
        print("\n" + "=" * 60)
        print("🎭 Running Playwright E2E Suite")
        print("=" * 60)

        try:
            suite = PlaywrightE2ETestSuite()
            results = await suite.run_all_e2e_tests()

            self.test_suites["playwright_e2e"] = results
            return results

        except Exception as e:
            error_result = {
                "test_suite": "Playwright E2E Suite",
                "status": "ERROR",
                "message": str(e),
                "timestamp": datetime.now().isoformat(),
            }
            self.test_suites["playwright_e2e"] = error_result
            print(f"💥 Playwright E2E suite failed: {e}")
            return error_result

    async def run_api_health_checks(self) -> Dict[str, Any]:
        """API健全性チェック"""
        print("\n" + "=" * 60)
        print("🏥 Running API Health Checks")
        print("=" * 60)

        health_checks = []

        # GitHub API接続テスト
        try:
            github_result = subprocess.run(
                ["gh", "api", "user"], capture_output=True, text=True, timeout=30
            )

            health_checks.append(
                {
                    "name": "GitHub API Connection",
                    "status": "PASS" if github_result.returncode == 0 else "FAIL",
                    "details": (
                        github_result.stdout
                        if github_result.returncode == 0
                        else github_result.stderr
                    ),
                }
            )
        except Exception as e:
            health_checks.append(
                {"name": "GitHub API Connection", "status": "ERROR", "details": str(e)}
            )

        # ローカルAPI健全性チェック
        api_ports = [8000, 5000, 3000]
        for port in api_ports:
            try:
                import requests

                response = requests.get(f"http://localhost:{port}/health", timeout=5)
                health_checks.append(
                    {
                        "name": f"Local API Port {port}",
                        "status": "PASS" if response.status_code == 200 else "FAIL",
                        "details": f"Status: {response.status_code}",
                    }
                )
                break  # 最初に成功したポートで停止
            except Exception:
                health_checks.append(
                    {
                        "name": f"Local API Port {port}",
                        "status": "SKIP",
                        "details": "Not running or not accessible",
                    }
                )

        # 結果サマリー
        passed_checks = len([c for c in health_checks if c["status"] == "PASS"])
        total_checks = len(health_checks)

        api_results = {
            "test_suite": "API Health Checks",
            "status": "PASS" if passed_checks > 0 else "FAIL",
            "total_checks": total_checks,
            "passed_checks": passed_checks,
            "health_checks": health_checks,
            "timestamp": datetime.now().isoformat(),
        }

        self.test_suites["api_health"] = api_results
        return api_results

    async def run_load_performance_tests(self) -> Dict[str, Any]:
        """負荷・パフォーマンステスト"""
        print("\n" + "=" * 60)
        print("⚡ Running Load & Performance Tests")
        print("=" * 60)

        try:
            # 簡単なパフォーマンステスト
            from coordination.error_pattern_analyzer import ErrorPatternAnalyzer
            from coordination.auto_repair_engine import AutoRepairEngine

            performance_results = []

            # エラーパターン分析のパフォーマンステスト
            analyzer = ErrorPatternAnalyzer()
            large_log = "\n".join(
                [
                    f"Error {i}: ModuleNotFoundError: No module named 'module{i}'"
                    for i in range(1000)
                ]
            )

            start_time = time.time()
            matches = analyzer.analyze_log_content(large_log)
            analysis_duration = time.time() - start_time

            performance_results.append(
                {
                    "test": "Error Pattern Analysis",
                    "input_size": "1000 lines",
                    "duration": analysis_duration,
                    "throughput": 1000 / analysis_duration,
                    "status": "PASS" if analysis_duration < 5.0 else "WARN",
                }
            )

            # 修復エンジンのパフォーマンステスト
            repair_engine = AutoRepairEngine()
            start_time = time.time()

            # 軽量なテストパターン
            test_patterns = ["config validation", "lint check"]
            repair_results = await repair_engine.smart_repair(test_patterns)

            repair_duration = time.time() - start_time

            performance_results.append(
                {
                    "test": "Smart Repair Engine",
                    "input_size": f"{len(test_patterns)} patterns",
                    "duration": repair_duration,
                    "status": "PASS" if repair_duration < 30.0 else "WARN",
                }
            )

            # 全体的な判定
            passed_tests = len(
                [r for r in performance_results if r["status"] == "PASS"]
            )
            total_tests = len(performance_results)

            load_results = {
                "test_suite": "Load & Performance Tests",
                "status": "PASS" if passed_tests >= total_tests * 0.8 else "WARN",
                "total_tests": total_tests,
                "passed_tests": passed_tests,
                "performance_results": performance_results,
                "timestamp": datetime.now().isoformat(),
            }

            self.test_suites["load_performance"] = load_results
            return load_results

        except Exception as e:
            error_result = {
                "test_suite": "Load & Performance Tests",
                "status": "ERROR",
                "message": str(e),
                "timestamp": datetime.now().isoformat(),
            }
            self.test_suites["load_performance"] = error_result
            return error_result

    def calculate_overall_metrics(self):
        """全体メトリクス計算"""
        for suite_name, suite_results in self.test_suites.items():
            if isinstance(suite_results, dict):
                # 各スイートからメトリクスを抽出
                if "total_tests" in suite_results:
                    self.overall_results["total_tests"] += suite_results["total_tests"]
                    self.overall_results["passed_tests"] += suite_results.get(
                        "passed", 0
                    )
                    self.overall_results["failed_tests"] += suite_results.get(
                        "failed", 0
                    )
                    self.overall_results["error_tests"] += suite_results.get(
                        "errors", 0
                    )
                    self.overall_results["skipped_tests"] += suite_results.get(
                        "skipped", 0
                    )
                elif "total_checks" in suite_results:
                    self.overall_results["total_tests"] += suite_results["total_checks"]
                    self.overall_results["passed_tests"] += suite_results.get(
                        "passed_checks", 0
                    )
                elif "status" in suite_results:
                    # 単一ステータスの場合
                    self.overall_results["total_tests"] += 1
                    if suite_results["status"] == "PASS":
                        self.overall_results["passed_tests"] += 1
                    elif suite_results["status"] == "FAIL":
                        self.overall_results["failed_tests"] += 1
                    elif suite_results["status"] == "ERROR":
                        self.overall_results["error_tests"] += 1

    def check_quality_gates(self) -> Dict[str, Any]:
        """品質ゲートチェック"""
        print("\n" + "=" * 60)
        print("🚪 Checking Quality Gates")
        print("=" * 60)

        quality_checks = []
        overall_status = "PASS"

        # 1. 成功率チェック
        total_tests = self.overall_results["total_tests"]
        passed_tests = self.overall_results["passed_tests"]
        success_rate = passed_tests / total_tests if total_tests > 0 else 0

        success_rate_check = {
            "gate": "Minimum Success Rate",
            "threshold": f">= {self.quality_gates['min_success_rate']:.1%}",
            "actual": f"{success_rate:.1%}",
            "status": (
                "PASS"
                if success_rate >= self.quality_gates["min_success_rate"]
                else "FAIL"
            ),
        }
        quality_checks.append(success_rate_check)

        if success_rate_check["status"] == "FAIL":
            overall_status = "FAIL"

        # 2. 実行時間チェック
        duration = (datetime.now() - self.start_time).total_seconds() / 60
        duration_check = {
            "gate": "Maximum Duration",
            "threshold": f"<= {self.quality_gates['max_duration_minutes']} minutes",
            "actual": f"{duration:.1f} minutes",
            "status": (
                "PASS"
                if duration <= self.quality_gates["max_duration_minutes"]
                else "FAIL"
            ),
        }
        quality_checks.append(duration_check)

        if duration_check["status"] == "FAIL":
            overall_status = "FAIL"

        # 3. 必要テストカテゴリチェック
        available_categories = list(self.test_suites.keys())
        required_categories = self.quality_gates["required_test_categories"]
        missing_categories = [
            cat for cat in required_categories if cat not in available_categories
        ]

        categories_check = {
            "gate": "Required Test Categories",
            "threshold": f"All of: {required_categories}",
            "actual": f"Available: {available_categories}",
            "missing": missing_categories,
            "status": "PASS" if len(missing_categories) == 0 else "WARN",
        }
        quality_checks.append(categories_check)

        # 4. クリティカル失敗チェック
        critical_failures = self.overall_results["error_tests"]
        critical_check = {
            "gate": "Maximum Critical Failures",
            "threshold": f"<= {self.quality_gates['max_critical_failures']}",
            "actual": str(critical_failures),
            "status": (
                "PASS"
                if critical_failures <= self.quality_gates["max_critical_failures"]
                else "FAIL"
            ),
        }
        quality_checks.append(critical_check)

        if critical_check["status"] == "FAIL":
            overall_status = "FAIL"

        quality_gate_results = {
            "overall_status": overall_status,
            "checks": quality_checks,
            "summary": {
                "total_tests": total_tests,
                "success_rate": success_rate,
                "duration_minutes": duration,
                "critical_failures": critical_failures,
            },
            "timestamp": datetime.now().isoformat(),
        }

        # 結果出力
        for check in quality_checks:
            status_emoji = (
                "✅"
                if check["status"] == "PASS"
                else "⚠️" if check["status"] == "WARN" else "❌"
            )
            print(
                f"{status_emoji} {check['gate']}: {check['actual']} (Required: {check['threshold']})"
            )

        print(f"\n🏆 Overall Quality Gate Status: {overall_status}")

        return quality_gate_results

    async def generate_comprehensive_report(self) -> Dict[str, Any]:
        """包括的レポート生成"""
        print("\n" + "=" * 60)
        print("📊 Generating Comprehensive Report")
        print("=" * 60)

        # 全体メトリクス計算
        self.calculate_overall_metrics()

        # 品質ゲートチェック
        quality_gate_results = self.check_quality_gates()

        duration = (datetime.now() - self.start_time).total_seconds()

        comprehensive_report = {
            "report_metadata": {
                "generated_at": datetime.now().isoformat(),
                "duration_seconds": duration,
                "test_environment": "integration",
                "report_version": "1.0",
            },
            "executive_summary": {
                "overall_status": quality_gate_results["overall_status"],
                "total_test_suites": len(self.test_suites),
                "total_tests": self.overall_results["total_tests"],
                "passed_tests": self.overall_results["passed_tests"],
                "failed_tests": self.overall_results["failed_tests"],
                "error_tests": self.overall_results["error_tests"],
                "success_rate": self.overall_results["passed_tests"]
                / max(self.overall_results["total_tests"], 1),
            },
            "test_suites": self.test_suites,
            "quality_gates": quality_gate_results,
            "recommendations": self.generate_recommendations(),
        }

        # レポートファイル保存
        report_file = (
            self.base_path
            / "reports"
            / f"integration_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        )
        with open(report_file, "w") as f:
            json.dump(comprehensive_report, f, indent=2)

        # Markdownレポート生成
        markdown_report = self.generate_markdown_report(comprehensive_report)
        markdown_file = (
            self.base_path
            / "reports"
            / f"integration_test_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.md"
        )
        with open(markdown_file, "w") as f:
            f.write(markdown_report)

        print(f"📄 JSON Report: {report_file}")
        print(f"📝 Markdown Report: {markdown_file}")

        return comprehensive_report

    def generate_recommendations(self) -> List[str]:
        """改善提案生成"""
        recommendations = []

        success_rate = self.overall_results["passed_tests"] / max(
            self.overall_results["total_tests"], 1
        )

        if success_rate < 0.9:
            recommendations.append(
                "テスト成功率が90%を下回っています。失敗したテストケースの詳細調査を推奨します。"
            )

        if self.overall_results["error_tests"] > 0:
            recommendations.append(
                "エラーが発生したテストがあります。環境設定や依存関係を確認してください。"
            )

        if (
            "playwright_e2e" not in self.test_suites
            or self.test_suites["playwright_e2e"].get("status") == "SKIPPED"
        ):
            recommendations.append(
                "E2Eテストが実行されていません。Playwrightのインストールを確認してください。"
            )

        if success_rate >= 0.95:
            recommendations.append("優秀な結果です！この品質を維持してください。")

        return recommendations

    def generate_markdown_report(self, report_data: Dict[str, Any]) -> str:
        """Markdownレポート生成"""
        md = "# GitHub Actions自動化システム統合テストレポート\n\n"

        # エグゼクティブサマリー
        summary = report_data["executive_summary"]
        md += "## エグゼクティブサマリー\n\n"
        md += f"**全体ステータス**: {summary['overall_status']}\n"
        md += f"**実行日時**: {report_data['report_metadata']['generated_at']}\n"
        md += f"**実行時間**: {report_data['report_metadata']['duration_seconds']:.1f}秒\n\n"

        md += "### テスト結果概要\n\n"
        md += f"- 総テストスイート数: {summary['total_test_suites']}\n"
        md += f"- 総テスト数: {summary['total_tests']}\n"
        md += f"- 成功: {summary['passed_tests']}\n"
        md += f"- 失敗: {summary['failed_tests']}\n"
        md += f"- エラー: {summary['error_tests']}\n"
        md += f"- 成功率: {summary['success_rate']:.1%}\n\n"

        # 品質ゲート結果
        md += "## 品質ゲート結果\n\n"
        for check in report_data["quality_gates"]["checks"]:
            status_emoji = (
                "✅"
                if check["status"] == "PASS"
                else "⚠️" if check["status"] == "WARN" else "❌"
            )
            md += f"{status_emoji} **{check['gate']}**: {check['actual']}\n"
        md += "\n"

        # テストスイート詳細
        md += "## テストスイート詳細\n\n"
        for suite_name, suite_data in report_data["test_suites"].items():
            md += f"### {suite_data.get('test_suite', suite_name)}\n\n"
            md += f"**ステータス**: {suite_data.get('status', 'N/A')}\n"

            if "total_tests" in suite_data:
                md += f"**テスト数**: {suite_data['total_tests']}\n"
                md += f"**成功率**: {suite_data.get('success_rate', 0):.1%}\n"

            if "message" in suite_data:
                md += f"**メッセージ**: {suite_data['message']}\n"

            md += "\n"

        # 改善提案
        if report_data["recommendations"]:
            md += "## 改善提案\n\n"
            for i, rec in enumerate(report_data["recommendations"], 1):
                md += f"{i}. {rec}\n"
            md += "\n"

        md += "---\n"
        md += "*このレポートは自動生成されました*\n"

        return md

    async def run_full_integration_test_suite(self) -> Dict[str, Any]:
        """完全統合テストスイート実行"""
        print("🚀 Starting Full Integration Test Suite")
        print("🎯 GitHub Actions自動化エラー対応システム")
        print("=" * 80)

        try:
            # 環境セットアップ
            await self.setup_test_environment()

            # 各テストスイートを順番に実行
            await self.run_github_actions_test_suite()
            await self.run_api_health_checks()
            await self.run_load_performance_tests()
            await self.run_pytest_integration_suite()
            await self.run_playwright_e2e_suite()

            # 包括的レポート生成
            final_report = await self.generate_comprehensive_report()

            return final_report

        except Exception as e:
            print(f"💥 Integration test suite failed: {e}")
            return {
                "status": "CRITICAL_ERROR",
                "message": str(e),
                "timestamp": datetime.now().isoformat(),
            }


async def main():
    """メイン実行関数"""
    runner = IntegrationTestRunner()

    try:
        final_report = await runner.run_full_integration_test_suite()

        # 最終判定
        overall_status = final_report.get("quality_gates", {}).get(
            "overall_status", "UNKNOWN"
        )

        if overall_status == "PASS":
            print("\n🎉 全ての品質ゲートをクリアしました！")
            print("✅ GitHub Actions自動化システムは本番環境にデプロイ可能です。")
            exit_code = 0
        elif overall_status == "WARN":
            print("\n⚠️ 一部の品質ゲートで警告があります。")
            print("🔍 詳細な調査を推奨しますが、デプロイは可能です。")
            exit_code = 1
        else:
            print("\n❌ 品質ゲートでの失敗があります。")
            print("🛠️ 修正が必要です。本番デプロイは推奨されません。")
            exit_code = 2

        return exit_code

    except Exception as e:
        print(f"\n💥 統合テスト実行中に致命的なエラーが発生しました: {e}")
        return 3


if __name__ == "__main__":
    exit_code = asyncio.run(main())
    exit(exit_code)
