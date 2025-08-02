#!/usr/bin/env python3
"""
Quality Gate Checker for CI/CD Pipeline
品質ゲート管理とテスト結果分析
"""

import json
import os
import sys
from pathlib import Path
from datetime import datetime
from typing import Dict, Any, List, Optional


class QualityGateChecker:
    """品質ゲートチェッカー"""

    def __init__(self, reports_dir: str = "tests/reports"):
        self.reports_dir = Path(reports_dir)
        self.quality_criteria = {
            "min_test_success_rate": 95.0,  # 95%以上の成功率
            "max_failed_tests": 0,  # 失敗テストは0件
            "min_coverage": 80.0,  # 80%以上のカバレッジ
            "max_security_issues": 0,  # セキュリティ問題は0件
            "max_performance_degradation": 20.0,  # 20%以上の性能劣化は許可しない
        }

    def analyze_test_reports(self) -> Dict[str, Any]:
        """テストレポートを分析"""
        analysis = {
            "timestamp": datetime.now().isoformat(),
            "test_suites": {},
            "overall_metrics": {
                "total_tests": 0,
                "passed_tests": 0,
                "failed_tests": 0,
                "skipped_tests": 0,
                "success_rate": 0.0,
            },
            "quality_gate_results": {},
            "recommendations": [],
        }

        # 各テストレポートを分析
        for report_file in self.reports_dir.glob("*-report.json"):
            if report_file.exists():
                try:
                    suite_name = report_file.stem.replace("-report", "")
                    with open(report_file, "r", encoding="utf-8") as f:
                        data = json.load(f)

                    suite_metrics = self._extract_test_metrics(data, suite_name)
                    analysis["test_suites"][suite_name] = suite_metrics

                    # 全体メトリクスに加算
                    analysis["overall_metrics"]["total_tests"] += suite_metrics.get(
                        "total", 0
                    )
                    analysis["overall_metrics"]["passed_tests"] += suite_metrics.get(
                        "passed", 0
                    )
                    analysis["overall_metrics"]["failed_tests"] += suite_metrics.get(
                        "failed", 0
                    )
                    analysis["overall_metrics"]["skipped_tests"] += suite_metrics.get(
                        "skipped", 0
                    )

                except Exception as e:
                    print(f"Error analyzing {report_file}: {e}")

        # 成功率を計算
        total_tests = analysis["overall_metrics"]["total_tests"]
        if total_tests > 0:
            passed_tests = analysis["overall_metrics"]["passed_tests"]
            analysis["overall_metrics"]["success_rate"] = (
                passed_tests / total_tests
            ) * 100

        # 品質ゲートを評価
        analysis["quality_gate_results"] = self._evaluate_quality_gates(analysis)

        # 推奨事項を生成
        analysis["recommendations"] = self._generate_recommendations(analysis)

        return analysis

    def _extract_test_metrics(
        self, data: Dict[str, Any], suite_name: str
    ) -> Dict[str, Any]:
        """テストメトリクスを抽出"""
        metrics = {
            "suite_name": suite_name,
            "total": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "duration": 0.0,
            "coverage": None,
            "performance_issues": [],
        }

        # pytest-json-report形式の場合
        if "summary" in data:
            summary = data["summary"]
            metrics.update(
                {
                    "total": summary.get("total", 0),
                    "passed": summary.get("passed", 0),
                    "failed": summary.get("failed", 0),
                    "skipped": summary.get("skipped", 0),
                }
            )

        # 期間情報
        if "duration" in data:
            metrics["duration"] = data["duration"]

        # テスト詳細からメトリクスを抽出
        if "tests" in data:
            for test in data["tests"]:
                if test.get("outcome") == "passed":
                    metrics["passed"] += 1
                elif test.get("outcome") == "failed":
                    metrics["failed"] += 1
                elif test.get("outcome") == "skipped":
                    metrics["skipped"] += 1
                metrics["total"] += 1

        return metrics

    def _evaluate_quality_gates(self, analysis: Dict[str, Any]) -> Dict[str, Any]:
        """品質ゲートを評価"""
        results = {
            "overall_status": "PASSED",
            "criteria_results": {},
            "failed_criteria": [],
        }

        overall_metrics = analysis["overall_metrics"]
        success_rate = overall_metrics["success_rate"]
        failed_tests = overall_metrics["failed_tests"]

        # テスト成功率チェック
        success_rate_passed = (
            success_rate >= self.quality_criteria["min_test_success_rate"]
        )
        results["criteria_results"]["test_success_rate"] = {
            "status": "PASSED" if success_rate_passed else "FAILED",
            "actual": success_rate,
            "required": self.quality_criteria["min_test_success_rate"],
        }

        if not success_rate_passed:
            results["failed_criteria"].append("test_success_rate")

        # 失敗テスト数チェック
        failed_tests_passed = failed_tests <= self.quality_criteria["max_failed_tests"]
        results["criteria_results"]["max_failed_tests"] = {
            "status": "PASSED" if failed_tests_passed else "FAILED",
            "actual": failed_tests,
            "required": self.quality_criteria["max_failed_tests"],
        }

        if not failed_tests_passed:
            results["failed_criteria"].append("max_failed_tests")

        # 全体ステータスを決定
        if results["failed_criteria"]:
            results["overall_status"] = "FAILED"

        return results

    def _generate_recommendations(self, analysis: Dict[str, Any]) -> List[str]:
        """推奨事項を生成"""
        recommendations = []

        failed_tests = analysis["overall_metrics"]["failed_tests"]
        success_rate = analysis["overall_metrics"]["success_rate"]

        if failed_tests > 0:
            recommendations.append(
                f"失敗したテスト {failed_tests} 件を修正してください"
            )

        if success_rate < self.quality_criteria["min_test_success_rate"]:
            recommendations.append(
                f"テスト成功率 {success_rate:.1f}% を {self.quality_criteria['min_test_success_rate']:.1f}% 以上に改善してください"
            )

        # パフォーマンス問題の検出
        for suite_name, suite_data in analysis["test_suites"].items():
            if suite_data.get("duration", 0) > 60:  # 60秒超過
                recommendations.append(
                    f"{suite_name} テストスイートの実行時間 ({suite_data['duration']:.1f}s) を短縮してください"
                )

        if not recommendations:
            recommendations.append("全品質基準をクリアしています！")

        return recommendations

    def generate_report(self, output_file: Optional[str] = None) -> Dict[str, Any]:
        """品質ゲートレポートを生成"""
        analysis = self.analyze_test_reports()

        if output_file:
            output_path = Path(output_file)
            output_path.parent.mkdir(parents=True, exist_ok=True)

            with open(output_path, "w", encoding="utf-8") as f:
                json.dump(analysis, f, indent=2, ensure_ascii=False)

            print(f"品質ゲートレポートを生成しました: {output_path}")

        return analysis

    def print_summary(self, analysis: Dict[str, Any]):
        """サマリを表示"""
        print("=" * 60)
        print("          CI/CD 品質ゲート分析結果")
        print("=" * 60)

        overall = analysis["overall_metrics"]
        quality_gate = analysis["quality_gate_results"]

        # 全体メトリクス表示
        print(f"\n📊 テスト実行サマリ:")
        print(f"  総テスト数: {overall['total_tests']}")
        print(f"  成功: {overall['passed_tests']} ✅")
        print(f"  失敗: {overall['failed_tests']} ❌")
        print(f"  スキップ: {overall['skipped_tests']} ⏭️")
        print(f"  成功率: {overall['success_rate']:.1f}%")

        # 品質ゲート結果表示
        print(f"\n🚦 品質ゲート結果: {quality_gate['overall_status']}")

        for criteria, result in quality_gate["criteria_results"].items():
            status_icon = "✅" if result["status"] == "PASSED" else "❌"
            print(f"  {criteria}: {result['status']} {status_icon}")
            print(f"    実際値: {result['actual']}, 要求値: {result['required']}")

        # 推奨事項表示
        print(f"\n💡 推奨事項:")
        for i, rec in enumerate(analysis["recommendations"], 1):
            print(f"  {i}. {rec}")

        # テストスイート別詳細
        print(f"\n📋 テストスイート別詳細:")
        for suite_name, suite_data in analysis["test_suites"].items():
            success_rate = (suite_data["passed"] / max(suite_data["total"], 1)) * 100
            print(
                f"  {suite_name}: {suite_data['passed']}/{suite_data['total']} ({success_rate:.1f}%)"
            )


def main():
    """メイン実行関数"""
    checker = QualityGateChecker()

    # 品質ゲート分析実行
    analysis = checker.generate_report("tests/reports/quality-gate-analysis.json")

    # サマリ表示
    checker.print_summary(analysis)

    # 品質ゲート失敗時の終了コード
    if analysis["quality_gate_results"]["overall_status"] == "FAILED":
        print("\n❌ 品質ゲートに失敗しました。上記の推奨事項に従って修正してください。")
        sys.exit(1)
    else:
        print("\n✅ 品質ゲートに合格しました！")
        sys.exit(0)


if __name__ == "__main__":
    main()
