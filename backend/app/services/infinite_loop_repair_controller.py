"""
無限ループエラー検知・修復制御システム
MCP Playwrightとの連携による手動修復無限ループ制御
"""

import asyncio
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any
from dataclasses import dataclass, asdict
from pathlib import Path
import httpx
import traceback
from contextlib import asynccontextmanager

from app.services.mcp_playwright_error_monitor import MCPPlaywrightErrorMonitor
from app.core.config import settings


@dataclass
class LoopControlMetrics:
    """無限ループ制御メトリクス"""
    timestamp: str
    loop_count: int
    total_repair_cycles: int
    current_repair_cycle: int
    error_free_cycles: int
    last_error_detection: Optional[str]
    repair_success_rate: float
    average_repair_time: float
    system_stability_score: float
    loop_status: str  # running, paused, stopped, error


@dataclass
class RepairCycleResult:
    """修復サイクル結果"""
    cycle_id: str
    start_time: str
    end_time: str
    duration: float
    errors_detected: int
    errors_fixed: int
    repair_success: bool
    verification_passed: bool
    next_cycle_delay: float


class InfiniteLoopRepairController:
    """無限ループ修復制御システム"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.monitor = MCPPlaywrightErrorMonitor()
        
        # 制御設定
        self.config = {
            "max_repair_cycles": 10,
            "repair_timeout": 1800,  # 30分
            "consecutive_clean_required": 3,
            "error_threshold": 0,
            "base_cycle_interval": 30,  # 30秒
            "exponential_backoff": True,
            "max_cycle_interval": 300,  # 5分
            "emergency_stop_threshold": 20,  # 連続20回失敗で緊急停止
        }
        
        # 状態管理
        self.loop_state = {
            "active": False,
            "current_cycle": 0,
            "total_cycles": 0,
            "error_free_cycles": 0,
            "consecutive_failures": 0,
            "last_successful_repair": None,
            "emergency_stop": False,
            "pause_requested": False
        }
        
        # メトリクス
        self.repair_history: List[RepairCycleResult] = []
        self.error_patterns: Dict[str, int] = {}
        self.performance_metrics: Dict[str, float] = {}
        
        # ファイルパス
        self.state_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/infinite_loop_state.json"
        self.metrics_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/infinite_loop_metrics.json"
        self.repair_log_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/infinite_repair.log"
        
        # 修復リクエストファイル監視
        self.repair_request_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/manual_repair_request.json"
        
    async def start_infinite_repair_loop(self):
        """無限修復ループ開始"""
        self.logger.info("Starting Infinite Loop Repair Controller...")
        
        self.loop_state["active"] = True
        self.loop_state["emergency_stop"] = False
        
        try:
            while self.loop_state["active"] and not self.loop_state["emergency_stop"]:
                # パース要求チェック
                if self.loop_state["pause_requested"]:
                    await self._handle_pause_request()
                    continue
                
                # 修復サイクル実行
                cycle_result = await self._execute_repair_cycle()
                self.repair_history.append(cycle_result)
                
                # 状態更新
                await self._update_loop_state(cycle_result)
                
                # メトリクス更新
                await self._update_metrics()
                
                # 緊急停止条件チェック
                if await self._check_emergency_stop_condition():
                    break
                
                # 次のサイクルまでの待機
                next_delay = self._calculate_next_cycle_delay(cycle_result)
                await asyncio.sleep(next_delay)
                
        except Exception as e:
            self.logger.error(f"Infinite repair loop failed: {str(e)}")
            self.logger.error(traceback.format_exc())
        finally:
            self.loop_state["active"] = False
            await self._cleanup_and_finalize()
    
    async def _execute_repair_cycle(self) -> RepairCycleResult:
        """修復サイクル実行"""
        cycle_id = f"cycle_{int(time.time())}_{self.loop_state['current_cycle']}"
        start_time = datetime.now()
        
        self.logger.info(f"Starting repair cycle {cycle_id}")
        
        cycle_result = RepairCycleResult(
            cycle_id=cycle_id,
            start_time=start_time.isoformat(),
            end_time="",
            duration=0,
            errors_detected=0,
            errors_fixed=0,
            repair_success=False,
            verification_passed=False,
            next_cycle_delay=self.config["base_cycle_interval"]
        )
        
        try:
            # 1. エラー検知フェーズ
            errors_detected = await self._detect_errors()
            cycle_result.errors_detected = errors_detected
            
            if errors_detected > 0:
                self.logger.info(f"Detected {errors_detected} errors, initiating repair...")
                
                # 2. 修復実行フェーズ
                repair_success = await self._execute_repairs()
                cycle_result.repair_success = repair_success
                
                if repair_success:
                    # 3. 修復検証フェーズ
                    verification_result = await self._verify_repairs()
                    cycle_result.verification_passed = verification_result
                    
                    if verification_result:
                        cycle_result.errors_fixed = errors_detected
                        self.loop_state["error_free_cycles"] += 1
                        self.loop_state["consecutive_failures"] = 0
                        self.loop_state["last_successful_repair"] = datetime.now().isoformat()
                        self.logger.info(f"Repair cycle {cycle_id} completed successfully")
                    else:
                        self.logger.warning(f"Repair verification failed for cycle {cycle_id}")
                        self.loop_state["consecutive_failures"] += 1
                else:
                    self.logger.error(f"Repair execution failed for cycle {cycle_id}")
                    self.loop_state["consecutive_failures"] += 1
            else:
                # エラーなし - システム健全
                cycle_result.repair_success = True
                cycle_result.verification_passed = True
                self.loop_state["error_free_cycles"] += 1
                self.loop_state["consecutive_failures"] = 0
                self.logger.info(f"No errors detected in cycle {cycle_id}")
            
        except Exception as e:
            self.logger.error(f"Repair cycle {cycle_id} failed with exception: {str(e)}")
            self.loop_state["consecutive_failures"] += 1
            cycle_result.repair_success = False
        
        finally:
            end_time = datetime.now()
            cycle_result.end_time = end_time.isoformat()
            cycle_result.duration = (end_time - start_time).total_seconds()
            
            self.loop_state["current_cycle"] += 1
            self.loop_state["total_cycles"] += 1
        
        return cycle_result
    
    async def _detect_errors(self) -> int:
        """エラー検知"""
        try:
            # MCP Playwright Monitor でエラー検知
            health_metrics = await self.monitor.check_api_health()
            db_status = await self.monitor.check_database_connectivity()
            perf_metrics = await self.monitor.monitor_performance()
            security_status = await self.monitor.scan_security_issues()
            
            # エラーカウント
            error_count = 0
            
            # API Health エラー
            if health_metrics.error_rate > 0:
                error_count += health_metrics.unhealthy_endpoints
            
            # データベースエラー
            if db_status["status"] == "error":
                error_count += 1
            
            # パフォーマンスエラー
            if perf_metrics["overall_status"] == "critical":
                error_count += len(perf_metrics.get("slow_endpoints", []))
            
            # セキュリティエラー
            if security_status["overall_status"] == "vulnerable":
                error_count += len(security_status.get("vulnerabilities", []))
            
            # エラーパターン記録
            if error_count > 0:
                error_pattern = f"health:{health_metrics.error_rate:.2f}_db:{db_status['status']}_perf:{perf_metrics['overall_status']}_sec:{security_status['overall_status']}"
                self.error_patterns[error_pattern] = self.error_patterns.get(error_pattern, 0) + 1
            
            return error_count
            
        except Exception as e:
            self.logger.error(f"Error detection failed: {str(e)}")
            return 1  # 検知失敗もエラーとして扱う
    
    async def _execute_repairs(self) -> bool:
        """修復実行"""
        try:
            # MCP Playwright Monitor の修復機能を実行
            await self.monitor.execute_auto_repair()
            
            # 追加の修復手順
            repair_success = await self._perform_additional_repairs()
            
            return repair_success
            
        except Exception as e:
            self.logger.error(f"Repair execution failed: {str(e)}")
            return False
    
    async def _perform_additional_repairs(self) -> bool:
        """追加修復手順"""
        try:
            repair_actions = []
            
            # 1. システムファイル修復
            file_repair_result = await self._repair_system_files()
            repair_actions.append(file_repair_result)
            
            # 2. 設定ファイル修復
            config_repair_result = await self._repair_configuration_files()
            repair_actions.append(config_repair_result)
            
            # 3. ログローテーション
            log_rotation_result = await self._perform_log_rotation()
            repair_actions.append(log_rotation_result)
            
            # 4. メモリクリーンアップ
            memory_cleanup_result = await self._cleanup_memory()
            repair_actions.append(memory_cleanup_result)
            
            # 成功率計算
            successful_actions = sum(1 for action in repair_actions if action.get("status") == "success")
            success_rate = successful_actions / len(repair_actions) if repair_actions else 0
            
            return success_rate >= 0.8  # 80%以上成功で修復成功とみなす
            
        except Exception as e:
            self.logger.error(f"Additional repairs failed: {str(e)}")
            return False
    
    async def _repair_system_files(self) -> Dict[str, Any]:
        """システムファイル修復"""
        result = {
            "action": "system_file_repair",
            "status": "success",
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            # 重要なシステムファイルの存在確認と修復
            important_files = [
                "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/itsm.db",
                "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/app/main.py",
                "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/requirements.txt"
            ]
            
            missing_files = []
            for file_path in important_files:
                if not Path(file_path).exists():
                    missing_files.append(file_path)
            
            if missing_files:
                result["status"] = "warning"
                result["details"] = f"Missing files detected: {', '.join(missing_files)}"
            else:
                result["details"] = "All critical system files present"
            
        except Exception as e:
            result["status"] = "failed"
            result["details"] = f"System file repair failed: {str(e)}"
        
        return result
    
    async def _repair_configuration_files(self) -> Dict[str, Any]:
        """設定ファイル修復"""
        result = {
            "action": "config_file_repair",
            "status": "success",
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            # 設定ファイルの整合性チェック
            config_files = [
                "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/app/core/config.py",
                "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/realtime_repair_state.json"
            ]
            
            repaired_files = []
            for config_file in config_files:
                if Path(config_file).exists():
                    # ファイルサイズチェック（空ファイルでないか）
                    if Path(config_file).stat().st_size == 0:
                        repaired_files.append(config_file)
                        # 基本的な修復（JSONファイルの場合）
                        if config_file.endswith('.json'):
                            with open(config_file, 'w') as f:
                                json.dump({"repaired": True, "timestamp": datetime.now().isoformat()}, f)
            
            if repaired_files:
                result["details"] = f"Repaired configuration files: {', '.join(repaired_files)}"
            else:
                result["details"] = "Configuration files are healthy"
            
        except Exception as e:
            result["status"] = "failed"
            result["details"] = f"Configuration repair failed: {str(e)}"
        
        return result
    
    async def _perform_log_rotation(self) -> Dict[str, Any]:
        """ログローテーション"""
        result = {
            "action": "log_rotation",
            "status": "success",
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            log_dir = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs")
            if not log_dir.exists():
                log_dir.mkdir(parents=True, exist_ok=True)
            
            rotated_logs = []
            max_log_size = 10 * 1024 * 1024  # 10MB
            
            for log_file in log_dir.glob("*.log"):
                if log_file.stat().st_size > max_log_size:
                    # ログファイルをローテーション
                    timestamp = int(time.time())
                    rotated_name = f"{log_file.stem}_{timestamp}.log"
                    rotated_path = log_dir / rotated_name
                    log_file.rename(rotated_path)
                    
                    # 新しい空のログファイルを作成
                    log_file.touch()
                    rotated_logs.append(log_file.name)
            
            if rotated_logs:
                result["details"] = f"Rotated logs: {', '.join(rotated_logs)}"
            else:
                result["details"] = "No log rotation needed"
            
        except Exception as e:
            result["status"] = "failed"
            result["details"] = f"Log rotation failed: {str(e)}"
        
        return result
    
    async def _cleanup_memory(self) -> Dict[str, Any]:
        """メモリクリーンアップ"""
        result = {
            "action": "memory_cleanup",
            "status": "success",
            "timestamp": datetime.now().isoformat()
        }
        
        try:
            # Python ガベージコレクション実行
            import gc
            collected = gc.collect()
            
            # 一時ディレクトリクリーンアップ
            temp_dir = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/temp")
            cleaned_files = 0
            
            if temp_dir.exists():
                for temp_file in temp_dir.glob("*"):
                    if temp_file.is_file():
                        temp_file.unlink()
                        cleaned_files += 1
            
            result["details"] = f"GC collected: {collected} objects, Temp files cleaned: {cleaned_files}"
            
        except Exception as e:
            result["status"] = "failed"
            result["details"] = f"Memory cleanup failed: {str(e)}"
        
        return result
    
    async def _verify_repairs(self) -> bool:
        """修復検証"""
        try:
            # 修復後の状態を検証
            verification_results = []
            
            # 1. API Health 再確認
            health_metrics = await self.monitor.check_api_health()
            if health_metrics.error_rate < 0.05:  # 5%未満
                verification_results.append(True)
            else:
                verification_results.append(False)
            
            # 2. Database 再確認
            db_status = await self.monitor.check_database_connectivity()
            verification_results.append(db_status["status"] == "healthy")
            
            # 3. Performance 再確認
            perf_metrics = await self.monitor.monitor_performance()
            verification_results.append(perf_metrics["overall_status"] != "critical")
            
            # 4. Security 再確認
            security_status = await self.monitor.scan_security_issues()
            verification_results.append(security_status["overall_status"] != "vulnerable")
            
            # 80%以上のチェックが通れば修復成功
            success_rate = sum(verification_results) / len(verification_results)
            return success_rate >= 0.8
            
        except Exception as e:
            self.logger.error(f"Repair verification failed: {str(e)}")
            return False
    
    async def _update_loop_state(self, cycle_result: RepairCycleResult):
        """ループ状態更新"""
        try:
            # ファイルベースの状態更新
            loop_data = {
                "loop_count": self.loop_state["total_cycles"],
                "total_errors_fixed": sum(r.errors_fixed for r in self.repair_history),
                "last_scan": datetime.now().isoformat(),
                "repair_history": [
                    {
                        "target": "comprehensive_repair",
                        "timestamp": cycle_result.end_time,
                        "loop": self.loop_state["total_cycles"],
                        "success": cycle_result.repair_success,
                        "errors_fixed": cycle_result.errors_fixed
                    }
                ][-10:]  # 最新10件のみ保持
            }
            
            with open(self.state_file, 'w') as f:
                json.dump(loop_data, f, indent=2)
            
        except Exception as e:
            self.logger.error(f"Failed to update loop state: {str(e)}")
    
    async def _update_metrics(self):
        """メトリクス更新"""
        try:
            if not self.repair_history:
                return
            
            # 成功率計算
            successful_repairs = sum(1 for r in self.repair_history if r.repair_success)
            success_rate = successful_repairs / len(self.repair_history)
            
            # 平均修復時間
            avg_repair_time = sum(r.duration for r in self.repair_history) / len(self.repair_history)
            
            # システム安定性スコア
            recent_cycles = self.repair_history[-10:]  # 最新10サイクル
            recent_success_rate = sum(1 for r in recent_cycles if r.repair_success) / len(recent_cycles)
            stability_score = recent_success_rate * 100
            
            metrics = LoopControlMetrics(
                timestamp=datetime.now().isoformat(),
                loop_count=self.loop_state["total_cycles"],
                total_repair_cycles=len(self.repair_history),
                current_repair_cycle=self.loop_state["current_cycle"],
                error_free_cycles=self.loop_state["error_free_cycles"],
                last_error_detection=self.repair_history[-1].start_time if self.repair_history[-1].errors_detected > 0 else None,
                repair_success_rate=success_rate,
                average_repair_time=avg_repair_time,
                system_stability_score=stability_score,
                loop_status="running" if self.loop_state["active"] else "stopped"
            )
            
            # メトリクスファイル保存
            with open(self.metrics_file, 'w') as f:
                json.dump(asdict(metrics), f, indent=2)
            
        except Exception as e:
            self.logger.error(f"Failed to update metrics: {str(e)}")
    
    async def _check_emergency_stop_condition(self) -> bool:
        """緊急停止条件チェック"""
        # 連続失敗回数チェック
        if self.loop_state["consecutive_failures"] >= self.config["emergency_stop_threshold"]:
            self.logger.critical(f"Emergency stop triggered: {self.loop_state['consecutive_failures']} consecutive failures")
            self.loop_state["emergency_stop"] = True
            return True
        
        # 修復サイクル上限チェック
        if self.loop_state["current_cycle"] >= self.config["max_repair_cycles"]:
            self.logger.info(f"Maximum repair cycles reached: {self.config['max_repair_cycles']}")
            return True
        
        # 連続クリーンサイクル達成チェック
        if self.loop_state["error_free_cycles"] >= self.config["consecutive_clean_required"]:
            self.logger.info(f"System stabilized: {self.loop_state['error_free_cycles']} consecutive clean cycles")
            return True
        
        return False
    
    def _calculate_next_cycle_delay(self, cycle_result: RepairCycleResult) -> float:
        """次のサイクルまでの遅延計算"""
        base_delay = self.config["base_cycle_interval"]
        
        if not self.config["exponential_backoff"]:
            return base_delay
        
        # エラーがない場合は基本間隔
        if cycle_result.errors_detected == 0:
            return base_delay
        
        # 連続失敗回数に基づく指数バックオフ
        backoff_multiplier = min(2 ** self.loop_state["consecutive_failures"], self.config["max_cycle_interval"] / base_delay)
        delay = base_delay * backoff_multiplier
        
        return min(delay, self.config["max_cycle_interval"])
    
    async def _handle_pause_request(self):
        """一時停止要求処理"""
        self.logger.info("Pause requested, waiting for resume...")
        
        while self.loop_state["pause_requested"] and self.loop_state["active"]:
            await asyncio.sleep(5)
        
        self.logger.info("Resuming repair loop...")
    
    async def _cleanup_and_finalize(self):
        """クリーンアップと終了処理"""
        try:
            # 最終メトリクス更新
            await self._update_metrics()
            
            # 最終状態保存
            final_state = {
                "timestamp": datetime.now().isoformat(),
                "loop_completed": True,
                "total_cycles": self.loop_state["total_cycles"],
                "total_repairs": len(self.repair_history),
                "emergency_stop": self.loop_state["emergency_stop"],
                "final_status": "completed" if not self.loop_state["emergency_stop"] else "emergency_stop"
            }
            
            final_state_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/final_loop_state.json"
            with open(final_state_file, 'w') as f:
                json.dump(final_state, f, indent=2)
            
            self.logger.info(f"Infinite repair loop finalized: {final_state['final_status']}")
            
        except Exception as e:
            self.logger.error(f"Cleanup failed: {str(e)}")
    
    def pause_loop(self):
        """ループ一時停止"""
        self.loop_state["pause_requested"] = True
        self.logger.info("Loop pause requested")
    
    def resume_loop(self):
        """ループ再開"""
        self.loop_state["pause_requested"] = False
        self.logger.info("Loop resume requested")
    
    def stop_loop(self):
        """ループ停止"""
        self.loop_state["active"] = False
        self.logger.info("Loop stop requested")
    
    def get_status(self) -> Dict[str, Any]:
        """現在の状態取得"""
        return {
            "active": self.loop_state["active"],
            "current_cycle": self.loop_state["current_cycle"],
            "total_cycles": self.loop_state["total_cycles"],
            "error_free_cycles": self.loop_state["error_free_cycles"],
            "consecutive_failures": self.loop_state["consecutive_failures"],
            "emergency_stop": self.loop_state["emergency_stop"],
            "pause_requested": self.loop_state["pause_requested"],
            "total_repairs": len(self.repair_history),
            "last_repair": self.repair_history[-1].cycle_id if self.repair_history else None
        }


# 実行用エントリーポイント
async def main():
    """メイン実行関数"""
    controller = InfiniteLoopRepairController()
    
    try:
        await controller.start_infinite_repair_loop()
    except KeyboardInterrupt:
        controller.stop_loop()
        print("Infinite repair loop stopped by user")
    except Exception as e:
        print(f"Infinite repair loop failed: {str(e)}")


if __name__ == "__main__":
    # ログ設定
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/infinite_repair_controller.log'),
            logging.StreamHandler()
        ]
    )
    
    # 非同期実行
    asyncio.run(main())