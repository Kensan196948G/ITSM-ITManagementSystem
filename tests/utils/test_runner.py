#!/usr/bin/env python3
"""
ITSM Test Runner - Comprehensive test execution utility
"""
import argparse
import subprocess
import sys
import os
import json
import time
from pathlib import Path
from typing import Dict, List, Any
import concurrent.futures
from datetime import datetime


class ITSMTestRunner:
    """Test runner for ITSM system with comprehensive reporting"""
    
    def __init__(self, config_path: str = None):
        self.config = self.load_config(config_path)
        self.results = {
            "start_time": None,
            "end_time": None,
            "duration": None,
            "suites": {},
            "summary": {
                "total_tests": 0,
                "passed": 0,
                "failed": 0,
                "skipped": 0,
                "success_rate": 0.0
            }
        }
    
    def load_config(self, config_path: str = None) -> Dict[str, Any]:
        """Load test configuration"""
        default_config = {
            "test_suites": {
                "unit": {
                    "path": "tests/",
                    "markers": "unit",
                    "parallel": True,
                    "coverage": True
                },
                "api": {
                    "path": "tests/api/",
                    "markers": "api and not slow",
                    "parallel": True,
                    "coverage": True
                },
                "e2e": {
                    "path": "tests/e2e/",
                    "markers": "e2e and not slow",
                    "parallel": False,
                    "coverage": False
                },
                "load": {
                    "path": "tests/load/",
                    "markers": "load",
                    "parallel": False,
                    "coverage": False,
                    "timeout": 1800
                }
            },
            "reporting": {
                "html": True,
                "json": True,
                "junit": True,
                "coverage": True
            },
            "quality_gates": {
                "min_coverage": 80,
                "max_failed_tests": 0,
                "max_test_duration": 3600
            }
        }
        
        if config_path and os.path.exists(config_path):
            with open(config_path, 'r') as f:
                custom_config = json.load(f)
                default_config.update(custom_config)
        
        return default_config
    
    def run_test_suite(self, suite_name: str, suite_config: Dict[str, Any]) -> Dict[str, Any]:
        """Run a specific test suite"""
        print(f"\n🧪 Running {suite_name} tests...")
        
        start_time = time.time()
        
        # Build pytest command
        cmd = ["python", "-m", "pytest", suite_config["path"], "-v", "--tb=short"]
        
        # Add markers
        if "markers" in suite_config:
            cmd.extend(["-m", suite_config["markers"]])
        
        # Add reporting options
        reports_dir = Path("tests/reports")
        reports_dir.mkdir(exist_ok=True)
        
        if self.config["reporting"]["html"]:
            cmd.extend([
                "--html", f"tests/reports/{suite_name}-report.html",
                "--self-contained-html"
            ])
        
        if self.config["reporting"]["json"]:
            cmd.extend([
                "--json-report",
                f"--json-report-file=tests/reports/{suite_name}-report.json"
            ])
        
        if self.config["reporting"]["junit"]:
            cmd.extend([f"--junit-xml=tests/reports/{suite_name}-junit.xml"])
        
        # Add coverage if enabled
        if suite_config.get("coverage", False) and self.config["reporting"]["coverage"]:
            cmd.extend([
                "--cov=src",
                f"--cov-report=html:tests/reports/{suite_name}-coverage-html",
                f"--cov-report=json:tests/reports/{suite_name}-coverage.json",
                "--cov-report=term-missing"
            ])
        
        # Add benchmark reporting for performance tests
        if suite_name in ["api", "load"]:
            cmd.extend([f"--benchmark-json=tests/reports/{suite_name}-benchmark.json"])
        
        # Add parallel execution if enabled
        if suite_config.get("parallel", False):
            import multiprocessing
            workers = min(4, multiprocessing.cpu_count())
            cmd.extend(["-n", str(workers)])
        
        # Set timeout if specified
        timeout = suite_config.get("timeout", 1800)  # 30 minutes default
        
        try:
            # Run the tests
            result = subprocess.run(
                cmd,
                capture_output=True,
                text=True,
                timeout=timeout,
                cwd=Path.cwd()
            )
            
            end_time = time.time()
            duration = end_time - start_time
            
            # Parse results
            suite_result = {
                "name": suite_name,
                "command": " ".join(cmd),
                "start_time": start_time,
                "end_time": end_time,
                "duration": duration,
                "return_code": result.returncode,
                "stdout": result.stdout,
                "stderr": result.stderr,
                "success": result.returncode == 0
            }
            
            # Try to parse JSON report for detailed results
            json_report_path = f"tests/reports/{suite_name}-report.json"
            if os.path.exists(json_report_path):
                with open(json_report_path, 'r') as f:
                    json_report = json.load(f)
                    suite_result["detailed_results"] = json_report
                    
                    # Extract summary
                    if "summary" in json_report:
                        summary = json_report["summary"]
                        suite_result["summary"] = {
                            "total": summary.get("total", 0),
                            "passed": summary.get("passed", 0),
                            "failed": summary.get("failed", 0),
                            "skipped": summary.get("skipped", 0),
                            "duration": summary.get("duration", duration)
                        }
            
            status = "✅ PASSED" if result.returncode == 0 else "❌ FAILED"
            print(f"{status} {suite_name} tests completed in {duration:.2f}s")
            
            return suite_result
            
        except subprocess.TimeoutExpired:
            print(f"⏰ TIMEOUT {suite_name} tests exceeded {timeout}s")
            return {
                "name": suite_name,
                "start_time": start_time,
                "end_time": time.time(),
                "duration": timeout,
                "return_code": -1,
                "success": False,
                "error": "Timeout exceeded"
            }
        
        except Exception as e:
            print(f"💥 ERROR running {suite_name} tests: {e}")
            return {
                "name": suite_name,
                "start_time": start_time,
                "end_time": time.time(),
                "duration": time.time() - start_time,
                "return_code": -1,
                "success": False,
                "error": str(e)
            }
    
    def run_all_suites(self, suites: List[str] = None, parallel: bool = False) -> Dict[str, Any]:
        """Run multiple test suites"""
        self.results["start_time"] = datetime.now().isoformat()
        start_time = time.time()
        
        # Determine which suites to run
        if suites is None:
            suites = list(self.config["test_suites"].keys())
        
        print(f"🚀 Starting ITSM test execution for suites: {', '.join(suites)}")
        
        if parallel and len(suites) > 1:
            # Run suites in parallel (except E2E which should run sequentially)
            parallel_suites = [s for s in suites if s != "e2e"]
            sequential_suites = [s for s in suites if s == "e2e"]
            
            # Run parallel suites
            if parallel_suites:
                with concurrent.futures.ThreadPoolExecutor(max_workers=3) as executor:
                    future_to_suite = {
                        executor.submit(
                            self.run_test_suite, 
                            suite, 
                            self.config["test_suites"][suite]
                        ): suite 
                        for suite in parallel_suites
                    }
                    
                    for future in concurrent.futures.as_completed(future_to_suite):
                        suite = future_to_suite[future]
                        try:
                            result = future.result()
                            self.results["suites"][suite] = result
                        except Exception as e:
                            print(f"Error in parallel execution of {suite}: {e}")
                            self.results["suites"][suite] = {
                                "name": suite,
                                "success": False,
                                "error": str(e)
                            }
            
            # Run sequential suites (E2E)
            for suite in sequential_suites:
                result = self.run_test_suite(suite, self.config["test_suites"][suite])
                self.results["suites"][suite] = result
        else:
            # Run suites sequentially
            for suite in suites:
                if suite not in self.config["test_suites"]:
                    print(f"⚠️  Warning: Unknown test suite '{suite}'")
                    continue
                
                result = self.run_test_suite(suite, self.config["test_suites"][suite])
                self.results["suites"][suite] = result
        
        # Calculate summary
        end_time = time.time()
        self.results["end_time"] = datetime.now().isoformat()
        self.results["duration"] = end_time - start_time
        
        self.calculate_summary()
        return self.results
    
    def calculate_summary(self):
        """Calculate overall test summary"""
        total_tests = 0
        passed = 0
        failed = 0
        skipped = 0
        
        for suite_name, suite_result in self.results["suites"].items():
            if "summary" in suite_result:
                summary = suite_result["summary"]
                total_tests += summary.get("total", 0)
                passed += summary.get("passed", 0)
                failed += summary.get("failed", 0)
                skipped += summary.get("skipped", 0)
        
        self.results["summary"] = {
            "total_tests": total_tests,
            "passed": passed,
            "failed": failed,
            "skipped": skipped,
            "success_rate": (passed / total_tests * 100) if total_tests > 0 else 0.0,
            "overall_success": failed == 0
        }
    
    def check_quality_gates(self) -> Dict[str, Any]:
        """Check quality gates and return results"""
        gates = self.config["quality_gates"]
        results = {
            "passed": True,
            "violations": []
        }
        
        # Check test failures
        if self.results["summary"]["failed"] > gates["max_failed_tests"]:
            results["passed"] = False
            results["violations"].append(
                f"Too many test failures: {self.results['summary']['failed']} > {gates['max_failed_tests']}"
            )
        
        # Check test duration
        if self.results["duration"] > gates["max_test_duration"]:
            results["passed"] = False
            results["violations"].append(
                f"Test duration exceeded: {self.results['duration']:.0f}s > {gates['max_test_duration']}s"
            )
        
        # Check coverage (if available)
        for suite_name in ["api", "unit"]:
            coverage_file = f"tests/reports/{suite_name}-coverage.json"
            if os.path.exists(coverage_file):
                with open(coverage_file, 'r') as f:
                    coverage_data = json.load(f)
                    coverage_percent = coverage_data.get("totals", {}).get("percent_covered", 0)
                    
                    if coverage_percent < gates["min_coverage"]:
                        results["passed"] = False
                        results["violations"].append(
                            f"{suite_name} coverage too low: {coverage_percent:.1f}% < {gates['min_coverage']}%"
                        )
        
        return results
    
    def generate_report(self, output_path: str = "tests/reports/execution-summary.json"):
        """Generate execution summary report"""
        Path(output_path).parent.mkdir(parents=True, exist_ok=True)
        
        # Add quality gate results
        quality_gate_results = self.check_quality_gates()
        self.results["quality_gates"] = quality_gate_results
        
        with open(output_path, 'w') as f:
            json.dump(self.results, f, indent=2, default=str)
        
        print(f"\n📊 Test execution summary saved to: {output_path}")
        return self.results
    
    def print_summary(self):
        """Print test execution summary"""
        print("\n" + "="*60)
        print("🧪 ITSM TEST EXECUTION SUMMARY")
        print("="*60)
        
        summary = self.results["summary"]
        print(f"⏱️  Duration: {self.results['duration']:.2f}s")
        print(f"📊 Total Tests: {summary['total_tests']}")
        print(f"✅ Passed: {summary['passed']}")
        print(f"❌ Failed: {summary['failed']}")
        print(f"⏭️  Skipped: {summary['skipped']}")
        print(f"📈 Success Rate: {summary['success_rate']:.1f}%")
        
        print("\n📋 Suite Results:")
        for suite_name, suite_result in self.results["suites"].items():
            status = "✅" if suite_result["success"] else "❌"
            duration = suite_result.get("duration", 0)
            print(f"  {status} {suite_name}: {duration:.2f}s")
        
        # Quality gates
        if "quality_gates" in self.results:
            qg = self.results["quality_gates"]
            qg_status = "✅ PASSED" if qg["passed"] else "❌ FAILED"
            print(f"\n🚪 Quality Gates: {qg_status}")
            
            if qg["violations"]:
                print("  Violations:")
                for violation in qg["violations"]:
                    print(f"    • {violation}")
        
        overall_status = "SUCCESS" if summary["overall_success"] else "FAILURE"
        print(f"\n🎯 Overall Result: {overall_status}")
        print("="*60)


