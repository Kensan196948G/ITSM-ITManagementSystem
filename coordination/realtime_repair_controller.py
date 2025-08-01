#!/usr/bin/env python3
"""
リアルタイム修復コントローラー
- GitHub Actions監視、エラーパターン分析、自動修復の統合制御
- エラー0件達成まで継続実行する制御システム 
- 修復履歴とパフォーマンス追跡によるインテリジェント制御
"""

import asyncio
import json
import logging
import signal
import sys
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any
import traceback

# ローカルモジュールのインポート
from github_actions_monitor import GitHubActionsMonitor
from error_pattern_analyzer import ErrorPatternAnalyzer
from auto_repair_engine import AutoRepairEngine

class RealtimeRepairController:
    def __init__(self):
        self.base_path = Path(__file__).parent
        self.project_root = self.base_path.parent
        
        # ログ設定
        self.setup_logging()
        
        # コンポーネント初期化
        self.github_monitor = GitHubActionsMonitor()
        self.pattern_analyzer = ErrorPatternAnalyzer()
        self.repair_engine = AutoRepairEngine()
        
        # 制御フラグ
        self.running = False
        self.repair_in_progress = False
        
        # 設定パラメータ
        self.config = {
            "check_interval": 30,  # 30秒間隔
            "max_repair_cycles": 10,  # 最大修復サイクル数
            "error_threshold": 0,  # エラー許容数
            "consecutive_clean_required": 3,  # 連続クリーンチェック要求数
            "repair_timeout": 1800,  # 修復タイムアウト（30分）
            "success_notification": True,
            "failure_notification": True
        }
        
        # 状態追跡
        self.state = {
            "start_time": None,
            "total_cycles": 0,
            "repair_cycles": 0,
            "consecutive_clean_checks": 0,
            "last_error_count": 0,
            "errors_detected": [],
            "repair_history": [],
            "current_status": "stopped"
        }
        
        # シグナルハンドラー設定
        self.setup_signal_handlers()
        
        self.logger.info("Realtime Repair Controller initialized")

    def setup_logging(self):
        """ログ設定"""
        log_file = self.base_path / "realtime_repair_controller.log"
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger("RealtimeRepairController")

    def setup_signal_handlers(self):
        """シグナルハンドラーの設定"""
        def signal_handler(signum, frame):
            self.logger.info(f"Received signal {signum}, shutting down gracefully...")
            self.stop()
        
        signal.signal(signal.SIGINT, signal_handler)
        signal.signal(signal.SIGTERM, signal_handler)

    async def check_github_actions_status(self) -> Dict[str, Any]:
        """GitHub Actionsの状況チェック"""
        try:
            # GitHub CLI認証確認
            if not await self.github_monitor.check_gh_auth():
                return {
                    "status": "error",
                    "message": "GitHub CLI not authenticated",
                    "errors": [],
                    "total_errors": 0
                }
            
            # ワークフロー実行を取得
            workflow_runs = await self.github_monitor.get_workflow_runs()
            
            if not workflow_runs:
                return {
                    "status": "no_runs",
                    "message": "No workflow runs found",
                    "errors": [],
                    "total_errors": 0
                }
            
            # 失敗したワークフローを分析
            failed_runs = [run for run in workflow_runs if run["conclusion"] == "failure"]
            in_progress_runs = [run for run in workflow_runs if run["status"] == "in_progress"]
            
            all_errors = []
            total_error_count = 0
            
            for run in failed_runs:
                run_id = run["id"]
                run_name = run["name"]
                
                # ログを取得して分析
                logs = await self.github_monitor.get_workflow_logs(str(run_id))
                if logs:
                    matches = self.pattern_analyzer.analyze_log_content(logs, f"workflow_{run_id}.log")
                    
                    for match in matches:
                        all_errors.append({
                            "workflow_id": run_id,
                            "workflow_name": run_name,
                            "pattern": match.pattern.name,
                            "category": match.pattern.category,
                            "severity": match.pattern.severity,
                            "confidence": match.confidence,
                            "matched_text": match.matched_text,
                            "line_number": match.line_number,
                            "auto_fixable": match.pattern.auto_fixable,
                            "timestamp": match.timestamp.isoformat()
                        })
                        total_error_count += 1
            
            return {
                "status": "success",
                "message": f"Found {len(failed_runs)} failed runs, {total_error_count} errors",
                "errors": all_errors,
                "total_errors": total_error_count,
                "failed_runs": len(failed_runs),
                "in_progress_runs": len(in_progress_runs),
                "workflow_runs": workflow_runs[:5]  # 最新5件のみ
            }
            
        except Exception as e:
            self.logger.error(f"Error checking GitHub Actions status: {e}")
            return {
                "status": "error",
                "message": str(e),
                "errors": [],
                "total_errors": 0
            }

    async def execute_repair_cycle(self, errors: List[Dict]) -> Dict[str, Any]:
        """修復サイクルを実行"""
        if self.repair_in_progress:
            return {
                "status": "skipped",
                "message": "Repair already in progress"
            }
        
        self.repair_in_progress = True
        repair_start_time = datetime.now()
        
        try:
            self.logger.info(f"🔧 Starting repair cycle for {len(errors)} errors")
            
            # エラーパターンから修復対象を決定
            error_patterns = [error["matched_text"] for error in errors]
            unique_patterns = list(set(error_patterns))
            
            # スマート修復実行
            repair_results = await self.repair_engine.smart_repair(unique_patterns)
            
            # 修復後の検証
            await asyncio.sleep(5)  # 修復完了を待機
            
            # 修復結果の分析
            total_actions = sum(len(category_results) for category_results in repair_results.values())
            successful_actions = sum(
                len([r for r in category_results if r.status.value == "success"])
                for category_results in repair_results.values()
            )
            
            success_rate = successful_actions / total_actions if total_actions > 0 else 0
            repair_duration = (datetime.now() - repair_start_time).total_seconds()
            
            # 修復履歴に記録
            repair_record = {
                "timestamp": repair_start_time.isoformat(),
                "duration": repair_duration,
                "errors_addressed": len(errors),
                "repair_actions": total_actions,
                "successful_actions": successful_actions,
                "success_rate": success_rate,
                "categories": list(repair_results.keys())
            }
            
            self.state["repair_history"].append(repair_record)
            self.state["repair_cycles"] += 1
            
            # 修復後にGitHub Actionsを再実行
            await self.trigger_github_actions_rerun()
            
            self.logger.info(f"✅ Repair cycle completed: {success_rate:.2%} success rate")
            
            return {
                "status": "completed",
                "message": f"Repair cycle completed with {success_rate:.2%} success rate",
                "repair_results": repair_results,
                "statistics": repair_record
            }
            
        except Exception as e:
            self.logger.error(f"Error in repair cycle: {e}")
            return {
                "status": "error",
                "message": str(e),
                "repair_results": {}
            }
        finally:
            self.repair_in_progress = False

    async def trigger_github_actions_rerun(self):
        """GitHub Actionsワークフローの再実行"""
        try:
            # 最新の失敗したワークフローを取得
            workflow_runs = await self.github_monitor.get_workflow_runs()
            failed_runs = [run for run in workflow_runs if run["conclusion"] == "failure"]
            
            if failed_runs:
                latest_failed = failed_runs[0]  # 最新の失敗したワークフロー
                run_id = str(latest_failed["id"])
                
                success = await self.github_monitor.trigger_workflow_rerun(run_id)
                if success:
                    self.logger.info(f"🔄 Triggered rerun for workflow {run_id}")
                else:
                    self.logger.warning(f"Failed to trigger rerun for workflow {run_id}")
        
        except Exception as e:
            self.logger.error(f"Error triggering workflow rerun: {e}")

    async def save_state(self):
        """現在の状態を保存"""
        state_file = self.base_path / "realtime_repair_state.json"
        
        current_state = {
            "timestamp": datetime.now().isoformat(),
            "config": self.config,
            "state": self.state,
            "uptime": (datetime.now() - self.state["start_time"]).total_seconds() if self.state["start_time"] else 0
        }
        
        with open(state_file, 'w') as f:
            json.dump(current_state, f, indent=2)

    async def generate_status_report(self) -> Dict[str, Any]:
        """ステータスレポートを生成"""
        uptime = (datetime.now() - self.state["start_time"]).total_seconds() if self.state["start_time"] else 0
        
        report = {
            "timestamp": datetime.now().isoformat(),
            "status": self.state["current_status"],
            "uptime_seconds": uptime,
            "uptime_formatted": str(timedelta(seconds=int(uptime))),
            "total_cycles": self.state["total_cycles"],
            "repair_cycles": self.state["repair_cycles"],
            "consecutive_clean_checks": self.state["consecutive_clean_checks"],
            "last_error_count": self.state["last_error_count"],
            "errors_detected_count": len(self.state["errors_detected"]),
            "repair_success_rate": self.calculate_repair_success_rate(),
            "config": self.config,
            "recent_repairs": self.state["repair_history"][-5:] if self.state["repair_history"] else []
        }
        
        return report

    def calculate_repair_success_rate(self) -> float:
        """修復成功率を計算"""
        if not self.state["repair_history"]:
            return 0.0
        
        total_success_rate = sum(record["success_rate"] for record in self.state["repair_history"])
        return total_success_rate / len(self.state["repair_history"])

    async def main_control_loop(self):
        """メイン制御ループ"""
        self.logger.info("🚀 Starting realtime repair control loop")
        self.running = True
        self.state["start_time"] = datetime.now()
        self.state["current_status"] = "monitoring"
        
        try:
            while self.running:
                cycle_start_time = datetime.now()
                self.state["total_cycles"] += 1
                
                self.logger.info(f"📊 Control cycle {self.state['total_cycles']} starting")
                
                try:
                    # GitHub Actionsの状況をチェック
                    actions_status = await self.check_github_actions_status()
                    
                    if actions_status["status"] == "error":
                        self.logger.error(f"GitHub Actions check failed: {actions_status['message']}")
                        await asyncio.sleep(60)  # エラー時は1分待機
                        continue
                    
                    total_errors = actions_status["total_errors"]
                    errors = actions_status["errors"]
                    
                    self.state["last_error_count"] = total_errors
                    self.state["errors_detected"] = errors
                    
                    if total_errors <= self.config["error_threshold"]:
                        # エラーなし - クリーンチェック
                        self.state["consecutive_clean_checks"] += 1
                        self.logger.info(f"✅ Clean check {self.state['consecutive_clean_checks']}/{self.config['consecutive_clean_required']}")
                        
                        if self.state["consecutive_clean_checks"] >= self.config["consecutive_clean_required"]:
                            # 成功達成！
                            self.logger.info("🎉 SUCCESS! No errors detected for required consecutive checks")
                            self.state["current_status"] = "success"
                            
                            if self.config["success_notification"]:
                                await self.send_success_notification()
                            
                            # 成功状態を保存
                            await self.save_state()
                            break  # ループ終了
                    else:
                        # エラー検出 - 修復実行
                        self.state["consecutive_clean_checks"] = 0
                        self.logger.warning(f"❌ Detected {total_errors} errors, starting repair cycle")
                        
                        if self.state["repair_cycles"] < self.config["max_repair_cycles"]:
                            self.state["current_status"] = "repairing"
                            repair_result = await self.execute_repair_cycle(errors)
                            
                            if repair_result["status"] == "completed":
                                self.logger.info("🔧 Repair cycle completed, waiting for verification")
                                # 修復後は少し長めに待機してからチェック
                                await asyncio.sleep(60)
                            else:
                                self.logger.error(f"Repair cycle failed: {repair_result['message']}")
                        else:
                            # 最大修復回数に達した
                            self.logger.error(f"❌ Maximum repair cycles ({self.config['max_repair_cycles']}) reached")
                            self.state["current_status"] = "max_repairs_reached"
                            
                            if self.config["failure_notification"]:
                                await self.send_failure_notification(total_errors, errors)
                            
                            break  # ループ終了
                    
                    # 状態を保存
                    await self.save_state()
                    
                    # 次のチェックまで待機
                    if self.running:
                        self.state["current_status"] = "monitoring"
                        await asyncio.sleep(self.config["check_interval"])
                
                except Exception as e:
                    self.logger.error(f"Error in control loop cycle: {e}")
                    self.logger.debug(traceback.format_exc())
                    await asyncio.sleep(60)  # エラー時は1分待機
                
                cycle_duration = (datetime.now() - cycle_start_time).total_seconds()
                self.logger.debug(f"Cycle {self.state['total_cycles']} completed in {cycle_duration:.2f}s")
        
        except KeyboardInterrupt:
            self.logger.info("Control loop interrupted by user")
        except Exception as e:
            self.logger.error(f"Fatal error in control loop: {e}")
            self.logger.debug(traceback.format_exc())
        finally:
            self.running = False
            self.state["current_status"] = "stopped"
            await self.save_state()
            self.logger.info("Control loop stopped")

    async def send_success_notification(self):
        """成功通知を送信"""
        self.logger.info("📧 Sending success notification")
        
        # 実際の通知実装（Slack、メール等）はここに追加
        success_message = f"""
🎉 ITSM Auto-Repair SUCCESS!

✅ All GitHub Actions errors have been resolved
📊 Total cycles: {self.state['total_cycles']}
🔧 Repair cycles: {self.state['repair_cycles']}
⏱️ Uptime: {str(timedelta(seconds=int((datetime.now() - self.state['start_time']).total_seconds())))}
📈 Repair success rate: {self.calculate_repair_success_rate():.2%}

The system will continue monitoring for new issues.
        """
        
        print(success_message)

    async def send_failure_notification(self, error_count: int, errors: List[Dict]):
        """失敗通知を送信"""
        self.logger.warning("📧 Sending failure notification")
        
        error_summary = {}
        for error in errors:
            category = error["category"]
            if category not in error_summary:
                error_summary[category] = 0
            error_summary[category] += 1
        
        failure_message = f"""
❌ ITSM Auto-Repair FAILED

🚨 Unable to resolve all errors after maximum repair attempts
📊 Remaining errors: {error_count}
🔧 Repair cycles attempted: {self.state['repair_cycles']}
⏱️ Total runtime: {str(timedelta(seconds=int((datetime.now() - self.state['start_time']).total_seconds())))}

Error breakdown:
{json.dumps(error_summary, indent=2)}

Manual intervention may be required.
        """
        
        print(failure_message)

    def stop(self):
        """制御ループを停止"""
        self.logger.info("Stopping realtime repair controller...")
        self.running = False

    async def start(self):
        """制御ループを開始"""
        await self.main_control_loop()


async def main():
    """メイン実行関数"""
    print("=" * 80)
    print("🤖 ITSM GitHub Actions Realtime Error Monitor & Auto-Repair System")
    print("🎯 Target: 0 errors with 3 consecutive clean checks")
    print("⚡ Real-time monitoring with 30-second intervals")  
    print("🔧 Automatic repair with smart pattern matching")
    print("🚀 Repository: Kensan196948G/ITSM-ITManagementSystem")
    print("=" * 80)
    
    controller = RealtimeRepairController()
    
    try:
        # 初期状態レポート
        initial_report = await controller.generate_status_report()
        print(f"📊 Initial Status: {json.dumps(initial_report, indent=2)}")
        
        # メイン制御ループ開始
        await controller.start()
        
        # 最終状態レポート
        final_report = await controller.generate_status_report()
        print(f"📊 Final Status: {json.dumps(final_report, indent=2)}")
        
    except KeyboardInterrupt:
        print("\n🛑 System stopped by user")
        controller.stop()
    except Exception as e:
        print(f"❌ Fatal system error: {e}")
        controller.stop()


if __name__ == "__main__":
    asyncio.run(main())