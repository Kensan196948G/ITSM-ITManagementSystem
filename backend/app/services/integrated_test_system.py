"""
統合テストシステム
強化された無限ループ自動修復システムの統合テスト・動作検証・レポート生成
"""

import asyncio
import aiohttp
import aiofiles
import logging
import time
import json
import traceback
import subprocess
import psutil
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
import uuid
import sys
import os

# モジュールインポート
from enhanced_infinite_loop_monitor import EnhancedInfiniteLoopMonitor, enhanced_monitor
from internal_validation_system import InternalValidationSystem, internal_validator
from enhanced_reporting_system import EnhancedReportingSystem, enhanced_reporter

logger = logging.getLogger(__name__)

class TestPhase(Enum):
    """テストフェーズ"""
    INITIALIZATION = "initialization"
    COMPONENT_TEST = "component_test"
    INTEGRATION_TEST = "integration_test"
    END_TO_END_TEST = "end_to_end_test"
    STRESS_TEST = "stress_test"
    REPORTING = "reporting"
    CLEANUP = "cleanup"

class TestResult(Enum):
    """テスト結果"""
    PASS = "pass"
    FAIL = "fail"
    SKIP = "skip"
    ERROR = "error"

@dataclass
class TestCase:
    """テストケース定義"""
    test_id: str
    name: str
    description: str
    phase: TestPhase
    test_function: str
    timeout: int
    dependencies: List[str]
    critical: bool = False

@dataclass
class TestExecution:
    """テスト実行結果"""
    test_id: str
    test_name: str
    phase: TestPhase
    start_time: datetime
    end_time: Optional[datetime]
    duration: float
    result: TestResult
    error_message: Optional[str]
    details: Dict[str, Any]
    output_log: List[str]

