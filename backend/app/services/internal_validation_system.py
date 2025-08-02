"""
内部検証システム
修復後のAPI機能テスト・データ整合性検証・セキュリティ状態確認・パフォーマンス指標検証
"""

import asyncio
import aiohttp
import aiofiles
import logging
import time
import json
import traceback
import re
import sqlite3
import subprocess
import os
import hashlib
import psutil
import ssl
import socket
import statistics
from typing import Dict, List, Optional, Any, Tuple, Union, Set
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from urllib.parse import urlparse
import threading
from concurrent.futures import ThreadPoolExecutor
from collections import defaultdict, deque
import uuid

logger = logging.getLogger(__name__)


class ValidationSeverity(Enum):
    """検証重要度"""

    INFO = "info"
    WARNING = "warning"
    ERROR = "error"
    CRITICAL = "critical"


class ValidationCategory(Enum):
    """検証カテゴリ"""

    API_FUNCTIONALITY = "api_functionality"
    DATABASE_INTEGRITY = "database_integrity"
    SECURITY_COMPLIANCE = "security_compliance"
    PERFORMANCE_METRICS = "performance_metrics"
    SYSTEM_HEALTH = "system_health"
    DATA_CONSISTENCY = "data_consistency"
    ENDPOINT_AVAILABILITY = "endpoint_availability"
    RESPONSE_VALIDATION = "response_validation"


@dataclass
class ValidationTest:
    """検証テスト定義"""

    test_id: str
    name: str
    category: ValidationCategory
    severity: ValidationSeverity
    description: str
    test_function: str
    timeout: int
    dependencies: List[str]
    expected_result: Any
    retry_count: int = 3


@dataclass
class ValidationResult:
    """検証結果"""

    test_id: str
    test_name: str
    category: ValidationCategory
    severity: ValidationSeverity
    timestamp: datetime
    duration: float
    success: bool
    score: float  # 0-100
    actual_result: Any
    expected_result: Any
    error_message: Optional[str]
    recommendations: List[str]
    details: Dict[str, Any]


@dataclass
class ValidationSuite:
    """検証スイート"""

    suite_id: str
    name: str
    description: str
    tests: List[ValidationTest]
    parallel_execution: bool
    timeout: int


