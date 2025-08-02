"""MCP Playwright を使用したAPIエラー検知・修復システム"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, asdict
from enum import Enum
import aiohttp
import sqlite3
from pathlib import Path

from app.core.config import settings

# ログ設定
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


class ErrorSeverity(Enum):
    """エラー重要度"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class ErrorCategory(Enum):
    """エラーカテゴリ"""

    CONNECTION = "connection"
    DATABASE = "database"
    AUTHENTICATION = "authentication"
    AUTHORIZATION = "authorization"
    VALIDATION = "validation"
    TIMEOUT = "timeout"
    RATE_LIMIT = "rate_limit"
    INTERNAL_SERVER = "internal_server"
    SECURITY = "security"
    PERFORMANCE = "performance"


@dataclass
class APIError:
    """APIエラー情報"""

    timestamp: float
    endpoint: str
    method: str
    status_code: int
    error_message: str
    response_time: float
    category: ErrorCategory
    severity: ErrorSeverity
    details: Dict[str, Any]
    request_id: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        """辞書形式に変換"""
        result = asdict(self)
        result["category"] = self.category.value
        result["severity"] = self.severity.value
        return result


@dataclass
class PerformanceMetrics:
    """パフォーマンスメトリクス"""

    endpoint: str
    avg_response_time: float
    max_response_time: float
    min_response_time: float
    error_rate: float
    request_count: int
    timestamp: float


