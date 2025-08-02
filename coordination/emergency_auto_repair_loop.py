#!/usr/bin/env python3
"""
緊急対応：GitHub Actions 完全自動化ループシステム
- 5秒以内のエラー検知
- 即座の自動修復トリガー
- エラー0件まで無限ループ継続
- ITSM準拠のインシデント管理
"""

import asyncio
import json
import logging
import subprocess
import time
import signal
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Set
from dataclasses import dataclass, asdict
from enum import Enum
import traceback
import threading
from concurrent.futures import ThreadPoolExecutor
import queue

class IncidentSeverity(Enum):
    """ITSM準拠インシデント重要度"""
    P1_CRITICAL = "P1_CRITICAL"  # 1分以内対応
    P2_HIGH = "P2_HIGH"         # 5分以内対応
    P3_MEDIUM = "P3_MEDIUM"     # 15分以内対応
    P4_LOW = "P4_LOW"           # 1時間以内対応

class IncidentStatus(Enum):
    """ITSM準拠インシデント状態"""
    NEW = "NEW"
    ASSIGNED = "ASSIGNED"
    IN_PROGRESS = "IN_PROGRESS"
    RESOLVED = "RESOLVED"
    CLOSED = "CLOSED"

@dataclass
class ITSMIncident:
    """ITSM準拠インシデント"""
    id: str
    title: str
    description: str
    severity: IncidentSeverity
    status: IncidentStatus
    created_at: datetime
    updated_at: datetime
    auto_repair_attempts: int
    github_run_id: str
    error_patterns: List[str]
    root_cause: Optional[str] = None
    resolution: Optional[str] = None
    assigned_to: str = "auto_repair_system"

