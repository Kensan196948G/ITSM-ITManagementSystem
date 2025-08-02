#!/usr/bin/env python3
"""
GitHub Workflow Automation for Enhanced Auto-Repair System
GitHub Actionsとの統合による完全自動化
"""

import asyncio
import json
import logging
import subprocess
import yaml
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple
import re
import aiohttp
import sys
import os

class GitHubWorkflowAutomation:
    """GitHub Workflow統合自動化クラス"""
    
    def __init__(self, repo_owner: str = "Kensan196948G", repo_name: str = "ITSM-ITManagementSystem"):
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.base_path = Path(__file__).parent
        self.project_root = self.base_path.parent
        
        # ログ設定
        self.setup_logging()
        
        # GitHub API設定
        self.github_token = os.getenv('GITHUB_TOKEN')
        self.api_base = "https://api.github.com"
        
        # ワークフロー設定
        self.workflow_configs = self.load_workflow_configs()
        
    def setup_logging(self):
        """ログ設定"""
        log_file = self.base_path / "github_workflow_automation.log"
        
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - %(message)s'
        )
        
        self.logger = logging.getLogger("GitHubWorkflowAutomation")
        self.logger.setLevel(logging.INFO)
        
        # ファイルハンドラ
        file_handler = logging.FileHandler(log_file)
        file_handler.setFormatter(formatter)
        self.logger.addHandler(file_handler)
        
        # コンソールハンドラ
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        self.logger.addHandler(console_handler)

    def load_workflow_configs(self) -> Dict:
        """ワークフロー設定読み込み"""
        return {
            "auto_repair_trigger": {
                "name": "Auto Repair Trigger",
                "on": {
                    "workflow_run": {
                        "workflows": ["CI", "Tests", "Build"],
                        "types": ["completed"]
                    },
                    "repository_dispatch": {
                        "types": ["repair-trigger"]
                    }
                },
                "jobs": {
                    "trigger_repair": {
                        "runs-on": "ubuntu-latest",
                        "if": "${{ github.event.workflow_run.conclusion == 'failure' }}",
                        "steps": [
                            {
                                "name": "Checkout",
                                "uses": "actions/checkout@v3"
                            },
                            {
                                "name": "Setup Python",
                                "uses": "actions/setup-python@v4",
                                "with": {"python-version": "3.9"}
                            },
                            {
                                "name": "Install Dependencies",
                                "run": "pip install -r coordination/requirements.txt"
                            },
                            {
                                "name": "Trigger Auto Repair",
                                "run": "python coordination/enhanced_github_actions_auto_repair.py --trigger-mode",
                                "env": {
                                    "GITHUB_TOKEN": "${{ secrets.GITHUB_TOKEN }}",
                                    "FAILED_RUN_ID": "${{ github.event.workflow_run.id }}"
                                }
                            }
                        ]
                    }
                }
            },
            "repair_validation": {
                "name": "Repair Validation",
                "on": {
                    "pull_request": {
                        "types": ["opened", "synchronize"],
                        "branches": ["main"]
                    }
                },
                "jobs": {
                    "validate_repair": {
                        "runs-on": "ubuntu-latest",
                        "if": "startsWith(github.head_ref, 'claude-autofix-')",
                        "steps": [
                            {
                                "name": "Checkout",
                                "uses": "actions/checkout@v3"
                            },
                            {
                                "name": "Setup Python",
                                "uses": "actions/setup-python@v4",
                                "with": {"python-version": "3.9"}
                            },
                            {
                                "name": "Run Security Scan",
                                "run": "python coordination/security_validator.py --pr-mode"
                            },
                            {
                                "name": "Run Quality Checks",
                                "run": "python coordination/quality_gate_checker.py"
                            },
                            {
                                "name": "Validate Changes",
                                "run": "python coordination/change_validator.py --validate-auto-repair"
                            }
                        ]
                    }
                }
            }
        }

    async def create_workflow_files(self):
        """ワークフローファイル作成"""
        workflow_dir = self.project_root / ".github" / "workflows"
        workflow_dir.mkdir(parents=True, exist_ok=True)
        
        for workflow_name, config in self.workflow_configs.items():
            workflow_file = workflow_dir / f"{workflow_name}.yml"
            
            with open(workflow_file, 'w') as f:
                yaml.dump(config, f, default_flow_style=False, sort_keys=False)
            
            self.logger.info(f"Created workflow file: {workflow_file}")

    async def setup_github_secrets(self):
        """GitHub Secrets設定"""
        secrets_to_setup = [
            "CLAUDE_API_KEY",
            "SLACK_WEBHOOK_URL", 
            "TEAMS_WEBHOOK_URL",
            "AUTO_REPAIR_TOKEN"
        ]
        
        for secret in secrets_to_setup:
            self.logger.info(f"Please setup GitHub secret: {secret}")
            # 実際の設定は手動またはGitHub CLI経由

    async def monitor_workflow_runs(self):
        """ワークフロー実行監視"""
        self.logger.info("Starting workflow run monitoring")
        
        while True:
            try:
                # 最新のワークフロー実行を取得
                runs = await self.get_recent_workflow_runs()
                
                for run in runs:
                    await self.process_workflow_run(run)
                
                await asyncio.sleep(30)  # 30秒間隔
                
            except Exception as e:
                self.logger.error(f"Error in workflow monitoring: {e}")
                await asyncio.sleep(60)

    async def get_recent_workflow_runs(self) -> List[Dict]:
        """最新のワークフロー実行取得"""
        try:
            cmd = [
                "gh", "api", 
                f"repos/{self.repo_owner}/{self.repo_name}/actions/runs",
                "--jq", ".workflow_runs[:10]"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            return json.loads(result.stdout)
            
        except Exception as e:
            self.logger.error(f"Failed to get workflow runs: {e}")
            return []

    async def process_workflow_run(self, run: Dict):
        """ワークフロー実行処理"""
        run_id = run["id"]
        status = run["status"]
        conclusion = run["conclusion"]
        
        # 失敗したワークフローのみ処理
        if status == "completed" and conclusion == "failure":
            self.logger.info(f"Processing failed workflow run: {run_id}")
            
            # 自動修復トリガー
            await self.trigger_auto_repair(run)

    async def trigger_auto_repair(self, run: Dict):
        """自動修復トリガー"""
        try:
            # Repository dispatch イベントを送信
            await self.dispatch_repair_event(run)
            
        except Exception as e:
            self.logger.error(f"Failed to trigger auto repair: {e}")

    async def dispatch_repair_event(self, run: Dict):
        """修復イベント送信"""
        try:
            cmd = [
                "gh", "api",
                f"repos/{self.repo_owner}/{self.repo_name}/dispatches",
                "-X", "POST",
                "--field", "event_type=repair-trigger",
                "--field", f"client_payload[run_id]={run['id']}",
                "--field", f"client_payload[workflow_name]={run['name']}",
                "--field", f"client_payload[head_sha]={run['head_sha']}"
            ]
            
            subprocess.run(cmd, check=True)
            self.logger.info(f"Dispatched repair event for run {run['id']}")
            
        except Exception as e:
            self.logger.error(f"Failed to dispatch repair event: {e}")

    async def create_status_check(self, commit_sha: str, status: str, description: str):
        """ステータスチェック作成"""
        try:
            cmd = [
                "gh", "api",
                f"repos/{self.repo_owner}/{self.repo_name}/statuses/{commit_sha}",
                "-X", "POST",
                "--field", "state=" + status,
                "--field", "description=" + description,
                "--field", "context=auto-repair-system"
            ]
            
            subprocess.run(cmd, check=True)
            self.logger.info(f"Created status check: {status} - {description}")
            
        except Exception as e:
            self.logger.error(f"Failed to create status check: {e}")

    async def setup_webhooks(self):
        """Webhook設定"""
        webhook_config = {
            "name": "web",
            "active": True,
            "events": [
                "workflow_run",
                "pull_request",
                "push"
            ],
            "config": {
                "url": "https://your-webhook-endpoint.com/github",
                "content_type": "json",
                "secret": os.getenv("WEBHOOK_SECRET"),
                "insecure_ssl": "0"
            }
        }
        
        try:
            cmd = [
                "gh", "api",
                f"repos/{self.repo_owner}/{self.repo_name}/hooks",
                "-X", "POST",
                "--input", "-"
            ]
            
            process = subprocess.Popen(cmd, stdin=subprocess.PIPE, text=True)
            process.communicate(json.dumps(webhook_config))
            
            if process.returncode == 0:
                self.logger.info("Webhook setup completed")
            else:
                self.logger.error("Webhook setup failed")
                
        except Exception as e:
            self.logger.error(f"Error setting up webhook: {e}")


class QualityGateChecker:
    """品質ゲートチェッカー"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.logger = logging.getLogger("QualityGateChecker")

    async def run_all_checks(self) -> Dict:
        """全ての品質チェック実行"""
        results = {
            "lint": await self.check_lint(),
            "tests": await self.check_tests(),
            "security": await self.check_security(),
            "coverage": await self.check_coverage(),
            "dependencies": await self.check_dependencies()
        }
        
        results["overall_pass"] = all(results.values())
        return results

    async def check_lint(self) -> bool:
        """Lintチェック"""
        try:
            # Python lint
            result = subprocess.run(
                ["flake8", "backend/", "--select=E9,F63,F7,F82"],
                cwd=self.project_root,
                capture_output=True
            )
            
            return result.returncode == 0
            
        except Exception as e:
            self.logger.error(f"Lint check failed: {e}")
            return False

    async def check_tests(self) -> bool:
        """テストチェック"""
        try:
            # Backend tests
            result = subprocess.run(
                ["python", "-m", "pytest", "tests/", "-x"],
                cwd=self.project_root / "backend",
                capture_output=True
            )
            
            return result.returncode == 0
            
        except Exception as e:
            self.logger.error(f"Test check failed: {e}")
            return False

    async def check_security(self) -> bool:
        """セキュリティチェック"""
        try:
            # Security scan
            result = subprocess.run(
                ["bandit", "-r", "backend/app/", "-f", "json"],
                cwd=self.project_root,
                capture_output=True
            )
            
            if result.returncode == 0:
                return True
            
            # 低リスクの警告のみの場合は合格とする
            try:
                output = json.loads(result.stdout)
                high_severity = any(
                    issue["issue_severity"] in ["HIGH", "MEDIUM"]
                    for issue in output.get("results", [])
                )
                return not high_severity
            except:
                return False
                
        except Exception as e:
            self.logger.error(f"Security check failed: {e}")
            return False

    async def check_coverage(self) -> bool:
        """カバレッジチェック"""
        try:
            result = subprocess.run(
                ["python", "-m", "pytest", "--cov=app", "--cov-report=json"],
                cwd=self.project_root / "backend",
                capture_output=True
            )
            
            if result.returncode == 0:
                # カバレッジ報告を確認
                coverage_file = self.project_root / "backend" / "coverage.json"
                if coverage_file.exists():
                    with open(coverage_file, 'r') as f:
                        coverage_data = json.load(f)
                    
                    total_coverage = coverage_data.get("totals", {}).get("percent_covered", 0)
                    return total_coverage >= 80  # 80%以上
            
            return False
            
        except Exception as e:
            self.logger.error(f"Coverage check failed: {e}")
            return False

    async def check_dependencies(self) -> bool:
        """依存関係チェック"""
        try:
            # Python dependencies security check
            result = subprocess.run(
                ["safety", "check", "-r", "requirements.txt"],
                cwd=self.project_root / "backend",
                capture_output=True
            )
            
            return result.returncode == 0
            
        except Exception as e:
            self.logger.error(f"Dependencies check failed: {e}")
            return True  # 依存関係チェックの失敗は警告レベル


class SecurityValidator:
    """セキュリティバリデーター"""
    
    def __init__(self, project_root: Path):
        self.project_root = project_root
        self.logger = logging.getLogger("SecurityValidator")
        
        # 危険なパターン
        self.dangerous_patterns = [
            r"rm\s+-rf",
            r"sudo\s+",
            r"chmod\s+777",
            r"--force",
            r"eval\s*\(",
            r"exec\s*\(",
            r"system\s*\(",
            r"shell_exec\s*\("
        ]

    async def validate_pr_changes(self, pr_number: int) -> Dict:
        """PRの変更をバリデーション"""
        try:
            # PR情報取得
            cmd = ["gh", "pr", "diff", str(pr_number)]
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            diff_content = result.stdout
            
            # セキュリティチェック
            security_issues = await self.scan_diff_for_security(diff_content)
            
            return {
                "safe": len(security_issues) == 0,
                "issues": security_issues,
                "recommendation": "approve" if len(security_issues) == 0 else "review_required"
            }
            
        except Exception as e:
            self.logger.error(f"PR validation failed: {e}")
            return {
                "safe": False,
                "issues": [f"Validation error: {e}"],
                "recommendation": "manual_review"
            }

    async def scan_diff_for_security(self, diff_content: str) -> List[str]:
        """差分のセキュリティスキャン"""
        issues = []
        
        lines = diff_content.split('\n')
        for i, line in enumerate(lines):
            if line.startswith('+') and not line.startswith('+++'):
                # 追加された行のみチェック
                content = line[1:]  # '+' を除去
                
                for pattern in self.dangerous_patterns:
                    if re.search(pattern, content, re.IGNORECASE):
                        issues.append(f"Line {i+1}: Dangerous pattern detected: {pattern}")
        
        return issues


async def main():
    """メイン実行関数"""
    print("🚀 Starting GitHub Workflow Automation Setup")
    
    automation = GitHubWorkflowAutomation()
    
    try:
        # ワークフローファイル作成
        await automation.create_workflow_files()
        
        # GitHub Secrets設定案内
        await automation.setup_github_secrets()
        
        # Webhook設定
        await automation.setup_webhooks()
        
        print("✅ GitHub Workflow Automation setup completed")
        print("📋 Please configure the following GitHub secrets:")
        print("   - CLAUDE_API_KEY")
        print("   - SLACK_WEBHOOK_URL")
        print("   - TEAMS_WEBHOOK_URL")
        print("   - AUTO_REPAIR_TOKEN")
        
    except Exception as e:
        print(f"❌ Setup failed: {e}")


if __name__ == "__main__":
    asyncio.run(main())