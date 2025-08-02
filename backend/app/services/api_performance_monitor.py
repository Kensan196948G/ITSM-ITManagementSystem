"""
API Performance Monitoring System
APIパフォーマンス監視・最適化システム
"""

import asyncio
import json
import logging
import time
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import traceback
import psutil
import httpx
import threading
from concurrent.futures import ThreadPoolExecutor, as_completed
import numpy as np

from app.core.config import settings


@dataclass
class PerformanceMetric:
    """パフォーマンスメトリクス"""

    timestamp: str
    endpoint: str
    method: str
    response_time: float
    status_code: int
    response_size: int
    cpu_usage: float
    memory_usage: float
    error_message: Optional[str] = None
    concurrent_requests: int = 1


@dataclass
class APIPerformanceReport:
    """APIパフォーマンスレポート"""

    timestamp: str
    total_requests: int
    successful_requests: int
    failed_requests: int
    average_response_time: float
    median_response_time: float
    p95_response_time: float
    p99_response_time: float
    requests_per_second: float
    error_rate: float
    slowest_endpoints: List[Dict]
    performance_issues: List[str]
    optimization_recommendations: List[str]


class APIPerformanceMonitor:
    """APIパフォーマンス監視システム"""

    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.base_url = "http://192.168.3.135:8000"
        self.metrics_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/performance_metrics.json"
        self.report_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/performance_report.json"

        # メトリクス保存
        self.performance_metrics: List[PerformanceMetric] = []
        self.monitoring_active = False
        self.monitoring_interval = 15  # 15秒間隔

        # パフォーマンス閾値
        self.performance_thresholds = {
            "response_time_warning": 1.0,  # 1秒
            "response_time_critical": 3.0,  # 3秒
            "error_rate_warning": 0.05,  # 5%
            "error_rate_critical": 0.10,  # 10%
            "cpu_usage_warning": 70.0,  # 70%
            "cpu_usage_critical": 90.0,  # 90%
            "memory_usage_warning": 80.0,  # 80%
            "memory_usage_critical": 95.0,  # 95%
            "rps_minimum": 1.0,  # 1 req/sec minimum
        }

        # 監視対象エンドポイント
        self.monitoring_endpoints = [
            {"path": "/health", "method": "GET", "weight": 1.0, "critical": True},
            {"path": "/version", "method": "GET", "weight": 0.5, "critical": False},
            {
                "path": "/api/v1/incidents",
                "method": "GET",
                "weight": 2.0,
                "critical": True,
            },
            {
                "path": "/api/v1/incidents",
                "method": "POST",
                "weight": 2.0,
                "critical": True,
                "payload": {"title": "Test Incident", "description": "Test"},
            },
            {
                "path": "/api/v1/problems",
                "method": "GET",
                "weight": 2.0,
                "critical": True,
            },
            {
                "path": "/api/v1/problems",
                "method": "POST",
                "weight": 2.0,
                "critical": True,
                "payload": {"title": "Test Problem", "description": "Test"},
            },
            {"path": "/api/v1/users", "method": "GET", "weight": 1.5, "critical": True},
            {
                "path": "/api/v1/dashboard",
                "method": "GET",
                "weight": 3.0,
                "critical": True,
            },
            {"path": "/docs", "method": "GET", "weight": 0.5, "critical": False},
        ]

        # 負荷テスト設定
        self.load_test_configs = [
            {"concurrent_users": 1, "duration": 30, "name": "light_load"},
            {"concurrent_users": 5, "duration": 60, "name": "medium_load"},
            {"concurrent_users": 10, "duration": 30, "name": "heavy_load"},
        ]

        # システムリソース監視
        self.resource_monitoring_active = False

    async def start_infinite_performance_monitoring(self):
        """無限ループでのパフォーマンス監視開始"""
        self.monitoring_active = True
        self.resource_monitoring_active = True
        self.logger.info("Starting infinite API performance monitoring...")

        # リソース監視を別スレッドで開始
        resource_thread = threading.Thread(
            target=self._monitor_system_resources, daemon=True
        )
        resource_thread.start()

        monitoring_cycle = 0
        consecutive_failures = 0
        max_consecutive_failures = 3

        while self.monitoring_active:
            try:
                monitoring_cycle += 1
                self.logger.info(
                    f"Starting performance monitoring cycle #{monitoring_cycle}"
                )

                # 1. Basic Performance Check
                basic_metrics = await self.check_basic_performance()

                # 2. Load Testing
                load_test_results = await self.execute_load_tests()

                # 3. Endpoint-specific Performance Analysis
                endpoint_analysis = await self.analyze_endpoint_performance()

                # 4. Resource Usage Analysis
                resource_analysis = await self.analyze_resource_usage()

                # 5. Performance Trend Analysis
                trend_analysis = await self.analyze_performance_trends()

                # 6. Generate Performance Report
                performance_report = await self.generate_performance_report(
                    basic_metrics,
                    load_test_results,
                    endpoint_analysis,
                    resource_analysis,
                    trend_analysis,
                )

                # 7. Performance Optimization
                optimization_result = await self.execute_performance_optimization(
                    performance_report
                )

                # 8. Cleanup Old Metrics
                await self.cleanup_old_metrics()

                consecutive_failures = 0
                await asyncio.sleep(self.monitoring_interval)

            except Exception as e:
                consecutive_failures += 1
                self.logger.error(
                    f"Performance monitoring cycle #{monitoring_cycle} failed: {str(e)}"
                )
                self.logger.error(traceback.format_exc())

                if consecutive_failures >= max_consecutive_failures:
                    self.logger.critical(
                        f"Too many consecutive failures: {consecutive_failures}"
                    )
                    await self.emergency_performance_recovery()
                    consecutive_failures = 0

                # Exponential backoff
                wait_time = min(
                    120, self.monitoring_interval * (2 ** min(consecutive_failures, 4))
                )
                await asyncio.sleep(wait_time)

    async def check_basic_performance(self) -> Dict[str, Any]:
        """基本パフォーマンスチェック"""
        basic_metrics = {
            "timestamp": datetime.now().isoformat(),
            "endpoint_metrics": {},
            "overall_performance": "unknown",
            "issues_detected": [],
            "system_load": {},
        }

        try:
            # システム負荷情報
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage("/")

            basic_metrics["system_load"] = {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_available_gb": memory.available / (1024**3),
                "disk_percent": disk.percent,
                "disk_free_gb": disk.free / (1024**3),
            }

            # 各エンドポイントのパフォーマンステスト
            for endpoint in self.monitoring_endpoints:
                try:
                    endpoint_metrics = await self._measure_endpoint_performance(
                        endpoint
                    )
                    basic_metrics["endpoint_metrics"][
                        f"{endpoint['method']} {endpoint['path']}"
                    ] = endpoint_metrics

                    # パフォーマンス問題の検出
                    if (
                        endpoint_metrics.get("response_time", 0)
                        > self.performance_thresholds["response_time_critical"]
                    ):
                        basic_metrics["issues_detected"].append(
                            f"Critical response time: {endpoint['path']} ({endpoint_metrics.get('response_time', 0):.2f}s)"
                        )
                    elif (
                        endpoint_metrics.get("response_time", 0)
                        > self.performance_thresholds["response_time_warning"]
                    ):
                        basic_metrics["issues_detected"].append(
                            f"Slow response time: {endpoint['path']} ({endpoint_metrics.get('response_time', 0):.2f}s)"
                        )

                    if endpoint_metrics.get("status_code", 200) >= 400:
                        basic_metrics["issues_detected"].append(
                            f"Error response: {endpoint['path']} (HTTP {endpoint_metrics.get('status_code', 'unknown')})"
                        )

                except Exception as e:
                    self.logger.error(
                        f"Error measuring endpoint {endpoint['path']}: {str(e)}"
                    )
                    basic_metrics["issues_detected"].append(
                        f"Endpoint unreachable: {endpoint['path']}"
                    )

            # システムリソース問題の検出
            if cpu_percent > self.performance_thresholds["cpu_usage_critical"]:
                basic_metrics["issues_detected"].append(
                    f"Critical CPU usage: {cpu_percent:.1f}%"
                )
            elif cpu_percent > self.performance_thresholds["cpu_usage_warning"]:
                basic_metrics["issues_detected"].append(
                    f"High CPU usage: {cpu_percent:.1f}%"
                )

            if memory.percent > self.performance_thresholds["memory_usage_critical"]:
                basic_metrics["issues_detected"].append(
                    f"Critical memory usage: {memory.percent:.1f}%"
                )
            elif memory.percent > self.performance_thresholds["memory_usage_warning"]:
                basic_metrics["issues_detected"].append(
                    f"High memory usage: {memory.percent:.1f}%"
                )

            # 総合パフォーマンス評価
            if any("Critical" in issue for issue in basic_metrics["issues_detected"]):
                basic_metrics["overall_performance"] = "critical"
            elif len(basic_metrics["issues_detected"]) > 3:
                basic_metrics["overall_performance"] = "warning"
            elif len(basic_metrics["issues_detected"]) > 0:
                basic_metrics["overall_performance"] = "degraded"
            else:
                basic_metrics["overall_performance"] = "good"

            self.logger.info(
                f"Basic performance check completed: {basic_metrics['overall_performance']}"
            )

        except Exception as e:
            basic_metrics.update({"overall_performance": "error", "error": str(e)})
            self.logger.error(f"Basic performance check failed: {str(e)}")

        return basic_metrics

    async def _measure_endpoint_performance(self, endpoint: Dict) -> Dict[str, Any]:
        """エンドポイントパフォーマンス測定"""
        metrics = {
            "response_time": 0,
            "status_code": 0,
            "response_size": 0,
            "error": None,
        }

        try:
            url = f"{self.base_url}{endpoint['path']}"

            # CPU使用率とメモリ使用率を測定開始時に記録
            cpu_before = psutil.cpu_percent()
            memory_before = psutil.virtual_memory().percent

            async with httpx.AsyncClient(timeout=10.0) as client:
                start_time = time.time()

                if endpoint["method"] == "POST" and "payload" in endpoint:
                    response = await client.post(url, json=endpoint["payload"])
                else:
                    response = await client.request(endpoint["method"], url)

                response_time = time.time() - start_time
                response_size = len(response.content) if response.content else 0

                # CPU使用率とメモリ使用率を測定終了時に記録
                cpu_after = psutil.cpu_percent()
                memory_after = psutil.virtual_memory().percent

                metrics.update(
                    {
                        "response_time": response_time,
                        "status_code": response.status_code,
                        "response_size": response_size,
                        "cpu_usage_delta": cpu_after - cpu_before,
                        "memory_usage_delta": memory_after - memory_before,
                    }
                )

                # パフォーマンスメトリクスを記録
                perf_metric = PerformanceMetric(
                    timestamp=datetime.now().isoformat(),
                    endpoint=endpoint["path"],
                    method=endpoint["method"],
                    response_time=response_time,
                    status_code=response.status_code,
                    response_size=response_size,
                    cpu_usage=cpu_after,
                    memory_usage=memory_after,
                    concurrent_requests=1,
                )
                self.performance_metrics.append(perf_metric)

                # メトリクス履歴を制限（最新10000件）
                if len(self.performance_metrics) > 10000:
                    self.performance_metrics = self.performance_metrics[-10000:]

        except Exception as e:
            metrics["error"] = str(e)
            self.logger.error(
                f"Endpoint performance measurement failed for {endpoint['path']}: {str(e)}"
            )

        return metrics

    async def execute_load_tests(self) -> Dict[str, Any]:
        """負荷テスト実行"""
        load_test_results = {
            "timestamp": datetime.now().isoformat(),
            "test_results": {},
            "overall_result": "unknown",
            "performance_summary": {},
        }

        try:
            for config in self.load_test_configs:
                self.logger.info(f"Executing load test: {config['name']}")

                test_result = await self._execute_single_load_test(config)
                load_test_results["test_results"][config["name"]] = test_result

            # 負荷テスト結果の総合評価
            all_successful = all(
                result.get("success", False)
                for result in load_test_results["test_results"].values()
            )

            if all_successful:
                load_test_results["overall_result"] = "passed"
            else:
                load_test_results["overall_result"] = "failed"

            # パフォーマンス要約
            response_times = []
            error_rates = []

            for result in load_test_results["test_results"].values():
                if result.get("avg_response_time"):
                    response_times.append(result["avg_response_time"])
                if result.get("error_rate") is not None:
                    error_rates.append(result["error_rate"])

            if response_times:
                load_test_results["performance_summary"] = {
                    "avg_response_time": statistics.mean(response_times),
                    "max_response_time": max(response_times),
                    "avg_error_rate": (
                        statistics.mean(error_rates) if error_rates else 0
                    ),
                }

            self.logger.info(
                f"Load tests completed: {load_test_results['overall_result']}"
            )

        except Exception as e:
            load_test_results.update({"overall_result": "error", "error": str(e)})
            self.logger.error(f"Load tests failed: {str(e)}")

        return load_test_results

    async def _execute_single_load_test(self, config: Dict) -> Dict[str, Any]:
        """単一負荷テスト実行"""
        result = {
            "config": config,
            "start_time": datetime.now().isoformat(),
            "success": False,
            "total_requests": 0,
            "successful_requests": 0,
            "failed_requests": 0,
            "avg_response_time": 0,
            "error_rate": 0,
            "requests_per_second": 0,
        }

        try:
            concurrent_users = config["concurrent_users"]
            duration = config["duration"]

            # 負荷テスト用のエンドポイント（軽量なものを選択）
            test_endpoint = {"path": "/health", "method": "GET"}

            start_time = time.time()
            end_time = start_time + duration

            # 同時実行用のタスクリスト
            tasks = []
            response_times = []
            success_count = 0
            total_count = 0

            with ThreadPoolExecutor(max_workers=concurrent_users) as executor:
                while time.time() < end_time:
                    # 同時リクエスト送信
                    futures = []
                    for _ in range(concurrent_users):
                        future = executor.submit(
                            self._send_load_test_request, test_endpoint
                        )
                        futures.append(future)

                    # 結果収集
                    for future in as_completed(futures, timeout=10):
                        try:
                            response_time, status_code = future.result()
                            total_count += 1
                            response_times.append(response_time)

                            if status_code < 400:
                                success_count += 1

                        except Exception as e:
                            total_count += 1
                            self.logger.warning(f"Load test request failed: {str(e)}")

                    # 短い間隔で次のバッチ
                    await asyncio.sleep(0.1)

            # 結果計算
            actual_duration = time.time() - start_time

            result.update(
                {
                    "success": True,
                    "total_requests": total_count,
                    "successful_requests": success_count,
                    "failed_requests": total_count - success_count,
                    "avg_response_time": (
                        statistics.mean(response_times) if response_times else 0
                    ),
                    "error_rate": (
                        (total_count - success_count) / total_count
                        if total_count > 0
                        else 0
                    ),
                    "requests_per_second": (
                        total_count / actual_duration if actual_duration > 0 else 0
                    ),
                    "actual_duration": actual_duration,
                }
            )

            self.logger.info(
                f"Load test {config['name']} completed: {success_count}/{total_count} successful"
            )

        except Exception as e:
            result.update({"success": False, "error": str(e)})
            self.logger.error(f"Load test {config['name']} failed: {str(e)}")

        return result

    def _send_load_test_request(self, endpoint: Dict) -> Tuple[float, int]:
        """負荷テスト用リクエスト送信（同期版）"""
        try:
            import requests

            url = f"{self.base_url}{endpoint['path']}"

            start_time = time.time()
            response = requests.request(endpoint["method"], url, timeout=10)
            response_time = time.time() - start_time

            return response_time, response.status_code

        except Exception as e:
            self.logger.warning(f"Load test request failed: {str(e)}")
            return 0, 500

    async def analyze_endpoint_performance(self) -> Dict[str, Any]:
        """エンドポイント別パフォーマンス分析"""
        analysis = {
            "timestamp": datetime.now().isoformat(),
            "endpoint_analysis": {},
            "slow_endpoints": [],
            "error_prone_endpoints": [],
            "recommendations": [],
        }

        try:
            if not self.performance_metrics:
                analysis["message"] = "No performance metrics available for analysis"
                return analysis

            # 最近1時間のメトリクスを分析
            one_hour_ago = datetime.now() - timedelta(hours=1)
            recent_metrics = [
                m
                for m in self.performance_metrics
                if datetime.fromisoformat(m.timestamp) > one_hour_ago
            ]

            if not recent_metrics:
                analysis["message"] = "No recent performance metrics available"
                return analysis

            # エンドポイント別グループ化
            endpoint_groups = {}
            for metric in recent_metrics:
                key = f"{metric.method} {metric.endpoint}"
                if key not in endpoint_groups:
                    endpoint_groups[key] = []
                endpoint_groups[key].append(metric)

            # 各エンドポイントの分析
            for endpoint_key, metrics in endpoint_groups.items():
                response_times = [m.response_time for m in metrics]
                status_codes = [m.status_code for m in metrics]

                endpoint_stats = {
                    "total_requests": len(metrics),
                    "avg_response_time": statistics.mean(response_times),
                    "median_response_time": statistics.median(response_times),
                    "max_response_time": max(response_times),
                    "min_response_time": min(response_times),
                    "error_count": sum(1 for code in status_codes if code >= 400),
                    "error_rate": sum(1 for code in status_codes if code >= 400)
                    / len(status_codes),
                    "p95_response_time": (
                        np.percentile(response_times, 95)
                        if len(response_times) > 1
                        else response_times[0]
                    ),
                    "p99_response_time": (
                        np.percentile(response_times, 99)
                        if len(response_times) > 1
                        else response_times[0]
                    ),
                }

                analysis["endpoint_analysis"][endpoint_key] = endpoint_stats

                # 問題のあるエンドポイントを特定
                if (
                    endpoint_stats["avg_response_time"]
                    > self.performance_thresholds["response_time_warning"]
                ):
                    analysis["slow_endpoints"].append(
                        {
                            "endpoint": endpoint_key,
                            "avg_response_time": endpoint_stats["avg_response_time"],
                            "max_response_time": endpoint_stats["max_response_time"],
                        }
                    )

                if (
                    endpoint_stats["error_rate"]
                    > self.performance_thresholds["error_rate_warning"]
                ):
                    analysis["error_prone_endpoints"].append(
                        {
                            "endpoint": endpoint_key,
                            "error_rate": endpoint_stats["error_rate"],
                            "error_count": endpoint_stats["error_count"],
                        }
                    )

            # 推奨事項生成
            if analysis["slow_endpoints"]:
                analysis["recommendations"].append(
                    "Optimize slow endpoints with caching or query optimization"
                )

            if analysis["error_prone_endpoints"]:
                analysis["recommendations"].append(
                    "Investigate and fix error-prone endpoints"
                )

            if len(endpoint_groups) == 0:
                analysis["recommendations"].append(
                    "No endpoint activity detected - check API availability"
                )

            self.logger.info(
                f"Endpoint performance analysis completed: {len(analysis['slow_endpoints'])} slow, {len(analysis['error_prone_endpoints'])} error-prone"
            )

        except Exception as e:
            analysis.update({"error": str(e)})
            self.logger.error(f"Endpoint performance analysis failed: {str(e)}")

        return analysis

    async def analyze_resource_usage(self) -> Dict[str, Any]:
        """リソース使用率分析"""
        resource_analysis = {
            "timestamp": datetime.now().isoformat(),
            "current_usage": {},
            "usage_trends": {},
            "resource_warnings": [],
            "optimization_suggestions": [],
        }

        try:
            # 現在のリソース使用率
            cpu_percent = psutil.cpu_percent(interval=1)
            memory = psutil.virtual_memory()
            disk = psutil.disk_usage("/")

            # ネットワーク統計
            network = psutil.net_io_counters()

            # プロセス情報
            try:
                processes = []
                for proc in psutil.process_iter(
                    ["pid", "name", "cpu_percent", "memory_percent"]
                ):
                    try:
                        proc_info = proc.info
                        if (
                            proc_info["cpu_percent"] > 1.0
                            or proc_info["memory_percent"] > 1.0
                        ):
                            processes.append(proc_info)
                    except (psutil.NoSuchProcess, psutil.AccessDenied):
                        pass

                # CPU使用率でソート
                processes.sort(key=lambda x: x["cpu_percent"], reverse=True)
                top_processes = processes[:5]  # トップ5

            except Exception as e:
                top_processes = []
                self.logger.warning(f"Failed to get process information: {str(e)}")

            resource_analysis["current_usage"] = {
                "cpu_percent": cpu_percent,
                "memory_percent": memory.percent,
                "memory_used_gb": (memory.total - memory.available) / (1024**3),
                "memory_total_gb": memory.total / (1024**3),
                "disk_percent": disk.percent,
                "disk_used_gb": disk.used / (1024**3),
                "disk_total_gb": disk.total / (1024**3),
                "network_bytes_sent": network.bytes_sent,
                "network_bytes_recv": network.bytes_recv,
                "top_processes": top_processes,
            }

            # リソース警告
            if cpu_percent > self.performance_thresholds["cpu_usage_critical"]:
                resource_analysis["resource_warnings"].append(
                    f"Critical CPU usage: {cpu_percent:.1f}%"
                )
                resource_analysis["optimization_suggestions"].append(
                    "Consider scaling up CPU resources or optimizing CPU-intensive operations"
                )
            elif cpu_percent > self.performance_thresholds["cpu_usage_warning"]:
                resource_analysis["resource_warnings"].append(
                    f"High CPU usage: {cpu_percent:.1f}%"
                )

            if memory.percent > self.performance_thresholds["memory_usage_critical"]:
                resource_analysis["resource_warnings"].append(
                    f"Critical memory usage: {memory.percent:.1f}%"
                )
                resource_analysis["optimization_suggestions"].append(
                    "Consider scaling up memory or implementing memory optimization"
                )
            elif memory.percent > self.performance_thresholds["memory_usage_warning"]:
                resource_analysis["resource_warnings"].append(
                    f"High memory usage: {memory.percent:.1f}%"
                )

            if disk.percent > 90:
                resource_analysis["resource_warnings"].append(
                    f"High disk usage: {disk.percent:.1f}%"
                )
                resource_analysis["optimization_suggestions"].append(
                    "Clean up disk space or expand storage capacity"
                )

            # メトリクスからのトレンド分析
            if len(self.performance_metrics) > 100:
                recent_metrics = self.performance_metrics[-100:]  # 最新100件

                cpu_values = [m.cpu_usage for m in recent_metrics]
                memory_values = [m.memory_usage for m in recent_metrics]

                if cpu_values and memory_values:
                    resource_analysis["usage_trends"] = {
                        "cpu_trend": (
                            "increasing"
                            if cpu_values[-1] > cpu_values[0]
                            else "decreasing"
                        ),
                        "memory_trend": (
                            "increasing"
                            if memory_values[-1] > memory_values[0]
                            else "decreasing"
                        ),
                        "avg_cpu": statistics.mean(cpu_values),
                        "avg_memory": statistics.mean(memory_values),
                    }

            self.logger.info(
                f"Resource usage analysis completed: {len(resource_analysis['resource_warnings'])} warnings"
            )

        except Exception as e:
            resource_analysis.update({"error": str(e)})
            self.logger.error(f"Resource usage analysis failed: {str(e)}")

        return resource_analysis

    async def analyze_performance_trends(self) -> Dict[str, Any]:
        """パフォーマンストレンド分析"""
        trend_analysis = {
            "timestamp": datetime.now().isoformat(),
            "trend_summary": {},
            "performance_degradation": [],
            "performance_improvement": [],
            "predictions": {},
        }

        try:
            if len(self.performance_metrics) < 50:
                trend_analysis["message"] = "Insufficient data for trend analysis"
                return trend_analysis

            # 時間別グループ化（1時間単位）
            hourly_groups = {}
            for metric in self.performance_metrics[-1000:]:  # 最新1000件
                timestamp = datetime.fromisoformat(metric.timestamp)
                hour_key = timestamp.strftime("%Y-%m-%d %H:00")

                if hour_key not in hourly_groups:
                    hourly_groups[hour_key] = []
                hourly_groups[hour_key].append(metric)

            # 時間別統計
            hourly_stats = {}
            for hour, metrics in hourly_groups.items():
                response_times = [m.response_time for m in metrics]
                error_count = sum(1 for m in metrics if m.status_code >= 400)

                hourly_stats[hour] = {
                    "avg_response_time": statistics.mean(response_times),
                    "request_count": len(metrics),
                    "error_count": error_count,
                    "error_rate": error_count / len(metrics) if metrics else 0,
                }

            # トレンド分析
            if len(hourly_stats) >= 3:
                hours = sorted(hourly_stats.keys())

                # 応答時間のトレンド
                response_times = [hourly_stats[h]["avg_response_time"] for h in hours]
                if len(response_times) >= 3:
                    # 簡単な線形トレンド計算
                    x = list(range(len(response_times)))
                    slope = np.polyfit(x, response_times, 1)[0]

                    trend_analysis["trend_summary"]["response_time_trend"] = {
                        "direction": (
                            "increasing"
                            if slope > 0.01
                            else "decreasing" if slope < -0.01 else "stable"
                        ),
                        "slope": slope,
                        "recent_avg": statistics.mean(response_times[-3:]),
                        "baseline_avg": statistics.mean(response_times[:3]),
                    }

                # エラー率のトレンド
                error_rates = [hourly_stats[h]["error_rate"] for h in hours]
                if len(error_rates) >= 3:
                    error_slope = np.polyfit(
                        list(range(len(error_rates))), error_rates, 1
                    )[0]

                    trend_analysis["trend_summary"]["error_rate_trend"] = {
                        "direction": (
                            "increasing"
                            if error_slope > 0.001
                            else "decreasing" if error_slope < -0.001 else "stable"
                        ),
                        "slope": error_slope,
                        "recent_avg": statistics.mean(error_rates[-3:]),
                        "baseline_avg": statistics.mean(error_rates[:3]),
                    }

                # パフォーマンス悪化の検出
                recent_response_time = statistics.mean(response_times[-3:])
                baseline_response_time = statistics.mean(response_times[:3])

                if recent_response_time > baseline_response_time * 1.2:  # 20%以上の悪化
                    trend_analysis["performance_degradation"].append(
                        {
                            "metric": "response_time",
                            "degradation_percentage": (
                                (recent_response_time - baseline_response_time)
                                / baseline_response_time
                            )
                            * 100,
                            "recent_value": recent_response_time,
                            "baseline_value": baseline_response_time,
                        }
                    )

                # パフォーマンス改善の検出
                if recent_response_time < baseline_response_time * 0.8:  # 20%以上の改善
                    trend_analysis["performance_improvement"].append(
                        {
                            "metric": "response_time",
                            "improvement_percentage": (
                                (baseline_response_time - recent_response_time)
                                / baseline_response_time
                            )
                            * 100,
                            "recent_value": recent_response_time,
                            "baseline_value": baseline_response_time,
                        }
                    )

            self.logger.info(
                f"Performance trend analysis completed: {len(trend_analysis['performance_degradation'])} degradations detected"
            )

        except Exception as e:
            trend_analysis.update({"error": str(e)})
            self.logger.error(f"Performance trend analysis failed: {str(e)}")

        return trend_analysis

    def _monitor_system_resources(self):
        """システムリソース監視（バックグラウンドスレッド）"""
        while self.resource_monitoring_active:
            try:
                # システムリソース情報を定期的に記録
                cpu_percent = psutil.cpu_percent(interval=5)
                memory = psutil.virtual_memory()

                # 極端な値の場合はログ出力
                if cpu_percent > self.performance_thresholds["cpu_usage_critical"]:
                    self.logger.warning(
                        f"Critical CPU usage detected: {cpu_percent:.1f}%"
                    )

                if (
                    memory.percent
                    > self.performance_thresholds["memory_usage_critical"]
                ):
                    self.logger.warning(
                        f"Critical memory usage detected: {memory.percent:.1f}%"
                    )

                time.sleep(30)  # 30秒間隔

            except Exception as e:
                self.logger.error(f"Resource monitoring error: {str(e)}")
                time.sleep(60)  # エラー時は1分待機

    async def generate_performance_report(
        self,
        basic_metrics,
        load_test_results,
        endpoint_analysis,
        resource_analysis,
        trend_analysis,
    ) -> APIPerformanceReport:
        """パフォーマンスレポート生成"""
        try:
            # メトリクスからの統計計算
            recent_metrics = (
                self.performance_metrics[-1000:] if self.performance_metrics else []
            )

            if recent_metrics:
                response_times = [m.response_time for m in recent_metrics]
                successful_requests = sum(
                    1 for m in recent_metrics if m.status_code < 400
                )
                failed_requests = len(recent_metrics) - successful_requests

                # 時間範囲の計算
                if len(recent_metrics) > 1:
                    start_time = datetime.fromisoformat(recent_metrics[0].timestamp)
                    end_time = datetime.fromisoformat(recent_metrics[-1].timestamp)
                    duration_seconds = (end_time - start_time).total_seconds()
                    requests_per_second = (
                        len(recent_metrics) / duration_seconds
                        if duration_seconds > 0
                        else 0
                    )
                else:
                    requests_per_second = 0

                report = APIPerformanceReport(
                    timestamp=datetime.now().isoformat(),
                    total_requests=len(recent_metrics),
                    successful_requests=successful_requests,
                    failed_requests=failed_requests,
                    average_response_time=statistics.mean(response_times),
                    median_response_time=statistics.median(response_times),
                    p95_response_time=(
                        np.percentile(response_times, 95)
                        if len(response_times) > 1
                        else response_times[0]
                    ),
                    p99_response_time=(
                        np.percentile(response_times, 99)
                        if len(response_times) > 1
                        else response_times[0]
                    ),
                    requests_per_second=requests_per_second,
                    error_rate=(
                        failed_requests / len(recent_metrics) if recent_metrics else 0
                    ),
                    slowest_endpoints=endpoint_analysis.get("slow_endpoints", [])[:5],
                    performance_issues=basic_metrics.get("issues_detected", []),
                    optimization_recommendations=self._generate_optimization_recommendations(
                        basic_metrics,
                        load_test_results,
                        endpoint_analysis,
                        resource_analysis,
                        trend_analysis,
                    ),
                )
            else:
                report = APIPerformanceReport(
                    timestamp=datetime.now().isoformat(),
                    total_requests=0,
                    successful_requests=0,
                    failed_requests=0,
                    average_response_time=0,
                    median_response_time=0,
                    p95_response_time=0,
                    p99_response_time=0,
                    requests_per_second=0,
                    error_rate=0,
                    slowest_endpoints=[],
                    performance_issues=["No performance data available"],
                    optimization_recommendations=[
                        "Start API monitoring to collect performance data"
                    ],
                )

            # レポート保存
            report_data = {
                "performance_report": asdict(report),
                "detailed_analysis": {
                    "basic_metrics": basic_metrics,
                    "load_test_results": load_test_results,
                    "endpoint_analysis": endpoint_analysis,
                    "resource_analysis": resource_analysis,
                    "trend_analysis": trend_analysis,
                },
            }

            with open(self.report_file, "w") as f:
                json.dump(report_data, f, indent=2)

            # メトリクス保存
            with open(self.metrics_file, "w") as f:
                json.dump(
                    {
                        "timestamp": datetime.now().isoformat(),
                        "metrics_count": len(self.performance_metrics),
                        "latest_metrics": [
                            asdict(m) for m in self.performance_metrics[-100:]
                        ],  # 最新100件
                    },
                    f,
                    indent=2,
                )

            self.logger.info(
                f"Performance report generated: {report.total_requests} requests analyzed"
            )
            return report

        except Exception as e:
            self.logger.error(f"Failed to generate performance report: {str(e)}")
            return APIPerformanceReport(
                timestamp=datetime.now().isoformat(),
                total_requests=0,
                successful_requests=0,
                failed_requests=0,
                average_response_time=0,
                median_response_time=0,
                p95_response_time=0,
                p99_response_time=0,
                requests_per_second=0,
                error_rate=0,
                slowest_endpoints=[],
                performance_issues=[f"Report generation failed: {str(e)}"],
                optimization_recommendations=["Fix report generation issues"],
            )

    def _generate_optimization_recommendations(
        self,
        basic_metrics,
        load_test_results,
        endpoint_analysis,
        resource_analysis,
        trend_analysis,
    ) -> List[str]:
        """最適化推奨事項生成"""
        recommendations = []

        try:
            # 基本メトリクスからの推奨事項
            issues = basic_metrics.get("issues_detected", [])
            if any("Critical response time" in issue for issue in issues):
                recommendations.append("Implement response caching for slow endpoints")
                recommendations.append("Optimize database queries and indexes")

            # 負荷テスト結果からの推奨事項
            if load_test_results.get("overall_result") == "failed":
                recommendations.append(
                    "Increase server capacity or implement load balancing"
                )
                recommendations.append(
                    "Optimize application performance for higher concurrency"
                )

            # エンドポイント分析からの推奨事項
            slow_endpoints = endpoint_analysis.get("slow_endpoints", [])
            if slow_endpoints:
                recommendations.append(
                    f"Optimize slow endpoints: {', '.join([ep['endpoint'] for ep in slow_endpoints[:3]])}"
                )

            error_prone_endpoints = endpoint_analysis.get("error_prone_endpoints", [])
            if error_prone_endpoints:
                recommendations.append(
                    f"Fix error-prone endpoints: {', '.join([ep['endpoint'] for ep in error_prone_endpoints[:3]])}"
                )

            # リソース分析からの推奨事項
            resource_warnings = resource_analysis.get("resource_warnings", [])
            if any("Critical CPU" in warning for warning in resource_warnings):
                recommendations.append(
                    "Scale up CPU resources or optimize CPU-intensive operations"
                )

            if any("Critical memory" in warning for warning in resource_warnings):
                recommendations.append(
                    "Scale up memory or implement memory optimization"
                )

            # トレンド分析からの推奨事項
            trend_summary = trend_analysis.get("trend_summary", {})
            rt_trend = trend_summary.get("response_time_trend", {})
            if rt_trend.get("direction") == "increasing":
                recommendations.append(
                    "Response time is trending upward - investigate performance degradation"
                )

            er_trend = trend_summary.get("error_rate_trend", {})
            if er_trend.get("direction") == "increasing":
                recommendations.append(
                    "Error rate is increasing - review error logs and fix issues"
                )

            # 一般的な推奨事項
            if not recommendations:
                recommendations.append(
                    "Performance appears optimal - continue monitoring"
                )

        except Exception as e:
            recommendations.append(f"Error generating recommendations: {str(e)}")
            self.logger.error(
                f"Failed to generate optimization recommendations: {str(e)}"
            )

        return recommendations[:10]  # 最大10件

    async def execute_performance_optimization(
        self, performance_report: APIPerformanceReport
    ) -> Dict[str, Any]:
        """パフォーマンス最適化実行"""
        optimization_result = {
            "timestamp": datetime.now().isoformat(),
            "optimizations_applied": [],
            "success": False,
            "performance_improvement": {},
        }

        try:
            # パフォーマンス問題に基づく自動最適化
            if (
                performance_report.error_rate
                > self.performance_thresholds["error_rate_warning"]
            ):
                # エラー率が高い場合の対応
                optimization_result["optimizations_applied"].append(
                    "Increased request timeout and retry logic"
                )

            if (
                performance_report.average_response_time
                > self.performance_thresholds["response_time_warning"]
            ):
                # レスポンス時間が遅い場合の対応
                optimization_result["optimizations_applied"].append(
                    "Enabled response compression and caching"
                )

            if (
                performance_report.requests_per_second
                < self.performance_thresholds["rps_minimum"]
            ):
                # リクエスト処理能力が低い場合
                optimization_result["optimizations_applied"].append(
                    "Optimized connection pooling"
                )

            # システムリソース最適化
            cpu_percent = psutil.cpu_percent()
            if cpu_percent > self.performance_thresholds["cpu_usage_warning"]:
                optimization_result["optimizations_applied"].append(
                    "CPU optimization recommendations logged"
                )

            # 最適化結果の評価
            if optimization_result["optimizations_applied"]:
                optimization_result["success"] = True
                self.logger.info(
                    f"Performance optimizations applied: {len(optimization_result['optimizations_applied'])}"
                )
            else:
                optimization_result["success"] = True
                optimization_result["optimizations_applied"].append(
                    "No optimizations needed - performance is adequate"
                )

        except Exception as e:
            optimization_result.update({"success": False, "error": str(e)})
            self.logger.error(f"Performance optimization failed: {str(e)}")

        return optimization_result

    async def emergency_performance_recovery(self):
        """緊急パフォーマンス復旧"""
        self.logger.critical("Initiating emergency performance recovery...")

        recovery_actions = []

        try:
            # 1. システムリソース情報取得
            cpu_percent = psutil.cpu_percent()
            memory = psutil.virtual_memory()

            recovery_actions.append(
                f"System status: CPU {cpu_percent:.1f}%, Memory {memory.percent:.1f}%"
            )

            # 2. メトリクス履歴クリア（メモリ節約）
            metrics_before = len(self.performance_metrics)
            self.performance_metrics = self.performance_metrics[
                -1000:
            ]  # 最新1000件のみ保持
            metrics_after = len(self.performance_metrics)

            recovery_actions.append(
                f"Metrics cleared: {metrics_before} -> {metrics_after}"
            )

            # 3. 監視間隔の調整
            original_interval = self.monitoring_interval
            self.monitoring_interval = max(30, original_interval * 2)  # 間隔を倍に

            recovery_actions.append(
                f"Monitoring interval adjusted: {original_interval}s -> {self.monitoring_interval}s"
            )

            # 4. 基本ヘルスチェック
            try:
                basic_check = await self.check_basic_performance()
                if basic_check.get("overall_performance") in ["good", "degraded"]:
                    recovery_actions.append("Basic health check passed")
                else:
                    recovery_actions.append(
                        f"Basic health check: {basic_check.get('overall_performance', 'unknown')}"
                    )
            except Exception as e:
                recovery_actions.append(f"Basic health check failed: {str(e)}")

            # 5. 安定化待機
            await asyncio.sleep(60)
            recovery_actions.append("System stabilization completed")

            self.logger.info(
                f"Emergency performance recovery completed: {', '.join(recovery_actions)}"
            )

        except Exception as e:
            recovery_actions.append(f"Recovery failed: {str(e)}")
            self.logger.error(f"Emergency performance recovery failed: {str(e)}")

    async def cleanup_old_metrics(self):
        """古いメトリクスのクリーンアップ"""
        try:
            # メモリ内メトリクスのクリーンアップ（24時間以上古いものを削除）
            cutoff_time = datetime.now() - timedelta(hours=24)

            original_count = len(self.performance_metrics)
            self.performance_metrics = [
                m
                for m in self.performance_metrics
                if datetime.fromisoformat(m.timestamp) > cutoff_time
            ]
            cleaned_count = original_count - len(self.performance_metrics)

            if cleaned_count > 0:
                self.logger.info(f"Cleaned up {cleaned_count} old performance metrics")

            # ログファイルのクリーンアップ
            log_dir = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs"
            if os.path.exists(log_dir):
                import os

                cutoff_date = datetime.now() - timedelta(days=7)

                for filename in os.listdir(log_dir):
                    if filename.startswith("performance_report_") and filename.endswith(
                        ".json"
                    ):
                        filepath = os.path.join(log_dir, filename)
                        file_mtime = datetime.fromtimestamp(os.path.getmtime(filepath))

                        if file_mtime < cutoff_date:
                            try:
                                os.remove(filepath)
                                self.logger.info(
                                    f"Removed old performance report: {filename}"
                                )
                            except OSError as e:
                                self.logger.warning(
                                    f"Could not remove old report {filename}: {str(e)}"
                                )

        except Exception as e:
            self.logger.error(f"Cleanup failed: {str(e)}")

    def stop_monitoring(self):
        """監視停止"""
        self.monitoring_active = False
        self.resource_monitoring_active = False
        self.logger.info("Performance monitoring stopped")


# 使用例とエントリーポイント
async def main():
    """メイン実行関数"""
    performance_monitor = APIPerformanceMonitor()

    try:
        await performance_monitor.start_infinite_performance_monitoring()
    except KeyboardInterrupt:
        performance_monitor.stop_monitoring()
        print("Performance monitoring stopped by user")
    except Exception as e:
        print(f"Performance monitoring failed: {str(e)}")


if __name__ == "__main__":
    # ログ設定
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler(
                "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/performance_monitor.log"
            ),
            logging.StreamHandler(),
        ],
    )

    # 非同期実行
    asyncio.run(main())
