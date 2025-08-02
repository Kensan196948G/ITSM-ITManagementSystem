#!/usr/bin/env python3
"""
統合制御システム - 既存システムとの完全統合
- enhanced_github_actions_auto_repair.py
- realtime_repair_controller.py
- emergency_auto_repair_loop.py
- infinite_loop_state.json (ループ176、528エラー修正)
完全自動化による統合制御
"""

import asyncio
import json
import logging
import subprocess
import signal
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from enum import Enum
import threading
import queue
import traceback

class SystemPriority(Enum):
    """システム優先度"""
    EMERGENCY = 1      # 緊急（5秒間隔）
    REALTIME = 2       # リアルタイム（5秒間隔）
    ENHANCED = 3       # 拡張（30秒間隔）
    BACKGROUND = 4     # バックグラウンド（定期実行）

class IntegrationStatus(Enum):
    """統合状態"""
    INITIALIZING = "initializing"
    ACTIVE = "active"
    EMERGENCY = "emergency"
    MAINTENANCE = "maintenance"
    ERROR = "error"
    SHUTDOWN = "shutdown"

@dataclass
class SystemComponent:
    """システムコンポーネント"""
    name: str
    priority: SystemPriority
    status: str
    last_execution: Optional[datetime]
    error_count: int
    success_count: int
    active: bool

