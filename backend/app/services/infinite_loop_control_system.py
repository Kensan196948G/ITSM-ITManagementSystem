"""
Infinite Loop Control System
無限ループ制御システム - MCP Playwrightエラー検知・修復システムの統合制御
"""

import asyncio
import json
import logging
import time
import signal
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Callable
from dataclasses import dataclass, asdict
from pathlib import Path
import traceback
import psutil
import os

# 各監視システムのインポート
from .mcp_playwright_error_monitor import MCPPlaywrightErrorMonitor
from .database_error_repair import DatabaseErrorRepairSystem
from .api_performance_monitor import APIPerformanceMonitor
from .security_error_monitor import SecurityErrorMonitor
from .auto_log_analysis_repair import AutoLogAnalysisRepairEngine


@dataclass
class SystemStatus:
    """システム状態"""
    timestamp: str
    system_name: str
    status: str  # running, stopped, error, recovering
    last_activity: str
    error_count: int
    uptime_seconds: float
    health_score: float
    memory_usage_mb: float
    cpu_usage_percent: float


@dataclass
class LoopControlMetrics:
    """ループ制御メトリクス"""
    timestamp: str
    total_loops: int
    successful_loops: int
    failed_loops: int
    average_loop_time: float
    systems_running: int
    systems_healthy: int
    overall_health_score: float
    error_rate: float
    uptime_hours: float


