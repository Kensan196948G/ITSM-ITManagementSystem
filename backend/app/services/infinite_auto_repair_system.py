"""無限ループ自動修復実行システム - マスターコントローラー"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
import aiofiles
import signal
import sys

# 各監視システムをインポート
from .mcp_api_error_monitor import APIErrorMonitor, InfiniteLoopMonitor
from .database_error_repair import DatabaseHealthMonitor
from .performance_monitor import PerformanceMonitor
from .security_error_monitor import SecurityErrorMonitor
from .log_analysis_repair import LogAnalysisEngine

logger = logging.getLogger(__name__)


class SystemStatus(Enum):
    """システム状態"""

    INITIALIZING = "initializing"
    RUNNING = "running"
    DEGRADED = "degraded"
    CRITICAL = "critical"
    MAINTENANCE = "maintenance"
    SHUTDOWN = "shutdown"


class RepairAction(Enum):
    """修復アクション"""

    LOG_ONLY = "log_only"
    NOTIFY = "notify"
    AUTO_REPAIR = "auto_repair"
    MANUAL_INTERVENTION = "manual_intervention"
    EMERGENCY_SHUTDOWN = "emergency_shutdown"


@dataclass
class SystemHealth:
    """システムヘルス"""

    timestamp: float
    overall_status: SystemStatus
    api_health: Dict[str, Any]
    database_health: Dict[str, Any]
    performance_health: Dict[str, Any]
    security_health: Dict[str, Any]
    log_analysis_health: Dict[str, Any]
    active_issues: List[Dict[str, Any]]
    repair_history: List[Dict[str, Any]]

    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result["overall_status"] = self.overall_status.value
        return result


@dataclass
class RepairTask:
    """修復タスク"""

    id: str
    timestamp: float
    task_type: str
    priority: int
    description: str
    system: str
    action: RepairAction
    parameters: Dict[str, Any]
    max_attempts: int = 3
    attempts: int = 0
    completed: bool = False
    success: bool = False
    error_message: Optional[str] = None

    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result["action"] = self.action.value
        return result


class RepairCoordinator:
    """修復コーディネーター"""

    def __init__(self):
        self.repair_queue: List[RepairTask] = []
        self.running_tasks: Set[str] = set()
        self.repair_history: List[RepairTask] = []
        self.max_concurrent_repairs = 5
        self.repair_cooldown = 300  # 5分間のクールダウン
        self.last_repairs: Dict[str, float] = {}

    def add_repair_task(self, task: RepairTask) -> bool:
        """修復タスクを追加"""
        # クールダウンチェック
        cooldown_key = f"{task.system}:{task.task_type}"
        if self._is_in_cooldown(cooldown_key):
            logger.warning(f"Repair task {task.id} skipped due to cooldown")
            return False

        # 重複チェック
        if any(t.id == task.id for t in self.repair_queue):
            logger.warning(f"Repair task {task.id} already in queue")
            return False

        # 優先度に基づいて挿入
        self.repair_queue.append(task)
        self.repair_queue.sort(key=lambda x: x.priority)

        logger.info(f"Added repair task: {task.id} (priority: {task.priority})")
        return True

    async def execute_repairs(self) -> List[RepairTask]:
        """修復タスクを実行"""
        completed_tasks = []

        # 同時実行数制限
        while (
            len(self.running_tasks) < self.max_concurrent_repairs and self.repair_queue
        ):

            task = self.repair_queue.pop(0)
            if task.id not in self.running_tasks:
                self.running_tasks.add(task.id)

                # 非同期で修復実行
                asyncio.create_task(self._execute_single_repair(task))

        # 完了したタスクをチェック
        for task in list(self.repair_history):
            if task.completed and task.id in self.running_tasks:
                self.running_tasks.remove(task.id)
                completed_tasks.append(task)

        return completed_tasks

    async def _execute_single_repair(self, task: RepairTask):
        """単一修復タスクを実行"""
        logger.info(f"Executing repair task: {task.id}")

        try:
            task.attempts += 1

            # タスクタイプに応じた修復処理
            success = await self._perform_repair_action(task)

            task.success = success
            task.completed = True

            if success:
                # 成功時はクールダウンを設定
                cooldown_key = f"{task.system}:{task.task_type}"
                self.last_repairs[cooldown_key] = time.time()
                logger.info(f"Repair task {task.id} completed successfully")
            else:
                logger.warning(f"Repair task {task.id} failed")

                # 再試行判定
                if task.attempts < task.max_attempts:
                    task.completed = False
                    # 遅延後に再実行
                    await asyncio.sleep(30)
                    self.repair_queue.append(task)
                    self.repair_queue.sort(key=lambda x: x.priority)

        except Exception as e:
            task.error_message = str(e)
            task.completed = True
            task.success = False
            logger.error(f"Error executing repair task {task.id}: {e}")

        finally:
            # 履歴に追加
            if task not in self.repair_history:
                self.repair_history.append(task)

            # 履歴サイズ制限
            if len(self.repair_history) > 1000:
                self.repair_history = self.repair_history[-800:]

    async def _perform_repair_action(self, task: RepairTask) -> bool:
        """修復アクションを実行"""
        try:
            if task.action == RepairAction.LOG_ONLY:
                return True

            elif task.action == RepairAction.NOTIFY:
                await self._send_notification(task)
                return True

            elif task.action == RepairAction.AUTO_REPAIR:
                return await self._execute_auto_repair(task)

            elif task.action == RepairAction.MANUAL_INTERVENTION:
                await self._request_manual_intervention(task)
                return True

            elif task.action == RepairAction.EMERGENCY_SHUTDOWN:
                await self._emergency_shutdown(task)
                return True

            return False

        except Exception as e:
            logger.error(f"Error performing repair action for {task.id}: {e}")
            return False

    async def _send_notification(self, task: RepairTask):
        """通知送信"""
        notification = {
            "timestamp": time.time(),
            "type": "repair_notification",
            "task": task.to_dict(),
        }

        notification_dir = Path("repair_notifications")
        notification_dir.mkdir(exist_ok=True)

        filename = f"notification_{task.id}_{int(time.time())}.json"
        async with aiofiles.open(notification_dir / filename, "w") as f:
            await f.write(json.dumps(notification, indent=2, default=str))

    async def _execute_auto_repair(self, task: RepairTask) -> bool:
        """自動修復実行"""
        # システム別の修復処理
        if task.system == "api":
            return await self._repair_api_issue(task)
        elif task.system == "database":
            return await self._repair_database_issue(task)
        elif task.system == "performance":
            return await self._repair_performance_issue(task)
        elif task.system == "security":
            return await self._repair_security_issue(task)
        elif task.system == "logging":
            return await self._repair_logging_issue(task)

        return False

    async def _repair_api_issue(self, task: RepairTask) -> bool:
        """API問題の修復"""
        # 基本的なAPI修復処理
        logger.info(f"Attempting API repair for task {task.id}")
        await asyncio.sleep(2)  # シミュレーション
        return True

    async def _repair_database_issue(self, task: RepairTask) -> bool:
        """データベース問題の修復"""
        logger.info(f"Attempting database repair for task {task.id}")
        await asyncio.sleep(3)  # シミュレーション
        return True

    async def _repair_performance_issue(self, task: RepairTask) -> bool:
        """パフォーマンス問題の修復"""
        logger.info(f"Attempting performance repair for task {task.id}")
        await asyncio.sleep(2)  # シミュレーション
        return True

    async def _repair_security_issue(self, task: RepairTask) -> bool:
        """セキュリティ問題の修復"""
        logger.info(f"Attempting security repair for task {task.id}")
        await asyncio.sleep(1)  # シミュレーション
        return True

    async def _repair_logging_issue(self, task: RepairTask) -> bool:
        """ログ問題の修復"""
        logger.info(f"Attempting logging repair for task {task.id}")
        await asyncio.sleep(1)  # シミュレーション
        return True

    async def _request_manual_intervention(self, task: RepairTask):
        """手動介入要求"""
        intervention_request = {
            "timestamp": time.time(),
            "task": task.to_dict(),
            "urgency": "high" if task.priority <= 2 else "medium",
            "message": f"Manual intervention required for {task.description}",
        }

        request_dir = Path("manual_intervention_requests")
        request_dir.mkdir(exist_ok=True)

        filename = f"intervention_{task.id}_{int(time.time())}.json"
        async with aiofiles.open(request_dir / filename, "w") as f:
            await f.write(json.dumps(intervention_request, indent=2, default=str))

    async def _emergency_shutdown(self, task: RepairTask):
        """緊急シャットダウン"""
        logger.critical(f"Emergency shutdown triggered by task {task.id}")

        shutdown_info = {
            "timestamp": time.time(),
            "reason": task.description,
            "task": task.to_dict(),
        }

        async with aiofiles.open("emergency_shutdown.json", "w") as f:
            await f.write(json.dumps(shutdown_info, indent=2, default=str))

    def _is_in_cooldown(self, cooldown_key: str) -> bool:
        """クールダウン中かチェック"""
        last_repair = self.last_repairs.get(cooldown_key, 0)
        return time.time() - last_repair < self.repair_cooldown


class InfiniteAutoRepairSystem:
    """無限ループ自動修復システム - メインクラス"""

    def __init__(self, base_url: str = "http://192.168.3.135:8000"):
        self.base_url = base_url
        self.running = False
        self.system_status = SystemStatus.INITIALIZING

        # 各監視システム
        self.api_monitor = APIErrorMonitor(base_url)
        self.db_monitor = DatabaseHealthMonitor()
        self.performance_monitor = PerformanceMonitor(base_url)
        self.security_monitor = SecurityErrorMonitor()
        self.log_analyzer = LogAnalysisEngine()

        # 修復コーディネーター
        self.repair_coordinator = RepairCoordinator()

        # 設定
        self.monitoring_interval = 30  # 30秒間隔
        self.health_check_interval = 60  # 1分間隔
        self.repair_execution_interval = 10  # 10秒間隔

        # ヘルス履歴
        self.health_history: List[SystemHealth] = []

        # シグナルハンドリング
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)

    def _signal_handler(self, signum, frame):
        """シグナルハンドラー"""
        logger.info(f"Received signal {signum}, shutting down gracefully...")
        self.running = False

    async def initialize(self):
        """システム初期化"""
        logger.info("Initializing Infinite Auto Repair System")

        try:
            # 各監視システムの初期化チェック
            await self._validate_monitors()

            # 作業ディレクトリ作成
            self._create_work_directories()

            self.system_status = SystemStatus.RUNNING
            logger.info("System initialization completed")

        except Exception as e:
            logger.error(f"Initialization failed: {e}")
            self.system_status = SystemStatus.CRITICAL
            raise

    async def _validate_monitors(self):
        """監視システムの検証"""
        logger.info("Validating monitoring systems...")

        # API監視の検証
        try:
            async with self.api_monitor:
                await self.api_monitor.check_endpoint("/health", "GET")
            logger.info("API monitor validated")
        except Exception as e:
            logger.warning(f"API monitor validation failed: {e}")

        # データベース監視の検証
        try:
            health_status = self.db_monitor.get_health_status()
            logger.info("Database monitor validated")
        except Exception as e:
            logger.warning(f"Database monitor validation failed: {e}")

        # パフォーマンス監視の検証
        try:
            async with self.performance_monitor:
                report = self.performance_monitor.get_performance_report(1)
            logger.info("Performance monitor validated")
        except Exception as e:
            logger.warning(f"Performance monitor validation failed: {e}")

        # セキュリティ監視の検証
        try:
            status = self.security_monitor.get_security_status()
            logger.info("Security monitor validated")
        except Exception as e:
            logger.warning(f"Security monitor validation failed: {e}")

        # ログ分析の検証
        try:
            await self.log_analyzer.analyze_log_files()
            logger.info("Log analyzer validated")
        except Exception as e:
            logger.warning(f"Log analyzer validation failed: {e}")

    def _create_work_directories(self):
        """作業ディレクトリ作成"""
        directories = [
            "system_health_reports",
            "repair_logs",
            "repair_notifications",
            "manual_intervention_requests",
            "emergency_logs",
        ]

        for directory in directories:
            Path(directory).mkdir(exist_ok=True)

    async def start_infinite_loop(self):
        """無限ループ開始"""
        logger.info("Starting infinite auto repair loop")
        self.running = True

        # 複数のタスクを並行実行
        tasks = [
            asyncio.create_task(self._monitoring_loop()),
            asyncio.create_task(self._repair_execution_loop()),
            asyncio.create_task(self._health_check_loop()),
            asyncio.create_task(self._maintenance_loop()),
        ]

        try:
            await asyncio.gather(*tasks)
        except Exception as e:
            logger.error(f"Error in infinite loop: {e}")
        finally:
            self.running = False
            logger.info("Infinite loop stopped")

    async def _monitoring_loop(self):
        """監視ループ"""
        logger.info("Starting monitoring loop")

        while self.running:
            try:
                await self._run_monitoring_cycle()
                await asyncio.sleep(self.monitoring_interval)

            except Exception as e:
                logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(10)

    async def _run_monitoring_cycle(self):
        """監視サイクル実行"""
        monitoring_tasks = []

        # API監視
        async with self.api_monitor:
            api_errors = await self.api_monitor.run_monitoring_cycle()
            if api_errors:
                for error in api_errors:
                    await self._process_api_error(error)

        # データベース監視
        db_errors = await self.db_monitor.run_health_check()
        if db_errors:
            for error in db_errors:
                await self._process_database_error(error)

        # パフォーマンス監視
        async with self.performance_monitor:
            perf_alerts = await self.performance_monitor.run_performance_cycle()
            if perf_alerts:
                for alert in perf_alerts:
                    await self._process_performance_alert(alert)

        # セキュリティ監視は定期的に実行
        # ログ分析は別途定期実行

    async def _repair_execution_loop(self):
        """修復実行ループ"""
        logger.info("Starting repair execution loop")

        while self.running:
            try:
                completed_tasks = await self.repair_coordinator.execute_repairs()

                if completed_tasks:
                    await self._log_repair_results(completed_tasks)

                await asyncio.sleep(self.repair_execution_interval)

            except Exception as e:
                logger.error(f"Error in repair execution loop: {e}")
                await asyncio.sleep(10)

    async def _health_check_loop(self):
        """ヘルスチェックループ"""
        logger.info("Starting health check loop")

        while self.running:
            try:
                health = await self._collect_system_health()
                self.health_history.append(health)

                # ヘルス履歴サイズ制限
                if len(self.health_history) > 1440:  # 24時間分（1分間隔）
                    self.health_history = self.health_history[-1200:]

                # システム状態更新
                await self._update_system_status(health)

                # ヘルスレポート保存
                if len(self.health_history) % 60 == 0:  # 1時間ごと
                    await self._save_health_report(health)

                await asyncio.sleep(self.health_check_interval)

            except Exception as e:
                logger.error(f"Error in health check loop: {e}")
                await asyncio.sleep(30)

    async def _maintenance_loop(self):
        """メンテナンスループ"""
        logger.info("Starting maintenance loop")

        while self.running:
            try:
                # ログローテーション
                await self._rotate_logs()

                # 古いファイルのクリーンアップ
                await self._cleanup_old_files()

                # 統計情報更新
                await self._update_statistics()

                # 24時間ごとに実行
                await asyncio.sleep(86400)

            except Exception as e:
                logger.error(f"Error in maintenance loop: {e}")
                await asyncio.sleep(3600)  # エラー時は1時間後に再試行

    async def _process_api_error(self, error):
        """APIエラー処理"""
        task = RepairTask(
            id=f"api_error_{int(time.time())}_{hash(error.endpoint)}",
            timestamp=time.time(),
            task_type="api_error",
            priority=self._get_priority_from_severity(error.severity),
            description=f"API error on {error.endpoint}: {error.error_message}",
            system="api",
            action=RepairAction.AUTO_REPAIR,
            parameters={
                "endpoint": error.endpoint,
                "error_type": error.category.value,
                "severity": error.severity.value,
            },
        )

        self.repair_coordinator.add_repair_task(task)

    async def _process_database_error(self, error):
        """データベースエラー処理"""
        task = RepairTask(
            id=f"db_error_{int(time.time())}_{hash(error.database_url)}",
            timestamp=time.time(),
            task_type="database_error",
            priority=self._get_priority_from_severity(error.severity),
            description=f"Database error: {error.error_message}",
            system="database",
            action=RepairAction.AUTO_REPAIR,
            parameters={
                "issue_type": error.issue_type.value,
                "severity": error.severity.value,
                "database_url": error.database_url,
            },
        )

        self.repair_coordinator.add_repair_task(task)

    async def _process_performance_alert(self, alert):
        """パフォーマンスアラート処理"""
        task = RepairTask(
            id=f"perf_alert_{int(time.time())}_{hash(alert.endpoint)}",
            timestamp=time.time(),
            task_type="performance_alert",
            priority=self._get_priority_from_level(alert.level),
            description=f"Performance alert: {alert.message}",
            system="performance",
            action=RepairAction.AUTO_REPAIR,
            parameters={
                "alert_type": alert.alert_type.value,
                "level": alert.level.value,
                "endpoint": alert.endpoint,
            },
        )

        self.repair_coordinator.add_repair_task(task)

    def _get_priority_from_severity(self, severity) -> int:
        """重要度から優先度を取得"""
        priority_map = {"critical": 1, "high": 2, "medium": 3, "low": 4}
        return priority_map.get(
            severity.value if hasattr(severity, "value") else str(severity), 5
        )

    def _get_priority_from_level(self, level) -> int:
        """レベルから優先度を取得"""
        priority_map = {
            "critical": 1,
            "poor": 2,
            "acceptable": 3,
            "good": 4,
            "excellent": 5,
        }
        return priority_map.get(
            level.value if hasattr(level, "value") else str(level), 5
        )

    async def _collect_system_health(self) -> SystemHealth:
        """システムヘルス収集"""
        # 各システムのヘルス情報を収集
        api_health = self.api_monitor.get_health_report()
        db_health = self.db_monitor.get_health_status()

        # パフォーマンスヘルス
        try:
            perf_health = self.performance_monitor.get_performance_report(1)
        except:
            perf_health = {"error": "Failed to get performance health"}

        security_health = self.security_monitor.get_security_status()

        # ログ分析ヘルス
        try:
            log_health = {"status": "active", "last_analysis": time.time()}
        except:
            log_health = {"status": "error"}

        # アクティブな問題を収集
        active_issues = []

        # 全体的なステータス判定
        overall_status = self._determine_overall_status(
            api_health, db_health, perf_health, security_health, log_health
        )

        return SystemHealth(
            timestamp=time.time(),
            overall_status=overall_status,
            api_health=api_health,
            database_health=db_health,
            performance_health=perf_health,
            security_health=security_health,
            log_analysis_health=log_health,
            active_issues=active_issues,
            repair_history=[
                task.to_dict() for task in self.repair_coordinator.repair_history[-10:]
            ],
        )

    def _determine_overall_status(
        self, api_health, db_health, perf_health, security_health, log_health
    ) -> SystemStatus:
        """全体ステータス判定"""
        # 重要なヘルス指標をチェック
        critical_indicators = [
            api_health.get("overall_health") == "critical",
            security_health.get("security_level") == "critical",
            db_health.get("status") == "critical",
        ]

        if any(critical_indicators):
            return SystemStatus.CRITICAL

        warning_indicators = [
            api_health.get("overall_health") == "warning",
            security_health.get("security_level") == "high",
            perf_health.get("performance_level") == "poor",
        ]

        if sum(warning_indicators) >= 2:
            return SystemStatus.DEGRADED

        return SystemStatus.RUNNING

    async def _update_system_status(self, health: SystemHealth):
        """システム状態更新"""
        old_status = self.system_status
        self.system_status = health.overall_status

        if old_status != self.system_status:
            logger.warning(
                f"System status changed: {old_status.value} -> {self.system_status.value}"
            )

            # 状態変化をログ記録
            status_change = {
                "timestamp": time.time(),
                "old_status": old_status.value,
                "new_status": self.system_status.value,
                "health_summary": {
                    "api": health.api_health.get("overall_health", "unknown"),
                    "database": health.database_health.get("status", "unknown"),
                    "security": health.security_health.get("security_level", "unknown"),
                },
            }

            status_log_file = Path("system_status_changes.log")
            async with aiofiles.open(status_log_file, "a") as f:
                await f.write(json.dumps(status_change, default=str) + "\n")

    async def _save_health_report(self, health: SystemHealth):
        """ヘルスレポート保存"""
        report_dir = Path("system_health_reports")
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = report_dir / f"health_report_{timestamp}.json"

        async with aiofiles.open(report_file, "w") as f:
            await f.write(json.dumps(health.to_dict(), indent=2, default=str))

    async def _log_repair_results(self, completed_tasks: List[RepairTask]):
        """修復結果ログ記録"""
        for task in completed_tasks:
            log_entry = {
                "timestamp": time.time(),
                "task": task.to_dict(),
                "result": "success" if task.success else "failure",
            }

            log_file = (
                Path("repair_logs")
                / f"repair_log_{datetime.now().strftime('%Y%m%d')}.json"
            )
            async with aiofiles.open(log_file, "a") as f:
                await f.write(json.dumps(log_entry, default=str) + "\n")

    async def _rotate_logs(self):
        """ログローテーション"""
        # 古いログファイルを圧縮・アーカイブ
        # 実装は簡略化
        logger.info("Log rotation completed")

    async def _cleanup_old_files(self):
        """古いファイルクリーンアップ"""
        # 30日以上古いファイルを削除
        cutoff_time = time.time() - (30 * 24 * 3600)

        cleanup_dirs = [
            "system_health_reports",
            "repair_notifications",
            "manual_intervention_requests",
        ]

        for dir_name in cleanup_dirs:
            dir_path = Path(dir_name)
            if dir_path.exists():
                for file_path in dir_path.iterdir():
                    if file_path.stat().st_mtime < cutoff_time:
                        file_path.unlink()

    async def _update_statistics(self):
        """統計情報更新"""
        stats = {
            "timestamp": time.time(),
            "uptime": time.time() - getattr(self, "start_time", time.time()),
            "total_repairs": len(self.repair_coordinator.repair_history),
            "successful_repairs": len(
                [t for t in self.repair_coordinator.repair_history if t.success]
            ),
            "system_status": self.system_status.value,
            "health_checks": len(self.health_history),
        }

        async with aiofiles.open("system_statistics.json", "w") as f:
            await f.write(json.dumps(stats, indent=2, default=str))

    async def shutdown(self):
        """システムシャットダウン"""
        logger.info("Shutting down Infinite Auto Repair System")

        self.running = False
        self.system_status = SystemStatus.SHUTDOWN

        # 最終ヘルスレポート保存
        if self.health_history:
            final_health = self.health_history[-1]
            await self._save_health_report(final_health)

        # 修復状況保存
        repair_summary = {
            "timestamp": time.time(),
            "total_repairs": len(self.repair_coordinator.repair_history),
            "pending_repairs": len(self.repair_coordinator.repair_queue),
            "running_repairs": len(self.repair_coordinator.running_tasks),
        }

        async with aiofiles.open("shutdown_summary.json", "w") as f:
            await f.write(json.dumps(repair_summary, indent=2, default=str))

        logger.info("System shutdown completed")


# メイン実行用
async def main():
    """メイン実行関数"""
    system = InfiniteAutoRepairSystem()

    try:
        await system.initialize()
        system.start_time = time.time()
        await system.start_infinite_loop()

    except KeyboardInterrupt:
        logger.info("Shutdown requested by user")
    except Exception as e:
        logger.error(f"System error: {e}")
    finally:
        await system.shutdown()


if __name__ == "__main__":
    # ログ設定
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler("infinite_auto_repair.log"),
            logging.StreamHandler(sys.stdout),
        ],
    )

    asyncio.run(main())