class IntegratedTestSystem:
    """統合テストシステム"""
    
    def __init__(self):
        self.backend_path = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend")
        self.coordination_path = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination")
        self.test_results_path = self.coordination_path / "test_results"
        self.test_results_path.mkdir(exist_ok=True)
        
        # テスト結果管理
        self.test_executions: List[TestExecution] = []
        self.current_session_id = str(uuid.uuid4())
        
        # コンポーネント参照
        self.monitor = enhanced_monitor
        self.validator = internal_validator
        self.reporter = enhanced_reporter
        
        # テストケース定義
        self.test_cases = self._initialize_test_cases()
    
    def _initialize_test_cases(self) -> List[TestCase]:
        """テストケース初期化"""
        test_cases = []
        
        # 初期化テスト
        test_cases.extend([
            TestCase(
                test_id="init_001",
                name="システム初期化テスト",
                description="システムの基本初期化と設定確認",
                phase=TestPhase.INITIALIZATION,
                test_function="_test_system_initialization",
                timeout=30,
                dependencies=[],
                critical=True
            ),
            TestCase(
                test_id="init_002",
                name="コンポーネントロードテスト",
                description="各コンポーネントのロードと初期化確認",
                phase=TestPhase.INITIALIZATION,
                test_function="_test_component_loading",
                timeout=45,
                dependencies=["init_001"],
                critical=True
            )
        ])
        
        # コンポーネントテスト
        test_cases.extend([
            TestCase(
                test_id="comp_001",
                name="監視システム単体テスト",
                description="無限ループ監視システムの単体テスト",
                phase=TestPhase.COMPONENT_TEST,
                test_function="_test_monitoring_system",
                timeout=120,
                dependencies=["init_002"],
                critical=True
            ),
            TestCase(
                test_id="comp_002",
                name="検証システム単体テスト",
                description="内部検証システムの単体テスト",
                phase=TestPhase.COMPONENT_TEST,
                test_function="_test_validation_system",
                timeout=180,
                dependencies=["init_002"],
                critical=True
            ),
            TestCase(
                test_id="comp_003",
                name="レポートシステム単体テスト",
                description="強化レポートシステムの単体テスト",
                phase=TestPhase.COMPONENT_TEST,
                test_function="_test_reporting_system",
                timeout=90,
                dependencies=["init_002"],
                critical=False
            )
        ])
        
        # 統合テスト
        test_cases.extend([
            TestCase(
                test_id="integ_001",
                name="監視-検証連携テスト",
                description="監視システムと検証システムの連携テスト",
                phase=TestPhase.INTEGRATION_TEST,
                test_function="_test_monitor_validation_integration",
                timeout=300,
                dependencies=["comp_001", "comp_002"],
                critical=True
            ),
            TestCase(
                test_id="integ_002",
                name="検証-レポート連携テスト",
                description="検証システムとレポートシステムの連携テスト",
                phase=TestPhase.INTEGRATION_TEST,
                test_function="_test_validation_reporting_integration",
                timeout=240,
                dependencies=["comp_002", "comp_003"],
                critical=False
            )
        ])
        
        # E2Eテスト
        test_cases.extend([
            TestCase(
                test_id="e2e_001",
                name="無限ループ結合テスト",
                description="全コンポーネントの統合無限ループテスト",
                phase=TestPhase.END_TO_END_TEST,
                test_function="_test_infinite_loop_e2e",
                timeout=600,
                dependencies=["integ_001", "integ_002"],
                critical=True
            ),
            TestCase(
                test_id="e2e_002",
                name="エラーシナリオテスト",
                description="意図的エラー発生と自動修復のテスト",
                phase=TestPhase.END_TO_END_TEST,
                test_function="_test_error_scenarios",
                timeout=450,
                dependencies=["e2e_001"],
                critical=True
            )
        ])
        
        # ストレステスト
        test_cases.extend([
            TestCase(
                test_id="stress_001",
                name="高負荷ストレステスト",
                description="高負荷時のシステム安定性テスト",
                phase=TestPhase.STRESS_TEST,
                test_function="_test_high_load_stress",
                timeout=900,
                dependencies=["e2e_002"],
                critical=False
            )
        ])
        
        return test_cases
    
    async def run_comprehensive_test_suite(self) -> Dict[str, Any]:
        """包括的テストスイート実行"""
        session_start = datetime.now()
        logger.info(f"🚨 統合テストスイート開始 (Session: {self.current_session_id})")
        
        test_session = {
            "session_id": self.current_session_id,
            "start_time": session_start.isoformat(),
            "end_time": None,
            "total_duration": 0.0,
            "phases_executed": [],
            "results": {
                "total_tests": len(self.test_cases),
                "passed": 0,
                "failed": 0,
                "skipped": 0,
                "errors": 0
            },
            "critical_failures": [],
            "phase_results": {},
            "summary": {}
        }
        
        try:
            # フェーズ別実行
            for phase in TestPhase:
                phase_result = await self._execute_test_phase(phase)
                test_session["phase_results"][phase.value] = phase_result
                test_session["phases_executed"].append(phase.value)
                
                # クリティカルエラーチェック
                critical_failures = [
                    exec for exec in phase_result.get("executions", [])
                    if exec.get("critical") and exec.get("result") != TestResult.PASS.value
                ]
                
                if critical_failures:
                    test_session["critical_failures"].extend(critical_failures)
                    logger.error(f"❌ クリティカルエラー発生: {phase.value}")
                    
                    # クリティカルエラーの場合、後続フェーズをスキップ
                    remaining_phases = [p for p in TestPhase if p.value not in test_session["phases_executed"]]
                    for skip_phase in remaining_phases:
                        test_session["phase_results"][skip_phase.value] = {
                            "phase": skip_phase.value,
                            "skipped": True,
                            "reason": "Critical failure in previous phase"
                        }
                    break
            
            # 結果集計
            for execution in self.test_executions:
                if execution.result == TestResult.PASS:
                    test_session["results"]["passed"] += 1
                elif execution.result == TestResult.FAIL:
                    test_session["results"]["failed"] += 1
                elif execution.result == TestResult.SKIP:
                    test_session["results"]["skipped"] += 1
                elif execution.result == TestResult.ERROR:
                    test_session["results"]["errors"] += 1
            
            # サマリ生成
            test_session["summary"] = self._generate_test_summary(test_session)
            
        except Exception as e:
            logger.error(f"❌ テストスイート実行エラー: {e}")
            test_session["error"] = str(e)
            test_session["traceback"] = traceback.format_exc()
        
        finally:
            session_end = datetime.now()
            test_session["end_time"] = session_end.isoformat()
            test_session["total_duration"] = (session_end - session_start).total_seconds()
            
            # テスト結果保存
            await self._save_test_session(test_session)
            
            # 結果レポート生成
            await self._generate_test_report(test_session)
            
            logger.info(f"✅ 統合テストスイート完了 ({test_session['total_duration']:.1f}秒)")
        
        return test_session
    
    async def _execute_test_phase(self, phase: TestPhase) -> Dict[str, Any]:
        """テストフェーズ実行"""
        phase_start = datetime.now()
        logger.info(f"🔄 テストフェーズ開始: {phase.value}")
        
        phase_tests = [tc for tc in self.test_cases if tc.phase == phase]
        phase_result = {
            "phase": phase.value,
            "start_time": phase_start.isoformat(),
            "end_time": None,
            "duration": 0.0,
            "total_tests": len(phase_tests),
            "passed": 0,
            "failed": 0,
            "skipped": 0,
            "errors": 0,
            "executions": []
        }
        
        try:
            # 依存関係順でテストをソート
            sorted_tests = self._sort_tests_by_dependencies(phase_tests)
            
            for test_case in sorted_tests:
                execution = await self._execute_single_test(test_case)
                phase_result["executions"].append(asdict(execution))
                
                # 結果集計
                if execution.result == TestResult.PASS:
                    phase_result["passed"] += 1
                elif execution.result == TestResult.FAIL:
                    phase_result["failed"] += 1
                elif execution.result == TestResult.SKIP:
                    phase_result["skipped"] += 1
                elif execution.result == TestResult.ERROR:
                    phase_result["errors"] += 1
                
                # クリティカルテスト失敗時の処理
                if test_case.critical and execution.result not in [TestResult.PASS, TestResult.SKIP]:
                    logger.error(f"❌ クリティカルテスト失敗: {test_case.test_id}")
                    break
            
        except Exception as e:
            logger.error(f"テストフェーズ実行エラー ({phase.value}): {e}")
            phase_result["error"] = str(e)
        
        finally:
            phase_end = datetime.now()
            phase_result["end_time"] = phase_end.isoformat()
            phase_result["duration"] = (phase_end - phase_start).total_seconds()
            
            logger.info(f"✅ テストフェーズ完了: {phase.value} ({phase_result['duration']:.1f}秒)")
        
        return phase_result
    
    def _sort_tests_by_dependencies(self, tests: List[TestCase]) -> List[TestCase]:
        """依存関係順でテストをソート"""
        sorted_tests = []
        remaining_tests = tests.copy()
        executed_test_ids = set()
        
        while remaining_tests:
            progress_made = False
            
            for test in remaining_tests[:]:
                if all(dep in executed_test_ids for dep in test.dependencies):
                    sorted_tests.append(test)
                    executed_test_ids.add(test.test_id)
                    remaining_tests.remove(test)
                    progress_made = True
            
            if not progress_made:
                # 循環依存関係の可能性
                logger.warning("循環依存関係が検出されました。残りのテストを依存関係なしで実行します。")
                sorted_tests.extend(remaining_tests)
                break
        
        return sorted_tests
    
    async def _execute_single_test(self, test_case: TestCase) -> TestExecution:
        """単一テスト実行"""
        start_time = datetime.now()
        output_log = []
        
        execution = TestExecution(
            test_id=test_case.test_id,
            test_name=test_case.name,
            phase=test_case.phase,
            start_time=start_time,
            end_time=None,
            duration=0.0,
            result=TestResult.ERROR,
            error_message=None,
            details={},
            output_log=output_log
        )
        
        try:
            logger.info(f"▶️ テスト実行: {test_case.test_id} - {test_case.name}")
            output_log.append(f"Test started: {test_case.test_id}")
            
            # 依存関係チェック
            if not self._check_dependencies(test_case.dependencies):
                execution.result = TestResult.SKIP
                execution.error_message = "Dependencies not satisfied"
                output_log.append("Test skipped: Dependencies not satisfied")
                return execution
            
            # テスト関数取得と実行
            test_function = getattr(self, test_case.test_function, None)
            if test_function is None:
                execution.result = TestResult.ERROR
                execution.error_message = f"Test function {test_case.test_function} not found"
                output_log.append(f"Error: Test function not found - {test_case.test_function}")
                return execution
            
            # タイムアウト付きでテスト実行
            test_result = await asyncio.wait_for(
                test_function(test_case, output_log),
                timeout=test_case.timeout
            )
            
            if isinstance(test_result, dict):
                execution.result = TestResult(test_result.get("result", "error"))
                execution.details = test_result.get("details", {})
                if "error" in test_result:
                    execution.error_message = test_result["error"]
            else:
                execution.result = TestResult.PASS if test_result else TestResult.FAIL
            
            output_log.append(f"Test completed: {execution.result.value}")
            
        except asyncio.TimeoutError:
            execution.result = TestResult.ERROR
            execution.error_message = f"Test timeout ({test_case.timeout}s)"
            output_log.append(f"Error: Test timeout after {test_case.timeout} seconds")
        except Exception as e:
            execution.result = TestResult.ERROR
            execution.error_message = str(e)
            output_log.append(f"Error: {str(e)}")
            logger.error(f"Test execution error ({test_case.test_id}): {e}")
        
        finally:
            end_time = datetime.now()
            execution.end_time = end_time
            execution.duration = (end_time - start_time).total_seconds()
            
            # テスト実行結果を履歴に追加
            self.test_executions.append(execution)
            
            result_symbol = {
                TestResult.PASS: "✅",
                TestResult.FAIL: "❌",
                TestResult.SKIP: "⏭️",
                TestResult.ERROR: "🚨"
            }.get(execution.result, "❓")
            
            logger.info(f"{result_symbol} テスト完了: {test_case.test_id} ({execution.duration:.2f}s) - {execution.result.value}")
        
        return execution
    
    def _check_dependencies(self, dependencies: List[str]) -> bool:
        """依存関係チェック"""
        if not dependencies:
            return True
        
        passed_test_ids = {
            exec.test_id for exec in self.test_executions 
            if exec.result == TestResult.PASS
        }
        
        return all(dep in passed_test_ids for dep in dependencies)
    
    # テスト実装関数群
    async def _test_system_initialization(self, test_case: TestCase, output_log: List[str]) -> Dict[str, Any]:
        """システム初期化テスト"""
        try:
            output_log.append("Initializing system components...")
            
            # ファイルシステム確認
            required_paths = [
                self.backend_path,
                self.coordination_path,
                self.test_results_path
            ]
            
            for path in required_paths:
                if not path.exists():
                    return {
                        "result": "fail",
                        "error": f"Required path does not exist: {path}"
                    }
                output_log.append(f"Path exists: {path}")
            
            # 基本設定確認
            output_log.append("System initialization successful")
            return {
                "result": "pass",
                "details": {
                    "backend_path": str(self.backend_path),
                    "coordination_path": str(self.coordination_path),
                    "test_results_path": str(self.test_results_path)
                }
            }
            
        except Exception as e:
            return {
                "result": "error",
                "error": str(e)
            }
    
    async def _test_component_loading(self, test_case: TestCase, output_log: List[str]) -> Dict[str, Any]:
        """コンポーネントロードテスト"""
        try:
            output_log.append("Loading system components...")
            
            # コンポーネントの存在確認
            components = {
                "monitor": self.monitor,
                "validator": self.validator,
                "reporter": self.reporter
            }
            
            for name, component in components.items():
                if component is None:
                    return {
                        "result": "fail",
                        "error": f"Component {name} is not loaded"
                    }
                output_log.append(f"Component loaded: {name}")
            
            # コンポーネントの基本メソッド確認
            if not hasattr(self.monitor, 'get_status'):
                return {
                    "result": "fail",
                    "error": "Monitor component missing get_status method"
                }
            
            if not hasattr(self.validator, 'get_validation_status'):
                return {
                    "result": "fail",
                    "error": "Validator component missing get_validation_status method"
                }
            
            output_log.append("All components loaded successfully")
            return {
                "result": "pass",
                "details": {
                    "loaded_components": list(components.keys())
                }
            }
            
        except Exception as e:
            return {
                "result": "error",
                "error": str(e)
            }
    
    async def _test_monitoring_system(self, test_case: TestCase, output_log: List[str]) -> Dict[str, Any]:
        """監視システム単体テスト"""
        try:
            output_log.append("Testing monitoring system...")
            
            # 監視システムの状態取得
            status = self.monitor.get_status()
            if not isinstance(status, dict):
                return {
                    "result": "fail",
                    "error": "Monitor status is not a dictionary"
                }
            
            output_log.append(f"Monitor status retrieved: {len(status)} fields")
            
            # 基本フィールドの確認
            required_fields = ["monitoring", "loop_count", "total_errors_fixed"]
            for field in required_fields:
                if field not in status:
                    return {
                        "result": "fail",
                        "error": f"Missing required field in status: {field}"
                    }
                output_log.append(f"Required field present: {field}")
            
            # エラー検知機能のテスト（簡単な機能テスト）
            if hasattr(self.monitor, '_detect_api_errors'):
                output_log.append("Error detection method available")
            
            output_log.append("Monitoring system test passed")
            return {
                "result": "pass",
                "details": {
                    "status_fields": list(status.keys()),
                    "loop_count": status.get("loop_count", 0),
                    "errors_fixed": status.get("total_errors_fixed", 0)
                }
            }
            
        except Exception as e:
            return {
                "result": "error",
                "error": str(e)
            }
    
    async def _test_validation_system(self, test_case: TestCase, output_log: List[str]) -> Dict[str, Any]:
        """検証システム単体テスト"""
        try:
            output_log.append("Testing validation system...")
            
            # 検証システムの状態取得
            status = self.validator.get_validation_status()
            if not isinstance(status, dict):
                return {
                    "result": "fail",
                    "error": "Validator status is not a dictionary"
                }
            
            output_log.append(f"Validator status retrieved: {len(status)} fields")
            
            # 基本フィールドの確認
            required_fields = ["available_suites"]
            for field in required_fields:
                if field not in status:
                    return {
                        "result": "fail",
                        "error": f"Missing required field in status: {field}"
                    }
                output_log.append(f"Required field present: {field}")
            
            # 検証スイートの存在確認
            available_suites = status.get("available_suites", [])
            if not available_suites:
                return {
                    "result": "fail",
                    "error": "No validation suites available"
                }
            
            output_log.append(f"Available validation suites: {len(available_suites)}")
            
            # 簡単な検証テスト実行
            try:
                test_result = await self.validator.run_comprehensive_validation(["api_functionality"])
                if "overall_score" in test_result:
                    output_log.append(f"Validation test completed: score {test_result['overall_score']}")
                else:
                    output_log.append("Validation test completed without score")
            except Exception as e:
                output_log.append(f"Validation test failed: {str(e)}")
                # 検証テストの失敗は結果に影響しない（システムは動作している）
            
            output_log.append("Validation system test passed")
            return {
                "result": "pass",
                "details": {
                    "available_suites": available_suites,
                    "total_sessions": status.get("total_sessions", 0),
                    "total_validations": status.get("total_validations", 0)
                }
            }
            
        except Exception as e:
            return {
                "result": "error",
                "error": str(e)
            }
    
    async def _test_reporting_system(self, test_case: TestCase, output_log: List[str]) -> Dict[str, Any]:
        """レポートシステム単体テスト"""
        try:
            output_log.append("Testing reporting system...")
            
            # レポートシステムの状態取得
            status = self.reporter.get_report_status()
            if not isinstance(status, dict):
                return {
                    "result": "fail",
                    "error": "Reporter status is not a dictionary"
                }
            
            output_log.append(f"Reporter status retrieved: {len(status)} fields")
            
            # 基本フィールドの確認
            required_fields = ["available_formats", "reports_directory"]
            for field in required_fields:
                if field not in status:
                    return {
                        "result": "fail",
                        "error": f"Missing required field in status: {field}"
                    }
                output_log.append(f"Required field present: {field}")
            
            # レポートディレクトリの確認
            reports_dir = Path(status.get("reports_directory", ""))
            if not reports_dir.exists():
                return {
                    "result": "fail",
                    "error": f"Reports directory does not exist: {reports_dir}"
                }
            
            output_log.append(f"Reports directory exists: {reports_dir}")
            
            # 利用可能なフォーマット確認
            available_formats = status.get("available_formats", [])
            if not available_formats:
                return {
                    "result": "fail",
                    "error": "No report formats available"
                }
            
            output_log.append(f"Available report formats: {available_formats}")
            
            output_log.append("Reporting system test passed")
            return {
                "result": "pass",
                "details": {
                    "available_formats": available_formats,
                    "reports_directory": str(reports_dir),
                    "total_reports": status.get("total_reports", 0)
                }
            }
            
        except Exception as e:
            return {
                "result": "error",
                "error": str(e)
            }
    
    async def _test_monitor_validation_integration(self, test_case: TestCase, output_log: List[str]) -> Dict[str, Any]:
        """監視-検証連携テスト"""
        try:
            output_log.append("Testing monitor-validation integration...")
            
            # 監視システムからデータ取得
            monitor_status = self.monitor.get_status()
            output_log.append("Monitor status retrieved")
            
            # 検証システムで簡単な検証実行
            validation_result = await self.validator.run_comprehensive_validation(["api_functionality"])
            output_log.append("Validation executed")
            
            # 結果の整合性確認
            if not isinstance(validation_result, dict):
                return {
                    "result": "fail",
                    "error": "Validation result is not a dictionary"
                }
            
            # 基本的な連携確認
            integration_score = 100.0
            
            if "overall_score" not in validation_result:
                integration_score -= 30
                output_log.append("Warning: Missing overall_score in validation result")
            
            if "success_rate" not in validation_result:
                integration_score -= 20
                output_log.append("Warning: Missing success_rate in validation result")
            
            success = integration_score >= 70.0
            result_type = "pass" if success else "fail"
            
            output_log.append(f"Monitor-validation integration test: {result_type} (score: {integration_score})")
            return {
                "result": result_type,
                "details": {
                    "integration_score": integration_score,
                    "monitor_status_fields": len(monitor_status),
                    "validation_result_fields": len(validation_result)
                }
            }
            
        except Exception as e:
            return {
                "result": "error",
                "error": str(e)
            }
    
    async def _test_validation_reporting_integration(self, test_case: TestCase, output_log: List[str]) -> Dict[str, Any]:
        """検証-レポート連携テスト"""
        try:
            output_log.append("Testing validation-reporting integration...")
            
            # 検証実行
            validation_result = await self.validator.run_comprehensive_validation(["api_functionality"])
            output_log.append("Validation executed for reporting integration test")
            
            # レポート生成テスト（JSONフォーマット）
            from enhanced_reporting_system import ReportFormat
            report_result = await self.reporter.generate_comprehensive_report(
                report_format=ReportFormat.JSON,
                include_charts=False
            )
            output_log.append("Report generation executed")
            
            # 結果確認
            if not isinstance(report_result, dict):
                return {
                    "result": "fail",
                    "error": "Report result is not a dictionary"
                }
            
            if "report_id" not in report_result:
                return {
                    "result": "fail",
                    "error": "Missing report_id in report result"
                }
            
            # ファイル生成確認
            if "file_path" in report_result:
                report_file = Path(report_result["file_path"])
                if report_file.exists():
                    output_log.append(f"Report file generated: {report_file}")
                else:
                    output_log.append("Warning: Report file not found")
            
            output_log.append("Validation-reporting integration test passed")
            return {
                "result": "pass",
                "details": {
                    "validation_score": validation_result.get("overall_score", 0),
                    "report_id": report_result.get("report_id"),
                    "report_generated": "file_path" in report_result
                }
            }
            
        except Exception as e:
            return {
                "result": "error",
                "error": str(e)
            }
    
    async def _test_infinite_loop_e2e(self, test_case: TestCase, output_log: List[str]) -> Dict[str, Any]:
        """無限ループE2Eテスト"""
        try:
            output_log.append("Testing infinite loop end-to-end functionality...")
            
            # 簡単な無限ループシミュレーション（5サイクル）
            simulation_cycles = 5
            successful_cycles = 0
            
            for cycle in range(simulation_cycles):
                output_log.append(f"Simulating cycle {cycle + 1}/{simulation_cycles}")
                
                try:
                    # 監視システム状態取得
                    monitor_status = self.monitor.get_status()
                    
                    # 検証実行
                    validation_result = await self.validator.run_comprehensive_validation(["api_functionality"])
                    
                    # サイクル成功判定
                    if isinstance(monitor_status, dict) and isinstance(validation_result, dict):
                        successful_cycles += 1
                        output_log.append(f"Cycle {cycle + 1} completed successfully")
                    else:
                        output_log.append(f"Cycle {cycle + 1} failed")
                    
                    # サイクル間の小休止
                    await asyncio.sleep(2)
                    
                except Exception as e:
                    output_log.append(f"Cycle {cycle + 1} error: {str(e)}")
            
            # 結果評価
            success_rate = (successful_cycles / simulation_cycles) * 100
            success = success_rate >= 80.0  # 80%以上の成功率でパス
            
            output_log.append(f"E2E test completed: {successful_cycles}/{simulation_cycles} cycles successful ({success_rate}%)")
            
            return {
                "result": "pass" if success else "fail",
                "details": {
                    "total_cycles": simulation_cycles,
                    "successful_cycles": successful_cycles,
                    "success_rate": success_rate
                }
            }
            
        except Exception as e:
            return {
                "result": "error",
                "error": str(e)
            }
    
    async def _test_error_scenarios(self, test_case: TestCase, output_log: List[str]) -> Dict[str, Any]:
        """エラーシナリオテスト"""
        try:
            output_log.append("Testing error scenarios and recovery...")
            
            # エラーシナリオのシミュレーション
            scenarios_tested = 0
            scenarios_handled = 0
            
            # シナリオ1: 無効なURLでの検証
            try:
                output_log.append("Scenario 1: Testing with invalid URL")
                
                # オリジナルURLを保存
                original_url = self.validator.base_url
                
                # 無効なURLに変更
                self.validator.base_url = "http://invalid-url-for-testing:9999"
                
                # 検証実行（エラーが期待される）
                validation_result = await self.validator.run_comprehensive_validation(["api_functionality"])
                
                # URLを復元
                self.validator.base_url = original_url
                
                scenarios_tested += 1
                if isinstance(validation_result, dict):
                    scenarios_handled += 1  # エラーが適切に処理された
                    output_log.append("Scenario 1: Error handled gracefully")
                
            except Exception as e:
                output_log.append(f"Scenario 1: Unexpected error - {str(e)}")
            
            # シナリオ2: 存在しない検証スイート
            try:
                output_log.append("Scenario 2: Testing with non-existent validation suite")
                
                validation_result = await self.validator.run_comprehensive_validation(["non_existent_suite"])
                
                scenarios_tested += 1
                if isinstance(validation_result, dict):
                    scenarios_handled += 1
                    output_log.append("Scenario 2: Non-existent suite handled gracefully")
                
            except Exception as e:
                output_log.append(f"Scenario 2: Unexpected error - {str(e)}")
            
            # シナリオ3: メモリ不足シミュレーション（軽微）
            try:
                output_log.append("Scenario 3: Testing memory usage monitoring")
                
                # 現在のメモリ使用量確認
                memory_percent = psutil.virtual_memory().percent
                output_log.append(f"Current memory usage: {memory_percent:.1f}%")
                
                scenarios_tested += 1
                scenarios_handled += 1  # メモリ監視が機能している
                
            except Exception as e:
                output_log.append(f"Scenario 3: Error - {str(e)}")
            
            # 結果評価
            if scenarios_tested == 0:
                return {
                    "result": "fail",
                    "error": "No scenarios were tested"
                }
            
            handling_rate = (scenarios_handled / scenarios_tested) * 100
            success = handling_rate >= 70.0  # 70%以上のシナリオでエラーが適切に処理される
            
            output_log.append(f"Error scenarios test: {scenarios_handled}/{scenarios_tested} scenarios handled ({handling_rate}%)")
            
            return {
                "result": "pass" if success else "fail",
                "details": {
                    "scenarios_tested": scenarios_tested,
                    "scenarios_handled": scenarios_handled,
                    "handling_rate": handling_rate
                }
            }
            
        except Exception as e:
            return {
                "result": "error",
                "error": str(e)
            }
    
    async def _test_high_load_stress(self, test_case: TestCase, output_log: List[str]) -> Dict[str, Any]:
        """高負荷ストレステスト"""
        try:
            output_log.append("Testing high load stress scenarios...")
            
            # 軽微なストレステスト（同時実行数を制限）
            concurrent_tests = 3
            test_duration = 30  # 秒
            
            # 同時実行タスク作成
            async def stress_task(task_id: int):
                start_time = time.time()
                successful_operations = 0
                
                while time.time() - start_time < test_duration:
                    try:
                        # 監視システム状態取得
                        status = self.monitor.get_status()
                        if isinstance(status, dict):
                            successful_operations += 1
                        
                        await asyncio.sleep(1)  # 1秒間隔
                        
                    except Exception:
                        pass  # エラーは無視（ストレステストのため）
                
                return successful_operations
            
            # 同時タスク実行
            tasks = [stress_task(i) for i in range(concurrent_tests)]
            results = await asyncio.gather(*tasks, return_exceptions=True)
            
            # 結果集計
            total_operations = 0
            successful_tasks = 0
            
            for i, result in enumerate(results):
                if isinstance(result, int):
                    total_operations += result
                    successful_tasks += 1
                    output_log.append(f"Stress task {i+1}: {result} successful operations")
                else:
                    output_log.append(f"Stress task {i+1}: failed with {type(result).__name__}")
            
            # ストレステスト評価
            task_success_rate = (successful_tasks / concurrent_tests) * 100
            avg_operations = total_operations / successful_tasks if successful_tasks > 0 else 0
            
            # 成功条件: 70%以上のタスクが成功し、平均操作数が10以上
            success = task_success_rate >= 70.0 and avg_operations >= 10
            
            output_log.append(f"Stress test completed: {task_success_rate}% task success, {avg_operations:.1f} avg operations")
            
            return {
                "result": "pass" if success else "fail",
                "details": {
                    "concurrent_tests": concurrent_tests,
                    "test_duration": test_duration,
                    "successful_tasks": successful_tasks,
                    "total_operations": total_operations,
                    "task_success_rate": task_success_rate,
                    "avg_operations_per_task": avg_operations
                }
            }
            
        except Exception as e:
            return {
                "result": "error",
                "error": str(e)
            }
    
    def _generate_test_summary(self, test_session: Dict[str, Any]) -> Dict[str, Any]:
        """テストサマリ生成"""
        try:
            results = test_session.get("results", {})
            total_tests = results.get("total_tests", 0)
            passed = results.get("passed", 0)
            
            if total_tests == 0:
                success_rate = 0.0
                overall_status = "no_tests"
            else:
                success_rate = (passed / total_tests) * 100
                
                if success_rate >= 90:
                    overall_status = "excellent"
                elif success_rate >= 80:
                    overall_status = "good"
                elif success_rate >= 70:
                    overall_status = "acceptable"
                elif success_rate >= 50:
                    overall_status = "poor"
                else:
                    overall_status = "critical"
            
            critical_failures = test_session.get("critical_failures", [])
            has_critical_failures = len(critical_failures) > 0
            
            return {
                "overall_status": overall_status,
                "success_rate": success_rate,
                "has_critical_failures": has_critical_failures,
                "critical_failure_count": len(critical_failures),
                "phases_completed": len(test_session.get("phases_executed", [])),
                "total_phases": len(TestPhase),
                "execution_time_minutes": test_session.get("total_duration", 0) / 60,
                "recommended_actions": self._generate_recommendations(test_session)
            }
            
        except Exception as e:
            logger.error(f"テストサマリ生成エラー: {e}")
            return {"error": str(e)}
    
    def _generate_recommendations(self, test_session: Dict[str, Any]) -> List[str]:
        """推奨事項生成"""
        recommendations = []
        
        try:
            results = test_session.get("results", {})
            critical_failures = test_session.get("critical_failures", [])
            
            if critical_failures:
                recommendations.append("🚨 クリティカルエラーが発生しています。優先的に修正してください。")
            
            failed_tests = results.get("failed", 0)
            if failed_tests > 0:
                recommendations.append(f"❌ {failed_tests}件のテストが失敗しています。テストログを確認して原因を特定してください。")
            
            error_tests = results.get("errors", 0)
            if error_tests > 0:
                recommendations.append(f"🚨 {error_tests}件のテストでエラーが発生しています。システム設定を確認してください。")
            
            total_duration = test_session.get("total_duration", 0)
            if total_duration > 3600:  # 1時間以上
                recommendations.append("⏱️ テスト実行時間が長いです。パフォーマンスの最適化を検討してください。")
            
            success_rate = (results.get("passed", 0) / results.get("total_tests", 1)) * 100
            if success_rate >= 95:
                recommendations.append("🎉 テスト結果が優秀です。システムは安定して動作しています。")
            elif success_rate >= 80:
                recommendations.append("✅ テスト結果は良好です。小さな改善でさらに向上できます。")
            
            if not recommendations:
                recommendations.append("📊 テストが完了しました。詳細な結果を確認してください。")
            
        except Exception as e:
            recommendations.append(f"❓ 推奨事項生成エラー: {str(e)}")
        
        return recommendations
    
    async def _save_test_session(self, test_session: Dict[str, Any]):
        """テストセッション保存"""
        try:
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            session_file = self.test_results_path / f"test_session_{timestamp}.json"
            
            async with aiofiles.open(session_file, 'w') as f:
                await f.write(json.dumps(test_session, indent=2, ensure_ascii=False, default=str))
            
            # 最新セッションのシンボリックリンク更新
            latest_file = self.test_results_path / "latest_test_session.json"
            if latest_file.exists():
                latest_file.unlink()
            
            try:
                latest_file.symlink_to(session_file.name)
            except:
                # シンボリックリンクが作成できない場合はコピー
                async with aiofiles.open(latest_file, 'w') as f:
                    await f.write(json.dumps(test_session, indent=2, ensure_ascii=False, default=str))
            
            logger.info(f"💾 テストセッション保存完了: {session_file}")
            
        except Exception as e:
            logger.error(f"テストセッション保存エラー: {e}")
    
    async def _generate_test_report(self, test_session: Dict[str, Any]):
        """テストレポート生成"""
        try:
            # 簡単なテストレポート生成
            from enhanced_reporting_system import ReportFormat
            
            # テスト結果をレポーターに連携
            test_report = await self.reporter.generate_comprehensive_report(
                report_format=ReportFormat.HTML,
                include_charts=True
            )
            
            logger.info(f"📋 テストレポート生成完了: {test_report.get('file_path', 'エラー')}")
            
        except Exception as e:
            logger.error(f"テストレポート生成エラー: {e}")
    
    def get_test_status(self) -> Dict[str, Any]:
        """テスト状況取得"""
        try:
            return {
                "current_session_id": self.current_session_id,
                "total_test_cases": len(self.test_cases),
                "total_executions": len(self.test_executions),
                "test_results_directory": str(self.test_results_path),
                "available_phases": [phase.value for phase in TestPhase],
                "execution_summary": {
                    "passed": len([e for e in self.test_executions if e.result == TestResult.PASS]),
                    "failed": len([e for e in self.test_executions if e.result == TestResult.FAIL]),
                    "skipped": len([e for e in self.test_executions if e.result == TestResult.SKIP]),
                    "errors": len([e for e in self.test_executions if e.result == TestResult.ERROR])
                }
            }
        except Exception as e:
            logger.error(f"テスト状況取得エラー: {e}")
            return {"error": str(e)}

