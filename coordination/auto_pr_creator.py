#!/usr/bin/env python3
"""
自動PR作成エンジン
- GitHub Actions エラー修復後の自動PR作成
- インテリジェントなコミットメッセージとPR説明文生成
- 修復履歴とテスト結果の統合
"""

import asyncio
import json
import logging
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Any, Tuple
import re
import os

class AutoPRCreator:
    """自動PR作成エンジン"""
    
    def __init__(self):
        self.base_path = Path(__file__).parent
        self.project_root = self.base_path.parent
        
        # ログ設定
        self.setup_logging()
        
        # PR作成統計
        self.pr_stats = {
            "total_prs_created": 0,
            "successful_prs": 0,
            "failed_prs": 0,
            "last_pr_created": None
        }
        
        # GitHub設定
        self.github_config = {
            "owner": "Kensan196948G",
            "repo": "ITSM-ITManagementSystem",
            "base_branch": "main"
        }
        
        self.logger.info("Auto PR Creator initialized")

    def setup_logging(self):
        """ログ設定"""
        log_file = self.base_path / "auto_pr_creator.log"
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger("AutoPRCreator")

    async def check_git_status(self) -> Dict[str, Any]:
        """Git状態チェック"""
        try:
            # Git statusをチェック
            result = subprocess.run(
                ["git", "status", "--porcelain"],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            if result.returncode == 0:
                changes = result.stdout.strip().split('\n') if result.stdout.strip() else []
                modified_files = []
                added_files = []
                deleted_files = []
                
                for change in changes:
                    if change:
                        status = change[:2]
                        filename = change[3:]
                        
                        if 'M' in status:
                            modified_files.append(filename)
                        elif 'A' in status:
                            added_files.append(filename)
                        elif 'D' in status:
                            deleted_files.append(filename)
                
                return {
                    "status": "success",
                    "has_changes": len(changes) > 0,
                    "total_changes": len(changes),
                    "modified_files": modified_files,
                    "added_files": added_files,
                    "deleted_files": deleted_files,
                    "all_changes": changes
                }
            else:
                return {
                    "status": "error",
                    "message": "Failed to check git status",
                    "error": result.stderr
                }
                
        except Exception as e:
            self.logger.error(f"Git status check failed: {e}")
            return {
                "status": "error",
                "message": str(e)
            }

    def generate_branch_name(self, repair_summary: Dict[str, Any]) -> str:
        """修復内容に基づくブランチ名生成"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # 修復カテゴリに基づくプレフィックス
        categories = repair_summary.get("categories", [])
        
        if "dependency" in categories:
            prefix = "fix/dependencies"
        elif "build" in categories:
            prefix = "fix/build"
        elif "test" in categories:
            prefix = "fix/tests"
        elif "database" in categories:
            prefix = "fix/database"
        else:
            prefix = "fix/automation"
        
        return f"{prefix}-{timestamp}"

    def generate_commit_message(self, repair_summary: Dict[str, Any], git_status: Dict[str, Any]) -> str:
        """インテリジェントなコミットメッセージ生成"""
        categories = repair_summary.get("categories", [])
        total_actions = repair_summary.get("total_actions", 0)
        success_rate = repair_summary.get("success_rate", 0)
        
        # メインアクションを決定
        if "dependency" in categories:
            main_action = "Fix dependency issues"
        elif "build" in categories:
            main_action = "Fix build errors"
        elif "test" in categories:
            main_action = "Fix test failures"
        elif "database" in categories:
            main_action = "Fix database configuration"
        else:
            main_action = "Apply automated fixes"
        
        # 詳細情報
        details = []
        if total_actions > 0:
            details.append(f"Applied {total_actions} repair actions")
        if success_rate > 0:
            details.append(f"Success rate: {success_rate:.1%}")
        
        # 変更されたファイル数
        total_changes = git_status.get("total_changes", 0)
        if total_changes > 0:
            details.append(f"Modified {total_changes} files")
        
        commit_message = f"{main_action}\n\n"
        
        if details:
            commit_message += "Changes:\n"
            for detail in details:
                commit_message += f"- {detail}\n"
            commit_message += "\n"
        
        # カテゴリ別の詳細
        if categories:
            commit_message += "Categories addressed:\n"
            for category in categories:
                commit_message += f"- {category}\n"
            commit_message += "\n"
        
        commit_message += "🤖 Generated with Claude Code\n"
        commit_message += "Co-Authored-By: Claude <noreply@anthropic.com>"
        
        return commit_message

    def generate_pr_description(self, repair_summary: Dict[str, Any], 
                              git_status: Dict[str, Any],
                              error_analysis: Optional[Dict[str, Any]] = None) -> str:
        """PR説明文生成"""
        description = "## 自動修復PR\n\n"
        description += "このPRは自動エラー検知・修復システムによって作成されました。\n\n"
        
        # 修復サマリー
        description += "### 修復サマリー\n\n"
        description += f"- **実行アクション数**: {repair_summary.get('total_actions', 0)}\n"
        description += f"- **成功アクション数**: {repair_summary.get('successful_actions', 0)}\n"
        description += f"- **成功率**: {repair_summary.get('success_rate', 0):.1%}\n"
        description += f"- **修復カテゴリ**: {', '.join(repair_summary.get('categories', []))}\n\n"
        
        # 変更ファイル
        if git_status.get("has_changes", False):
            description += "### 変更されたファイル\n\n"
            
            modified_files = git_status.get("modified_files", [])
            added_files = git_status.get("added_files", [])
            deleted_files = git_status.get("deleted_files", [])
            
            if modified_files:
                description += "**Modified:**\n"
                for file in modified_files[:10]:  # 最初の10ファイルのみ
                    description += f"- `{file}`\n"
                if len(modified_files) > 10:
                    description += f"- ... and {len(modified_files) - 10} more files\n"
                description += "\n"
            
            if added_files:
                description += "**Added:**\n"
                for file in added_files[:5]:
                    description += f"- `{file}`\n"
                if len(added_files) > 5:
                    description += f"- ... and {len(added_files) - 5} more files\n"
                description += "\n"
            
            if deleted_files:
                description += "**Deleted:**\n"
                for file in deleted_files[:5]:
                    description += f"- `{file}`\n"
                description += "\n"
        
        # エラー分析詳細
        if error_analysis:
            description += "### 検出されたエラーパターン\n\n"
            total_errors = error_analysis.get("total_errors", 0)
            auto_fixable = error_analysis.get("auto_fixable", 0)
            
            description += f"- **検出エラー数**: {total_errors}\n"
            description += f"- **自動修復可能**: {auto_fixable}\n"
            
            categories = error_analysis.get("categories", {})
            if categories:
                description += "\n**エラーカテゴリ別内訳:**\n"
                for category, count in categories.items():
                    description += f"- {category}: {count}\n"
        
        # テスト計画
        description += "\n### テスト計画\n\n"
        description += "- [ ] 自動テストスイートの実行\n"
        description += "- [ ] GitHub Actions ワークフローの確認\n"
        description += "- [ ] 依存関係の検証\n"
        description += "- [ ] ビルドプロセスの確認\n"
        description += "- [ ] 機能テストの実行\n\n"
        
        # 注意事項
        description += "### ⚠️ 注意事項\n\n"
        description += "この修復は自動化システムによって実行されました。\n"
        description += "マージ前に以下を確認してください：\n\n"
        description += "1. すべてのテストが通過していること\n"
        description += "2. 機能に悪影響がないこと\n"
        description += "3. セキュリティ上の問題がないこと\n\n"
        
        # フッター
        description += "---\n"
        description += f"🤖 Generated with [Claude Code](https://claude.ai/code) at {datetime.now().isoformat()}\n"
        description += f"🔧 Auto-repair system v1.0"
        
        return description

    async def create_branch(self, branch_name: str) -> Dict[str, Any]:
        """新しいブランチ作成"""
        try:
            # 現在のブランチを確認
            current_branch_result = subprocess.run(
                ["git", "branch", "--show-current"],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            current_branch = current_branch_result.stdout.strip()
            
            # ベースブランチにいることを確認
            if current_branch != self.github_config["base_branch"]:
                # ベースブランチに切り替え
                checkout_result = subprocess.run(
                    ["git", "checkout", self.github_config["base_branch"]],
                    capture_output=True,
                    text=True,
                    cwd=self.project_root
                )
                
                if checkout_result.returncode != 0:
                    return {
                        "status": "error",
                        "message": f"Failed to checkout {self.github_config['base_branch']}",
                        "error": checkout_result.stderr
                    }
            
            # 最新の変更を取得
            pull_result = subprocess.run(
                ["git", "pull", "origin", self.github_config["base_branch"]],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            # 新しいブランチ作成
            branch_result = subprocess.run(
                ["git", "checkout", "-b", branch_name],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            if branch_result.returncode == 0:
                return {
                    "status": "success",
                    "branch_name": branch_name,
                    "message": f"Successfully created branch {branch_name}"
                }
            else:
                return {
                    "status": "error",
                    "message": f"Failed to create branch {branch_name}",
                    "error": branch_result.stderr
                }
                
        except Exception as e:
            self.logger.error(f"Branch creation failed: {e}")
            return {
                "status": "error",
                "message": str(e)
            }

    async def commit_changes(self, commit_message: str) -> Dict[str, Any]:
        """変更をコミット"""
        try:
            # 全ての変更をステージング
            add_result = subprocess.run(
                ["git", "add", "."],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            if add_result.returncode != 0:
                return {
                    "status": "error",
                    "message": "Failed to stage changes",
                    "error": add_result.stderr
                }
            
            # コミット実行
            commit_result = subprocess.run(
                ["git", "commit", "-m", commit_message],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            if commit_result.returncode == 0:
                return {
                    "status": "success",
                    "message": "Changes committed successfully",
                    "output": commit_result.stdout
                }
            else:
                return {
                    "status": "error",
                    "message": "Failed to commit changes",
                    "error": commit_result.stderr
                }
                
        except Exception as e:
            self.logger.error(f"Commit failed: {e}")
            return {
                "status": "error",
                "message": str(e)
            }

    async def push_branch(self, branch_name: str) -> Dict[str, Any]:
        """ブランチをリモートにプッシュ"""
        try:
            push_result = subprocess.run(
                ["git", "push", "-u", "origin", branch_name],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            if push_result.returncode == 0:
                return {
                    "status": "success",
                    "message": f"Branch {branch_name} pushed successfully",
                    "output": push_result.stdout
                }
            else:
                return {
                    "status": "error",
                    "message": f"Failed to push branch {branch_name}",
                    "error": push_result.stderr
                }
                
        except Exception as e:
            self.logger.error(f"Push failed: {e}")
            return {
                "status": "error",
                "message": str(e)
            }

    async def create_pull_request(self, branch_name: str, pr_title: str, 
                                pr_description: str) -> Dict[str, Any]:
        """GitHub CLIを使用してPR作成"""
        try:
            # PR作成コマンド
            pr_command = [
                "gh", "pr", "create",
                "--title", pr_title,
                "--body", pr_description,
                "--base", self.github_config["base_branch"],
                "--head", branch_name
            ]
            
            pr_result = subprocess.run(
                pr_command,
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            if pr_result.returncode == 0:
                pr_url = pr_result.stdout.strip()
                return {
                    "status": "success",
                    "message": "Pull request created successfully",
                    "pr_url": pr_url,
                    "output": pr_result.stdout
                }
            else:
                return {
                    "status": "error",
                    "message": "Failed to create pull request",
                    "error": pr_result.stderr
                }
                
        except Exception as e:
            self.logger.error(f"PR creation failed: {e}")
            return {
                "status": "error",
                "message": str(e)
            }

    async def create_automated_pr(self, repair_summary: Dict[str, Any],
                                error_analysis: Optional[Dict[str, Any]] = None) -> Dict[str, Any]:
        """自動PR作成の完全フロー"""
        self.logger.info("🔄 Starting automated PR creation process")
        
        try:
            # Git状態確認
            git_status = await self.check_git_status()
            if git_status["status"] != "success":
                return git_status
            
            if not git_status.get("has_changes", False):
                return {
                    "status": "skipped",
                    "message": "No changes to commit"
                }
            
            # ブランチ名生成
            branch_name = self.generate_branch_name(repair_summary)
            
            # コミットメッセージ生成
            commit_message = self.generate_commit_message(repair_summary, git_status)
            
            # PR説明文生成
            pr_description = self.generate_pr_description(repair_summary, git_status, error_analysis)
            
            # PRタイトル生成
            categories = repair_summary.get("categories", [])
            if "dependency" in categories:
                pr_title = "🔧 Fix: Dependency and build issues"
            elif "test" in categories:
                pr_title = "🧪 Fix: Test failures and validation"
            elif "build" in categories:
                pr_title = "🏗️ Fix: Build and compilation errors"
            else:
                pr_title = "🤖 Fix: Automated error resolution"
            
            # ステップ1: ブランチ作成
            self.logger.info(f"Creating branch: {branch_name}")
            branch_result = await self.create_branch(branch_name)
            if branch_result["status"] != "success":
                return branch_result
            
            # ステップ2: 変更をコミット
            self.logger.info("Committing changes")
            commit_result = await self.commit_changes(commit_message)
            if commit_result["status"] != "success":
                return commit_result
            
            # ステップ3: ブランチをプッシュ
            self.logger.info(f"Pushing branch: {branch_name}")
            push_result = await self.push_branch(branch_name)
            if push_result["status"] != "success":
                return push_result
            
            # ステップ4: PR作成
            self.logger.info("Creating pull request")
            pr_result = await self.create_pull_request(branch_name, pr_title, pr_description)
            
            if pr_result["status"] == "success":
                # 統計更新
                self.pr_stats["total_prs_created"] += 1
                self.pr_stats["successful_prs"] += 1
                self.pr_stats["last_pr_created"] = datetime.now().isoformat()
                
                self.logger.info(f"✅ PR created successfully: {pr_result.get('pr_url', '')}")
                
                return {
                    "status": "success",
                    "message": "Automated PR created successfully",
                    "branch_name": branch_name,
                    "pr_url": pr_result.get("pr_url", ""),
                    "pr_title": pr_title,
                    "commit_message": commit_message,
                    "changes_summary": git_status
                }
            else:
                self.pr_stats["failed_prs"] += 1
                return pr_result
                
        except Exception as e:
            self.logger.error(f"Automated PR creation failed: {e}")
            self.pr_stats["failed_prs"] += 1
            return {
                "status": "error",
                "message": str(e)
            }

    def get_pr_statistics(self) -> Dict[str, Any]:
        """PR作成統計取得"""
        return self.pr_stats.copy()

    async def cleanup_old_branches(self, max_age_days: int = 7) -> Dict[str, Any]:
        """古い自動修復ブランチのクリーンアップ"""
        try:
            # ローカルブランチリスト取得
            branches_result = subprocess.run(
                ["git", "branch", "--format=%(refname:short)"],
                capture_output=True,
                text=True,
                cwd=self.project_root
            )
            
            if branches_result.returncode != 0:
                return {
                    "status": "error",
                    "message": "Failed to get branch list"
                }
            
            branches = branches_result.stdout.strip().split('\n')
            fix_branches = [b for b in branches if b.startswith('fix/')]
            
            deleted_branches = []
            cutoff_date = datetime.now() - timedelta(days=max_age_days)
            
            for branch in fix_branches:
                try:
                    # ブランチの最終コミット日時を確認
                    commit_date_result = subprocess.run(
                        ["git", "log", "-1", "--format=%ct", branch],
                        capture_output=True,
                        text=True,
                        cwd=self.project_root
                    )
                    
                    if commit_date_result.returncode == 0:
                        commit_timestamp = int(commit_date_result.stdout.strip())
                        commit_date = datetime.fromtimestamp(commit_timestamp)
                        
                        if commit_date < cutoff_date:
                            # 古いブランチを削除
                            delete_result = subprocess.run(
                                ["git", "branch", "-D", branch],
                                capture_output=True,
                                text=True,
                                cwd=self.project_root
                            )
                            
                            if delete_result.returncode == 0:
                                deleted_branches.append(branch)
                                self.logger.info(f"Deleted old branch: {branch}")
                
                except Exception as e:
                    self.logger.warning(f"Failed to process branch {branch}: {e}")
            
            return {
                "status": "success",
                "message": f"Cleaned up {len(deleted_branches)} old branches",
                "deleted_branches": deleted_branches
            }
            
        except Exception as e:
            self.logger.error(f"Branch cleanup failed: {e}")
            return {
                "status": "error",
                "message": str(e)
            }


async def main():
    """テスト実行"""
    pr_creator = AutoPRCreator()
    
    # テスト用の修復サマリー
    test_repair_summary = {
        "categories": ["dependency", "build"],
        "total_actions": 5,
        "successful_actions": 4,
        "success_rate": 0.8
    }
    
    test_error_analysis = {
        "total_errors": 3,
        "auto_fixable": 2,
        "categories": {
            "python_dependency": 2,
            "build": 1
        }
    }
    
    print("🧪 Testing Auto PR Creator...")
    
    # Git状態チェック
    git_status = await pr_creator.check_git_status()
    print(f"Git Status: {git_status}")
    
    # PR作成テスト（実際には作成しない）
    print("📝 Generated PR content preview:")
    commit_msg = pr_creator.generate_commit_message(test_repair_summary, git_status)
    print(f"Commit Message:\n{commit_msg}\n")
    
    pr_desc = pr_creator.generate_pr_description(test_repair_summary, git_status, test_error_analysis)
    print(f"PR Description:\n{pr_desc}")
    
    # 統計表示
    stats = pr_creator.get_pr_statistics()
    print(f"📊 PR Statistics: {stats}")


if __name__ == "__main__":
    asyncio.run(main())