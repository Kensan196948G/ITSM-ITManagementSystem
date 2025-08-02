#!/usr/bin/env python3
"""
Test health check and quality gate validator
"""
import json
import sys
import argparse
from pathlib import Path
from typing import Dict, Any, List, Tuple
from datetime import datetime
import logging

# Set up logging
logging.basicConfig(
    level=logging.INFO, format="%(asctime)s - %(levelname)s - %(message)s"
)
logger = logging.getLogger(__name__)


class TestHealthChecker:
    """Test health checker and quality gate validator"""

    def __init__(self, reports_dir: str):
        self.reports_dir = Path(reports_dir)
        self.quality_gates = {
            "test_success_rate": {"threshold": 95.0, "operator": ">="},
            "code_coverage": {"threshold": 80.0, "operator": ">="},
            "max_failed_tests": {"threshold": 0, "operator": "<="},
            "max_security_issues": {"threshold": 0, "operator": "<="},
            "max_duration": {"threshold": 600, "operator": "<="},  # 10 minutes
            "min_tests": {"threshold": 10, "operator": ">="},
        }

    def load_report_data(self) -> Dict[str, Any]:
        """Load all available test report data"""
        data = {
            "unit": {},
            "api": {},
            "e2e": {},
            "load": {},
            "coverage": {},
            "security": {},
            "benchmark": {},
        }

        # Load different report types
        report_patterns = {
            "unit": ["unit-report.json", "pytest_report.json"],
            "api": ["api-report.json", "api-fixed-report.json"],
            "e2e": ["e2e-report.json", "playwright-report.json"],
            "load": ["load-report.json", "load-benchmark.json"],
            "coverage": ["coverage.json", "coverage-report.json"],
            "security": ["bandit-report.json", "safety-report.json"],
            "benchmark": ["benchmark.json", "api-benchmark.json"],
        }

        for report_type, patterns in report_patterns.items():
            for pattern in patterns:
                report_file = self.reports_dir / pattern
                if report_file.exists():
                    try:
                        with open(report_file, "r") as f:
                            file_data = json.load(f)
                            data[report_type] = file_data
                            logger.info(f"Loaded {pattern}")
                            break
                    except (json.JSONDecodeError, IOError) as e:
                        logger.warning(f"Could not load {pattern}: {e}")

        return data

    def extract_test_metrics(self, data: Dict[str, Any]) -> Dict[str, Any]:
        """Extract key metrics from test data"""
        metrics = {
            "total_tests": 0,
            "passed_tests": 0,
            "failed_tests": 0,
            "skipped_tests": 0,
            "success_rate": 0.0,
            "total_duration": 0.0,
            "coverage_percent": 0.0,
            "security_issues": 0,
            "performance_issues": [],
            "suite_metrics": {},
        }

        # Process test suites
        for suite_name in ["unit", "api", "e2e", "load"]:
            suite_data = data.get(suite_name, {})
            if not suite_data:
                continue

            suite_metrics = self._extract_suite_metrics(suite_name, suite_data)
            metrics["suite_metrics"][suite_name] = suite_metrics

            # Aggregate totals
            metrics["total_tests"] += suite_metrics["total"]
            metrics["passed_tests"] += suite_metrics["passed"]
            metrics["failed_tests"] += suite_metrics["failed"]
            metrics["skipped_tests"] += suite_metrics["skipped"]
            metrics["total_duration"] += suite_metrics["duration"]

        # Calculate success rate
        if metrics["total_tests"] > 0:
            metrics["success_rate"] = (
                metrics["passed_tests"] / metrics["total_tests"]
            ) * 100

        # Extract coverage
        if data.get("coverage"):
            coverage_data = data["coverage"]
            if "totals" in coverage_data:
                metrics["coverage_percent"] = coverage_data["totals"].get(
                    "percent_covered", 0
                )

        # Extract security issues
        if data.get("security"):
            security_data = data["security"]
            if "results" in security_data:
                metrics["security_issues"] = len(security_data["results"])

        # Extract performance issues
        if data.get("benchmark"):
            benchmark_data = data["benchmark"]
            if "benchmarks" in benchmark_data:
                slow_benchmarks = []
                for bench in benchmark_data["benchmarks"]:
                    if bench.get("stats", {}).get("mean", 0) > 1.0:  # > 1 second
                        slow_benchmarks.append(
                            {
                                "name": bench.get("name", "Unknown"),
                                "duration": bench.get("stats", {}).get("mean", 0),
                            }
                        )
                metrics["performance_issues"] = slow_benchmarks

        return metrics

    def _extract_suite_metrics(
        self, suite_name: str, suite_data: Dict[str, Any]
    ) -> Dict[str, Any]:
        """Extract metrics from individual test suite"""
        metrics = {
            "total": 0,
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "duration": 0.0,
            "success_rate": 0.0,
        }

        # Handle different report formats
        if "summary" in suite_data:
            summary = suite_data["summary"]
            metrics.update(
                {
                    "total": summary.get("total", 0),
                    "passed": summary.get("passed", 0),
                    "failed": summary.get("failed", 0),
                    "skipped": summary.get("skipped", 0),
                    "duration": suite_data.get("duration", 0),
                }
            )
        elif "tests" in suite_data:
            # Process individual test results
            tests = suite_data["tests"]
            metrics["total"] = len(tests)

            for test in tests:
                outcome = test.get("outcome", "").lower()
                if outcome in ["passed", "pass"]:
                    metrics["passed"] += 1
                elif outcome in ["failed", "fail"]:
                    metrics["failed"] += 1
                elif outcome in ["skipped", "skip"]:
                    metrics["skipped"] += 1

                metrics["duration"] += test.get("duration", 0)

        # Calculate success rate
        if metrics["total"] > 0:
            metrics["success_rate"] = (metrics["passed"] / metrics["total"]) * 100

        return metrics

    def evaluate_quality_gates(self, metrics: Dict[str, Any]) -> Tuple[bool, List[str]]:
        """Evaluate quality gates and return pass/fail status with issues"""
        issues = []
        passed = True

        # Test success rate gate
        success_rate = metrics["success_rate"]
        threshold = self.quality_gates["test_success_rate"]["threshold"]
        if success_rate < threshold:
            issues.append(
                f"Test success rate {success_rate:.1f}% below threshold {threshold}%"
            )
            passed = False

        # Code coverage gate
        coverage = metrics["coverage_percent"]
        threshold = self.quality_gates["code_coverage"]["threshold"]
        if coverage < threshold:
            issues.append(f"Code coverage {coverage:.1f}% below threshold {threshold}%")
            passed = False

        # Failed tests gate
        failed_tests = metrics["failed_tests"]
        threshold = self.quality_gates["max_failed_tests"]["threshold"]
        if failed_tests > threshold:
            issues.append(
                f"Failed tests count {failed_tests} exceeds threshold {threshold}"
            )
            passed = False

        # Security issues gate
        security_issues = metrics["security_issues"]
        threshold = self.quality_gates["max_security_issues"]["threshold"]
        if security_issues > threshold:
            issues.append(
                f"Security issues count {security_issues} exceeds threshold {threshold}"
            )
            passed = False

        # Duration gate
        duration = metrics["total_duration"]
        threshold = self.quality_gates["max_duration"]["threshold"]
        if duration > threshold:
            issues.append(
                f"Test duration {duration:.1f}s exceeds threshold {threshold}s"
            )
            passed = False

        # Minimum tests gate
        total_tests = metrics["total_tests"]
        threshold = self.quality_gates["min_tests"]["threshold"]
        if total_tests < threshold:
            issues.append(f"Total tests count {total_tests} below minimum {threshold}")
            passed = False

        # Suite-specific gates
        critical_suites = ["api", "unit"]
        for suite_name in critical_suites:
            suite_metrics = metrics["suite_metrics"].get(suite_name, {})
            if suite_metrics and suite_metrics.get("success_rate", 0) < 90:
                issues.append(
                    f"Critical suite {suite_name} success rate {suite_metrics.get('success_rate', 0):.1f}% below 90%"
                )
                passed = False

        return passed, issues

    def generate_health_report(
        self, metrics: Dict[str, Any], quality_passed: bool, issues: List[str]
    ) -> Dict[str, Any]:
        """Generate comprehensive health report"""
        return {
            "timestamp": datetime.now().isoformat(),
            "overall_status": "PASS" if quality_passed else "FAIL",
            "quality_gates": {
                "passed": quality_passed,
                "issues": issues,
                "gates_checked": len(self.quality_gates),
            },
            "test_metrics": {
                "total_tests": metrics["total_tests"],
                "passed_tests": metrics["passed_tests"],
                "failed_tests": metrics["failed_tests"],
                "skipped_tests": metrics["skipped_tests"],
                "success_rate": round(metrics["success_rate"], 2),
                "total_duration": round(metrics["total_duration"], 2),
            },
            "quality_metrics": {
                "code_coverage": round(metrics["coverage_percent"], 2),
                "security_issues": metrics["security_issues"],
                "performance_issues": len(metrics["performance_issues"]),
            },
            "suite_breakdown": metrics["suite_metrics"],
            "recommendations": self._generate_recommendations(metrics, issues),
            "next_steps": self._get_next_steps(quality_passed, issues),
        }

    def _generate_recommendations(
        self, metrics: Dict[str, Any], issues: List[str]
    ) -> List[str]:
        """Generate recommendations based on metrics and issues"""
        recommendations = []

        if metrics["success_rate"] < 95:
            recommendations.append(
                "Review and fix failed tests to improve success rate"
            )

        if metrics["coverage_percent"] < 80:
            recommendations.append("Add more unit tests to increase code coverage")

        if metrics["total_duration"] > 300:  # 5 minutes
            recommendations.append(
                "Optimize test execution time through parallelization or test selection"
            )

        if metrics["security_issues"] > 0:
            recommendations.append(
                "Address security vulnerabilities identified in the scan"
            )

        if len(metrics["performance_issues"]) > 0:
            recommendations.append("Optimize slow-running tests and benchmarks")

        # Suite-specific recommendations
        for suite_name, suite_metrics in metrics["suite_metrics"].items():
            if suite_metrics.get("failed", 0) > 0:
                recommendations.append(f"Fix failing tests in {suite_name} test suite")

            if suite_metrics.get("duration", 0) > 180:  # 3 minutes per suite
                recommendations.append(
                    f"Optimize {suite_name} test suite execution time"
                )

        if not recommendations:
            recommendations.append("All quality metrics are within acceptable ranges")

        return recommendations

    def _get_next_steps(self, quality_passed: bool, issues: List[str]) -> List[str]:
        """Get next steps based on quality gate results"""
        if quality_passed:
            return [
                "All quality gates passed - ready for deployment",
                "Continue monitoring test metrics",
                "Consider adding additional test coverage",
            ]
        else:
            steps = ["Quality gates failed - address the following issues:"]
            steps.extend([f"- {issue}" for issue in issues])
            steps.extend(
                ["Re-run tests after fixes", "Review test strategy if issues persist"]
            )
            return steps

    def run_health_check(self) -> Dict[str, Any]:
        """Run complete health check and return results"""
        logger.info("Starting test health check...")

        # Load data
        data = self.load_report_data()
        logger.info("Loaded test report data")

        # Extract metrics
        metrics = self.extract_test_metrics(data)
        logger.info(
            f"Extracted metrics: {metrics['total_tests']} tests, {metrics['success_rate']:.1f}% success rate"
        )

        # Evaluate quality gates
        quality_passed, issues = self.evaluate_quality_gates(metrics)
        logger.info(
            f"Quality gates: {'PASSED' if quality_passed else 'FAILED'} ({len(issues)} issues)"
        )

        # Generate report
        report = self.generate_health_report(metrics, quality_passed, issues)

        # Save report
        report_file = self.reports_dir / "health_check_report.json"
        with open(report_file, "w") as f:
            json.dump(report, f, indent=2)

        logger.info(f"Health check report saved to {report_file}")

        return report

    def print_summary(self, report: Dict[str, Any]):
        """Print summary of health check results"""
        status = report["overall_status"]
        metrics = report["test_metrics"]
        quality = report["quality_metrics"]

        print("\n" + "=" * 60)
        print("🏥 TEST HEALTH CHECK SUMMARY")
        print("=" * 60)
        print(f"Overall Status: {'✅ PASS' if status == 'PASS' else '❌ FAIL'}")
        print(f"Timestamp: {report['timestamp']}")
        print()

        print("📊 Test Metrics:")
        print(f"  Total Tests: {metrics['total_tests']}")
        print(f"  Success Rate: {metrics['success_rate']:.1f}%")
        print(f"  Failed Tests: {metrics['failed_tests']}")
        print(f"  Duration: {metrics['total_duration']:.1f}s")
        print()

        print("🎯 Quality Metrics:")
        print(f"  Code Coverage: {quality['code_coverage']:.1f}%")
        print(f"  Security Issues: {quality['security_issues']}")
        print(f"  Performance Issues: {quality['performance_issues']}")
        print()

        if report["quality_gates"]["issues"]:
            print("⚠️ Quality Gate Issues:")
            for issue in report["quality_gates"]["issues"]:
                print(f"  - {issue}")
            print()

        print("💡 Recommendations:")
        for rec in report["recommendations"]:
            print(f"  - {rec}")
        print()

        print("🎯 Next Steps:")
        for step in report["next_steps"]:
            print(f"  {step}")
        print("=" * 60)


def main():
    parser = argparse.ArgumentParser(
        description="Test health checker and quality gate validator"
    )
    parser.add_argument(
        "--reports-dir", required=True, help="Directory containing test reports"
    )
    parser.add_argument("--output", help="Output file for health report (JSON)")
    parser.add_argument("--quiet", action="store_true", help="Suppress output")
    parser.add_argument(
        "--fail-on-quality-gate",
        action="store_true",
        help="Exit with error code if quality gates fail",
    )

    args = parser.parse_args()

    try:
        checker = TestHealthChecker(args.reports_dir)
        report = checker.run_health_check()

        if not args.quiet:
            checker.print_summary(report)

        if args.output:
            with open(args.output, "w") as f:
                json.dump(report, f, indent=2)
            logger.info(f"Health report saved to {args.output}")

        # Exit with appropriate code
        if args.fail_on_quality_gate and report["overall_status"] != "PASS":
            sys.exit(1)
        else:
            sys.exit(0)

    except Exception as e:
        logger.error(f"Health check failed: {e}")
        sys.exit(2)


if __name__ == "__main__":
    main()