class InfiniteLoopControlSystem:
    """無限ループ制御システム"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        
        # 制御状態
        self.master_active = False
        self.systems_active = {}
        self.start_time = None
        
        # ファイルパス
        self.control_state_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/infinite_loop_state.json"
        self.metrics_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/infinite_loop_metrics.json"
        self.master_log_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/infinite_loop_master.log"
        
        # 監視システムインスタンス
        self.monitoring_systems = {
            "mcp_playwright": MCPPlaywrightErrorMonitor(),
            "database_repair": DatabaseErrorRepairSystem(),
            "api_performance": APIPerformanceMonitor(),
            "security_monitor": SecurityErrorMonitor(),
            "log_analyzer": AutoLogAnalysisRepairEngine()
        }
        
        # システム状態追跡
        self.system_statuses: Dict[str, SystemStatus] = {}
        self.loop_metrics = []
        
        # 制御設定
        self.master_loop_interval = 60  # 1分間隔でマスター制御
        self.health_check_interval = 30  # 30秒間隔でヘルスチェック
        self.max_consecutive_failures = 5
        self.auto_recovery_enabled = True
        self.graceful_shutdown_timeout = 300  # 5分
        
        # パフォーマンス閾値
        self.performance_thresholds = {
            "max_memory_usage_mb": 2048,  # 2GB
            "max_cpu_usage_percent": 80.0,
            "min_health_score": 60.0,
            "max_error_rate": 0.10  # 10%
        }
        
        # システム優先順位（起動・停止順序）
        self.system_priority = [
            "database_repair",      # 最優先（データベース）
            "security_monitor",     # セキュリティ
            "mcp_playwright",       # メイン監視
            "api_performance",      # パフォーマンス
            "log_analyzer"         # ログ分析
        ]
        
        # シグナルハンドラーの設定
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _signal_handler(self, signum, frame):
        """シグナルハンドラー"""
        self.logger.info(f"Received signal {signum}. Initiating graceful shutdown...")
        asyncio.create_task(self.graceful_shutdown())
    
    async def start_infinite_master_control(self):
        """無限マスター制御開始"""
        self.master_active = True
        self.start_time = datetime.now()
        self.logger.info("Starting Infinite Loop Control System - Master Controller")
        
        try:
            # 初期状態の読み込み
            await self.load_control_state()
            
            # 各監視システムの起動
            await self.start_all_monitoring_systems()
            
            # ヘルスチェックタスクの開始
            health_check_task = asyncio.create_task(self._continuous_health_check())
            
            # メインマスター制御ループ
            master_loop_count = 0
            consecutive_failures = 0
            
            while self.master_active:
                try:
                    master_loop_count += 1
                    loop_start_time = time.time()
                    
                    self.logger.info(f"Starting master control loop #{master_loop_count}")
                    
                    # 1. システム状態収集
                    await self.collect_system_statuses()
                    
                    # 2. 全体健康状態評価
                    overall_health = await self.evaluate_overall_health()
                    
                    # 3. パフォーマンス監視・最適化
                    await self.monitor_and_optimize_performance()
                    
                    # 4. エラー・異常検知
                    await self.detect_system_anomalies()
                    
                    # 5. 自動修復・復旧
                    if self.auto_recovery_enabled:
                        await self.execute_auto_recovery()
                    
                    # 6. 制御メトリクスの更新
                    loop_time = time.time() - loop_start_time
                    await self.update_control_metrics(loop_time, True)
                    
                    # 7. 状態の永続化
                    await self.save_control_state()
                    
                    # 8. レポート生成
                    await self.generate_master_report(overall_health)
                    
                    consecutive_failures = 0
                    await asyncio.sleep(self.master_loop_interval)
                    
                except Exception as e:
                    consecutive_failures += 1
                    loop_time = time.time() - loop_start_time
                    await self.update_control_metrics(loop_time, False)
                    
                    self.logger.error(f"Master control loop #{master_loop_count} failed: {str(e)}")
                    self.logger.error(traceback.format_exc())
                    
                    if consecutive_failures >= self.max_consecutive_failures:
                        self.logger.critical(f"Too many consecutive failures: {consecutive_failures}")
                        await self.emergency_master_recovery()
                        consecutive_failures = 0
                    
                    # エラー時の待機（指数バックオフ）
                    wait_time = min(300, self.master_loop_interval * (2 ** min(consecutive_failures, 5)))
                    await asyncio.sleep(wait_time)
            
            # ヘルスチェックタスクの停止
            health_check_task.cancel()
            
        except Exception as e:
            self.logger.critical(f"Master control system failed: {str(e)}")
            await self.emergency_master_recovery()
        
        finally:
            await self.graceful_shutdown()
    
    async def start_all_monitoring_systems(self):
        """全監視システムの起動"""
        self.logger.info("Starting all monitoring systems...")
        
        # 優先順位に従って順次起動
        for system_name in self.system_priority:
            try:
                await self.start_monitoring_system(system_name)
                await asyncio.sleep(5)  # システム間の起動間隔
            except Exception as e:
                self.logger.error(f"Failed to start {system_name}: {str(e)}")
        
        # 起動完了の確認
        running_systems = len([name for name, active in self.systems_active.items() if active])
        self.logger.info(f"Monitoring systems startup completed: {running_systems}/{len(self.monitoring_systems)} systems running")
    
    async def start_monitoring_system(self, system_name: str):
        """個別監視システムの起動"""
        if system_name not in self.monitoring_systems:
            raise ValueError(f"Unknown monitoring system: {system_name}")
        
        self.logger.info(f"Starting monitoring system: {system_name}")
        
        try:
            system = self.monitoring_systems[system_name]
            
            # 各システムの開始メソッドを非同期で実行
            if system_name == "mcp_playwright":
                task = asyncio.create_task(system.start_infinite_monitoring())
            elif system_name == "database_repair":
                task = asyncio.create_task(system.start_infinite_monitoring())
            elif system_name == "api_performance":
                task = asyncio.create_task(system.start_infinite_performance_monitoring())
            elif system_name == "security_monitor":
                task = asyncio.create_task(system.start_infinite_security_monitoring())
            elif system_name == "log_analyzer":
                task = asyncio.create_task(system.start_infinite_log_monitoring())
            
            # システムタスクを追跡
            setattr(self, f"{system_name}_task", task)
            self.systems_active[system_name] = True
            
            # 初期状態の設定
            self.system_statuses[system_name] = SystemStatus(
                timestamp=datetime.now().isoformat(),
                system_name=system_name,
                status="running",
                last_activity=datetime.now().isoformat(),
                error_count=0,
                uptime_seconds=0,
                health_score=100.0,
                memory_usage_mb=0,
                cpu_usage_percent=0
            )
            
            self.logger.info(f"Successfully started {system_name}")
            
        except Exception as e:
            self.systems_active[system_name] = False
            self.logger.error(f"Failed to start {system_name}: {str(e)}")
            raise
    
    async def stop_monitoring_system(self, system_name: str):
        """個別監視システムの停止"""
        if system_name not in self.monitoring_systems:
            return
        
        self.logger.info(f"Stopping monitoring system: {system_name}")
        
        try:
            # システムの停止
            system = self.monitoring_systems[system_name]
            if hasattr(system, 'stop_monitoring'):
                system.stop_monitoring()
            
            # タスクの停止
            task_attr = f"{system_name}_task"
            if hasattr(self, task_attr):
                task = getattr(self, task_attr)
                if not task.done():
                    task.cancel()
                    try:
                        await task
                    except asyncio.CancelledError:
                        pass
            
            self.systems_active[system_name] = False
            
            # 状態の更新
            if system_name in self.system_statuses:
                self.system_statuses[system_name].status = "stopped"
                self.system_statuses[system_name].last_activity = datetime.now().isoformat()
            
            self.logger.info(f"Successfully stopped {system_name}")
            
        except Exception as e:
            self.logger.error(f"Error stopping {system_name}: {str(e)}")
    
    async def _continuous_health_check(self):
        """継続的ヘルスチェック"""
        while self.master_active:
            try:
                await self.perform_health_check()
                await asyncio.sleep(self.health_check_interval)
            except asyncio.CancelledError:
                break
            except Exception as e:
                self.logger.error(f"Health check failed: {str(e)}")
                await asyncio.sleep(self.health_check_interval)
    
    async def perform_health_check(self):
        """ヘルスチェック実行"""
        try:
            current_time = datetime.now()
            
            for system_name, system in self.monitoring_systems.items():
                if system_name not in self.systems_active or not self.systems_active[system_name]:
                    continue
                
                # システムタスクの状態確認
                task_attr = f"{system_name}_task"
                if hasattr(self, task_attr):
                    task = getattr(self, task_attr)
                    
                    if task.done() and not task.cancelled():
                        # タスクが異常終了している
                        self.systems_active[system_name] = False
                        self.system_statuses[system_name].status = "error"
                        self.system_statuses[system_name].error_count += 1
                        
                        self.logger.warning(f"System {system_name} task has terminated unexpectedly")
                        
                        # 自動復旧を試行
                        if self.auto_recovery_enabled:
                            await self.restart_monitoring_system(system_name)
                
                # システム状態の更新
                if system_name in self.system_statuses:
                    status = self.system_statuses[system_name]
                    status.timestamp = current_time.isoformat()
                    status.last_activity = current_time.isoformat()
                    
                    # アップタイムの計算
                    if self.start_time:
                        status.uptime_seconds = (current_time - self.start_time).total_seconds()
                    
                    # リソース使用量の更新
                    try:
                        process = psutil.Process()
                        status.memory_usage_mb = process.memory_info().rss / (1024 * 1024)
                        status.cpu_usage_percent = process.cpu_percent()
                    except Exception:
                        pass
        
        except Exception as e:
            self.logger.error(f"Health check execution failed: {str(e)}")
    
    async def restart_monitoring_system(self, system_name: str):
        """監視システムの再起動"""
        self.logger.info(f"Attempting to restart monitoring system: {system_name}")
        
        try:
            # 停止
            await self.stop_monitoring_system(system_name)
            await asyncio.sleep(5)
            
            # 再起動
            await self.start_monitoring_system(system_name)
            
            self.logger.info(f"Successfully restarted {system_name}")
            
        except Exception as e:
            self.logger.error(f"Failed to restart {system_name}: {str(e)}")
    
    async def collect_system_statuses(self):
        """システム状態の収集"""
        try:
            for system_name, system in self.monitoring_systems.items():
                if system_name not in self.systems_active or not self.systems_active[system_name]:
                    continue
                
                # 各システム固有の状態情報を収集
                try:
                    if system_name == "mcp_playwright":
                        # MCP Playwrightシステムの状態
                        error_count = len(getattr(system, 'error_history', []))
                        health_score = 100.0 - min(error_count * 5, 50)  # エラー1つにつき5点減点
                        
                    elif system_name == "database_repair":
                        # データベース修復システムの状態
                        error_count = len(getattr(system, 'error_history', []))
                        repair_count = len(getattr(system, 'repair_history', []))
                        health_score = max(50.0, 100.0 - error_count * 3 + repair_count * 2)
                        
                    elif system_name == "api_performance":
                        # APIパフォーマンス監視の状態
                        metrics = getattr(system, 'performance_metrics', [])
                        if metrics:
                            recent_metrics = metrics[-10:]  # 最新10件
                            avg_response_time = sum(m.response_time for m in recent_metrics) / len(recent_metrics)
                            health_score = max(0, 100.0 - avg_response_time * 10)
                        else:
                            health_score = 80.0
                        error_count = len([m for m in metrics if m.status_code >= 400])
                        
                    elif system_name == "security_monitor":
                        # セキュリティ監視の状態
                        threats = getattr(system, 'security_threats', [])
                        critical_threats = len([t for t in threats if t.severity == "critical"])
                        health_score = max(20.0, 100.0 - critical_threats * 15)
                        error_count = len(threats)
                        
                    elif system_name == "log_analyzer":
                        # ログ分析システムの状態
                        log_entries = getattr(system, 'log_entries', [])
                        error_entries = len([e for e in log_entries if e.level in ["ERROR", "CRITICAL"]])
                        health_score = max(30.0, 100.0 - error_entries * 2)
                        error_count = error_entries
                    
                    else:
                        error_count = 0
                        health_score = 90.0
                    
                    # システム状態の更新
                    if system_name in self.system_statuses:
                        status = self.system_statuses[system_name]
                        status.error_count = error_count
                        status.health_score = health_score
                        status.status = "running" if health_score > 50 else "degraded"
                    
                except Exception as e:
                    self.logger.warning(f"Failed to collect status for {system_name}: {str(e)}")
        
        except Exception as e:
            self.logger.error(f"System status collection failed: {str(e)}")
    
    async def evaluate_overall_health(self) -> Dict[str, Any]:
        """全体健康状態の評価"""
        overall_health = {
            "timestamp": datetime.now().isoformat(),
            "systems_running": 0,
            "systems_healthy": 0,
            "systems_degraded": 0,
            "systems_error": 0,
            "overall_health_score": 0.0,
            "critical_issues": [],
            "warnings": [],
            "system_details": {}
        }
        
        try:
            total_health_score = 0
            healthy_systems = 0
            
            for system_name, status in self.system_statuses.items():
                if self.systems_active.get(system_name, False):
                    overall_health["systems_running"] += 1
                    
                    if status.status == "running" and status.health_score >= self.performance_thresholds["min_health_score"]:
                        overall_health["systems_healthy"] += 1
                        healthy_systems += 1
                    elif status.status in ["running", "degraded"]:
                        overall_health["systems_degraded"] += 1
                    else:
                        overall_health["systems_error"] += 1
                        overall_health["critical_issues"].append(f"System {system_name} in error state")
                    
                    total_health_score += status.health_score
                    
                    # システム詳細
                    overall_health["system_details"][system_name] = {
                        "status": status.status,
                        "health_score": status.health_score,
                        "error_count": status.error_count,
                        "uptime_hours": status.uptime_seconds / 3600 if status.uptime_seconds else 0
                    }
                    
                    # 警告・問題の検出
                    if status.health_score < self.performance_thresholds["min_health_score"]:
                        overall_health["warnings"].append(f"Low health score for {system_name}: {status.health_score:.1f}")
                    
                    if status.memory_usage_mb > self.performance_thresholds["max_memory_usage_mb"]:
                        overall_health["warnings"].append(f"High memory usage for {system_name}: {status.memory_usage_mb:.1f}MB")
                    
                    if status.cpu_usage_percent > self.performance_thresholds["max_cpu_usage_percent"]:
                        overall_health["warnings"].append(f"High CPU usage for {system_name}: {status.cpu_usage_percent:.1f}%")
            
            # 全体健康スコアの計算
            if overall_health["systems_running"] > 0:
                overall_health["overall_health_score"] = total_health_score / overall_health["systems_running"]
            
            # 全体状態の判定
            if overall_health["overall_health_score"] >= 80:
                overall_health["overall_status"] = "healthy"
            elif overall_health["overall_health_score"] >= 60:
                overall_health["overall_status"] = "warning"
            else:
                overall_health["overall_status"] = "critical"
            
            self.logger.info(f"Overall health evaluation: {overall_health['overall_status']} ({overall_health['overall_health_score']:.1f})")
            
        except Exception as e:
            overall_health["error"] = str(e)
            overall_health["overall_status"] = "error"
            self.logger.error(f"Overall health evaluation failed: {str(e)}")
        
        return overall_health
    
    async def monitor_and_optimize_performance(self):
        """パフォーマンス監視・最適化"""
        try:
            # システムリソースの監視
            process = psutil.Process()
            memory_mb = process.memory_info().rss / (1024 * 1024)
            cpu_percent = process.cpu_percent()
            
            # メモリ使用量の最適化
            if memory_mb > self.performance_thresholds["max_memory_usage_mb"]:
                self.logger.warning(f"High memory usage detected: {memory_mb:.1f}MB")
                
                # メモリクリーンアップの実行
                await self._optimize_memory_usage()
            
            # CPU使用率の最適化
            if cpu_percent > self.performance_thresholds["max_cpu_usage_percent"]:
                self.logger.warning(f"High CPU usage detected: {cpu_percent:.1f}%")
                
                # CPU使用率の最適化
                await self._optimize_cpu_usage()
            
            # 各システムのパフォーマンス調整
            for system_name, status in self.system_statuses.items():
                if status.health_score < 50:
                    # パフォーマンスが低下しているシステムの調整
                    await self._optimize_system_performance(system_name)
        
        except Exception as e:
            self.logger.error(f"Performance monitoring and optimization failed: {str(e)}")
    
    async def _optimize_memory_usage(self):
        """メモリ使用量の最適化"""
        try:
            # 各システムのメモリクリーンアップを実行
            for system_name, system in self.monitoring_systems.items():
                if not self.systems_active.get(system_name, False):
                    continue
                
                # システム固有のクリーンアップ
                if hasattr(system, 'cleanup_old_metrics'):
                    await system.cleanup_old_metrics()
                
                if hasattr(system, 'cleanup_old_data'):
                    await system.cleanup_old_data()
                
                if hasattr(system, 'cleanup_old_analysis_data'):
                    await system.cleanup_old_analysis_data()
            
            self.logger.info("Memory optimization completed")
            
        except Exception as e:
            self.logger.error(f"Memory optimization failed: {str(e)}")
    
    async def _optimize_cpu_usage(self):
        """CPU使用率の最適化"""
        try:
            # 監視間隔の調整（CPU負荷軽減）
            for system_name, system in self.monitoring_systems.items():
                if not self.systems_active.get(system_name, False):
                    continue
                
                if hasattr(system, 'monitoring_interval'):
                    original_interval = system.monitoring_interval
                    system.monitoring_interval = min(300, original_interval * 1.5)  # 1.5倍に延長
                    self.logger.info(f"Adjusted monitoring interval for {system_name}: {original_interval}s -> {system.monitoring_interval}s")
            
            self.logger.info("CPU optimization completed")
            
        except Exception as e:
            self.logger.error(f"CPU optimization failed: {str(e)}")
    
    async def _optimize_system_performance(self, system_name: str):
        """個別システムパフォーマンス最適化"""
        try:
            system = self.monitoring_systems.get(system_name)
            if not system:
                return
            
            # システム固有の最適化
            if system_name == "mcp_playwright":
                # エラー履歴の制限
                if hasattr(system, 'error_history'):
                    system.error_history = system.error_history[-500:]  # 最新500件
            
            elif system_name == "database_repair":
                # エラー履歴とメトリクスの制限
                if hasattr(system, 'error_history'):
                    system.error_history = system.error_history[-200:]
                if hasattr(system, 'repair_history'):
                    system.repair_history = system.repair_history[-100:]
            
            elif system_name == "api_performance":
                # パフォーマンスメトリクスの制限
                if hasattr(system, 'performance_metrics'):
                    system.performance_metrics = system.performance_metrics[-1000:]
            
            elif system_name == "security_monitor":
                # セキュリティ脅威履歴の制限
                if hasattr(system, 'security_threats'):
                    system.security_threats = system.security_threats[-500:]
            
            elif system_name == "log_analyzer":
                # ログエントリの制限
                if hasattr(system, 'log_entries'):
                    system.log_entries = system.log_entries[-1000:]
            
            self.logger.info(f"Performance optimization completed for {system_name}")
            
        except Exception as e:
            self.logger.error(f"Performance optimization failed for {system_name}: {str(e)}")
    
    async def detect_system_anomalies(self):
        """システム異常検知"""
        try:
            anomalies = []
            
            for system_name, status in self.system_statuses.items():
                # エラー率の異常検知
                if status.uptime_seconds > 0:
                    error_rate = status.error_count / (status.uptime_seconds / 3600)  # エラー/時間
                    if error_rate > 10:  # 1時間に10エラー以上
                        anomalies.append(f"High error rate for {system_name}: {error_rate:.1f} errors/hour")
                
                # ヘルススコアの急激な低下
                if status.health_score < 30:
                    anomalies.append(f"Critical health score for {system_name}: {status.health_score:.1f}")
                
                # システム停止の検知
                if not self.systems_active.get(system_name, False) and system_name in self.system_priority:
                    anomalies.append(f"Critical system stopped: {system_name}")
            
            # システム全体の異常
            running_critical_systems = sum(
                1 for name in ["mcp_playwright", "database_repair", "security_monitor"]
                if self.systems_active.get(name, False)
            )
            
            if running_critical_systems < 2:
                anomalies.append(f"Too few critical systems running: {running_critical_systems}/3")
            
            # 異常が検出された場合の処理
            if anomalies:
                self.logger.warning(f"System anomalies detected: {anomalies}")
                
                # 異常レポートの記録
                anomaly_report = {
                    "timestamp": datetime.now().isoformat(),
                    "anomalies": anomalies,
                    "system_statuses": {name: asdict(status) for name, status in self.system_statuses.items()}
                }
                
                # 異常レポートの保存
                anomaly_file = f"/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/system_anomalies_{int(time.time())}.json"
                with open(anomaly_file, 'w') as f:
                    json.dump(anomaly_report, f, indent=2)
        
        except Exception as e:
            self.logger.error(f"System anomaly detection failed: {str(e)}")
    
    async def execute_auto_recovery(self):
        """自動復旧実行"""
        try:
            recovery_actions = []
            
            # 停止したクリティカルシステムの復旧
            for system_name in ["mcp_playwright", "database_repair", "security_monitor"]:
                if not self.systems_active.get(system_name, False):
                    try:
                        await self.restart_monitoring_system(system_name)
                        recovery_actions.append(f"Restarted {system_name}")
                    except Exception as e:
                        recovery_actions.append(f"Failed to restart {system_name}: {str(e)}")
            
            # ヘルススコアが低いシステムの復旧
            for system_name, status in self.system_statuses.items():
                if status.health_score < 30 and self.systems_active.get(system_name, False):
                    try:
                        await self.restart_monitoring_system(system_name)
                        recovery_actions.append(f"Recovered low-health system {system_name}")
                    except Exception as e:
                        recovery_actions.append(f"Failed to recover {system_name}: {str(e)}")
            
            # システムリソースの最適化
            process = psutil.Process()
            if process.memory_info().rss / (1024 * 1024) > self.performance_thresholds["max_memory_usage_mb"]:
                await self._optimize_memory_usage()
                recovery_actions.append("Executed memory optimization")
            
            if recovery_actions:
                self.logger.info(f"Auto recovery executed: {recovery_actions}")
                
                # 復旧アクションの記録
                recovery_report = {
                    "timestamp": datetime.now().isoformat(),
                    "actions": recovery_actions
                }
                
                recovery_file = f"/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/auto_recovery_{int(time.time())}.json"
                with open(recovery_file, 'w') as f:
                    json.dump(recovery_report, f, indent=2)
        
        except Exception as e:
            self.logger.error(f"Auto recovery execution failed: {str(e)}")
    
    async def emergency_master_recovery(self):
        """緊急マスター復旧"""
        self.logger.critical("Initiating emergency master recovery...")
        
        try:
            # 1. 全システムの強制停止
            for system_name in list(self.systems_active.keys()):
                try:
                    await self.stop_monitoring_system(system_name)
                except Exception as e:
                    self.logger.error(f"Error stopping {system_name} during emergency: {str(e)}")
            
            # 2. システム状態のリセット
            self.system_statuses.clear()
            self.systems_active.clear()
            
            # 3. 短い待機
            await asyncio.sleep(30)
            
            # 4. クリティカルシステムのみ再起動
            critical_systems = ["database_repair", "mcp_playwright", "security_monitor"]
            
            for system_name in critical_systems:
                try:
                    await self.start_monitoring_system(system_name)
                    await asyncio.sleep(10)  # システム間の間隔を長く
                except Exception as e:
                    self.logger.error(f"Failed to restart {system_name} during emergency: {str(e)}")
            
            # 5. 緊急復旧レポート
            recovery_status = {
                "timestamp": datetime.now().isoformat(),
                "emergency_recovery": True,
                "systems_restarted": list(self.systems_active.keys()),
                "systems_running": len([s for s in self.systems_active.values() if s])
            }
            
            emergency_file = f"/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/emergency_recovery_{int(time.time())}.json"
            with open(emergency_file, 'w') as f:
                json.dump(recovery_status, f, indent=2)
            
            self.logger.info("Emergency master recovery completed")
            
        except Exception as e:
            self.logger.critical(f"Emergency master recovery failed: {str(e)}")
    
    async def update_control_metrics(self, loop_time: float, success: bool):
        """制御メトリクスの更新"""
        try:
            current_time = datetime.now()
            uptime_hours = 0
            
            if self.start_time:
                uptime_hours = (current_time - self.start_time).total_seconds() / 3600
            
            # メトリクス計算
            total_loops = len(self.loop_metrics) + 1
            successful_loops = len([m for m in self.loop_metrics if m.successful_loops > 0]) + (1 if success else 0)
            failed_loops = total_loops - successful_loops
            
            # 平均ループ時間
            all_loop_times = [m.average_loop_time for m in self.loop_metrics] + [loop_time]
            average_loop_time = sum(all_loop_times) / len(all_loop_times)
            
            # システム統計
            systems_running = len([s for s in self.systems_active.values() if s])
            systems_healthy = len([s for s in self.system_statuses.values() if s.health_score >= 60])
            
            # 全体健康スコア
            if self.system_statuses:
                overall_health_score = sum(s.health_score for s in self.system_statuses.values()) / len(self.system_statuses)
            else:
                overall_health_score = 0
            
            # エラー率
            error_rate = failed_loops / total_loops if total_loops > 0 else 0
            
            # 新しいメトリクス
            metrics = LoopControlMetrics(
                timestamp=current_time.isoformat(),
                total_loops=total_loops,
                successful_loops=successful_loops,
                failed_loops=failed_loops,
                average_loop_time=average_loop_time,
                systems_running=systems_running,
                systems_healthy=systems_healthy,
                overall_health_score=overall_health_score,
                error_rate=error_rate,
                uptime_hours=uptime_hours
            )
            
            self.loop_metrics.append(metrics)
            
            # メトリクス履歴を制限（最新100件）
            if len(self.loop_metrics) > 100:
                self.loop_metrics = self.loop_metrics[-100:]
            
        except Exception as e:
            self.logger.error(f"Control metrics update failed: {str(e)}")
    
    async def save_control_state(self):
        """制御状態の保存"""
        try:
            state_data = {
                "timestamp": datetime.now().isoformat(),
                "master_active": self.master_active,
                "start_time": self.start_time.isoformat() if self.start_time else None,
                "systems_active": self.systems_active,
                "system_statuses": {name: asdict(status) for name, status in self.system_statuses.items()},
                "loop_metrics": [asdict(m) for m in self.loop_metrics[-10:]],  # 最新10件
                "performance_thresholds": self.performance_thresholds,
                "control_settings": {
                    "master_loop_interval": self.master_loop_interval,
                    "health_check_interval": self.health_check_interval,
                    "auto_recovery_enabled": self.auto_recovery_enabled
                }
            }
            
            with open(self.control_state_file, 'w') as f:
                json.dump(state_data, f, indent=2)
            
            # メトリクスファイルの保存
            if self.loop_metrics:
                latest_metrics = asdict(self.loop_metrics[-1])
                with open(self.metrics_file, 'w') as f:
                    json.dump(latest_metrics, f, indent=2)
        
        except Exception as e:
            self.logger.error(f"Failed to save control state: {str(e)}")
    
    async def load_control_state(self):
        """制御状態の読み込み"""
        try:
            if os.path.exists(self.control_state_file):
                with open(self.control_state_file, 'r') as f:
                    state_data = json.load(f)
                
                # 設定の復元
                if "control_settings" in state_data:
                    settings = state_data["control_settings"]
                    self.master_loop_interval = settings.get("master_loop_interval", self.master_loop_interval)
                    self.health_check_interval = settings.get("health_check_interval", self.health_check_interval)
                    self.auto_recovery_enabled = settings.get("auto_recovery_enabled", self.auto_recovery_enabled)
                
                # 閾値の復元
                if "performance_thresholds" in state_data:
                    self.performance_thresholds.update(state_data["performance_thresholds"])
                
                self.logger.info("Control state loaded successfully")
        
        except Exception as e:
            self.logger.error(f"Failed to load control state: {str(e)}")
    
    async def generate_master_report(self, overall_health: Dict[str, Any]):
        """マスターレポート生成"""
        try:
            report = {
                "timestamp": datetime.now().isoformat(),
                "master_control_status": "active" if self.master_active else "inactive",
                "uptime_hours": (datetime.now() - self.start_time).total_seconds() / 3600 if self.start_time else 0,
                "overall_health": overall_health,
                "system_summary": {
                    "total_systems": len(self.monitoring_systems),
                    "running_systems": len([s for s in self.systems_active.values() if s]),
                    "healthy_systems": overall_health.get("systems_healthy", 0),
                    "degraded_systems": overall_health.get("systems_degraded", 0),
                    "error_systems": overall_health.get("systems_error", 0)
                },
                "performance_metrics": asdict(self.loop_metrics[-1]) if self.loop_metrics else None,
                "resource_usage": {
                    "memory_mb": psutil.Process().memory_info().rss / (1024 * 1024),
                    "cpu_percent": psutil.Process().cpu_percent()
                },
                "recommendations": self._generate_master_recommendations(overall_health)
            }
            
            # マスターレポートの保存
            master_report_file = f"/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/master_report_{int(time.time())}.json"
            with open(master_report_file, 'w') as f:
                json.dump(report, f, indent=2)
            
            self.logger.info(f"Master report generated: {overall_health.get('overall_status', 'unknown')} health status")
            
        except Exception as e:
            self.logger.error(f"Failed to generate master report: {str(e)}")
    
    def _generate_master_recommendations(self, overall_health: Dict[str, Any]) -> List[str]:
        """マスター推奨事項生成"""
        recommendations = []
        
        try:
            # システム状態に基づく推奨事項
            if overall_health.get("systems_error", 0) > 0:
                recommendations.append("Investigate and fix systems in error state")
            
            if overall_health.get("systems_degraded", 0) > 1:
                recommendations.append("Multiple systems showing degraded performance - check resource allocation")
            
            if overall_health.get("overall_health_score", 0) < 60:
                recommendations.append("Overall system health is low - immediate attention required")
            
            # パフォーマンスに基づく推奨事項
            if self.loop_metrics:
                latest_metrics = self.loop_metrics[-1]
                
                if latest_metrics.error_rate > 0.1:
                    recommendations.append("High error rate in master control loop - investigate causes")
                
                if latest_metrics.average_loop_time > 120:
                    recommendations.append("Master control loop taking too long - optimize performance")
            
            # リソース使用量に基づく推奨事項
            process = psutil.Process()
            memory_mb = process.memory_info().rss / (1024 * 1024)
            cpu_percent = process.cpu_percent()
            
            if memory_mb > self.performance_thresholds["max_memory_usage_mb"]:
                recommendations.append("High memory usage - consider memory optimization")
            
            if cpu_percent > self.performance_thresholds["max_cpu_usage_percent"]:
                recommendations.append("High CPU usage - consider reducing monitoring frequency")
            
            # 一般的な推奨事項
            if not recommendations:
                recommendations.append("System operating normally - continue monitoring")
            
        except Exception as e:
            recommendations.append(f"Error generating recommendations: {str(e)}")
        
        return recommendations[:10]  # 最大10件
    
    async def graceful_shutdown(self):
        """グレースフルシャットダウン"""
        self.logger.info("Initiating graceful shutdown of Infinite Loop Control System...")
        
        try:
            self.master_active = False
            
            # 逆順で全システムを停止
            for system_name in reversed(self.system_priority):
                if system_name in self.systems_active:
                    await self.stop_monitoring_system(system_name)
                    await asyncio.sleep(2)  # システム間の停止間隔
            
            # 最終状態の保存
            await self.save_control_state()
            
            # 最終レポートの生成
            final_report = {
                "timestamp": datetime.now().isoformat(),
                "shutdown_type": "graceful",
                "uptime_hours": (datetime.now() - self.start_time).total_seconds() / 3600 if self.start_time else 0,
                "systems_stopped": list(self.monitoring_systems.keys()),
                "final_metrics": asdict(self.loop_metrics[-1]) if self.loop_metrics else None
            }
            
            final_report_file = f"/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/shutdown_report_{int(time.time())}.json"
            with open(final_report_file, 'w') as f:
                json.dump(final_report, f, indent=2)
            
            self.logger.info("Graceful shutdown completed successfully")
            
        except Exception as e:
            self.logger.error(f"Error during graceful shutdown: {str(e)}")
    
    def stop_master_control(self):
        """マスター制御停止"""
        self.master_active = False
        self.logger.info("Master control stop requested")


# 使用例とエントリーポイント
async def main():
    """メイン実行関数"""
    master_controller = InfiniteLoopControlSystem()
    
    try:
        await master_controller.start_infinite_master_control()
    except KeyboardInterrupt:
        await master_controller.graceful_shutdown()
        print("Infinite Loop Control System stopped by user")
    except Exception as e:
        print(f"Infinite Loop Control System failed: {str(e)}")


if __name__ == "__main__":
    # ログ設定
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/infinite_loop_master.log'),
            logging.StreamHandler()
        ]
    )
    
    # 非同期実行
    asyncio.run(main())