"""API応答時間・パフォーマンス監視システム"""

import asyncio
import time
import json
import logging
import statistics
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
import aiohttp
import psutil
import sqlite3
from collections import defaultdict, deque
import aiofiles

from app.core.config import settings

logger = logging.getLogger(__name__)


class PerformanceLevel(Enum):
    """パフォーマンスレベル"""
    EXCELLENT = "excellent"
    GOOD = "good"
    ACCEPTABLE = "acceptable"
    POOR = "poor"
    CRITICAL = "critical"


class AlertType(Enum):
    """アラートタイプ"""
    RESPONSE_TIME = "response_time"
    ERROR_RATE = "error_rate"
    THROUGHPUT = "throughput"
    RESOURCE_USAGE = "resource_usage"
    AVAILABILITY = "availability"


@dataclass
class PerformanceMetric:
    """パフォーマンスメトリクス"""
    timestamp: float
    endpoint: str
    method: str
    response_time: float
    status_code: int
    request_size: int
    response_size: int
    memory_usage: float
    cpu_usage: float
    active_connections: int
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class PerformanceAlert:
    """パフォーマンスアラート"""
    timestamp: float
    alert_type: AlertType
    level: PerformanceLevel
    message: str
    endpoint: str
    current_value: float
    threshold_value: float
    details: Dict[str, Any]
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['alert_type'] = self.alert_type.value
        result['level'] = self.level.value
        return result


@dataclass
class SystemMetrics:
    """システムメトリクス"""
    timestamp: float
    cpu_percent: float
    memory_percent: float
    disk_usage: float
    network_io: Dict[str, int]
    process_count: int
    load_average: List[float]
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


class PerformanceThresholds:
    """パフォーマンス閾値設定"""
    
    def __init__(self):
        self.response_time = {
            PerformanceLevel.EXCELLENT: 0.1,    # 100ms以下
            PerformanceLevel.GOOD: 0.5,         # 500ms以下
            PerformanceLevel.ACCEPTABLE: 1.0,   # 1s以下
            PerformanceLevel.POOR: 3.0,         # 3s以下
            PerformanceLevel.CRITICAL: 10.0     # 10s以上
        }
        
        self.error_rate = {
            PerformanceLevel.EXCELLENT: 0.001,  # 0.1%以下
            PerformanceLevel.GOOD: 0.01,        # 1%以下
            PerformanceLevel.ACCEPTABLE: 0.05,  # 5%以下
            PerformanceLevel.POOR: 0.1,         # 10%以下
            PerformanceLevel.CRITICAL: 0.2      # 20%以上
        }
        
        self.throughput = {
            PerformanceLevel.EXCELLENT: 1000,   # 1000 req/min以上
            PerformanceLevel.GOOD: 500,         # 500 req/min以上
            PerformanceLevel.ACCEPTABLE: 100,   # 100 req/min以上
            PerformanceLevel.POOR: 50,          # 50 req/min以上
            PerformanceLevel.CRITICAL: 10       # 10 req/min以下
        }
        
        self.cpu_usage = {
            PerformanceLevel.EXCELLENT: 30,     # 30%以下
            PerformanceLevel.GOOD: 50,          # 50%以下
            PerformanceLevel.ACCEPTABLE: 70,    # 70%以下
            PerformanceLevel.POOR: 85,          # 85%以下
            PerformanceLevel.CRITICAL: 95       # 95%以上
        }
        
        self.memory_usage = {
            PerformanceLevel.EXCELLENT: 40,     # 40%以下
            PerformanceLevel.GOOD: 60,          # 60%以下
            PerformanceLevel.ACCEPTABLE: 75,    # 75%以下
            PerformanceLevel.POOR: 85,          # 85%以下
            PerformanceLevel.CRITICAL: 95       # 95%以上
        }