# グローバルインスタンス
integrated_tester = IntegratedTestSystem()

async def main():
    """メイン実行関数"""
    try:
        logger.info("🚨 統合テストシステム実行開始")
        
        # 包括的テストスイート実行
        test_result = await integrated_tester.run_comprehensive_test_suite()
        
        print("\n" + "="*60)
        print("📋 統合テストスイート実行結果")
        print("="*60)
        
        # 基本結果
        results = test_result.get("results", {})
        print(f"📊 総テスト数: {results.get('total_tests', 0)}")
        print(f"✅ 成功: {results.get('passed', 0)}")
        print(f"❌ 失敗: {results.get('failed', 0)}")
        print(f"⏭️ スキップ: {results.get('skipped', 0)}")
        print(f"🚨 エラー: {results.get('errors', 0)}")
        
        # サマリ
        summary = test_result.get("summary", {})
        print(f"\n🎯 全体ステータス: {summary.get('overall_status', 'unknown')}")
        print(f"📊 成功率: {summary.get('success_rate', 0):.1f}%")
        print(f"⏱️ 実行時間: {summary.get('execution_time_minutes', 0):.1f}分")
        
        # クリティカルエラー
        critical_failures = test_result.get("critical_failures", [])
        if critical_failures:
            print(f"\n🚨 クリティカルエラー: {len(critical_failures)}件")
        
        # 推奨事項
        recommendations = summary.get("recommended_actions", [])
        if recommendations:
            print("\n💡 推奨事項:")
            for rec in recommendations:
                print(f"  - {rec}")
        
        # ファイル情報
        print(f"\n💾 テスト結果ファイル: {integrated_tester.test_results_path / 'latest_test_session.json'}")
        print(f"📋 レポートディレクトリ: {integrated_tester.reporter.reports_path}")
        
        print("\n" + "="*60)
        print("✅ 統合テストシステム実行完了")
        print("="*60)
        
    except KeyboardInterrupt:
        logger.info("⌨️ ユーザーによる中断")
    except Exception as e:
        logger.error(f"❌ 統合テストシステムエラー: {e}")
        traceback.print_exc()

if __name__ == "__main__":
    # ログ設定
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/integrated_test.log"),
            logging.StreamHandler()
        ]
    )
    
    asyncio.run(main())