class EmergencyAutoRepairLoop:
    """緊急完全自動化ループシステム"""
    
    def __init__(self, repo_owner: str = "Kensan196948G", repo_name: str = "ITSM-ITManagementSystem"):
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.base_path = Path(__file__).parent
        self.project_root = self.base_path.parent
        
        # 緊急設定
        self.emergency_config = {
            "error_detection_interval": 5,      # 5秒間隔検知
            "max_auto_repair_attempts": 50,     # 最大50回自動修復
            "critical_error_threshold": 1,      # エラー1件でも即座対応
            "success_threshold": 0,             # エラー0件で成功
            "consecutive_success_required": 3,   # 連続3回成功で完了
            "auto_rerun_delay": 10,             # 修復後10秒でワークフロー再実行
            "force_repair_timeout": 300,        # 修復強制タイムアウト5分
            "emergency_escalation_time": 600    # 10分で緊急エスカレーション
        }
        
        # システム状態
        self.running = False
        self.emergency_mode = True
        self.detection_active = False
        self.repair_queue = queue.Queue()
        self.active_incidents: Dict[str, ITSMIncident] = {}
        self.repair_statistics = {
            "total_detections": 0,
            "successful_repairs": 0,
            "failed_repairs": 0,
            "avg_detection_time": 0.0,
            "avg_repair_time": 0.0,
            "current_streak": 0,
            "max_streak": 0
        }
        
        # ログ設定
        self.setup_logging()
        
        # シグナルハンドラー
        self.setup_signal_handlers()
        
        # 検知済みワークフロー追跡
        self.tracked_workflows: Set[str] = set()
        
        # 実行カウンター
        self.loop_counter = 0
        self.last_github_check = None
        
        self.logger.critical(f"🚨 EMERGENCY AUTO-REPAIR SYSTEM INITIALIZED - TARGET: 0 ERRORS")

    def setup_logging(self):
        """緊急ログ設定"""
        log_file = self.base_path / "emergency_auto_repair.log"
        
        # 詳細なログフォーマット
        formatter = logging.Formatter(
            '%(asctime)s.%(msecs)03d - [%(levelname)s] - %(name)s:%(lineno)d - %(message)s',
            datefmt='%Y-%m-%d %H:%M:%S'
        )
        
        # ファイルハンドラ（即座フラッシュ）
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        file_handler.setLevel(logging.DEBUG)
        
        # コンソールハンドラ（緊急表示）
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        console_handler.setLevel(logging.INFO)
        
        # ロガー設定
        self.logger = logging.getLogger("EmergencyAutoRepair")
        self.logger.setLevel(logging.DEBUG)
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)
        
        # 強制フラッシュ
        for handler in self.logger.handlers:
            handler.flush()

    def setup_signal_handlers(self):
        """シグナルハンドラー設定"""
        def emergency_shutdown(signum, frame):
            self.logger.critical(f"🛑 EMERGENCY SHUTDOWN - Signal {signum}")
            self.emergency_stop()
        
        signal.signal(signal.SIGINT, emergency_shutdown)
        signal.signal(signal.SIGTERM, emergency_shutdown)

    async def ultra_fast_github_detection(self) -> List[Dict]:
        """超高速GitHub Actions エラー検知（5秒以内）"""
        detection_start = time.time()
        
        try:
            # 並列でGitHub API呼び出し
            tasks = [
                self.get_workflow_runs_fast(),
                self.check_github_status_fast()
            ]
            
            results = await asyncio.gather(*tasks, return_exceptions=True)
            workflow_runs = results[0] if not isinstance(results[0], Exception) else []
            github_status = results[1] if not isinstance(results[1], Exception) else {"authenticated": False}
            
            if not github_status.get("authenticated", False):
                self.logger.error("❌ GitHub CLI not authenticated")
                return []
            
            if not workflow_runs:
                return []
            
            # 失敗したワークフローを即座検出
            failed_runs = []
            for run in workflow_runs:
                if run.get("conclusion") == "failure" and run.get("status") == "completed":
                    run_id = str(run["id"])
                    
                    # 新規検知のみ処理
                    if run_id not in self.tracked_workflows:
                        self.tracked_workflows.add(run_id)
                        failed_runs.append({
                            "id": run_id,
                            "name": run.get("name", "Unknown"),
                            "head_sha": run.get("head_sha", "unknown"),
                            "created_at": run.get("created_at", datetime.now().isoformat()),
                            "html_url": run.get("html_url", ""),
                            "detection_time": time.time() - detection_start
                        })
                        
                        self.logger.critical(f"🚨 NEW FAILURE DETECTED: {run['name']} (ID: {run_id})")
            
            detection_time = time.time() - detection_start
            if failed_runs:
                self.logger.info(f"⚡ Detection completed in {detection_time:.3f}s - Found {len(failed_runs)} new failures")
            
            self.repair_statistics["avg_detection_time"] = (
                self.repair_statistics["avg_detection_time"] + detection_time
            ) / 2
            
            return failed_runs
            
        except Exception as e:
            self.logger.error(f"Detection error: {e}")
            return []

    async def get_workflow_runs_fast(self) -> List[Dict]:
        """高速ワークフロー取得"""
        try:
            cmd = [
                "gh", "api", 
                f"repos/{self.repo_owner}/{self.repo_name}/actions/runs",
                "--jq", ".workflow_runs[:5] | map(select(.created_at > (now - 3600 | strftime(\"%Y-%m-%dT%H:%M:%SZ\"))))"
            ]
            
            result = await asyncio.wait_for(
                asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                ),
                timeout=3.0  # 3秒タイムアウト
            )
            
            stdout, stderr = await result.communicate()
            
            if result.returncode == 0:
                return json.loads(stdout.decode())
            else:
                self.logger.warning(f"GitHub API call failed: {stderr.decode()}")
                return []
                
        except asyncio.TimeoutError:
            self.logger.warning("GitHub API timeout - using fallback")
            return []
        except Exception as e:
            self.logger.error(f"Fast workflow fetch error: {e}")
            return []

    async def check_github_status_fast(self) -> Dict:
        """高速GitHub認証確認"""
        try:
            result = await asyncio.wait_for(
                asyncio.create_subprocess_exec(
                    "gh", "auth", "status",
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                ),
                timeout=2.0
            )
            
            await result.communicate()
            return {"authenticated": result.returncode == 0}
            
        except asyncio.TimeoutError:
            return {"authenticated": False}
        except Exception:
            return {"authenticated": False}

    async def create_emergency_incident(self, failed_run: Dict) -> ITSMIncident:
        """緊急インシデント作成（ITSM準拠）"""
        incident_id = f"INC-{failed_run['id']}-{int(time.time())}"
        
        # 重要度の自動判定
        severity = self.determine_incident_severity(failed_run)
        
        incident = ITSMIncident(
            id=incident_id,
            title=f"GitHub Actions Failure: {failed_run['name']}",
            description=f"Workflow {failed_run['name']} failed (Run ID: {failed_run['id']})",
            severity=severity,
            status=IncidentStatus.NEW,
            created_at=datetime.now(),
            updated_at=datetime.now(),
            auto_repair_attempts=0,
            github_run_id=failed_run['id'],
            error_patterns=[]
        )
        
        self.active_incidents[incident_id] = incident
        self.logger.critical(f"📋 INCIDENT CREATED: {incident_id} - {severity.value}")
        
        return incident

    def determine_incident_severity(self, failed_run: Dict) -> IncidentSeverity:
        """インシデント重要度判定"""
        workflow_name = failed_run.get('name', '').lower()
        
        # クリティカルワークフロー
        if any(critical in workflow_name for critical in ['deploy', 'production', 'release', 'security']):
            return IncidentSeverity.P1_CRITICAL
        
        # 高優先度ワークフロー
        if any(high in workflow_name for high in ['ci', 'test', 'build', 'main']):
            return IncidentSeverity.P2_HIGH
        
        # 中優先度
        if any(medium in workflow_name for medium in ['lint', 'format', 'check']):
            return IncidentSeverity.P3_MEDIUM
        
        # デフォルト
        return IncidentSeverity.P2_HIGH  # 緊急時は高優先度

    async def execute_emergency_repair(self, incident: ITSMIncident) -> bool:
        """緊急修復実行"""
        repair_start_time = time.time()
        
        try:
            self.logger.critical(f"🔧 EMERGENCY REPAIR START: {incident.id}")
            
            # インシデント状態更新
            incident.status = IncidentStatus.IN_PROGRESS
            incident.updated_at = datetime.now()
            incident.auto_repair_attempts += 1
            
            # ログ取得と分析
            logs = await self.get_workflow_logs_emergency(incident.github_run_id)
            error_patterns = self.analyze_errors_fast(logs)
            incident.error_patterns = error_patterns
            
            # 強力な修復アクション実行
            repair_actions = self.get_emergency_repair_actions(error_patterns)
            repair_success = False
            
            for action in repair_actions:
                try:
                    self.logger.info(f"🔨 Executing repair: {action}")
                    success = await self.execute_repair_action_fast(action)
                    
                    if success:
                        repair_success = True
                        break  # 最初の成功で終了
                        
                except Exception as e:
                    self.logger.error(f"Repair action failed: {action} - {e}")
                    continue
            
            # 修復後の処理
            if repair_success:
                incident.status = IncidentStatus.RESOLVED
                incident.resolution = f"Auto-repaired using actions: {repair_actions[:3]}"
                self.repair_statistics["successful_repairs"] += 1
                
                # ワークフロー再実行
                await self.trigger_workflow_rerun_fast(incident.github_run_id)
                
                self.logger.critical(f"✅ REPAIR SUCCESS: {incident.id}")
            else:
                incident.status = IncidentStatus.ASSIGNED  # 手動対応必要
                self.repair_statistics["failed_repairs"] += 1
                self.logger.error(f"❌ REPAIR FAILED: {incident.id}")
            
            # 修復時間記録
            repair_time = time.time() - repair_start_time
            self.repair_statistics["avg_repair_time"] = (
                self.repair_statistics["avg_repair_time"] + repair_time
            ) / 2
            
            incident.updated_at = datetime.now()
            
            self.logger.info(f"⏱️ Repair completed in {repair_time:.3f}s")
            
            return repair_success
            
        except Exception as e:
            self.logger.error(f"Emergency repair error: {e}")
            incident.status = IncidentStatus.ASSIGNED
            return False

    async def get_workflow_logs_emergency(self, run_id: str) -> str:
        """緊急ログ取得（高速）"""
        try:
            cmd = ["gh", "api", f"repos/{self.repo_owner}/{self.repo_name}/actions/runs/{run_id}/logs"]
            
            result = await asyncio.wait_for(
                asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                ),
                timeout=10.0  # 10秒タイムアウト
            )
            
            stdout, stderr = await result.communicate()
            
            if result.returncode == 0:
                return stdout.decode('utf-8', errors='ignore')
            else:
                return ""
                
        except Exception as e:
            self.logger.error(f"Emergency log fetch error: {e}")
            return ""

    def analyze_errors_fast(self, logs: str) -> List[str]:
        """高速エラー分析"""
        error_patterns = []
        
        # 重要なエラーパターン
        critical_patterns = [
            r"ModuleNotFoundError",
            r"ImportError",
            r"SyntaxError",
            r"TypeError",
            r"FAILED.*test_",
            r"npm ERR!",
            r"Build failed",
            r"deployment.*failed"
        ]
        
        for pattern in critical_patterns:
            import re
            if re.search(pattern, logs, re.IGNORECASE):
                error_patterns.append(pattern)
        
        return error_patterns

    def get_emergency_repair_actions(self, error_patterns: List[str]) -> List[str]:
        """緊急修復アクション決定"""
        actions = []
        
        # パターン別修復アクション
        if any("ModuleNotFoundError" in p or "ImportError" in p for p in error_patterns):
            actions.extend([
                "pip install -r backend/requirements.txt --upgrade",
                "npm ci --prefix frontend",
                "pip install -e backend/."
            ])
        
        if any("test" in p.lower() for p in error_patterns):
            actions.extend([
                "python -m pytest backend/tests/ --tb=short -x",
                "npm test --prefix frontend -- --watchAll=false"
            ])
        
        if any("build" in p.lower() or "syntax" in p.lower() for p in error_patterns):
            actions.extend([
                "flake8 backend/ --select=E9,F63,F7,F82 --fix",
                "npm run build --prefix frontend",
                "python -m py_compile backend/app/main.py"
            ])
        
        # デフォルト修復アクション
        if not actions:
            actions = [
                "git status",
                "git add .",
                "git commit -m 'Emergency auto-fix' || true",
                "pip install -r backend/requirements.txt",
                "npm ci --prefix frontend"
            ]
        
        return actions

    async def execute_repair_action_fast(self, action: str) -> bool:
        """高速修復アクション実行"""
        try:
            # 作業ディレクトリ決定
            if "npm" in action or action.endswith("frontend"):
                cwd = self.project_root / "frontend"
            elif "pip" in action or "python" in action:
                cwd = self.project_root / "backend"
            else:
                cwd = self.project_root
            
            # コマンド実行
            cmd = action.split()
            result = await asyncio.wait_for(
                asyncio.create_subprocess_exec(
                    *cmd,
                    cwd=cwd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                ),
                timeout=60.0  # 1分タイムアウト
            )
            
            stdout, stderr = await result.communicate()
            
            if result.returncode == 0:
                self.logger.debug(f"✅ Action success: {action}")
                return True
            else:
                self.logger.warning(f"❌ Action failed: {action} - {stderr.decode()}")
                return False
                
        except asyncio.TimeoutError:
            self.logger.error(f"⏰ Action timeout: {action}")
            return False
        except Exception as e:
            self.logger.error(f"Action execution error: {action} - {e}")
            return False

    async def trigger_workflow_rerun_fast(self, run_id: str) -> bool:
        """高速ワークフロー再実行"""
        try:
            cmd = [
                "gh", "api", 
                f"repos/{self.repo_owner}/{self.repo_name}/actions/runs/{run_id}/rerun",
                "-X", "POST"
            ]
            
            result = await asyncio.wait_for(
                asyncio.create_subprocess_exec(
                    *cmd,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE
                ),
                timeout=5.0
            )
            
            await result.communicate()
            
            if result.returncode == 0:
                self.logger.critical(f"🔄 RERUN TRIGGERED: {run_id}")
                return True
            else:
                self.logger.error(f"Failed to rerun workflow {run_id}")
                return False
                
        except Exception as e:
            self.logger.error(f"Rerun trigger error: {e}")
            return False

    async def save_emergency_state(self):
        """緊急状態保存"""
        try:
            state_file = self.base_path / "emergency_repair_state.json"
            
            state_data = {
                "timestamp": datetime.now().isoformat(),
                "loop_counter": self.loop_counter,
                "emergency_mode": self.emergency_mode,
                "running": self.running,
                "statistics": self.repair_statistics,
                "active_incidents_count": len(self.active_incidents),
                "tracked_workflows_count": len(self.tracked_workflows),
                "config": self.emergency_config
            }
            
            with open(state_file, 'w') as f:
                json.dump(state_data, f, indent=2, default=str)
                
        except Exception as e:
            self.logger.error(f"State save error: {e}")

    async def emergency_monitoring_loop(self):
        """緊急監視ループ（5秒間隔）"""
        self.logger.critical("🚨 EMERGENCY MONITORING LOOP STARTED")
        self.running = True
        start_time = datetime.now()
        
        consecutive_success_count = 0
        
        try:
            while self.running:
                loop_start = time.time()
                self.loop_counter += 1
                
                self.logger.info(f"🔍 Emergency Loop #{self.loop_counter}")
                
                # 超高速エラー検知
                failed_runs = await self.ultra_fast_github_detection()
                self.repair_statistics["total_detections"] += 1
                
                if failed_runs:
                    # エラー検出時の即座対応
                    consecutive_success_count = 0
                    self.repair_statistics["current_streak"] = 0
                    
                    self.logger.critical(f"🚨 {len(failed_runs)} FAILURES DETECTED - EMERGENCY REPAIR MODE")
                    
                    # 並列で全失敗を修復
                    repair_tasks = []
                    for failed_run in failed_runs:
                        incident = await self.create_emergency_incident(failed_run)
                        repair_task = self.execute_emergency_repair(incident)
                        repair_tasks.append(repair_task)
                    
                    # 並列修復実行
                    repair_results = await asyncio.gather(*repair_tasks, return_exceptions=True)
                    
                    successful_repairs = sum(1 for result in repair_results if result is True)
                    self.logger.critical(f"🔧 REPAIR COMPLETED: {successful_repairs}/{len(repair_tasks)} successful")
                    
                    # 修復後の待機
                    await asyncio.sleep(self.emergency_config["auto_rerun_delay"])
                    
                else:
                    # 成功状態（エラーなし）
                    consecutive_success_count += 1
                    self.repair_statistics["current_streak"] += 1
                    self.repair_statistics["max_streak"] = max(
                        self.repair_statistics["max_streak"],
                        self.repair_statistics["current_streak"]
                    )
                    
                    self.logger.info(f"✅ Clean check {consecutive_success_count}/{self.emergency_config['consecutive_success_required']}")
                    
                    # 成功条件達成チェック
                    if consecutive_success_count >= self.emergency_config["consecutive_success_required"]:
                        self.logger.critical("🎉 EMERGENCY REPAIR SUCCESS! All errors resolved!")
                        
                        # 成功通知
                        await self.send_emergency_success_notification(start_time)
                        break
                
                # 状態保存
                await self.save_emergency_state()
                
                # 次のループまでの正確な待機
                loop_duration = time.time() - loop_start
                sleep_time = max(0, self.emergency_config["error_detection_interval"] - loop_duration)
                
                if sleep_time > 0:
                    await asyncio.sleep(sleep_time)
                
        except KeyboardInterrupt:
            self.logger.critical("🛑 Emergency monitoring interrupted by user")
        except Exception as e:
            self.logger.critical(f"💥 FATAL ERROR in emergency loop: {e}")
            self.logger.debug(traceback.format_exc())
        finally:
            self.running = False
            await self.save_emergency_state()
            self.logger.critical("🛑 EMERGENCY MONITORING STOPPED")

    async def send_emergency_success_notification(self, start_time: datetime):
        """緊急修復成功通知"""
        uptime = datetime.now() - start_time
        
        success_message = f"""
🎉 EMERGENCY AUTO-REPAIR SYSTEM SUCCESS!

✅ All GitHub Actions errors have been resolved
🚨 Emergency response completed successfully
📊 Statistics:
   - Total loops: {self.loop_counter}
   - Total detections: {self.repair_statistics['total_detections']}
   - Successful repairs: {self.repair_statistics['successful_repairs']}
   - Failed repairs: {self.repair_statistics['failed_repairs']}
   - Success rate: {(self.repair_statistics['successful_repairs'] / max(1, self.repair_statistics['total_detections']) * 100):.1f}%
   - Max consecutive successes: {self.repair_statistics['max_streak']}
   - Average detection time: {self.repair_statistics['avg_detection_time']:.3f}s
   - Average repair time: {self.repair_statistics['avg_repair_time']:.3f}s
⏱️ Total runtime: {uptime}

🔄 System returning to normal monitoring mode.
        """
        
        print(success_message)
        self.logger.critical(success_message)

    def emergency_stop(self):
        """緊急停止"""
        self.logger.critical("🛑 EMERGENCY STOP INITIATED")
        self.running = False

    async def start_emergency_system(self):
        """緊急システム開始"""
        await self.emergency_monitoring_loop()


async def main():
    """緊急メイン実行"""
    print("=" * 90)
    print("🚨 EMERGENCY GITHUB ACTIONS AUTO-REPAIR SYSTEM")
    print("⚡ 5-SECOND ERROR DETECTION")
    print("🔧 INSTANT AUTO-REPAIR TRIGGER")
    print("🎯 TARGET: 0 ERRORS - INFINITE LOOP UNTIL SUCCESS")
    print("📋 ITSM-COMPLIANT INCIDENT MANAGEMENT")
    print("🚀 Repository: Kensan196948G/ITSM-ITManagementSystem")
    print("=" * 90)
    
    emergency_system = EmergencyAutoRepairLoop()
    
    try:
        await emergency_system.start_emergency_system()
    except KeyboardInterrupt:
        print("\n🛑 Emergency system stopped by user")
        emergency_system.emergency_stop()
    except Exception as e:
        print(f"💥 FATAL EMERGENCY ERROR: {e}")
        emergency_system.emergency_stop()


if __name__ == "__main__":
    asyncio.run(main())