class PerformanceDatabase:
    """パフォーマンスデータベース"""
    
    def __init__(self, db_path: str = "performance_monitor.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """データベース初期化"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # パフォーマンスメトリクステーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS performance_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL,
                    endpoint TEXT,
                    method TEXT,
                    response_time REAL,
                    status_code INTEGER,
                    request_size INTEGER,
                    response_size INTEGER,
                    memory_usage REAL,
                    cpu_usage REAL,
                    active_connections INTEGER
                )
            """)
            
            # システムメトリクステーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS system_metrics (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL,
                    cpu_percent REAL,
                    memory_percent REAL,
                    disk_usage REAL,
                    network_io TEXT,
                    process_count INTEGER,
                    load_average TEXT
                )
            """)
            
            # アラートテーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS performance_alerts (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL,
                    alert_type TEXT,
                    level TEXT,
                    message TEXT,
                    endpoint TEXT,
                    current_value REAL,
                    threshold_value REAL,
                    details TEXT,
                    resolved BOOLEAN DEFAULT FALSE
                )
            """)
            
            # インデックス作成
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_metrics_timestamp ON performance_metrics (timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_metrics_endpoint ON performance_metrics (endpoint)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_alerts_timestamp ON performance_alerts (timestamp)")
            
            conn.commit()
    
    def save_metric(self, metric: PerformanceMetric):
        """メトリクスを保存"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO performance_metrics 
                (timestamp, endpoint, method, response_time, status_code, 
                 request_size, response_size, memory_usage, cpu_usage, active_connections)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                metric.timestamp, metric.endpoint, metric.method, metric.response_time,
                metric.status_code, metric.request_size, metric.response_size,
                metric.memory_usage, metric.cpu_usage, metric.active_connections
            ))
    
    def save_system_metric(self, metric: SystemMetrics):
        """システムメトリクスを保存"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO system_metrics 
                (timestamp, cpu_percent, memory_percent, disk_usage, 
                 network_io, process_count, load_average)
                VALUES (?, ?, ?, ?, ?, ?, ?)
            """, (
                metric.timestamp, metric.cpu_percent, metric.memory_percent,
                metric.disk_usage, json.dumps(metric.network_io),
                metric.process_count, json.dumps(metric.load_average)
            ))
    
    def save_alert(self, alert: PerformanceAlert):
        """アラートを保存"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO performance_alerts 
                (timestamp, alert_type, level, message, endpoint, 
                 current_value, threshold_value, details)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                alert.timestamp, alert.alert_type.value, alert.level.value,
                alert.message, alert.endpoint, alert.current_value,
                alert.threshold_value, json.dumps(alert.details)
            ))
    
    def get_metrics(self, hours: int = 24) -> List[Dict[str, Any]]:
        """メトリクスを取得"""
        cutoff_time = time.time() - (hours * 3600)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM performance_metrics 
                WHERE timestamp > ? 
                ORDER BY timestamp DESC
            """, (cutoff_time,))
            
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    def get_endpoint_stats(self, endpoint: str, hours: int = 24) -> Dict[str, Any]:
        """エンドポイント統計を取得"""
        cutoff_time = time.time() - (hours * 3600)
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT response_time, status_code FROM performance_metrics 
                WHERE endpoint = ? AND timestamp > ?
            """, (endpoint, cutoff_time))
            
            results = cursor.fetchall()
            if not results:
                return {}
            
            response_times = [r[0] for r in results]
            error_count = len([r for r in results if r[1] >= 400])
            
            return {
                "request_count": len(results),
                "avg_response_time": statistics.mean(response_times),
                "median_response_time": statistics.median(response_times),
                "p95_response_time": self._percentile(response_times, 95),
                "p99_response_time": self._percentile(response_times, 99),
                "error_rate": error_count / len(results),
                "min_response_time": min(response_times),
                "max_response_time": max(response_times)
            }
    
    def _percentile(self, data: List[float], percentile: int) -> float:
        """パーセンタイル計算"""
        if not data:
            return 0.0
        sorted_data = sorted(data)
        index = int((percentile / 100) * len(sorted_data))
        if index >= len(sorted_data):
            index = len(sorted_data) - 1
        return sorted_data[index]


class SystemResourceMonitor:
    """システムリソース監視"""
    
    def __init__(self):
        self.process = psutil.Process()
        self.network_io_old = psutil.net_io_counters()
    
    def get_system_metrics(self) -> SystemMetrics:
        """システムメトリクスを取得"""
        # CPU使用率
        cpu_percent = psutil.cpu_percent(interval=1)
        
        # メモリ使用率
        memory = psutil.virtual_memory()
        memory_percent = memory.percent
        
        # ディスク使用率
        disk = psutil.disk_usage('/')
        disk_usage = disk.percent
        
        # ネットワークIO
        network_io_new = psutil.net_io_counters()
        network_io = {
            "bytes_sent": network_io_new.bytes_sent - self.network_io_old.bytes_sent,
            "bytes_recv": network_io_new.bytes_recv - self.network_io_old.bytes_recv,
            "packets_sent": network_io_new.packets_sent - self.network_io_old.packets_sent,
            "packets_recv": network_io_new.packets_recv - self.network_io_old.packets_recv
        }
        self.network_io_old = network_io_new
        
        # プロセス数
        process_count = len(psutil.pids())
        
        # ロードアベレージ
        load_average = list(psutil.getloadavg()) if hasattr(psutil, 'getloadavg') else [0.0, 0.0, 0.0]
        
        return SystemMetrics(
            timestamp=time.time(),
            cpu_percent=cpu_percent,
            memory_percent=memory_percent,
            disk_usage=disk_usage,
            network_io=network_io,
            process_count=process_count,
            load_average=load_average
        )


class PerformanceAnalyzer:
    """パフォーマンス分析エンジン"""
    
    def __init__(self):
        self.thresholds = PerformanceThresholds()
        self.metric_history: Dict[str, deque] = defaultdict(lambda: deque(maxlen=100))
        self.alert_cooldown: Dict[str, float] = {}
        self.cooldown_period = 300  # 5分間のクールダウン
    
    def analyze_metric(self, metric: PerformanceMetric) -> List[PerformanceAlert]:
        """メトリクスを分析してアラートを生成"""
        alerts = []
        
        # 応答時間アラート
        response_alert = self._check_response_time(metric)
        if response_alert:
            alerts.append(response_alert)
        
        # リソース使用率アラート
        resource_alert = self._check_resource_usage(metric)
        if resource_alert:
            alerts.append(resource_alert)
        
        # エンドポイント履歴を更新
        endpoint_key = f"{metric.method}:{metric.endpoint}"
        self.metric_history[endpoint_key].append(metric)
        
        # トレンド分析アラート
        trend_alert = self._check_performance_trend(endpoint_key)
        if trend_alert:
            alerts.append(trend_alert)
        
        return alerts
    
    def _check_response_time(self, metric: PerformanceMetric) -> Optional[PerformanceAlert]:
        """応答時間チェック"""
        alert_key = f"response_time:{metric.endpoint}"
        
        # クールダウンチェック
        if self._is_in_cooldown(alert_key):
            return None
        
        level = self._get_performance_level(metric.response_time, self.thresholds.response_time)
        
        if level in [PerformanceLevel.POOR, PerformanceLevel.CRITICAL]:
            self.alert_cooldown[alert_key] = time.time()
            
            return PerformanceAlert(
                timestamp=time.time(),
                alert_type=AlertType.RESPONSE_TIME,
                level=level,
                message=f"Slow response time detected: {metric.response_time:.2f}s",
                endpoint=metric.endpoint,
                current_value=metric.response_time,
                threshold_value=self.thresholds.response_time[PerformanceLevel.ACCEPTABLE],
                details={
                    "method": metric.method,
                    "status_code": metric.status_code,
                    "level": level.value
                }
            )
        
        return None
    
    def _check_resource_usage(self, metric: PerformanceMetric) -> Optional[PerformanceAlert]:
        """リソース使用率チェック"""
        # CPU使用率チェック
        if metric.cpu_usage > self.thresholds.cpu_usage[PerformanceLevel.POOR]:
            alert_key = f"cpu_usage:{metric.endpoint}"
            if not self._is_in_cooldown(alert_key):
                self.alert_cooldown[alert_key] = time.time()
                
                level = self._get_performance_level(metric.cpu_usage, self.thresholds.cpu_usage, reverse=True)
                
                return PerformanceAlert(
                    timestamp=time.time(),
                    alert_type=AlertType.RESOURCE_USAGE,
                    level=level,
                    message=f"High CPU usage detected: {metric.cpu_usage:.1f}%",
                    endpoint=metric.endpoint,
                    current_value=metric.cpu_usage,
                    threshold_value=self.thresholds.cpu_usage[PerformanceLevel.ACCEPTABLE],
                    details={"resource_type": "cpu", "level": level.value}
                )
        
        # メモリ使用率チェック
        if metric.memory_usage > self.thresholds.memory_usage[PerformanceLevel.POOR]:
            alert_key = f"memory_usage:{metric.endpoint}"
            if not self._is_in_cooldown(alert_key):
                self.alert_cooldown[alert_key] = time.time()
                
                level = self._get_performance_level(metric.memory_usage, self.thresholds.memory_usage, reverse=True)
                
                return PerformanceAlert(
                    timestamp=time.time(),
                    alert_type=AlertType.RESOURCE_USAGE,
                    level=level,
                    message=f"High memory usage detected: {metric.memory_usage:.1f}%",
                    endpoint=metric.endpoint,
                    current_value=metric.memory_usage,
                    threshold_value=self.thresholds.memory_usage[PerformanceLevel.ACCEPTABLE],
                    details={"resource_type": "memory", "level": level.value}
                )
        
        return None
    
    def _check_performance_trend(self, endpoint_key: str) -> Optional[PerformanceAlert]:
        """パフォーマンストレンドチェック"""
        if len(self.metric_history[endpoint_key]) < 10:
            return None
        
        metrics = list(self.metric_history[endpoint_key])
        recent_metrics = metrics[-5:]  # 最新5件
        older_metrics = metrics[-10:-5]  # その前の5件
        
        recent_avg = statistics.mean(m.response_time for m in recent_metrics)
        older_avg = statistics.mean(m.response_time for m in older_metrics)
        
        # 50%以上の性能劣化を検出
        if recent_avg > older_avg * 1.5:
            alert_key = f"trend:{endpoint_key}"
            if not self._is_in_cooldown(alert_key):
                self.alert_cooldown[alert_key] = time.time()
                
                return PerformanceAlert(
                    timestamp=time.time(),
                    alert_type=AlertType.RESPONSE_TIME,
                    level=PerformanceLevel.POOR,
                    message=f"Performance degradation trend detected: {recent_avg:.2f}s vs {older_avg:.2f}s",
                    endpoint=endpoint_key.split(':', 1)[1],
                    current_value=recent_avg,
                    threshold_value=older_avg,
                    details={
                        "trend_type": "degradation",
                        "degradation_factor": recent_avg / older_avg
                    }
                )
        
        return None
    
    def _get_performance_level(self, value: float, thresholds: Dict[PerformanceLevel, float], reverse: bool = False) -> PerformanceLevel:
        """パフォーマンスレベルを取得"""
        if reverse:
            # 高い値が悪い場合（CPU使用率など）
            if value >= thresholds[PerformanceLevel.CRITICAL]:
                return PerformanceLevel.CRITICAL
            elif value >= thresholds[PerformanceLevel.POOR]:
                return PerformanceLevel.POOR
            elif value >= thresholds[PerformanceLevel.ACCEPTABLE]:
                return PerformanceLevel.ACCEPTABLE
            elif value >= thresholds[PerformanceLevel.GOOD]:
                return PerformanceLevel.GOOD
            else:
                return PerformanceLevel.EXCELLENT
        else:
            # 低い値が良い場合（応答時間など）
            if value <= thresholds[PerformanceLevel.EXCELLENT]:
                return PerformanceLevel.EXCELLENT
            elif value <= thresholds[PerformanceLevel.GOOD]:
                return PerformanceLevel.GOOD
            elif value <= thresholds[PerformanceLevel.ACCEPTABLE]:
                return PerformanceLevel.ACCEPTABLE
            elif value <= thresholds[PerformanceLevel.POOR]:
                return PerformanceLevel.POOR
            else:
                return PerformanceLevel.CRITICAL
    
    def _is_in_cooldown(self, alert_key: str) -> bool:
        """クールダウン中かチェック"""
        last_alert = self.alert_cooldown.get(alert_key, 0)
        return time.time() - last_alert < self.cooldown_period


class PerformanceMonitor:
    """パフォーマンス監視メインクラス"""
    
    def __init__(self, base_url: str = "http://192.168.3.135:8000"):
        self.base_url = base_url
        self.database = PerformanceDatabase()
        self.system_monitor = SystemResourceMonitor()
        self.analyzer = PerformanceAnalyzer()
        self.session: Optional[aiohttp.ClientSession] = None
        self.monitoring = False
        
        # 監視対象エンドポイント
        self.endpoints = [
            ("/health", "GET"),
            ("/version", "GET"),
            ("/api/v1/auth/login", "POST"),
            ("/api/v1/incidents", "GET"),
            ("/api/v1/incidents", "POST"),
            ("/api/v1/problems", "GET"),
            ("/api/v1/dashboard/stats", "GET"),
        ]
    
    async def __aenter__(self):
        """非同期コンテキスト開始"""
        self.session = aiohttp.ClientSession(
            timeout=aiohttp.ClientTimeout(total=30)
        )
        return self
    
    async def __aexit__(self, exc_type, exc_val, exc_tb):
        """非同期コンテキスト終了"""
        if self.session:
            await self.session.close()
    
    async def measure_endpoint_performance(self, endpoint: str, method: str) -> Optional[PerformanceMetric]:
        """エンドポイントのパフォーマンスを測定"""
        if not self.session:
            return None
        
        url = f"{self.base_url}{endpoint}"
        start_time = time.time()
        
        # システムリソース取得
        system_metrics = self.system_monitor.get_system_metrics()
        
        try:
            # テストデータ準備
            test_data = self._get_test_data(endpoint, method)
            request_size = len(json.dumps(test_data).encode()) if test_data else 0
            
            async with self.session.request(
                method,
                url,
                json=test_data if method in ["POST", "PUT", "PATCH"] else None,
                headers={"Content-Type": "application/json"}
            ) as response:
                response_text = await response.text()
                response_time = time.time() - start_time
                response_size = len(response_text.encode())
                
                return PerformanceMetric(
                    timestamp=time.time(),
                    endpoint=endpoint,
                    method=method,
                    response_time=response_time,
                    status_code=response.status,
                    request_size=request_size,
                    response_size=response_size,
                    memory_usage=system_metrics.memory_percent,
                    cpu_usage=system_metrics.cpu_percent,
                    active_connections=len(psutil.net_connections())
                )
                
        except Exception as e:
            logger.error(f"Error measuring performance for {endpoint}: {e}")
            return None
    
    def _get_test_data(self, endpoint: str, method: str) -> Optional[Dict[str, Any]]:
        """テストデータを取得"""
        test_data_map = {
            "/api/v1/auth/login": {
                "username": "test@example.com",
                "password": "testpassword"
            },
            "/api/v1/incidents": {
                "title": "Performance Test Incident",
                "description": "Test incident for performance monitoring",
                "priority": "medium",
                "category_id": 1
            }
        }
        
        return test_data_map.get(endpoint)
    
    async def run_performance_cycle(self) -> List[PerformanceAlert]:
        """パフォーマンス監視サイクルを実行"""
        all_alerts = []
        
        # システムメトリクスを保存
        system_metrics = self.system_monitor.get_system_metrics()
        self.database.save_system_metric(system_metrics)
        
        # 各エンドポイントを測定
        for endpoint, method in self.endpoints:
            try:
                metric = await self.measure_endpoint_performance(endpoint, method)
                if metric:
                    # メトリクスを保存
                    self.database.save_metric(metric)
                    
                    # 分析してアラート生成
                    alerts = self.analyzer.analyze_metric(metric)
                    all_alerts.extend(alerts)
                    
                    # アラートを保存
                    for alert in alerts:
                        self.database.save_alert(alert)
                        logger.warning(f"Performance alert: {alert.message}")
                
                # リクエスト間隔
                await asyncio.sleep(1)
                
            except Exception as e:
                logger.error(f"Error in performance cycle for {endpoint}: {e}")
        
        return all_alerts
    
    async def start_monitoring(self, interval: int = 60):
        """パフォーマンス監視を開始"""
        self.monitoring = True
        logger.info(f"Starting performance monitoring with {interval}s interval")
        
        while self.monitoring:
            try:
                alerts = await self.run_performance_cycle()
                
                if alerts:
                    await self._handle_alerts(alerts)
                
                await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"Error in monitoring cycle: {e}")
                await asyncio.sleep(10)
    
    def stop_monitoring(self):
        """監視を停止"""
        self.monitoring = False
        logger.info("Stopping performance monitoring")
    
    async def _handle_alerts(self, alerts: List[PerformanceAlert]):
        """アラート処理"""
        critical_alerts = [a for a in alerts if a.level == PerformanceLevel.CRITICAL]
        
        if critical_alerts:
            # 重要なアラートの場合は即座に対応
            await self._trigger_emergency_response(critical_alerts)
    
    async def _trigger_emergency_response(self, alerts: List[PerformanceAlert]):
        """緊急対応をトリガー"""
        logger.critical(f"Triggering emergency response for {len(alerts)} critical alerts")
        
        # アラート詳細をファイルに保存
        alert_data = [alert.to_dict() for alert in alerts]
        
        alert_file = Path("emergency_alerts") / f"critical_alerts_{int(time.time())}.json"
        alert_file.parent.mkdir(exist_ok=True)
        
        async with aiofiles.open(alert_file, 'w') as f:
            await f.write(json.dumps(alert_data, indent=2, default=str))
    
    def get_performance_report(self, hours: int = 24) -> Dict[str, Any]:
        """パフォーマンスレポートを生成"""
        metrics = self.database.get_metrics(hours)
        
        if not metrics:
            return {"error": "No metrics available"}
        
        # 全体統計
        response_times = [m['response_time'] for m in metrics]
        error_count = len([m for m in metrics if m['status_code'] >= 400])
        
        # エンドポイント別統計
        endpoint_stats = {}
        endpoints = set((m['endpoint'], m['method']) for m in metrics)
        
        for endpoint, method in endpoints:
            endpoint_key = f"{method} {endpoint}"
            endpoint_stats[endpoint_key] = self.database.get_endpoint_stats(endpoint, hours)
        
        return {
            "timestamp": time.time(),
            "period_hours": hours,
            "total_requests": len(metrics),
            "overall_stats": {
                "avg_response_time": statistics.mean(response_times) if response_times else 0,
                "median_response_time": statistics.median(response_times) if response_times else 0,
                "p95_response_time": self.database._percentile(response_times, 95),
                "p99_response_time": self.database._percentile(response_times, 99),
                "error_rate": error_count / len(metrics) if metrics else 0,
                "min_response_time": min(response_times) if response_times else 0,
                "max_response_time": max(response_times) if response_times else 0
            },
            "endpoint_statistics": endpoint_stats,
            "performance_level": self._get_overall_performance_level(response_times, error_count / len(metrics) if metrics else 0)
        }
    
    def _get_overall_performance_level(self, response_times: List[float], error_rate: float) -> str:
        """全体パフォーマンスレベルを取得"""
        if not response_times:
            return "unknown"
        
        avg_response_time = statistics.mean(response_times)
        
        if avg_response_time <= 0.5 and error_rate <= 0.01:
            return "excellent"
        elif avg_response_time <= 1.0 and error_rate <= 0.05:
            return "good"
        elif avg_response_time <= 3.0 and error_rate <= 0.1:
            return "acceptable"
        elif avg_response_time <= 10.0 and error_rate <= 0.2:
            return "poor"
        else:
            return "critical"


# メイン実行用
async def main():
    """メイン実行関数"""
    monitor = PerformanceMonitor()
    
    try:
        async with monitor:
            await monitor.start_monitoring()
    except KeyboardInterrupt:
        logger.info("Monitoring stopped by user")
    finally:
        monitor.stop_monitoring()


if __name__ == "__main__":
    asyncio.run(main())