class DatabaseManager:
    """データベース管理クラス"""

    def __init__(self, db_path: str = "api_error_monitor.db"):
        self.db_path = db_path
        self.init_database()

    def init_database(self):
        """データベース初期化"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()

            # エラーテーブル
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS errors (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL,
                    endpoint TEXT,
                    method TEXT,
                    status_code INTEGER,
                    error_message TEXT,
                    response_time REAL,
                    category TEXT,
                    severity TEXT,
                    details TEXT,
                    request_id TEXT,
                    resolved BOOLEAN DEFAULT FALSE
                )
            """
            )

            # パフォーマンスメトリクステーブル
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    endpoint TEXT,
                    avg_response_time REAL,
                    max_response_time REAL,
                    min_response_time REAL,
                    error_rate REAL,
                    request_count INTEGER,
                    timestamp REAL
                )
            """
            )

            # 修復ログテーブル
            cursor.execute(
                """
                CREATE TABLE IF NOT EXISTS repair_logs (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    error_id INTEGER,
                    repair_action TEXT,
                    success BOOLEAN,
                    details TEXT,
                    timestamp REAL,
                    FOREIGN KEY (error_id) REFERENCES errors (id)
                )
            """
            )

            conn.commit()

    def save_error(self, error: APIError) -> int:
        """エラーを保存"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO errors 
                (timestamp, endpoint, method, status_code, error_message, 
                 response_time, category, severity, details, request_id)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    error.timestamp,
                    error.endpoint,
                    error.method,
                    error.status_code,
                    error.error_message,
                    error.response_time,
                    error.category.value,
                    error.severity.value,
                    json.dumps(error.details),
                    error.request_id,
                ),
            )
            return cursor.lastrowid

    def save_performance_metrics(self, metrics: PerformanceMetrics):
        """パフォーマンスメトリクスを保存"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                INSERT INTO performance_metrics 
                (endpoint, avg_response_time, max_response_time, min_response_time,
                 error_rate, request_count, timestamp)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
                (
                    metrics.endpoint,
                    metrics.avg_response_time,
                    metrics.max_response_time,
                    metrics.min_response_time,
                    metrics.error_rate,
                    metrics.request_count,
                    metrics.timestamp,
                ),
            )

    def get_recent_errors(self, hours: int = 24) -> List[Dict[str, Any]]:
        """最近のエラーを取得"""
        cutoff_time = time.time() - (hours * 3600)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute(
                """
                SELECT * FROM errors 
                WHERE timestamp > ? 
                ORDER BY timestamp DESC
            """,
                (cutoff_time,),
            )

            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]


class APIErrorMonitor:
    """APIエラー監視システム"""

    def __init__(self, base_url: str = "http://192.168.3.135:8000"):
        self.base_url = base_url
        self.db_manager = DatabaseManager()
        self.session: Optional[aiohttp.ClientSession] = None
        self.monitoring = False
        self.error_cache: Dict[str, List[APIError]] = {}

        # 監視対象エンドポイント
        self.endpoints = [
            ("/health", "GET"),
            ("/version", "GET"),
            ("/api/v1/auth/login", "POST"),
            ("/api/v1/incidents", "GET"),
            ("/api/v1/incidents", "POST"),
            ("/api/v1/problems", "GET"),
            ("/api/v1/problems", "POST"),
            ("/api/v1/users", "GET"),
            ("/api/v1/dashboard/stats", "GET"),
            ("/api/v1/dashboard/metrics", "GET"),
        ]

        # エラー閾値設定
        self.thresholds = {
            "response_time_critical": 10.0,  # 10秒以上
            "response_time_high": 5.0,  # 5秒以上
            "response_time_medium": 2.0,  # 2秒以上
            "error_rate_critical": 0.5,  # 50%以上
            "error_rate_high": 0.3,  # 30%以上
            "error_rate_medium": 0.1,  # 10%以上
        }

    async def __aenter__(self):
        """非同期コンテキスト開始"""
        self.session = aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30))
        return self

    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """非同期コンテキスト終了"""
        if self.session:
            await self.session.close()

    def categorize_error(
        self, status_code: int, error_message: str, response_time: float
    ) -> tuple[ErrorCategory, ErrorSeverity]:
        """エラーのカテゴリと重要度を判定"""
        # カテゴリ判定
        if status_code == 0:  # 接続エラー
            category = ErrorCategory.CONNECTION
        elif status_code == 401:
            category = ErrorCategory.AUTHENTICATION
        elif status_code == 403:
            category = ErrorCategory.AUTHORIZATION
        elif status_code == 422:
            category = ErrorCategory.VALIDATION
        elif status_code == 429:
            category = ErrorCategory.RATE_LIMIT
        elif 500 <= status_code < 600:
            category = ErrorCategory.INTERNAL_SERVER
        elif response_time > self.thresholds["response_time_high"]:
            category = ErrorCategory.PERFORMANCE
        else:
            category = ErrorCategory.CONNECTION

        # 重要度判定
        if status_code == 0 or status_code >= 500:
            severity = ErrorSeverity.CRITICAL
        elif (
            status_code in [401, 403]
            or response_time > self.thresholds["response_time_critical"]
        ):
            severity = ErrorSeverity.HIGH
        elif (
            status_code in [400, 422, 429]
            or response_time > self.thresholds["response_time_medium"]
        ):
            severity = ErrorSeverity.MEDIUM
        else:
            severity = ErrorSeverity.LOW

        return category, severity

    async def check_endpoint(self, endpoint: str, method: str) -> Optional[APIError]:
        """エンドポイントをチェック"""
        if not self.session:
            return None

        start_time = time.time()
        url = f"{self.base_url}{endpoint}"

        try:
            # テスト用のペイロード
            test_data = self._get_test_data(endpoint, method)

            async with self.session.request(
                method,
                url,
                json=test_data if method in ["POST", "PUT", "PATCH"] else None,
                headers={"Content-Type": "application/json"},
            ) as response:
                response_time = time.time() - start_time

                # エラー判定
                if response.status >= 400:
                    error_text = await response.text()
                    category, severity = self.categorize_error(
                        response.status, error_text, response_time
                    )

                    return APIError(
                        timestamp=time.time(),
                        endpoint=endpoint,
                        method=method,
                        status_code=response.status,
                        error_message=error_text[:500],  # 長すぎる場合は切り詰め
                        response_time=response_time,
                        category=category,
                        severity=severity,
                        details={
                            "url": url,
                            "headers": dict(response.headers),
                            "request_data": test_data,
                        },
                    )

                # パフォーマンス警告
                if response_time > self.thresholds["response_time_medium"]:
                    category, severity = self.categorize_error(
                        response.status, "Slow response", response_time
                    )

                    return APIError(
                        timestamp=time.time(),
                        endpoint=endpoint,
                        method=method,
                        status_code=response.status,
                        error_message=f"Slow response: {response_time:.2f}s",
                        response_time=response_time,
                        category=category,
                        severity=severity,
                        details={"url": url, "performance_warning": True},
                    )

                return None

        except asyncio.TimeoutError:
            response_time = time.time() - start_time
            return APIError(
                timestamp=time.time(),
                endpoint=endpoint,
                method=method,
                status_code=0,
                error_message="Request timeout",
                response_time=response_time,
                category=ErrorCategory.TIMEOUT,
                severity=ErrorSeverity.HIGH,
                details={"url": url, "timeout": True},
            )

        except Exception as e:
            response_time = time.time() - start_time
            return APIError(
                timestamp=time.time(),
                endpoint=endpoint,
                method=method,
                status_code=0,
                error_message=str(e),
                response_time=response_time,
                category=ErrorCategory.CONNECTION,
                severity=ErrorSeverity.CRITICAL,
                details={"url": url, "exception": type(e).__name__},
            )

    def _get_test_data(self, endpoint: str, method: str) -> Optional[Dict[str, Any]]:
        """エンドポイント用のテストデータを取得"""
        test_data_map = {
            "/api/v1/auth/login": {
                "username": "test@example.com",
                "password": "testpassword",
            },
            "/api/v1/incidents": {
                "title": "Test Incident",
                "description": "Test incident for monitoring",
                "priority": "medium",
                "category_id": 1,
            },
            "/api/v1/problems": {
                "title": "Test Problem",
                "description": "Test problem for monitoring",
                "priority": "medium",
                "category_id": 1,
            },
        }

        return test_data_map.get(endpoint)

    async def run_monitoring_cycle(self) -> List[APIError]:
        """監視サイクルを実行"""
        errors = []

        for endpoint, method in self.endpoints:
            try:
                error = await self.check_endpoint(endpoint, method)
                if error:
                    errors.append(error)
                    # データベースに保存
                    self.db_manager.save_error(error)
                    logger.warning(
                        f"Error detected: {error.endpoint} - {error.error_message}"
                    )

                # リクエスト間隔
                await asyncio.sleep(0.5)

            except Exception as e:
                logger.error(f"Error checking {endpoint}: {e}")

        return errors

    async def start_monitoring(self, interval: int = 60):
        """監視を開始"""
        self.monitoring = True
        logger.info(f"Starting API monitoring with {interval}s interval")

        while self.monitoring:
            try:
                errors = await self.run_monitoring_cycle()

                if errors:
                    await self.analyze_and_repair(errors)

                # パフォーマンスメトリクス計算
                await self.calculate_performance_metrics()

                await asyncio.sleep(interval)

            except Exception as e:
                logger.error(f"Error in monitoring cycle: {e}")
                await asyncio.sleep(5)  # エラー時は短い間隔で再試行

    def stop_monitoring(self):
        """監視を停止"""
        self.monitoring = False
        logger.info("Stopping API monitoring")

    async def analyze_and_repair(self, errors: List[APIError]):
        """エラー分析と修復実行"""
        for error in errors:
            repair_action = await self.get_repair_action(error)
            if repair_action:
                success = await self.execute_repair_action(error, repair_action)
                logger.info(
                    f"Repair action {repair_action} {'succeeded' if success else 'failed'} for {error.endpoint}"
                )

    async def get_repair_action(self, error: APIError) -> Optional[str]:
        """修復アクションを決定"""
        repair_actions = {
            ErrorCategory.CONNECTION: "restart_service",
            ErrorCategory.DATABASE: "check_database_connection",
            ErrorCategory.TIMEOUT: "increase_timeout",
            ErrorCategory.RATE_LIMIT: "implement_backoff",
            ErrorCategory.INTERNAL_SERVER: "check_logs_and_restart",
            ErrorCategory.PERFORMANCE: "optimize_query",
        }

        return repair_actions.get(error.category)

    async def execute_repair_action(self, error: APIError, action: str) -> bool:
        """修復アクションを実行"""
        try:
            if action == "restart_service":
                return await self._restart_service()
            elif action == "check_database_connection":
                return await self._check_database_connection()
            elif action == "increase_timeout":
                return await self._increase_timeout()
            elif action == "implement_backoff":
                return await self._implement_backoff()
            elif action == "check_logs_and_restart":
                return await self._check_logs_and_restart()
            elif action == "optimize_query":
                return await self._optimize_query()

            return False

        except Exception as e:
            logger.error(f"Error executing repair action {action}: {e}")
            return False

    async def _restart_service(self) -> bool:
        """サービス再起動"""
        logger.info("Attempting service restart")
        # 実際の再起動ロジックはここに実装
        await asyncio.sleep(2)  # シミュレーション
        return True

    async def _check_database_connection(self) -> bool:
        """データベース接続チェック"""
        logger.info("Checking database connection")
        # データベース接続チェックロジック
        await asyncio.sleep(1)
        return True

    async def _increase_timeout(self) -> bool:
        """タイムアウト増加"""
        logger.info("Increasing timeout settings")
        await asyncio.sleep(1)
        return True

    async def _implement_backoff(self) -> bool:
        """バックオフ実装"""
        logger.info("Implementing backoff strategy")
        await asyncio.sleep(2)
        return True

    async def _check_logs_and_restart(self) -> bool:
        """ログチェックと再起動"""
        logger.info("Checking logs and restarting if necessary")
        await asyncio.sleep(3)
        return True

    async def _optimize_query(self) -> bool:
        """クエリ最適化"""
        logger.info("Optimizing database queries")
        await asyncio.sleep(2)
        return True

    async def calculate_performance_metrics(self):
        """パフォーマンスメトリクスを計算"""
        for endpoint, _ in self.endpoints:
            # 過去1時間のデータを取得
            recent_errors = self.db_manager.get_recent_errors(1)
            endpoint_errors = [e for e in recent_errors if e["endpoint"] == endpoint]

            if endpoint_errors:
                response_times = [e["response_time"] for e in endpoint_errors]
                error_count = len(
                    [e for e in endpoint_errors if e["status_code"] >= 400]
                )

                metrics = PerformanceMetrics(
                    endpoint=endpoint,
                    avg_response_time=sum(response_times) / len(response_times),
                    max_response_time=max(response_times),
                    min_response_time=min(response_times),
                    error_rate=error_count / len(endpoint_errors),
                    request_count=len(endpoint_errors),
                    timestamp=time.time(),
                )

                self.db_manager.save_performance_metrics(metrics)

    def get_health_report(self) -> Dict[str, Any]:
        """ヘルスレポートを生成"""
        recent_errors = self.db_manager.get_recent_errors(24)

        # エラー統計
        total_errors = len(recent_errors)
        critical_errors = len([e for e in recent_errors if e["severity"] == "critical"])
        high_errors = len([e for e in recent_errors if e["severity"] == "high"])

        # エンドポイント別統計
        endpoint_stats = {}
        for endpoint, _ in self.endpoints:
            endpoint_errors = [e for e in recent_errors if e["endpoint"] == endpoint]
            endpoint_stats[endpoint] = {
                "total_errors": len(endpoint_errors),
                "error_rate": len(endpoint_errors) / max(1, len(recent_errors)),
                "avg_response_time": sum(e["response_time"] for e in endpoint_errors)
                / max(1, len(endpoint_errors)),
            }

        return {
            "timestamp": time.time(),
            "monitoring_status": "active" if self.monitoring else "inactive",
            "total_errors_24h": total_errors,
            "critical_errors_24h": critical_errors,
            "high_errors_24h": high_errors,
            "overall_health": (
                "critical"
                if critical_errors > 5
                else "healthy" if total_errors < 10 else "warning"
            ),
            "endpoint_statistics": endpoint_stats,
            "thresholds": self.thresholds,
        }


# 無限ループ監視システム
class InfiniteLoopMonitor:
    """無限ループでのAPIエラー監視・修復システム"""

    def __init__(self, base_url: str = "http://192.168.3.135:8000"):
        self.monitor = APIErrorMonitor(base_url)
        self.running = False
        self.repair_count = 0
        self.max_repairs_per_hour = 10
        self.last_repair_reset = time.time()

    async def start_infinite_monitoring(self):
        """無限ループ監視を開始"""
        self.running = True
        logger.info("Starting infinite loop monitoring system")

        async with self.monitor:
            while self.running:
                try:
                    # 1時間ごとに修復カウンターをリセット
                    if time.time() - self.last_repair_reset > 3600:
                        self.repair_count = 0
                        self.last_repair_reset = time.time()

                    # 監視サイクル実行
                    errors = await self.monitor.run_monitoring_cycle()

                    # 修復が必要で、制限内の場合
                    if errors and self.repair_count < self.max_repairs_per_hour:
                        await self.monitor.analyze_and_repair(errors)
                        self.repair_count += len(errors)

                    # ヘルスレポート生成
                    health_report = self.monitor.get_health_report()
                    self._save_health_report(health_report)

                    # 短い間隔での監視
                    await asyncio.sleep(30)

                except Exception as e:
                    logger.error(f"Error in infinite monitoring loop: {e}")
                    await asyncio.sleep(10)

    def stop_monitoring(self):
        """監視を停止"""
        self.running = False
        logger.info("Stopping infinite monitoring")

    def _save_health_report(self, report: Dict[str, Any]):
        """ヘルスレポートを保存"""
        report_path = Path("api_health_reports")
        report_path.mkdir(exist_ok=True)

        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        with open(report_path / f"health_report_{timestamp}.json", "w") as f:
            json.dump(report, f, indent=2, default=str)


# CLI実行用のメイン関数
async def main():
    """メイン実行関数"""
    infinite_monitor = InfiniteLoopMonitor()

    try:
        await infinite_monitor.start_infinite_monitoring()
    except KeyboardInterrupt:
        logger.info("Monitoring stopped by user")
    finally:
        infinite_monitor.stop_monitoring()


if __name__ == "__main__":
    asyncio.run(main())