def main():
    """Main CLI entry point"""
    parser = argparse.ArgumentParser(description="ITSM Test Runner")
    parser.add_argument(
        "--suites", 
        nargs="+", 
        choices=["unit", "api", "e2e", "load"],
        help="Test suites to run"
    )
    parser.add_argument(
        "--parallel", 
        action="store_true",
        help="Run compatible suites in parallel"
    )
    parser.add_argument(
        "--config", 
        help="Path to configuration file"
    )
    parser.add_argument(
        "--output", 
        default="tests/reports/execution-summary.json",
        help="Output path for execution summary"
    )
    parser.add_argument(
        "--quality-gates-only", 
        action="store_true",
        help="Only check quality gates without running tests"
    )
    
    args = parser.parse_args()
    
    runner = ITSMTestRunner(args.config)
    
    if args.quality_gates_only:
        # Load existing results and check quality gates
        if os.path.exists(args.output):
            with open(args.output, 'r') as f:
                runner.results = json.load(f)
            
            quality_results = runner.check_quality_gates()
            runner.results["quality_gates"] = quality_results
            
            print("🚪 Quality Gate Check Results:")
            if quality_results["passed"]:
                print("✅ All quality gates passed!")
                sys.exit(0)
            else:
                print("❌ Quality gate violations:")
                for violation in quality_results["violations"]:
                    print(f"  • {violation}")
                sys.exit(1)
        else:
            print("❌ No test results found. Run tests first.")
            sys.exit(1)
    
    # Run tests
    try:
        results = runner.run_all_suites(args.suites, args.parallel)
        runner.generate_report(args.output)
        runner.print_summary()
        
        # Exit with appropriate code
        if results["summary"]["overall_success"] and results.get("quality_gates", {}).get("passed", True):
            sys.exit(0)
        else:
            sys.exit(1)
            
    except KeyboardInterrupt:
        print("\n⏹️  Test execution interrupted by user")
        sys.exit(2)
    except Exception as e:
        print(f"\n💥 Test execution failed with error: {e}")
        sys.exit(3)


if __name__ == "__main__":
    main()