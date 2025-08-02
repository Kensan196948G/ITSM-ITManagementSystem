#!/usr/bin/env python3
"""
無限ループエラー検知・修復システム統合起動スクリプト
MCP Playwright + ClaudeCode連携による手動修復システム
"""

import asyncio
import logging
import signal
import sys
import json
import time
from datetime import datetime
from pathlib import Path
from typing import Dict, Any
import traceback

# プロジェクトルートをPythonパスに追加
sys.path.append('/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend')

from app.services.mcp_playwright_error_monitor import MCPPlaywrightErrorMonitor
from app.services.infinite_loop_repair_controller import InfiniteLoopRepairController
from app.core.config import settings


class InfiniteErrorRepairSystem:
    """無限エラー検知・修復システム統合管理"""
    
    def __init__(self):
        self.logger = self._setup_logging()
        self.mcp_monitor = MCPPlaywrightErrorMonitor()
        self.loop_controller = InfiniteLoopRepairController()
        
        # システム状態
        self.system_running = False
        self.startup_time = None
        self.shutdown_requested = False
        
        # 統合設定
        self.config = {
            "system_name": "Infinite Error Repair System",
            "version": "1.0.0",
            "startup_timeout": 60,
            "shutdown_timeout": 30,
            "health_check_interval": 60,
            "auto_restart_on_failure": True,
            "max_restart_attempts": 3,
            "concurrent_monitoring": True,
            "emergency_stop_on_critical": True
        }
        
        # メトリクス
        self.metrics = {
            "startup_count": 0,
            "restart_count": 0,
            "total_uptime": 0,
            "errors_handled": 0,
            "repairs_executed": 0,
            "emergency_stops": 0
        }
        
        # ファイルパス
        self.system_state_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/system_state.json"
        self.system_metrics_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/system_metrics.json"
        
        # シグナルハンドラー設定
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
    
    def _setup_logging(self) -> logging.Logger:
        """ログ設定"""
        logger = logging.getLogger("InfiniteErrorRepairSystem")
        logger.setLevel(logging.INFO)
        
        # ログフォーマット
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        # ファイルハンドラー
        log_dir = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs")
        log_dir.mkdir(parents=True, exist_ok=True)
        
        file_handler = logging.FileHandler(log_dir / "infinite_repair_system.log")
        file_handler.setFormatter(formatter)
        logger.addHandler(file_handler)
        
        # コンソールハンドラー
        console_handler = logging.StreamHandler(sys.stdout)
        console_handler.setFormatter(formatter)
        logger.addHandler(console_handler)
        
        return logger
    
    def _signal_handler(self, signum, frame):
        """シグナルハンドラー"""
        self.logger.info(f"Received signal {signum}, initiating graceful shutdown...")
        self.shutdown_requested = True
    
    async def start_system(self):
        """システム起動"""
        try:
            self.logger.info(f"Starting {self.config['system_name']} v{self.config['version']}")
            self.startup_time = datetime.now()
            self.metrics["startup_count"] += 1
            
            # システム状態初期化
            await self._initialize_system_state()
            
            # 前回の状態復旧
            await self._restore_previous_state()
            
            # ヘルスチェック実行
            initial_health = await self._perform_initial_health_check()
            if not initial_health["healthy"]:
                self.logger.warning(f"Initial health check failed: {initial_health['issues']}")
                
                if self.config["emergency_stop_on_critical"] and initial_health["critical"]:
                    self.logger.critical("Critical issues detected during startup - aborting")
                    return False
            
            self.system_running = True
            
            # メインシステムループ実行
            if self.config["concurrent_monitoring"]:
                await self._run_concurrent_monitoring()
            else:
                await self._run_sequential_monitoring()
            
            return True
            
        except Exception as e:
            self.logger.error(f"System startup failed: {str(e)}")
            self.logger.error(traceback.format_exc())
            return False
        finally:
            await self._cleanup_system()
    
    async def _initialize_system_state(self):
        """システム状態初期化"""
        try:
            system_state = {
                "timestamp": datetime.now().isoformat(),
                "status": "starting",
                "pid": None,  # プロセスID
                "startup_time": self.startup_time.isoformat(),
                "config": self.config,
                "metrics": self.metrics,
                "components": {
                    "mcp_monitor": {"status": "initializing"},
                    "loop_controller": {"status": "initializing"}
                }
            }
            
            with open(self.system_state_file, 'w') as f:
                json.dump(system_state, f, indent=2)
            
            self.logger.info("System state initialized")
            
        except Exception as e:
            self.logger.error(f"Failed to initialize system state: {str(e)}")
    
    async def _restore_previous_state(self):
        """前回の状態復旧"""
        try:
            if not Path(self.system_state_file).exists():
                self.logger.info("No previous state found - starting fresh")
                return
            
            with open(self.system_state_file, 'r') as f:
                previous_state = json.load(f)
            
            # 前回の異常終了チェック
            if previous_state.get("status") == "running":
                self.logger.warning("Previous session ended abnormally - performing recovery")
                await self._perform_crash_recovery()
            
            # メトリクス復旧
            if "metrics" in previous_state:
                saved_metrics = previous_state["metrics"]
                self.metrics["restart_count"] = saved_metrics.get("restart_count", 0) + 1
                self.metrics["total_uptime"] += saved_metrics.get("total_uptime", 0)
                self.metrics["errors_handled"] += saved_metrics.get("errors_handled", 0)
                self.metrics["repairs_executed"] += saved_metrics.get("repairs_executed", 0)
                self.metrics["emergency_stops"] += saved_metrics.get("emergency_stops", 0)
            
            self.logger.info("Previous state restored successfully")
            
        except Exception as e:
            self.logger.error(f"Failed to restore previous state: {str(e)}")
    
    async def _perform_initial_health_check(self) -> Dict[str, Any]:
        """初期ヘルスチェック"""
        try:
            self.logger.info("Performing initial health check...")
            
            health_result = {
                "healthy": True,
                "critical": False,
                "issues": [],
                "components": {}
            }
            
            # API接続テスト
            try:
                api_health = await self.mcp_monitor.check_api_health()
                if api_health.error_rate > 0.5:  # 50%以上エラー
                    health_result["healthy"] = False
                    health_result["critical"] = True
                    health_result["issues"].append("High API error rate")
                
                health_result["components"]["api"] = {
                    "status": "healthy" if api_health.error_rate < 0.1 else "unhealthy",
                    "error_rate": api_health.error_rate,
                    "uptime": api_health.uptime_percentage
                }
                
            except Exception as e:
                health_result["healthy"] = False
                health_result["critical"] = True
                health_result["issues"].append(f"API connection failed: {str(e)}")
                health_result["components"]["api"] = {"status": "failed", "error": str(e)}
            
            # データベース接続テスト
            try:
                db_status = await self.mcp_monitor.check_database_connectivity()
                if db_status["status"] != "healthy":
                    health_result["healthy"] = False
                    health_result["critical"] = True
                    health_result["issues"].append("Database connection failed")
                
                health_result["components"]["database"] = db_status
                
            except Exception as e:
                health_result["healthy"] = False
                health_result["critical"] = True
                health_result["issues"].append(f"Database check failed: {str(e)}")
                health_result["components"]["database"] = {"status": "failed", "error": str(e)}
            
            # ファイルシステムアクセステスト
            try:
                test_file = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/health_check.tmp")
                test_file.write_text(f"health_check_{datetime.now().isoformat()}")
                test_file.unlink()
                
                health_result["components"]["filesystem"] = {"status": "healthy"}
                
            except Exception as e:
                health_result["healthy"] = False
                health_result["issues"].append(f"Filesystem access failed: {str(e)}")
                health_result["components"]["filesystem"] = {"status": "failed", "error": str(e)}
            
            self.logger.info(f"Initial health check completed: {'PASS' if health_result['healthy'] else 'FAIL'}")
            return health_result
            
        except Exception as e:
            self.logger.error(f"Initial health check failed: {str(e)}")
            return {
                "healthy": False,
                "critical": True,
                "issues": [f"Health check error: {str(e)}"],
                "components": {}
            }
    
    async def _perform_crash_recovery(self):
        """クラッシュ復旧処理"""
        try:
            self.logger.info("Performing crash recovery...")
            
            # エラー履歴をクリア
            self.mcp_monitor.error_history.clear()
            
            # 一時ファイルクリーンアップ
            temp_files = [
                "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/*.tmp",
                "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/temp/*"
            ]
            
            import glob
            for pattern in temp_files:
                for file_path in glob.glob(pattern):
                    try:
                        Path(file_path).unlink()
                    except Exception:
                        pass
            
            # データベース整合性チェック
            try:
                await self.mcp_monitor._check_database_integrity()
            except Exception as e:
                self.logger.warning(f"Database integrity check failed during recovery: {str(e)}")
            
            self.metrics["restart_count"] += 1
            self.logger.info("Crash recovery completed")
            
        except Exception as e:
            self.logger.error(f"Crash recovery failed: {str(e)}")
    
    async def _run_concurrent_monitoring(self):
        """並行監視実行"""
        try:
            self.logger.info("Starting concurrent monitoring mode...")
            
            # 複数のタスクを並行実行
            tasks = [
                asyncio.create_task(self._run_mcp_monitoring()),
                asyncio.create_task(self._run_loop_controller()),
                asyncio.create_task(self._run_system_health_monitor()),
                asyncio.create_task(self._run_metrics_updater())
            ]
            
            # すべてのタスクが完了するまで待機
            await asyncio.gather(*tasks, return_exceptions=True)
            
        except Exception as e:
            self.logger.error(f"Concurrent monitoring failed: {str(e)}")
    
    async def _run_sequential_monitoring(self):
        """順次監視実行"""
        try:
            self.logger.info("Starting sequential monitoring mode...")
            
            while self.system_running and not self.shutdown_requested:
                # MCP監視実行
                await self._run_single_mcp_cycle()
                
                # ループ制御実行
                await self._run_single_loop_cycle()
                
                # システムヘルス監視
                await self._check_system_health()
                
                # メトリクス更新
                await self._update_system_metrics()
                
                # 待機
                await asyncio.sleep(self.config["health_check_interval"])
            
        except Exception as e:
            self.logger.error(f"Sequential monitoring failed: {str(e)}")
    
    async def _run_mcp_monitoring(self):
        """MCP監視実行"""
        try:
            self.logger.info("Starting MCP Playwright monitoring...")
            restart_attempts = 0
            
            while self.system_running and not self.shutdown_requested:
                try:
                    await self.mcp_monitor.start_infinite_monitoring()
                    break  # 正常終了
                except Exception as e:
                    restart_attempts += 1
                    self.logger.error(f"MCP monitoring failed (attempt {restart_attempts}): {str(e)}")
                    
                    if restart_attempts >= self.config["max_restart_attempts"]:
                        self.logger.critical("Max restart attempts reached for MCP monitoring")
                        if self.config["emergency_stop_on_critical"]:
                            self.metrics["emergency_stops"] += 1
                            self.shutdown_requested = True
                        break
                    
                    # 指数バックオフ
                    wait_time = min(60, 5 * (2 ** restart_attempts))
                    await asyncio.sleep(wait_time)
            
        except Exception as e:
            self.logger.error(f"MCP monitoring task failed: {str(e)}")
    
    async def _run_loop_controller(self):
        """ループ制御実行"""
        try:
            self.logger.info("Starting infinite loop controller...")
            restart_attempts = 0
            
            while self.system_running and not self.shutdown_requested:
                try:
                    await self.loop_controller.start_infinite_repair_loop()
                    break  # 正常終了
                except Exception as e:
                    restart_attempts += 1
                    self.logger.error(f"Loop controller failed (attempt {restart_attempts}): {str(e)}")
                    
                    if restart_attempts >= self.config["max_restart_attempts"]:
                        self.logger.critical("Max restart attempts reached for loop controller")
                        if self.config["emergency_stop_on_critical"]:
                            self.metrics["emergency_stops"] += 1
                            self.shutdown_requested = True
                        break
                    
                    # 指数バックオフ
                    wait_time = min(60, 5 * (2 ** restart_attempts))
                    await asyncio.sleep(wait_time)
            
        except Exception as e:
            self.logger.error(f"Loop controller task failed: {str(e)}")
    
    async def _run_system_health_monitor(self):
        """システムヘルス監視"""
        try:
            self.logger.info("Starting system health monitor...")
            
            while self.system_running and not self.shutdown_requested:
                try:
                    await self._check_system_health()
                    await asyncio.sleep(self.config["health_check_interval"])
                except Exception as e:
                    self.logger.error(f"System health check failed: {str(e)}")
                    await asyncio.sleep(30)  # エラー時は短い間隔で再試行
            
        except Exception as e:
            self.logger.error(f"System health monitor failed: {str(e)}")
    
    async def _run_metrics_updater(self):
        """メトリクス更新"""
        try:
            self.logger.info("Starting metrics updater...")
            
            while self.system_running and not self.shutdown_requested:
                try:
                    await self._update_system_metrics()
                    await asyncio.sleep(30)  # 30秒ごとにメトリクス更新
                except Exception as e:
                    self.logger.error(f"Metrics update failed: {str(e)}")
                    await asyncio.sleep(60)  # エラー時は長い間隔で再試行
            
        except Exception as e:
            self.logger.error(f"Metrics updater failed: {str(e)}")
    
    async def _run_single_mcp_cycle(self):
        """単一MCP監視サイクル"""
        try:
            health_metrics = await self.mcp_monitor.check_api_health()
            db_status = await self.mcp_monitor.check_database_connectivity()
            
            # エラーが検知された場合
            if health_metrics.error_rate > 0 or db_status["status"] == "error":
                self.metrics["errors_handled"] += 1
                await self.mcp_monitor.execute_auto_repair()
                self.metrics["repairs_executed"] += 1
            
        except Exception as e:
            self.logger.error(f"MCP cycle failed: {str(e)}")
    
    async def _run_single_loop_cycle(self):
        """単一ループ制御サイクル"""
        try:
            cycle_result = await self.loop_controller._execute_repair_cycle()
            
            if cycle_result.repair_success:
                self.metrics["repairs_executed"] += 1
            
            if cycle_result.errors_detected > 0:
                self.metrics["errors_handled"] += cycle_result.errors_detected
            
        except Exception as e:
            self.logger.error(f"Loop cycle failed: {str(e)}")
    
    async def _check_system_health(self):
        """システムヘルスチェック"""
        try:
            current_time = datetime.now()
            uptime = (current_time - self.startup_time).total_seconds() if self.startup_time else 0
            
            health_status = {
                "timestamp": current_time.isoformat(),
                "uptime_seconds": uptime,
                "system_running": self.system_running,
                "mcp_active": self.mcp_monitor.monitoring_active,
                "loop_active": self.loop_controller.loop_state["active"],
                "metrics": self.metrics
            }
            
            # 異常検知
            if self.loop_controller.loop_state.get("emergency_stop", False):
                self.logger.warning("Emergency stop detected in loop controller")
            
            if self.loop_controller.loop_state.get("consecutive_failures", 0) > 10:
                self.logger.warning("High consecutive failure count detected")
            
            # 状態ファイル更新
            with open(self.system_state_file, 'w') as f:
                json.dump({
                    "status": "running",
                    "health": health_status,
                    "config": self.config
                }, f, indent=2)
            
        except Exception as e:
            self.logger.error(f"System health check failed: {str(e)}")
    
    async def _update_system_metrics(self):
        """システムメトリクス更新"""
        try:
            current_time = datetime.now()
            uptime = (current_time - self.startup_time).total_seconds() if self.startup_time else 0
            
            self.metrics["total_uptime"] = uptime
            
            metrics_data = {
                "timestamp": current_time.isoformat(),
                "system_info": {
                    "name": self.config["system_name"],
                    "version": self.config["version"],
                    "uptime_seconds": uptime,
                    "startup_time": self.startup_time.isoformat() if self.startup_time else None
                },
                "metrics": self.metrics,
                "component_status": {
                    "mcp_monitor": {
                        "active": self.mcp_monitor.monitoring_active,
                        "error_count": len(self.mcp_monitor.error_history),
                        "repair_count": len(self.mcp_monitor.repair_actions)
                    },
                    "loop_controller": {
                        "active": self.loop_controller.loop_state["active"],
                        "current_cycle": self.loop_controller.loop_state["current_cycle"],
                        "total_cycles": self.loop_controller.loop_state["total_cycles"],
                        "error_free_cycles": self.loop_controller.loop_state["error_free_cycles"]
                    }
                }
            }
            
            with open(self.system_metrics_file, 'w') as f:
                json.dump(metrics_data, f, indent=2)
            
        except Exception as e:
            self.logger.error(f"Metrics update failed: {str(e)}")
    
    async def _cleanup_system(self):
        """システムクリーンアップ"""
        try:
            self.logger.info("Starting system cleanup...")
            
            # 監視停止
            if hasattr(self.mcp_monitor, 'stop_monitoring'):
                self.mcp_monitor.stop_monitoring()
            
            if hasattr(self.loop_controller, 'stop_loop'):
                self.loop_controller.stop_loop()
            
            # 最終メトリクス更新
            await self._update_system_metrics()
            
            # 最終状態保存
            final_state = {
                "timestamp": datetime.now().isoformat(),
                "status": "stopped",
                "shutdown_reason": "graceful" if not self.shutdown_requested else "signal",
                "final_metrics": self.metrics,
                "total_uptime": (datetime.now() - self.startup_time).total_seconds() if self.startup_time else 0
            }
            
            with open(self.system_state_file, 'w') as f:
                json.dump(final_state, f, indent=2)
            
            self.logger.info("System cleanup completed")
            
        except Exception as e:
            self.logger.error(f"System cleanup failed: {str(e)}")


async def main():
    """メイン実行関数"""
    system = InfiniteErrorRepairSystem()
    
    print("=" * 80)
    print("Infinite Error Repair System - MCP Playwright + ClaudeCode Integration")
    print("=" * 80)
    print()
    
    try:
        success = await system.start_system()
        if success:
            print("System started successfully!")
        else:
            print("System startup failed!")
            return 1
            
    except KeyboardInterrupt:
        print("\nShutdown requested by user")
        return 0
    except Exception as e:
        print(f"System failed with error: {str(e)}")
        return 1
    
    return 0


if __name__ == "__main__":
    # 実行
    exit_code = asyncio.run(main())
    sys.exit(exit_code)