class IntegrationController:
    """統合制御システム"""
    
    def __init__(self):
        self.base_path = Path(__file__).parent
        self.project_root = self.base_path.parent
        
        # ログ設定
        self.setup_logging()
        
        # 統合状態
        self.status = IntegrationStatus.INITIALIZING
        self.running = False
        self.emergency_mode = False
        
        # システムコンポーネント
        self.components = {
            "emergency_loop": SystemComponent(
                name="emergency_auto_repair_loop",
                priority=SystemPriority.EMERGENCY,
                status="stopped",
                last_execution=None,
                error_count=0,
                success_count=0,
                active=False
            ),
            "realtime_controller": SystemComponent(
                name="realtime_repair_controller", 
                priority=SystemPriority.REALTIME,
                status="stopped",
                last_execution=None,
                error_count=0,
                success_count=0,
                active=False
            ),
            "enhanced_repair": SystemComponent(
                name="enhanced_github_actions_auto_repair",
                priority=SystemPriority.ENHANCED,
                status="stopped",
                last_execution=None,
                error_count=0,
                success_count=0,
                active=False
            ),
            "infinite_loop": SystemComponent(
                name="infinite_loop_monitor",
                priority=SystemPriority.BACKGROUND,
                status="active",  # 既に稼働中
                last_execution=datetime.now(),
                error_count=0,
                success_count=528,  # 528エラー修正済み
                active=True
            )
        }
        
        # 制御設定
        self.config = {
            "emergency_trigger_threshold": 1,     # エラー1件で緊急モード
            "escalation_time_seconds": 300,       # 5分でエスカレーション
            "health_check_interval": 10,          # 10秒間隔でヘルスチェック
            "component_timeout": 60,              # コンポーネント応答タイムアウト
            "max_concurrent_repairs": 3,          # 最大同時修復数
            "integration_save_interval": 30       # 30秒間隔で状態保存
        }
        
        # 統計情報
        self.statistics = {
            "total_github_errors_detected": 0,
            "total_repairs_attempted": 0,
            "total_repairs_successful": 0,
            "emergency_activations": 0,
            "system_uptime": 0,
            "integration_start_time": datetime.now(),
            "last_error_detection": None,
            "last_successful_repair": None
        }
        
        # メッセージキュー
        self.repair_queue = queue.Queue()
        self.notification_queue = queue.Queue()
        
        # シグナルハンドラー
        self.setup_signal_handlers()
        
        self.logger.critical("🎛️ INTEGRATION CONTROLLER INITIALIZED")

    def setup_logging(self):
        """統合ログ設定"""
        log_file = self.base_path / "integration_controller.log"
        
        formatter = logging.Formatter(
            '%(asctime)s.%(msecs)03d - [INTEGRATION] - %(levelname)s - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        
        self.logger = logging.getLogger("IntegrationController")
        self.logger.setLevel(logging.INFO)
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)

    def setup_signal_handlers(self):
        """シグナルハンドラー設定"""
        def shutdown_handler(signum, frame):
            self.logger.critical(f"🛑 Integration shutdown signal {signum}")
            self.shutdown()
        
        signal.signal(signal.SIGINT, shutdown_handler)
        signal.signal(signal.SIGTERM, shutdown_handler)

    async def monitor_existing_systems(self) -> Dict[str, Any]:
        """既存システムの監視"""
        monitoring_data = {}
        
        try:
            # infinite_loop_state.json の監視
            infinite_loop_file = self.base_path / "infinite_loop_state.json"
            if infinite_loop_file.exists():
                with open(infinite_loop_file, 'r') as f:
                    infinite_data = json.load(f)
                    monitoring_data["infinite_loop"] = {
                        "loop_count": infinite_data.get("loop_count", 0),
                        "total_errors_fixed": infinite_data.get("total_errors_fixed", 0),
                        "last_scan": infinite_data.get("last_scan"),
                        "active": True
                    }
                    
                    # コンポーネント情報更新
                    self.components["infinite_loop"].success_count = infinite_data.get("total_errors_fixed", 0)
                    self.components["infinite_loop"].last_execution = datetime.fromisoformat(
                        infinite_data.get("last_scan", datetime.now().isoformat())
                    )
            
            # realtime_repair_state.json の監視
            realtime_file = self.base_path / "realtime_repair_state.json"
            if realtime_file.exists():
                with open(realtime_file, 'r') as f:
                    realtime_data = json.load(f)
                    monitoring_data["realtime_repair"] = {
                        "timestamp": realtime_data.get("timestamp"),
                        "config": realtime_data.get("config", {}),
                        "uptime": realtime_data.get("uptime", 0),
                        "active": True
                    }
            
            # GitHub Actions 状況監視
            github_status = await self.check_github_actions_status()
            monitoring_data["github_actions"] = github_status
            
            # エラーメトリクス監視
            error_metrics = await self.check_error_metrics()
            monitoring_data["error_metrics"] = error_metrics
            
            return monitoring_data
            
        except Exception as e:
            self.logger.error(f"System monitoring error: {e}")
            return {"error": str(e)}

    async def check_github_actions_status(self) -> Dict[str, Any]:
        """GitHub Actions状況チェック"""
        try:
            # GitHub CLI での最新ワークフロー取得
            cmd = [
                "gh", "api", 
                f"repos/Kensan196948G/ITSM-ITManagementSystem/actions/runs",
                "--jq", ".workflow_runs[:5] | map(select(.created_at > (now - 3600 | strftime(\"%Y-%m-%dT%H:%M:%SZ\"))))"
            ]
            
            result = await asyncio.wait_for(
                asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                ),
                timeout=10.0
            )
            
            stdout, stderr = await result.communicate()
            
            if result.returncode == 0:
                runs = json.loads(stdout.decode())
                
                failed_runs = [run for run in runs if run.get("conclusion") == "failure"]
                in_progress = [run for run in runs if run.get("status") == "in_progress"]
                
                return {
                    "total_runs": len(runs),
                    "failed_runs": len(failed_runs),
                    "in_progress": len(in_progress),
                    "latest_failures": failed_runs[:3],  # 最新3件の失敗
                    "status": "critical" if failed_runs else "healthy",
                    "check_time": datetime.now().isoformat()
                }
            else:
                return {"status": "error", "message": "GitHub API access failed"}
                
        except Exception as e:
            return {"status": "error", "message": str(e)}

    async def check_error_metrics(self) -> Dict[str, Any]:
        """エラーメトリクス確認"""
        try:
            metrics_file = self.project_root / "backend" / "api_error_metrics.json"
            if metrics_file.exists():
                with open(metrics_file, 'r') as f:
                    metrics = json.load(f)
                    return {
                        "total_errors": metrics.get("total_errors", 0),
                        "health_status": metrics.get("health_status", "unknown"),
                        "timestamp": metrics.get("timestamp")
                    }
            
            return {"total_errors": 0, "health_status": "unknown"}
            
        except Exception as e:
            return {"total_errors": -1, "health_status": "error", "error": str(e)}

    async def decide_system_activation(self, monitoring_data: Dict) -> Dict[str, bool]:
        """システム活性化判定"""
        activation_decision = {
            "emergency_loop": False,
            "realtime_controller": False,
            "enhanced_repair": False,
            "escalate_priority": False
        }
        
        try:
            github_status = monitoring_data.get("github_actions", {})
            error_metrics = monitoring_data.get("error_metrics", {})
            
            failed_runs = github_status.get("failed_runs", 0)
            total_errors = error_metrics.get("total_errors", 0)
            
            # 緊急モード判定
            if (failed_runs >= self.config["emergency_trigger_threshold"] or 
                total_errors > 0 or 
                github_status.get("status") == "critical"):
                
                self.logger.critical(f"🚨 EMERGENCY TRIGGER: {failed_runs} failed runs, {total_errors} errors")
                activation_decision["emergency_loop"] = True
                activation_decision["escalate_priority"] = True
                self.emergency_mode = True
                self.statistics["emergency_activations"] += 1
                
            # リアルタイム修復判定
            elif failed_runs > 0 or total_errors > 0:
                self.logger.warning(f"⚡ REALTIME TRIGGER: {failed_runs} failed runs")
                activation_decision["realtime_controller"] = True
                
            # 拡張修復判定（定期実行）
            else:
                activation_decision["enhanced_repair"] = True
                self.emergency_mode = False
            
            return activation_decision
            
        except Exception as e:
            self.logger.error(f"Activation decision error: {e}")
            return activation_decision

    async def execute_emergency_mode(self):
        """緊急モード実行"""
        self.logger.critical("🚨 EXECUTING EMERGENCY MODE")
        self.status = IntegrationStatus.EMERGENCY
        
        try:
            # 緊急修復ループ開始
            emergency_script = self.base_path / "emergency_auto_repair_loop.py"
            
            process = await asyncio.create_subprocess_exec(
                "python3", str(emergency_script),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root
            )
            
            self.components["emergency_loop"].active = True
            self.components["emergency_loop"].status = "running"
            self.components["emergency_loop"].last_execution = datetime.now()
            
            # 緊急プロセス監視（非ブロッキング）
            asyncio.create_task(self.monitor_emergency_process(process))
            
            self.logger.critical("🚨 Emergency mode activated")
            
        except Exception as e:
            self.logger.error(f"Emergency mode execution error: {e}")
            self.components["emergency_loop"].error_count += 1

    async def monitor_emergency_process(self, process):
        """緊急プロセス監視"""
        try:
            # プロセス完了を待機（タイムアウト付き）
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), 
                timeout=self.config["escalation_time_seconds"]
            )
            
            if process.returncode == 0:
                self.logger.critical("✅ Emergency repair completed successfully")
                self.components["emergency_loop"].success_count += 1
                self.emergency_mode = False
            else:
                self.logger.error(f"❌ Emergency repair failed: {stderr.decode()}")
                self.components["emergency_loop"].error_count += 1
                
        except asyncio.TimeoutError:
            self.logger.warning("⏰ Emergency process timeout - continuing")
            process.terminate()
        except Exception as e:
            self.logger.error(f"Emergency process monitoring error: {e}")
        finally:
            self.components["emergency_loop"].active = False
            self.components["emergency_loop"].status = "completed"

    async def execute_realtime_mode(self):
        """リアルタイムモード実行"""
        self.logger.info("⚡ EXECUTING REALTIME MODE")
        
        try:
            # リアルタイム修復開始
            realtime_script = self.base_path / "realtime_repair_controller.py"
            
            process = await asyncio.create_subprocess_exec(
                "python3", str(realtime_script),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root
            )
            
            self.components["realtime_controller"].active = True
            self.components["realtime_controller"].status = "running"
            self.components["realtime_controller"].last_execution = datetime.now()
            
            # リアルタイムプロセス監視
            asyncio.create_task(self.monitor_realtime_process(process))
            
            self.logger.info("⚡ Realtime mode activated")
            
        except Exception as e:
            self.logger.error(f"Realtime mode execution error: {e}")
            self.components["realtime_controller"].error_count += 1

    async def monitor_realtime_process(self, process):
        """リアルタイムプロセス監視"""
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(), 
                timeout=300  # 5分タイムアウト
            )
            
            if process.returncode == 0:
                self.logger.info("✅ Realtime repair completed")
                self.components["realtime_controller"].success_count += 1
            else:
                self.logger.warning(f"⚠️ Realtime repair ended: {stderr.decode()}")
                
        except asyncio.TimeoutError:
            self.logger.info("⏰ Realtime process timeout - continuing")
            process.terminate()
        except Exception as e:
            self.logger.error(f"Realtime process monitoring error: {e}")
        finally:
            self.components["realtime_controller"].active = False
            self.components["realtime_controller"].status = "completed"

    async def execute_enhanced_mode(self):
        """拡張モード実行"""
        self.logger.info("🔧 EXECUTING ENHANCED MODE")
        
        try:
            # 拡張GitHub Actions修復開始
            enhanced_script = self.base_path / "enhanced_github_actions_auto_repair.py"
            
            process = await asyncio.create_subprocess_exec(
                "python3", str(enhanced_script),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
                cwd=self.project_root
            )
            
            self.components["enhanced_repair"].active = True
            self.components["enhanced_repair"].status = "running"
            self.components["enhanced_repair"].last_execution = datetime.now()
            
            # 拡張プロセス監視
            asyncio.create_task(self.monitor_enhanced_process(process))
            
            self.logger.info("🔧 Enhanced mode activated")
            
        except Exception as e:
            self.logger.error(f"Enhanced mode execution error: {e}")
            self.components["enhanced_repair"].error_count += 1

    async def monitor_enhanced_process(self, process):
        """拡張プロセス監視"""
        try:
            stdout, stderr = await asyncio.wait_for(
                process.communicate(),
                timeout=600  # 10分タイムアウト
            )
            
            if process.returncode == 0:
                self.logger.info("✅ Enhanced repair completed")
                self.components["enhanced_repair"].success_count += 1
            else:
                self.logger.info(f"ℹ️ Enhanced repair ended: {stderr.decode()}")
                
        except asyncio.TimeoutError:
            self.logger.info("⏰ Enhanced process timeout - continuing")
            process.terminate()
        except Exception as e:
            self.logger.error(f"Enhanced process monitoring error: {e}")
        finally:
            self.components["enhanced_repair"].active = False
            self.components["enhanced_repair"].status = "completed"

    async def save_integration_state(self):
        """統合状態保存"""
        try:
            state_file = self.base_path / "integration_controller_state.json"
            
            # 稼働時間計算
            uptime = (datetime.now() - self.statistics["integration_start_time"]).total_seconds()
            self.statistics["system_uptime"] = uptime
            
            state_data = {
                "timestamp": datetime.now().isoformat(),
                "status": self.status.value,
                "emergency_mode": self.emergency_mode,
                "running": self.running,
                "config": self.config,
                "components": {
                    name: {
                        "name": comp.name,
                        "priority": comp.priority.value,
                        "status": comp.status,
                        "last_execution": comp.last_execution.isoformat() if comp.last_execution else None,
                        "error_count": comp.error_count,
                        "success_count": comp.success_count,
                        "active": comp.active
                    }
                    for name, comp in self.components.items()
                },
                "statistics": self.statistics
            }
            
            with open(state_file, 'w') as f:
                json.dump(state_data, f, indent=2, default=str)
                
        except Exception as e:
            self.logger.error(f"State save error: {e}")

    async def generate_integration_report(self) -> Dict[str, Any]:
        """統合レポート生成"""
        uptime = (datetime.now() - self.statistics["integration_start_time"]).total_seconds()
        
        active_components = sum(1 for comp in self.components.values() if comp.active)
        total_successes = sum(comp.success_count for comp in self.components.values())
        total_errors = sum(comp.error_count for comp in self.components.values())
        
        return {
            "timestamp": datetime.now().isoformat(),
            "status": self.status.value,
            "emergency_mode": self.emergency_mode,
            "uptime_seconds": uptime,
            "uptime_formatted": str(timedelta(seconds=int(uptime))),
            "active_components": active_components,
            "total_components": len(self.components),
            "total_successes": total_successes,
            "total_errors": total_errors,
            "success_rate": total_successes / max(1, total_successes + total_errors),
            "statistics": self.statistics,
            "components_status": {
                name: {
                    "active": comp.active,
                    "status": comp.status,
                    "priority": comp.priority.value,
                    "success_count": comp.success_count,
                    "error_count": comp.error_count
                }
                for name, comp in self.components.items()
            }
        }

    async def main_integration_loop(self):
        """メイン統合制御ループ"""
        self.logger.critical("🎛️ STARTING INTEGRATION CONTROL LOOP")
        self.running = True
        self.status = IntegrationStatus.ACTIVE
        
        try:
            while self.running:
                loop_start = time.time()
                
                # 既存システム監視
                monitoring_data = await self.monitor_existing_systems()
                
                # システム活性化判定
                activation_decision = await self.decide_system_activation(monitoring_data)
                
                # 優先度に基づく実行
                if activation_decision["emergency_loop"] and not self.components["emergency_loop"].active:
                    await self.execute_emergency_mode()
                    
                elif activation_decision["realtime_controller"] and not self.components["realtime_controller"].active:
                    await self.execute_realtime_mode()
                    
                elif activation_decision["enhanced_repair"] and not self.components["enhanced_repair"].active:
                    await self.execute_enhanced_mode()
                
                # 統計更新
                self.statistics["total_github_errors_detected"] = monitoring_data.get("github_actions", {}).get("failed_runs", 0)
                
                # 状態保存
                if int(time.time()) % self.config["integration_save_interval"] == 0:
                    await self.save_integration_state()
                
                # 次のチェックまで待機
                loop_duration = time.time() - loop_start
                sleep_time = max(0, self.config["health_check_interval"] - loop_duration)
                
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                
        except KeyboardInterrupt:
            self.logger.critical("🛑 Integration loop interrupted")
        except Exception as e:
            self.logger.critical(f"💥 FATAL INTEGRATION ERROR: {e}")
            self.logger.debug(traceback.format_exc())
        finally:
            await self.shutdown()

    async def shutdown(self):
        """統合システム終了"""
        self.logger.critical("🛑 SHUTTING DOWN INTEGRATION CONTROLLER")
        self.running = False
        self.status = IntegrationStatus.SHUTDOWN
        
        # アクティブなコンポーネントの終了
        for name, component in self.components.items():
            if component.active:
                self.logger.info(f"Stopping component: {name}")
                component.active = False
                component.status = "stopped"
        
        # 最終状態保存
        await self.save_integration_state()
        
        # 最終レポート
        final_report = await self.generate_integration_report()
        self.logger.critical(f"📊 FINAL INTEGRATION REPORT:\n{json.dumps(final_report, indent=2, default=str)}")

    async def start(self):
        """統合制御開始"""
        await self.main_integration_loop()


async def main():
    """メイン実行"""
    print("=" * 100)
    print("🎛️ ITSM INTEGRATION CONTROLLER")
    print("🔄 COMPLETE SYSTEM INTEGRATION & ORCHESTRATION")
    print("🚨 Emergency + Realtime + Enhanced + Background Systems")
    print("📊 Loop 176: 528 Errors Fixed - Continuing Integration")
    print("🎯 Target: Complete GitHub Actions Error Resolution")
    print("=" * 100)
    
    controller = IntegrationController()
    
    try:
        await controller.start()
    except KeyboardInterrupt:
        print("\n🛑 Integration controller stopped by user")
    except Exception as e:
        print(f"💥 FATAL INTEGRATION ERROR: {e}")


if __name__ == "__main__":
    asyncio.run(main())