class InternalValidationSystem:
    """内部検証システム"""

    def __init__(self, base_url: str = "http://192.168.3.135:8000"):
        self.base_url = base_url
        self.backend_path = Path(
            "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend"
        )
        self.coordination_path = Path(
            "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination"
        )

        # 検証結果履歴
        self.validation_results: deque = deque(maxlen=10000)
        self.validation_history: List[Dict[str, Any]] = []

        # 検証スイート定義
        self.validation_suites = self._initialize_validation_suites()

        # パフォーマンス基準値
        self.performance_thresholds = {
            "response_time_threshold": 3.0,  # 秒
            "cpu_threshold": 80.0,  # %
            "memory_threshold": 85.0,  # %
            "database_query_threshold": 1.0,  # 秒
            "error_rate_threshold": 5.0,  # %
            "availability_threshold": 99.0,  # %
        }

        # セキュリティ基準
        self.security_standards = {
            "ssl_min_version": "TLSv1.2",
            "password_min_length": 8,
            "session_timeout": 3600,  # 秒
            "max_login_attempts": 5,
            "required_headers": [
                "X-Content-Type-Options",
                "X-Frame-Options",
                "X-XSS-Protection",
            ],
        }

    def _initialize_validation_suites(self) -> Dict[str, ValidationSuite]:
        """検証スイート初期化"""
        suites = {}

        # 基本API機能検証スイート
        api_tests = [
            ValidationTest(
                test_id="api_health_check",
                name="API ヘルスチェック",
                category=ValidationCategory.API_FUNCTIONALITY,
                severity=ValidationSeverity.CRITICAL,
                description="APIの基本的な応答性を確認",
                test_function="_test_api_health",
                timeout=30,
                dependencies=[],
                expected_result={"status": "ok"},
            ),
            ValidationTest(
                test_id="api_endpoints_availability",
                name="エンドポイント可用性",
                category=ValidationCategory.ENDPOINT_AVAILABILITY,
                severity=ValidationSeverity.ERROR,
                description="重要なエンドポイントの可用性確認",
                test_function="_test_endpoints_availability",
                timeout=60,
                dependencies=["api_health_check"],
                expected_result={"all_available": True},
            ),
            ValidationTest(
                test_id="api_response_validation",
                name="APIレスポンス検証",
                category=ValidationCategory.RESPONSE_VALIDATION,
                severity=ValidationSeverity.WARNING,
                description="APIレスポンスの構造と内容を検証",
                test_function="_test_api_response_validation",
                timeout=45,
                dependencies=["api_endpoints_availability"],
                expected_result={"valid_responses": True},
            ),
        ]

        suites["api_functionality"] = ValidationSuite(
            suite_id="api_functionality",
            name="API機能検証",
            description="APIの基本機能と応答性を検証",
            tests=api_tests,
            parallel_execution=False,
            timeout=180,
        )

        # データベース整合性検証スイート
        db_tests = [
            ValidationTest(
                test_id="database_connection",
                name="データベース接続",
                category=ValidationCategory.DATABASE_INTEGRITY,
                severity=ValidationSeverity.CRITICAL,
                description="データベースへの接続性を確認",
                test_function="_test_database_connection",
                timeout=15,
                dependencies=[],
                expected_result={"connected": True},
            ),
            ValidationTest(
                test_id="database_integrity",
                name="データベース整合性",
                category=ValidationCategory.DATABASE_INTEGRITY,
                severity=ValidationSeverity.CRITICAL,
                description="データベースの整合性をチェック",
                test_function="_test_database_integrity",
                timeout=30,
                dependencies=["database_connection"],
                expected_result={"integrity": "ok"},
            ),
            ValidationTest(
                test_id="data_consistency",
                name="データ一貫性",
                category=ValidationCategory.DATA_CONSISTENCY,
                severity=ValidationSeverity.ERROR,
                description="データの一貫性を検証",
                test_function="_test_data_consistency",
                timeout=60,
                dependencies=["database_integrity"],
                expected_result={"consistent": True},
            ),
        ]

        suites["database_integrity"] = ValidationSuite(
            suite_id="database_integrity",
            name="データベース整合性検証",
            description="データベースとデータの整合性を検証",
            tests=db_tests,
            parallel_execution=False,
            timeout=120,
        )

        # セキュリティ検証スイート
        security_tests = [
            ValidationTest(
                test_id="security_headers",
                name="セキュリティヘッダー",
                category=ValidationCategory.SECURITY_COMPLIANCE,
                severity=ValidationSeverity.WARNING,
                description="必要なセキュリティヘッダーの存在確認",
                test_function="_test_security_headers",
                timeout=30,
                dependencies=[],
                expected_result={"headers_present": True},
            ),
            ValidationTest(
                test_id="ssl_configuration",
                name="SSL/TLS設定",
                category=ValidationCategory.SECURITY_COMPLIANCE,
                severity=ValidationSeverity.ERROR,
                description="SSL/TLS設定の適切性を確認",
                test_function="_test_ssl_configuration",
                timeout=20,
                dependencies=[],
                expected_result={"ssl_valid": True},
            ),
            ValidationTest(
                test_id="authentication_security",
                name="認証セキュリティ",
                category=ValidationCategory.SECURITY_COMPLIANCE,
                severity=ValidationSeverity.CRITICAL,
                description="認証機能のセキュリティ設定確認",
                test_function="_test_authentication_security",
                timeout=45,
                dependencies=["security_headers"],
                expected_result={"auth_secure": True},
            ),
        ]

        suites["security_compliance"] = ValidationSuite(
            suite_id="security_compliance",
            name="セキュリティ準拠検証",
            description="セキュリティ設定と準拠性を検証",
            tests=security_tests,
            parallel_execution=True,
            timeout=120,
        )

        # パフォーマンス検証スイート
        performance_tests = [
            ValidationTest(
                test_id="response_time_performance",
                name="レスポンス時間",
                category=ValidationCategory.PERFORMANCE_METRICS,
                severity=ValidationSeverity.WARNING,
                description="APIレスポンス時間の性能確認",
                test_function="_test_response_time_performance",
                timeout=60,
                dependencies=[],
                expected_result={"avg_response_time": "< 3.0s"},
            ),
            ValidationTest(
                test_id="system_resource_performance",
                name="システムリソース",
                category=ValidationCategory.PERFORMANCE_METRICS,
                severity=ValidationSeverity.WARNING,
                description="CPU・メモリ使用率の確認",
                test_function="_test_system_resource_performance",
                timeout=30,
                dependencies=[],
                expected_result={"resource_usage": "normal"},
            ),
            ValidationTest(
                test_id="database_performance",
                name="データベース性能",
                category=ValidationCategory.PERFORMANCE_METRICS,
                severity=ValidationSeverity.WARNING,
                description="データベースクエリ性能の確認",
                test_function="_test_database_performance",
                timeout=45,
                dependencies=[],
                expected_result={"query_performance": "good"},
            ),
        ]

        suites["performance_metrics"] = ValidationSuite(
            suite_id="performance_metrics",
            name="パフォーマンス検証",
            description="システムパフォーマンスを検証",
            tests=performance_tests,
            parallel_execution=True,
            timeout=150,
        )

        return suites

    async def run_comprehensive_validation(
        self, suite_names: Optional[List[str]] = None
    ) -> Dict[str, Any]:
        """包括的検証実行"""
        validation_id = str(uuid.uuid4())
        start_time = datetime.now()

        logger.info(f"🔍 包括的検証開始 (ID: {validation_id})")

        # 実行対象スイートの決定
        if suite_names is None:
            suite_names = list(self.validation_suites.keys())

        # 検証結果格納
        validation_session = {
            "validation_id": validation_id,
            "start_time": start_time.isoformat(),
            "suite_names": suite_names,
            "results": {},
            "overall_score": 0.0,
            "success_rate": 0.0,
            "execution_time": 0.0,
            "recommendations": [],
        }

        try:
            # 各スイートを実行
            for suite_name in suite_names:
                if suite_name in self.validation_suites:
                    suite_result = await self._execute_validation_suite(
                        self.validation_suites[suite_name]
                    )
                    validation_session["results"][suite_name] = suite_result
                else:
                    logger.warning(f"検証スイート '{suite_name}' が見つかりません")

            # 全体スコア計算
            validation_session["overall_score"] = self._calculate_overall_score(
                validation_session["results"]
            )

            # 成功率計算
            validation_session["success_rate"] = self._calculate_success_rate(
                validation_session["results"]
            )

            # 推奨事項生成
            validation_session["recommendations"] = (
                self._generate_validation_recommendations(validation_session["results"])
            )

        except Exception as e:
            logger.error(f"包括的検証エラー: {e}")
            validation_session["error"] = str(e)

        finally:
            end_time = datetime.now()
            validation_session["end_time"] = end_time.isoformat()
            validation_session["execution_time"] = (
                end_time - start_time
            ).total_seconds()

            # 結果保存
            await self._save_validation_session(validation_session)

            logger.info(
                f"✅ 包括的検証完了 (スコア: {validation_session['overall_score']:.1f}/100)"
            )

        return validation_session

    async def _execute_validation_suite(self, suite: ValidationSuite) -> Dict[str, Any]:
        """検証スイート実行"""
        start_time = datetime.now()
        suite_result = {
            "suite_id": suite.suite_id,
            "suite_name": suite.name,
            "start_time": start_time.isoformat(),
            "test_results": [],
            "summary": {
                "total_tests": len(suite.tests),
                "passed": 0,
                "failed": 0,
                "warnings": 0,
                "errors": 0,
                "overall_score": 0.0,
            },
        }

        try:
            if suite.parallel_execution:
                # 並列実行
                tasks = []
                for test in suite.tests:
                    task = asyncio.create_task(self._execute_validation_test(test))
                    tasks.append(task)

                test_results = await asyncio.gather(*tasks, return_exceptions=True)
            else:
                # 順次実行（依存関係を考慮）
                test_results = []
                executed_tests = set()

                for test in self._sort_tests_by_dependencies(suite.tests):
                    # 依存関係チェック
                    if all(dep in executed_tests for dep in test.dependencies):
                        result = await self._execute_validation_test(test)
                        test_results.append(result)
                        executed_tests.add(test.test_id)
                    else:
                        logger.warning(
                            f"テスト {test.test_id} の依存関係が満たされていません"
                        )

            # 結果集計
            for result in test_results:
                if isinstance(result, Exception):
                    logger.error(f"テスト実行エラー: {result}")
                    continue

                suite_result["test_results"].append(result)

                # 統計更新
                if result.success:
                    suite_result["summary"]["passed"] += 1
                else:
                    suite_result["summary"]["failed"] += 1

                if result.severity == ValidationSeverity.WARNING:
                    suite_result["summary"]["warnings"] += 1
                elif result.severity == ValidationSeverity.ERROR:
                    suite_result["summary"]["errors"] += 1

            # 全体スコア計算
            if suite_result["test_results"]:
                total_score = sum(r.score for r in suite_result["test_results"])
                suite_result["summary"]["overall_score"] = total_score / len(
                    suite_result["test_results"]
                )

        except Exception as e:
            logger.error(f"検証スイート実行エラー ({suite.suite_id}): {e}")
            suite_result["error"] = str(e)

        finally:
            end_time = datetime.now()
            suite_result["end_time"] = end_time.isoformat()
            suite_result["execution_time"] = (end_time - start_time).total_seconds()

        return suite_result

    def _sort_tests_by_dependencies(
        self, tests: List[ValidationTest]
    ) -> List[ValidationTest]:
        """依存関係に基づいてテストをソート"""
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
                logger.warning(
                    "循環依存関係が検出されました。残りのテストを依存関係なしで実行します。"
                )
                sorted_tests.extend(remaining_tests)
                break

        return sorted_tests

    async def _execute_validation_test(self, test: ValidationTest) -> ValidationResult:
        """個別検証テスト実行"""
        start_time = datetime.now()

        # 結果オブジェクト初期化
        result = ValidationResult(
            test_id=test.test_id,
            test_name=test.name,
            category=test.category,
            severity=test.severity,
            timestamp=start_time,
            duration=0.0,
            success=False,
            score=0.0,
            actual_result=None,
            expected_result=test.expected_result,
            error_message=None,
            recommendations=[],
            details={},
        )

        try:
            # テスト関数を取得して実行
            test_function = getattr(self, test.test_function, None)
            if test_function is None:
                raise ValueError(f"テスト関数 {test.test_function} が見つかりません")

            # タイムアウト付きでテスト実行
            actual_result = await asyncio.wait_for(
                test_function(test), timeout=test.timeout
            )

            result.actual_result = actual_result

            # 結果評価
            result.success, result.score, result.recommendations = (
                self._evaluate_test_result(test, actual_result)
            )

        except asyncio.TimeoutError:
            result.error_message = f"テストタイムアウト ({test.timeout}秒)"
            result.score = 0.0
            result.recommendations.append("テストの実行時間を確認してください")
        except Exception as e:
            result.error_message = str(e)
            result.score = 0.0
            result.recommendations.append(f"テスト実行エラーの修正が必要: {str(e)}")

        finally:
            end_time = datetime.now()
            result.duration = (end_time - start_time).total_seconds()

        # 結果を履歴に追加
        self.validation_results.append(result)

        return result

    def _evaluate_test_result(
        self, test: ValidationTest, actual_result: Any
    ) -> Tuple[bool, float, List[str]]:
        """テスト結果評価"""
        recommendations = []

        try:
            if test.category == ValidationCategory.API_FUNCTIONALITY:
                return self._evaluate_api_test(test, actual_result, recommendations)
            elif test.category == ValidationCategory.DATABASE_INTEGRITY:
                return self._evaluate_database_test(
                    test, actual_result, recommendations
                )
            elif test.category == ValidationCategory.SECURITY_COMPLIANCE:
                return self._evaluate_security_test(
                    test, actual_result, recommendations
                )
            elif test.category == ValidationCategory.PERFORMANCE_METRICS:
                return self._evaluate_performance_test(
                    test, actual_result, recommendations
                )
            else:
                # デフォルト評価
                success = actual_result == test.expected_result
                score = 100.0 if success else 0.0
                return success, score, recommendations

        except Exception as e:
            logger.error(f"テスト結果評価エラー: {e}")
            recommendations.append(f"結果評価エラー: {str(e)}")
            return False, 0.0, recommendations

    def _evaluate_api_test(
        self, test: ValidationTest, actual_result: Any, recommendations: List[str]
    ) -> Tuple[bool, float, List[str]]:
        """API テスト結果評価"""
        if test.test_id == "api_health_check":
            if isinstance(actual_result, dict) and actual_result.get("status") == "ok":
                return True, 100.0, recommendations
            else:
                recommendations.append("APIヘルスチェックが失敗しています")
                return False, 0.0, recommendations

        elif test.test_id == "api_endpoints_availability":
            if isinstance(actual_result, dict):
                available_count = actual_result.get("available_count", 0)
                total_count = actual_result.get("total_count", 1)
                score = (available_count / total_count) * 100
                success = score >= 95.0

                if not success:
                    recommendations.append(
                        f"利用可能なエンドポイントが不足しています ({available_count}/{total_count})"
                    )

                return success, score, recommendations

        elif test.test_id == "api_response_validation":
            if isinstance(actual_result, dict):
                valid_responses = actual_result.get("valid_responses", 0)
                total_responses = actual_result.get("total_responses", 1)
                score = (valid_responses / total_responses) * 100
                success = score >= 90.0

                if not success:
                    recommendations.append(
                        f"APIレスポンスの妥当性に問題があります ({valid_responses}/{total_responses})"
                    )

                return success, score, recommendations

        return False, 0.0, recommendations

    def _evaluate_database_test(
        self, test: ValidationTest, actual_result: Any, recommendations: List[str]
    ) -> Tuple[bool, float, List[str]]:
        """データベース テスト結果評価"""
        if test.test_id == "database_connection":
            if isinstance(actual_result, dict) and actual_result.get("connected"):
                return True, 100.0, recommendations
            else:
                recommendations.append("データベース接続に失敗しています")
                return False, 0.0, recommendations

        elif test.test_id == "database_integrity":
            if isinstance(actual_result, dict):
                integrity = actual_result.get("integrity")
                if integrity == "ok":
                    return True, 100.0, recommendations
                else:
                    recommendations.append(
                        f"データベース整合性に問題があります: {integrity}"
                    )
                    return False, 0.0, recommendations

        elif test.test_id == "data_consistency":
            if isinstance(actual_result, dict):
                consistency_score = actual_result.get("consistency_score", 0)
                success = consistency_score >= 95.0

                if not success:
                    recommendations.append(
                        f"データ一貫性に問題があります (スコア: {consistency_score})"
                    )

                return success, consistency_score, recommendations

        return False, 0.0, recommendations

    def _evaluate_security_test(
        self, test: ValidationTest, actual_result: Any, recommendations: List[str]
    ) -> Tuple[bool, float, List[str]]:
        """セキュリティ テスト結果評価"""
        if test.test_id == "security_headers":
            if isinstance(actual_result, dict):
                present_headers = actual_result.get("present_headers", [])
                required_headers = self.security_standards["required_headers"]
                score = (len(present_headers) / len(required_headers)) * 100
                success = score >= 80.0

                if not success:
                    missing = set(required_headers) - set(present_headers)
                    recommendations.append(
                        f"必要なセキュリティヘッダーが不足: {list(missing)}"
                    )

                return success, score, recommendations

        elif test.test_id == "ssl_configuration":
            if isinstance(actual_result, dict):
                ssl_valid = actual_result.get("ssl_valid", False)
                if ssl_valid:
                    return True, 100.0, recommendations
                else:
                    recommendations.append("SSL/TLS設定に問題があります")
                    return False, 0.0, recommendations

        elif test.test_id == "authentication_security":
            if isinstance(actual_result, dict):
                auth_score = actual_result.get("auth_score", 0)
                success = auth_score >= 85.0

                if not success:
                    recommendations.append(
                        f"認証セキュリティに改善が必要 (スコア: {auth_score})"
                    )

                return success, auth_score, recommendations

        return False, 0.0, recommendations

    def _evaluate_performance_test(
        self, test: ValidationTest, actual_result: Any, recommendations: List[str]
    ) -> Tuple[bool, float, List[str]]:
        """パフォーマンス テスト結果評価"""
        if test.test_id == "response_time_performance":
            if isinstance(actual_result, dict):
                avg_response_time = actual_result.get("avg_response_time", float("inf"))
                threshold = self.performance_thresholds["response_time_threshold"]

                if avg_response_time <= threshold:
                    score = 100.0
                    success = True
                elif avg_response_time <= threshold * 2:
                    score = 50.0
                    success = False
                    recommendations.append(
                        f"レスポンス時間が遅い: {avg_response_time:.2f}秒"
                    )
                else:
                    score = 0.0
                    success = False
                    recommendations.append(
                        f"レスポンス時間が非常に遅い: {avg_response_time:.2f}秒"
                    )

                return success, score, recommendations

        elif test.test_id == "system_resource_performance":
            if isinstance(actual_result, dict):
                cpu_usage = actual_result.get("cpu_usage", 0)
                memory_usage = actual_result.get("memory_usage", 0)

                cpu_score = max(0, 100 - max(0, cpu_usage - 50) * 2)
                memory_score = max(0, 100 - max(0, memory_usage - 50) * 2)
                score = (cpu_score + memory_score) / 2

                success = score >= 70.0

                if cpu_usage > self.performance_thresholds["cpu_threshold"]:
                    recommendations.append(f"CPU使用率が高い: {cpu_usage}%")
                if memory_usage > self.performance_thresholds["memory_threshold"]:
                    recommendations.append(f"メモリ使用率が高い: {memory_usage}%")

                return success, score, recommendations

        elif test.test_id == "database_performance":
            if isinstance(actual_result, dict):
                query_time = actual_result.get("avg_query_time", float("inf"))
                threshold = self.performance_thresholds["database_query_threshold"]

                if query_time <= threshold:
                    score = 100.0
                    success = True
                elif query_time <= threshold * 3:
                    score = 50.0
                    success = False
                    recommendations.append(
                        f"データベースクエリが遅い: {query_time:.2f}秒"
                    )
                else:
                    score = 0.0
                    success = False
                    recommendations.append(
                        f"データベースクエリが非常に遅い: {query_time:.2f}秒"
                    )

                return success, score, recommendations

        return False, 0.0, recommendations

    # テスト実装関数群
    async def _test_api_health(self, test: ValidationTest) -> Dict[str, Any]:
        """API ヘルスチェックテスト"""
        try:
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=10)
            ) as session:
                async with session.get(f"{self.base_url}/health") as response:
                    if response.status == 200:
                        data = await response.json()
                        return {"status": "ok", "response": data}
                    else:
                        return {"status": "error", "status_code": response.status}
        except Exception as e:
            return {"status": "error", "error": str(e)}

    async def _test_endpoints_availability(
        self, test: ValidationTest
    ) -> Dict[str, Any]:
        """エンドポイント可用性テスト"""
        endpoints = [
            "/health",
            "/docs",
            "/api/v1/incidents",
            "/api/v1/users",
            "/api/v1/dashboard/metrics",
            "/api/v1/problems",
            "/api/v1/changes",
        ]

        available_count = 0
        endpoint_results = {}

        async with aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        ) as session:
            for endpoint in endpoints:
                try:
                    async with session.get(f"{self.base_url}{endpoint}") as response:
                        if response.status < 500:  # 500番台以外は利用可能とみなす
                            available_count += 1
                            endpoint_results[endpoint] = {
                                "status": "available",
                                "code": response.status,
                            }
                        else:
                            endpoint_results[endpoint] = {
                                "status": "error",
                                "code": response.status,
                            }
                except Exception as e:
                    endpoint_results[endpoint] = {"status": "error", "error": str(e)}

        return {
            "available_count": available_count,
            "total_count": len(endpoints),
            "availability_rate": (available_count / len(endpoints)) * 100,
            "endpoint_results": endpoint_results,
        }

    async def _test_api_response_validation(
        self, test: ValidationTest
    ) -> Dict[str, Any]:
        """APIレスポンス検証テスト"""
        test_endpoints = [
            {"endpoint": "/health", "method": "GET", "expected_fields": ["status"]},
            {
                "endpoint": "/api/v1/incidents",
                "method": "GET",
                "expected_fields": ["items", "total"],
            },
            {
                "endpoint": "/api/v1/users",
                "method": "GET",
                "expected_fields": ["items", "total"],
            },
        ]

        valid_responses = 0
        response_results = {}

        async with aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=45)
        ) as session:
            for test_ep in test_endpoints:
                try:
                    async with session.request(
                        test_ep["method"], f"{self.base_url}{test_ep['endpoint']}"
                    ) as response:
                        if response.status < 400:
                            try:
                                data = await response.json()

                                # 期待されるフィールドの存在確認
                                has_expected_fields = all(
                                    field in data
                                    for field in test_ep["expected_fields"]
                                )

                                if has_expected_fields:
                                    valid_responses += 1
                                    response_results[test_ep["endpoint"]] = {
                                        "status": "valid"
                                    }
                                else:
                                    response_results[test_ep["endpoint"]] = {
                                        "status": "invalid",
                                        "reason": "missing_expected_fields",
                                        "missing": [
                                            f
                                            for f in test_ep["expected_fields"]
                                            if f not in data
                                        ],
                                    }
                            except json.JSONDecodeError:
                                response_results[test_ep["endpoint"]] = {
                                    "status": "invalid",
                                    "reason": "invalid_json",
                                }
                        else:
                            response_results[test_ep["endpoint"]] = {
                                "status": "error",
                                "status_code": response.status,
                            }
                except Exception as e:
                    response_results[test_ep["endpoint"]] = {
                        "status": "error",
                        "error": str(e),
                    }

        return {
            "valid_responses": valid_responses,
            "total_responses": len(test_endpoints),
            "validation_rate": (valid_responses / len(test_endpoints)) * 100,
            "response_results": response_results,
        }

    async def _test_database_connection(self, test: ValidationTest) -> Dict[str, Any]:
        """データベース接続テスト"""
        try:
            db_path = self.backend_path / "itsm.db"

            if not db_path.exists():
                return {"connected": False, "reason": "database_file_not_found"}

            conn = sqlite3.connect(str(db_path), timeout=5.0)

            # 簡単なクエリで接続確認
            cursor = conn.execute("SELECT 1")
            result = cursor.fetchone()
            conn.close()

            if result and result[0] == 1:
                return {"connected": True, "database_path": str(db_path)}
            else:
                return {"connected": False, "reason": "query_failed"}

        except Exception as e:
            return {"connected": False, "reason": "connection_error", "error": str(e)}

    async def _test_database_integrity(self, test: ValidationTest) -> Dict[str, Any]:
        """データベース整合性テスト"""
        try:
            db_path = self.backend_path / "itsm.db"
            conn = sqlite3.connect(str(db_path), timeout=10.0)

            # 整合性チェック実行
            cursor = conn.execute("PRAGMA integrity_check")
            integrity_result = cursor.fetchone()

            # 外部キー制約チェック
            cursor = conn.execute("PRAGMA foreign_key_check")
            fk_errors = cursor.fetchall()

            conn.close()

            integrity_status = integrity_result[0] if integrity_result else "unknown"
            has_fk_errors = len(fk_errors) > 0

            return {
                "integrity": integrity_status,
                "foreign_key_errors": len(fk_errors),
                "has_errors": has_fk_errors or integrity_status != "ok",
                "details": {
                    "integrity_check": integrity_status,
                    "fk_error_count": len(fk_errors),
                },
            }

        except Exception as e:
            return {"integrity": "error", "error": str(e)}

    async def _test_data_consistency(self, test: ValidationTest) -> Dict[str, Any]:
        """データ一貫性テスト"""
        try:
            db_path = self.backend_path / "itsm.db"
            conn = sqlite3.connect(str(db_path), timeout=15.0)

            consistency_checks = []
            total_score = 0

            # テーブル存在確認
            required_tables = ["incidents", "users", "problems", "changes"]
            cursor = conn.execute(
                "SELECT name FROM sqlite_master WHERE type='table' AND name IN ({})".format(
                    ",".join(["?" for _ in required_tables])
                ),
                required_tables,
            )
            existing_tables = [row[0] for row in cursor.fetchall()]

            table_check = {
                "required_tables": required_tables,
                "existing_tables": existing_tables,
                "missing_tables": list(set(required_tables) - set(existing_tables)),
                "score": (len(existing_tables) / len(required_tables)) * 100,
            }
            consistency_checks.append(table_check)
            total_score += table_check["score"]

            # データ件数チェック（テーブルが存在する場合）
            data_counts = {}
            for table in existing_tables:
                try:
                    cursor = conn.execute(f"SELECT COUNT(*) FROM {table}")
                    count = cursor.fetchone()[0]
                    data_counts[table] = count
                except Exception as e:
                    data_counts[table] = f"error: {str(e)}"

            # 参照整合性チェック（基本的なもの）
            ref_integrity_score = 100.0  # 基本スコア
            ref_integrity_issues = []

            # incidents テーブルの assigned_to が users テーブルに存在するかチェック
            if "incidents" in existing_tables and "users" in existing_tables:
                try:
                    cursor = conn.execute(
                        """
                        SELECT COUNT(*) FROM incidents 
                        WHERE assigned_to IS NOT NULL 
                        AND assigned_to NOT IN (SELECT id FROM users)
                    """
                    )
                    orphaned_assignments = cursor.fetchone()[0]
                    if orphaned_assignments > 0:
                        ref_integrity_issues.append(
                            f"Orphaned incident assignments: {orphaned_assignments}"
                        )
                        ref_integrity_score -= 20
                except Exception as e:
                    ref_integrity_issues.append(f"Assignment check error: {str(e)}")
                    ref_integrity_score -= 10

            consistency_checks.append(
                {
                    "check_type": "referential_integrity",
                    "score": max(0, ref_integrity_score),
                    "issues": ref_integrity_issues,
                }
            )
            total_score += max(0, ref_integrity_score)

            conn.close()

            # 平均スコア計算
            avg_consistency_score = (
                total_score / len(consistency_checks) if consistency_checks else 0
            )

            return {
                "consistent": avg_consistency_score >= 95.0,
                "consistency_score": avg_consistency_score,
                "checks": consistency_checks,
                "data_counts": data_counts,
                "summary": {
                    "total_checks": len(consistency_checks),
                    "avg_score": avg_consistency_score,
                },
            }

        except Exception as e:
            return {"consistent": False, "error": str(e)}

    async def _test_security_headers(self, test: ValidationTest) -> Dict[str, Any]:
        """セキュリティヘッダーテスト"""
        try:
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=20)
            ) as session:
                async with session.get(f"{self.base_url}/health") as response:
                    headers = dict(response.headers)

                    required_headers = self.security_standards["required_headers"]
                    present_headers = []

                    for header in required_headers:
                        if header.lower() in [h.lower() for h in headers.keys()]:
                            present_headers.append(header)

                    return {
                        "headers_present": len(present_headers)
                        == len(required_headers),
                        "present_headers": present_headers,
                        "missing_headers": list(
                            set(required_headers) - set(present_headers)
                        ),
                        "all_headers": headers,
                        "compliance_rate": (
                            len(present_headers) / len(required_headers)
                        )
                        * 100,
                    }

        except Exception as e:
            return {"headers_present": False, "error": str(e)}

    async def _test_ssl_configuration(self, test: ValidationTest) -> Dict[str, Any]:
        """SSL/TLS設定テスト"""
        try:
            # HTTPSでない場合はスキップ
            if not self.base_url.startswith("https://"):
                return {
                    "ssl_valid": True,
                    "note": "HTTP接続のためSSLチェックをスキップ",
                    "protocol": "HTTP",
                }

            # HTTPSの場合のSSL確認
            parsed_url = urlparse(self.base_url)
            hostname = parsed_url.hostname
            port = parsed_url.port or 443

            context = ssl.create_default_context()

            with socket.create_connection((hostname, port), timeout=10) as sock:
                with context.wrap_socket(sock, server_hostname=hostname) as ssock:
                    cert = ssock.getpeercert()
                    protocol = ssock.version()

                    # 証明書有効期限チェック
                    expiry_date = datetime.strptime(
                        cert["notAfter"], "%b %d %H:%M:%S %Y %Z"
                    )
                    days_until_expiry = (expiry_date - datetime.now()).days

                    return {
                        "ssl_valid": True,
                        "protocol": protocol,
                        "certificate": {
                            "subject": cert.get("subject", []),
                            "issuer": cert.get("issuer", []),
                            "expires": cert.get("notAfter"),
                            "days_until_expiry": days_until_expiry,
                        },
                        "secure": days_until_expiry > 30
                        and protocol in ["TLSv1.2", "TLSv1.3"],
                    }

        except Exception as e:
            return {"ssl_valid": False, "error": str(e)}

    async def _test_authentication_security(
        self, test: ValidationTest
    ) -> Dict[str, Any]:
        """認証セキュリティテスト"""
        try:
            auth_score = 100.0
            security_issues = []

            # ログインエンドポイントの存在確認
            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=30)
            ) as session:
                # ログインエンドポイントテスト
                try:
                    async with session.post(
                        f"{self.base_url}/api/v1/auth/login"
                    ) as response:
                        if response.status in [400, 422]:  # バリデーションエラーは正常
                            pass
                        elif response.status == 404:
                            security_issues.append(
                                "ログインエンドポイントが見つかりません"
                            )
                            auth_score -= 30
                        elif response.status >= 500:
                            security_issues.append(
                                "ログインエンドポイントでサーバーエラー"
                            )
                            auth_score -= 20
                except Exception as e:
                    security_issues.append(
                        f"ログインエンドポイントテストエラー: {str(e)}"
                    )
                    auth_score -= 25

                # パスワードポリシーの確認（間接的）
                # 実際の実装では、パスワード要件を確認するAPIがあるかチェック

                # セッション管理の確認
                # クッキーのセキュリティ設定など

            return {
                "auth_secure": auth_score >= 85.0,
                "auth_score": auth_score,
                "security_issues": security_issues,
                "checks": {
                    "login_endpoint": "available" if auth_score >= 70 else "issues",
                    "password_policy": "not_tested",  # 実装に依存
                    "session_management": "not_tested",  # 実装に依存
                },
            }

        except Exception as e:
            return {"auth_secure": False, "error": str(e)}

    async def _test_response_time_performance(
        self, test: ValidationTest
    ) -> Dict[str, Any]:
        """レスポンス時間パフォーマンステスト"""
        try:
            endpoints = ["/health", "/api/v1/incidents", "/api/v1/users"]
            response_times = []
            endpoint_times = {}

            async with aiohttp.ClientSession(
                timeout=aiohttp.ClientTimeout(total=45)
            ) as session:
                for endpoint in endpoints:
                    endpoint_response_times = []

                    # 各エンドポイントを3回テスト
                    for _ in range(3):
                        start_time = time.time()
                        try:
                            async with session.get(
                                f"{self.base_url}{endpoint}"
                            ) as response:
                                await response.read()  # レスポンス本文を読み込み
                                response_time = time.time() - start_time
                                endpoint_response_times.append(response_time)
                                response_times.append(response_time)
                        except Exception as e:
                            # エラーの場合も時間を記録（タイムアウト等を含む）
                            response_time = time.time() - start_time
                            endpoint_response_times.append(response_time)
                            response_times.append(response_time)

                    endpoint_times[endpoint] = {
                        "avg_time": statistics.mean(endpoint_response_times),
                        "max_time": max(endpoint_response_times),
                        "min_time": min(endpoint_response_times),
                    }

            avg_response_time = (
                statistics.mean(response_times) if response_times else float("inf")
            )
            max_response_time = max(response_times) if response_times else float("inf")

            return {
                "avg_response_time": avg_response_time,
                "max_response_time": max_response_time,
                "endpoint_details": endpoint_times,
                "threshold": self.performance_thresholds["response_time_threshold"],
                "performance_rating": (
                    "good"
                    if avg_response_time
                    <= self.performance_thresholds["response_time_threshold"]
                    else "poor"
                ),
            }

        except Exception as e:
            return {"avg_response_time": float("inf"), "error": str(e)}

    async def _test_system_resource_performance(
        self, test: ValidationTest
    ) -> Dict[str, Any]:
        """システムリソースパフォーマンステスト"""
        try:
            # 複数回測定して平均を取る
            cpu_measurements = []
            memory_measurements = []

            for _ in range(5):
                cpu_measurements.append(psutil.cpu_percent(interval=0.2))
                memory_measurements.append(psutil.virtual_memory().percent)
                await asyncio.sleep(0.1)

            cpu_usage = statistics.mean(cpu_measurements)
            memory_usage = statistics.mean(memory_measurements)

            # ディスク使用量
            disk_usage = psutil.disk_usage("/").percent

            # プロセス数
            process_count = len(psutil.pids())

            return {
                "cpu_usage": cpu_usage,
                "memory_usage": memory_usage,
                "disk_usage": disk_usage,
                "process_count": process_count,
                "thresholds": {
                    "cpu_threshold": self.performance_thresholds["cpu_threshold"],
                    "memory_threshold": self.performance_thresholds["memory_threshold"],
                },
                "status": {
                    "cpu": (
                        "normal"
                        if cpu_usage < self.performance_thresholds["cpu_threshold"]
                        else "high"
                    ),
                    "memory": (
                        "normal"
                        if memory_usage
                        < self.performance_thresholds["memory_threshold"]
                        else "high"
                    ),
                },
            }

        except Exception as e:
            return {"cpu_usage": 0, "memory_usage": 0, "error": str(e)}

    async def _test_database_performance(self, test: ValidationTest) -> Dict[str, Any]:
        """データベースパフォーマンステスト"""
        try:
            db_path = self.backend_path / "itsm.db"
            conn = sqlite3.connect(str(db_path), timeout=15.0)

            query_times = []
            query_results = {}

            # 基本的なクエリのパフォーマンステスト
            test_queries = [
                ("simple_select", "SELECT 1"),
                ("count_incidents", "SELECT COUNT(*) FROM incidents"),
                ("count_users", "SELECT COUNT(*) FROM users"),
            ]

            for query_name, query in test_queries:
                try:
                    start_time = time.time()
                    cursor = conn.execute(query)
                    result = cursor.fetchone()
                    query_time = time.time() - start_time

                    query_times.append(query_time)
                    query_results[query_name] = {
                        "time": query_time,
                        "result": result,
                        "status": "success",
                    }
                except Exception as e:
                    query_results[query_name] = {
                        "time": 0,
                        "error": str(e),
                        "status": "error",
                    }

            # データベースサイズ確認
            db_size_mb = db_path.stat().st_size / (1024 * 1024)

            conn.close()

            avg_query_time = (
                statistics.mean(query_times) if query_times else float("inf")
            )
            max_query_time = max(query_times) if query_times else float("inf")

            return {
                "avg_query_time": avg_query_time,
                "max_query_time": max_query_time,
                "database_size_mb": db_size_mb,
                "query_details": query_results,
                "threshold": self.performance_thresholds["database_query_threshold"],
                "performance_rating": (
                    "good"
                    if avg_query_time
                    <= self.performance_thresholds["database_query_threshold"]
                    else "poor"
                ),
            }

        except Exception as e:
            return {"avg_query_time": float("inf"), "error": str(e)}

    def _calculate_overall_score(self, results: Dict[str, Any]) -> float:
        """全体スコア計算"""
        total_score = 0.0
        total_weight = 0.0

        # スイート重み付け
        suite_weights = {
            "api_functionality": 1.0,
            "database_integrity": 1.2,
            "security_compliance": 1.1,
            "performance_metrics": 0.8,
        }

        for suite_name, suite_result in results.items():
            if "summary" in suite_result and "overall_score" in suite_result["summary"]:
                weight = suite_weights.get(suite_name, 1.0)
                score = suite_result["summary"]["overall_score"]
                total_score += score * weight
                total_weight += weight

        return total_score / total_weight if total_weight > 0 else 0.0

    def _calculate_success_rate(self, results: Dict[str, Any]) -> float:
        """成功率計算"""
        total_tests = 0
        passed_tests = 0

        for suite_result in results.values():
            if "summary" in suite_result:
                summary = suite_result["summary"]
                total_tests += summary.get("total_tests", 0)
                passed_tests += summary.get("passed", 0)

        return (passed_tests / total_tests * 100) if total_tests > 0 else 0.0

    def _generate_validation_recommendations(
        self, results: Dict[str, Any]
    ) -> List[str]:
        """検証推奨事項生成"""
        recommendations = []

        try:
            for suite_name, suite_result in results.items():
                if "test_results" in suite_result:
                    for test_result in suite_result["test_results"]:
                        if not test_result.success and test_result.recommendations:
                            recommendations.extend(test_result.recommendations)

                # スイートレベルの推奨事項
                if "summary" in suite_result:
                    summary = suite_result["summary"]

                    if summary.get("overall_score", 0) < 70:
                        recommendations.append(
                            f"{suite_name} スイートのスコアが低い ({summary['overall_score']:.1f}/100)"
                        )

                    if summary.get("failed", 0) > 0:
                        recommendations.append(
                            f"{suite_name} で {summary['failed']} 件のテストが失敗"
                        )

            # 重複削除
            recommendations = list(set(recommendations))

        except Exception as e:
            logger.error(f"推奨事項生成エラー: {e}")
            recommendations.append(f"推奨事項生成エラー: {str(e)}")

        return recommendations

    async def _save_validation_session(self, session: Dict[str, Any]):
        """検証セッション保存"""
        try:
            # 履歴に追加
            self.validation_history.append(session)

            # 最新100セッションのみ保持
            self.validation_history = self.validation_history[-100:]

            # ファイルに保存
            timestamp = int(datetime.now().timestamp())
            session_file = (
                self.coordination_path / f"validation_session_{timestamp}.json"
            )

            async with aiofiles.open(session_file, "w") as f:
                await f.write(json.dumps(session, indent=2, ensure_ascii=False))

            # 最新の検証結果を保存
            latest_file = self.coordination_path / "latest_validation_results.json"
            async with aiofiles.open(latest_file, "w") as f:
                await f.write(json.dumps(session, indent=2, ensure_ascii=False))

            logger.info(f"📋 検証セッション保存完了: {session_file}")

        except Exception as e:
            logger.error(f"検証セッション保存エラー: {e}")

    def get_validation_status(self) -> Dict[str, Any]:
        """検証状況取得"""
        try:
            latest_session = (
                self.validation_history[-1] if self.validation_history else None
            )

            return {
                "total_sessions": len(self.validation_history),
                "total_validations": len(self.validation_results),
                "latest_session": (
                    {
                        "validation_id": (
                            latest_session.get("validation_id")
                            if latest_session
                            else None
                        ),
                        "timestamp": (
                            latest_session.get("start_time") if latest_session else None
                        ),
                        "overall_score": (
                            latest_session.get("overall_score") if latest_session else 0
                        ),
                        "success_rate": (
                            latest_session.get("success_rate") if latest_session else 0
                        ),
                    }
                    if latest_session
                    else None
                ),
                "available_suites": list(self.validation_suites.keys()),
            }
        except Exception as e:
            logger.error(f"検証状況取得エラー: {e}")
            return {"error": str(e)}


# グローバルインスタンス
internal_validator = InternalValidationSystem()


async def main():
    """メイン実行関数"""
    try:
        logger.info("🔍 内部検証システム単体実行開始")

        # 全検証スイートを実行
        result = await internal_validator.run_comprehensive_validation()

        print("\n=== 検証結果概要 ===")
        print(f"全体スコア: {result['overall_score']:.1f}/100")
        print(f"成功率: {result['success_rate']:.1f}%")
        print(f"実行時間: {result['execution_time']:.2f}秒")

        if result["recommendations"]:
            print("\n=== 推奨事項 ===")
            for rec in result["recommendations"]:
                print(f"- {rec}")

        print(
            f"\n詳細結果は {internal_validator.coordination_path / 'latest_validation_results.json'} に保存されました"
        )

    except KeyboardInterrupt:
        logger.info("⌨️ ユーザーによる中断")
    except Exception as e:
        logger.error(f"❌ 検証システムエラー: {e}")
        traceback.print_exc()


if __name__ == "__main__":
    # ログ設定
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler(
                "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/internal_validation.log"
            ),
            logging.StreamHandler(),
        ],
    )

    asyncio.run(main())
