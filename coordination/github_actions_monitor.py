#!/usr/bin/env python3
"""
GitHub Actions リアルタイムエラー監視と自動修復ループシステム
- GitHub Actions APIを使用してワークフロー状況を継続監視
- エラー検知から30秒以内の自動修復実行
- エラー0件達成まで継続的な修復ループ
"""

import asyncio
import json
import logging
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import re
import sys
import os

# プロジェクトルートを追加
sys.path.append(str(Path(__file__).parent.parent))

class GitHubActionsMonitor:
    def __init__(self, repo_owner: str = "Kensan196948G", repo_name: str = "ITSM-ITManagementSystem"):
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.base_path = Path(__file__).parent
        self.project_root = self.base_path.parent
        
        # ログ設定
        self.setup_logging()
        
        # 監視設定
        self.poll_interval = 30  # 30秒間隔
        self.max_repair_attempts = 5
        self.error_threshold = 0
        self.consecutive_clean_required = 3
        
        # 監視状態
        self.monitoring = False
        self.consecutive_clean_checks = 0
        self.repair_attempt_count = 0
        self.last_workflow_runs = {}
        
        # エラーパターン辞書
        self.error_patterns = self.load_error_patterns()
        
        # 修復アクション
        self.repair_actions = self.load_repair_actions()
        
        self.logger.info(f"GitHub Actions Monitor initialized for {repo_owner}/{repo_name}")

    def setup_logging(self):
        """ログ設定"""
        log_file = self.base_path / "github_actions_monitor.log"
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger("GitHubActionsMonitor")

    def load_error_patterns(self) -> Dict:
        """エラーパターンの定義"""
        return {
            "dependency_errors": {
                "patterns": [
                    r"ModuleNotFoundError: No module named",
                    r"ImportError: cannot import name",
                    r"npm ERR! Cannot resolve dependency",
                    r"pip.*not found",
                    r"Package .* not found",
                    r"requirements.*not satisfied"
                ],
                "severity": "high",
                "auto_fix": True
            },
            "test_failures": {
                "patterns": [
                    r"FAILED.*test_",
                    r"AssertionError",
                    r"Test.*failed",
                    r"ERROR.*pytest",
                    r"jest.*failed"
                ],
                "severity": "medium",
                "auto_fix": True
            },
            "build_errors": {
                "patterns": [
                    r"Build failed",
                    r"compilation error",
                    r"SyntaxError",
                    r"TypeError.*unexpected",
                    r"npm run build.*failed"
                ],
                "severity": "high",
                "auto_fix": True
            },
            "deployment_errors": {
                "patterns": [
                    r"deployment failed",
                    r"server.*not responding",
                    r"connection.*refused",
                    r"timeout.*deploy"
                ],
                "severity": "critical",
                "auto_fix": True
            },
            "config_errors": {
                "patterns": [
                    r"YAML.*syntax error",
                    r"Invalid.*configuration",
                    r"environment variable.*not set",
                    r"secret.*not found"
                ],
                "severity": "high",
                "auto_fix": True
            }
        }

    def load_repair_actions(self) -> Dict:
        """修復アクションの定義"""
        return {
            "dependency_errors": [
                "pip install -r requirements.txt",
                "npm ci",
                "pip install --upgrade pip",
                "npm install",
                "pip install -e ."
            ],
            "test_failures": [
                "python -m pytest tests/ --tb=short -v",
                "npm test -- --watchAll=false",
                "python -m pytest tests/unit/ -v",
                "python -m pytest tests/api/ -v"
            ],
            "build_errors": [
                "npm run build",
                "python -m py_compile backend/app/*.py",
                "flake8 backend/ --select=E9,F63,F7,F82",
                "npm run lint -- --fix"
            ],
            "deployment_errors": [
                "docker-compose restart",
                "systemctl restart nginx",
                "python backend/run.py &",
                "npm run preview"
            ],
            "config_errors": [
                "cp .env.example .env",
                "python -c \"import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))\"",
                "yamllint .github/workflows/",
                "echo 'DATABASE_URL=sqlite:///./test.db' >> .env"
            ]
        }

    async def check_gh_auth(self) -> bool:
        """GitHub CLI認証確認"""
        try:
            result = subprocess.run(["gh", "auth", "status"], 
                                  capture_output=True, text=True, check=False)
            if result.returncode == 0:
                return True
            else:
                self.logger.warning("GitHub CLI not authenticated")
                return False
        except Exception as e:
            self.logger.error(f"GitHub CLI check failed: {e}")
            return False

    async def get_workflow_runs(self) -> List[Dict]:
        """最新のワークフロー実行を取得"""
        try:
            cmd = [
                "gh", "api", 
                f"repos/{self.repo_owner}/{self.repo_name}/actions/runs",
                "--jq", ".workflow_runs[:10]"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            runs = json.loads(result.stdout)
            
            self.logger.debug(f"Retrieved {len(runs)} workflow runs")
            return runs
            
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Failed to get workflow runs: {e}")
            return []
        except Exception as e:
            self.logger.error(f"Error getting workflow runs: {e}")
            return []

    async def get_workflow_logs(self, run_id: str) -> str:
        """ワークフローログを取得"""
        try:
            cmd = ["gh", "api", f"repos/{self.repo_owner}/{self.repo_name}/actions/runs/{run_id}/logs"]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return result.stdout
        except Exception as e:
            self.logger.error(f"Failed to get logs for run {run_id}: {e}")
            return ""

    async def analyze_errors(self, logs: str) -> List[Dict]:
        """ログからエラーを分析"""
        errors = []
        
        for error_type, config in self.error_patterns.items():
            for pattern in config["patterns"]:
                matches = re.findall(pattern, logs, re.IGNORECASE | re.MULTILINE)
                if matches:
                    errors.append({
                        "type": error_type,
                        "pattern": pattern,
                        "matches": matches,
                        "severity": config["severity"],
                        "auto_fix": config["auto_fix"],
                        "count": len(matches)
                    })
        
        return errors

    async def execute_repair_action(self, action: str) -> Tuple[bool, str]:
        """修復アクションを実行"""
        try:
            self.logger.info(f"Executing repair action: {action}")
            
            # 作業ディレクトリを設定
            if action.startswith("npm"):
                cwd = self.project_root / "frontend"
            elif action.startswith("python") or action.startswith("pip"):
                cwd = self.project_root / "backend"
            else:
                cwd = self.project_root
            
            result = subprocess.run(
                action.split(),
                cwd=cwd,
                capture_output=True,
                text=True,
                timeout=300  # 5分タイムアウト
            )
            
            if result.returncode == 0:
                self.logger.info(f"Repair action successful: {action}")
                return True, result.stdout
            else:
                self.logger.warning(f"Repair action failed: {action} - {result.stderr}")
                return False, result.stderr
                
        except subprocess.TimeoutExpired:
            self.logger.error(f"Repair action timed out: {action}")
            return False, "Timeout"
        except Exception as e:
            self.logger.error(f"Error executing repair action {action}: {e}")
            return False, str(e)

    async def perform_auto_repair(self, errors: List[Dict]) -> bool:
        """自動修復実行"""
        self.logger.info(f"Starting auto-repair for {len(errors)} error types")
        
        repair_success = True
        
        for error in errors:
            if not error["auto_fix"]:
                continue
                
            error_type = error["type"]
            actions = self.repair_actions.get(error_type, [])
            
            self.logger.info(f"Repairing {error_type} with {len(actions)} actions")
            
            for action in actions:
                success, output = await self.execute_repair_action(action)
                if success:
                    self.logger.info(f"Repair successful for {error_type}: {action}")
                    break
                else:
                    self.logger.warning(f"Repair failed for {error_type}: {action}")
                    repair_success = False
        
        return repair_success

    async def trigger_workflow_rerun(self, run_id: str) -> bool:
        """ワークフローを再実行"""
        try:
            cmd = ["gh", "api", 
                   f"repos/{self.repo_owner}/{self.repo_name}/actions/runs/{run_id}/rerun", 
                   "-X", "POST"]
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            self.logger.info(f"Triggered rerun for workflow {run_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to trigger workflow rerun {run_id}: {e}")
            return False

    async def save_monitoring_status(self, status: Dict):
        """監視状況を保存"""
        status_file = self.base_path / "github_actions_status.json"
        
        status_data = {
            "timestamp": datetime.now().isoformat(),
            "monitoring": self.monitoring,
            "consecutive_clean_checks": self.consecutive_clean_checks,
            "repair_attempts": self.repair_attempt_count,
            "last_check": status.get("timestamp"),
            "total_errors": status.get("total_errors", 0),
            "error_types": status.get("error_types", {}),
            "status": "monitoring" if self.monitoring else "stopped"
        }
        
        with open(status_file, 'w') as f:
            json.dump(status_data, f, indent=2)

    async def monitor_loop(self):
        """メイン監視ループ"""
        self.logger.info("Starting GitHub Actions monitoring loop")
        self.monitoring = True
        
        while self.monitoring:
            try:
                # GitHub CLI認証確認
                if not await self.check_gh_auth():
                    self.logger.error("GitHub CLI not authenticated. Please run: gh auth login")
                    await asyncio.sleep(60)
                    continue
                
                # ワークフロー実行を取得
                workflow_runs = await self.get_workflow_runs()
                
                if not workflow_runs:
                    self.logger.warning("No workflow runs found")
                    await asyncio.sleep(self.poll_interval)
                    continue
                
                failed_runs = [run for run in workflow_runs if run["conclusion"] == "failure"]
                in_progress_runs = [run for run in workflow_runs if run["status"] == "in_progress"]
                
                self.logger.info(f"Found {len(failed_runs)} failed runs, {len(in_progress_runs)} in progress")
                
                total_errors = 0
                error_types = {}
                
                # 失敗したワークフローを分析
                for run in failed_runs:
                    run_id = run["id"]
                    run_name = run["name"]
                    
                    self.logger.info(f"Analyzing failed run: {run_name} (ID: {run_id})")
                    
                    # ログを取得して分析
                    logs = await self.get_workflow_logs(str(run_id))
                    if logs:
                        errors = await self.analyze_errors(logs)
                        
                        for error in errors:
                            error_type = error["type"]
                            if error_type not in error_types:
                                error_types[error_type] = 0
                            error_types[error_type] += error["count"]
                            total_errors += error["count"]
                        
                        # 自動修復実行
                        if errors and self.repair_attempt_count < self.max_repair_attempts:
                            self.logger.info(f"Starting auto-repair for run {run_id}")
                            self.repair_attempt_count += 1
                            
                            repair_success = await self.perform_auto_repair(errors)
                            
                            if repair_success:
                                # 修復成功時はワークフローを再実行
                                await self.trigger_workflow_rerun(str(run_id))
                                self.logger.info(f"Auto-repair completed, triggered rerun for {run_id}")
                            else:
                                self.logger.error(f"Auto-repair failed for run {run_id}")
                
                # 監視状況を更新
                status = {
                    "timestamp": datetime.now().isoformat(),
                    "total_errors": total_errors,
                    "error_types": error_types,
                    "failed_runs": len(failed_runs),
                    "in_progress_runs": len(in_progress_runs)
                }
                
                await self.save_monitoring_status(status)
                
                # エラー0件チェック
                if total_errors == 0 and len(failed_runs) == 0:
                    self.consecutive_clean_checks += 1
                    self.logger.info(f"Clean check {self.consecutive_clean_checks}/{self.consecutive_clean_required}")
                    
                    if self.consecutive_clean_checks >= self.consecutive_clean_required:
                        self.logger.info("🎉 Success! No errors detected for required consecutive checks")
                        # 成功状態を保存
                        status["status"] = "success"
                        status["message"] = "All errors resolved"
                        await self.save_monitoring_status(status)
                        break
                else:
                    self.consecutive_clean_checks = 0
                    self.logger.info(f"Errors detected: {total_errors} total, continuing monitoring")
                
                # 次のチェックまで待機
                await asyncio.sleep(self.poll_interval)
                
            except KeyboardInterrupt:
                self.logger.info("Monitoring interrupted by user")
                break
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(60)  # エラー時は1分待機
        
        self.monitoring = False
        self.logger.info("GitHub Actions monitoring stopped")

    async def start_monitoring(self):
        """監視開始"""
        await self.monitor_loop()

    def stop_monitoring(self):
        """監視停止"""
        self.monitoring = False


async def main():
    """メイン実行関数"""
    print("🚀 Starting GitHub Actions Real-time Error Monitor")
    print("📊 Repository: Kensan196948G/ITSM-ITManagementSystem")
    print("⏱️  Check interval: 30 seconds")
    print("🔄 Auto-repair: Enabled")
    print("🎯 Target: 0 errors with 3 consecutive clean checks")
    print("=" * 60)
    
    monitor = GitHubActionsMonitor()
    
    try:
        await monitor.start_monitoring()
    except KeyboardInterrupt:
        print("\n🛑 Monitoring stopped by user")
        monitor.stop_monitoring()
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        monitor.stop_monitoring()


if __name__ == "__main__":
    asyncio.run(main())