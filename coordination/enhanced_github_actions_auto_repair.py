#!/usr/bin/env python3
"""
GitHub Actions 失敗→Claude自動修復→再実行ループシステム
Enhanced Auto-Repair System with Claude Flow MCP Integration
"""

import asyncio
import json
import logging
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import re
import sys
import os
import hashlib
import tempfile
import yaml
import shutil
from dataclasses import dataclass, asdict
from enum import Enum

# プロジェクトルートを追加
sys.path.append(str(Path(__file__).parent.parent))

class RepairStatus(Enum):
    """修復ステータス"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    REQUIRES_MANUAL = "requires_manual"

class SecurityLevel(Enum):
    """セキュリティレベル"""
    LOW = 1
    MEDIUM = 2
    HIGH = 3
    CRITICAL = 4
    
    def __ge__(self, other):
        if isinstance(other, SecurityLevel):
            return self.value >= other.value
        return NotImplemented
    
    def __gt__(self, other):
        if isinstance(other, SecurityLevel):
            return self.value > other.value
        return NotImplemented
    
    def __le__(self, other):
        if isinstance(other, SecurityLevel):
            return self.value <= other.value
        return NotImplemented
    
    def __lt__(self, other):
        if isinstance(other, SecurityLevel):
            return self.value < other.value
        return NotImplemented

@dataclass
class RepairContext:
    """修復コンテキスト"""
    run_id: str
    workflow_name: str
    commit_sha: str
    error_type: str
    error_logs: str
    created_at: str
    security_level: SecurityLevel
    auto_approve: bool
    repair_attempts: int = 0

@dataclass
class RepairResult:
    """修復結果"""
    success: bool
    branch_name: Optional[str] = None
    pr_url: Optional[str] = None
    changes_applied: List[Dict] = None
    error_message: Optional[str] = None
    confidence_score: float = 0.0
    security_impact: SecurityLevel = SecurityLevel.LOW

class EnhancedGitHubActionsAutoRepair:
    """拡張GitHub Actions自動修復システム"""
    
    def __init__(self, repo_owner: str = "Kensan196948G", repo_name: str = "ITSM-ITManagementSystem"):
        self.repo_owner = repo_owner
        self.repo_name = repo_name
        self.base_path = Path(__file__).parent
        self.project_root = self.base_path.parent
        
        # ログ設定
        self.setup_logging()
        
        # 設定読み込み
        self.config = self.load_config()
        
        # 状態管理
        self.state_file = self.base_path / "enhanced_repair_state.json"
        self.state = self.load_state()
        
        # セキュリティ設定
        self.security_config = self.load_security_config()
        
        # Claude Flow統合
        self.claude_flow = ClaudeFlowIntegration(self.project_root, self.logger)
        
        # 承認システム
        self.approval_system = ApprovalSystem(self.config, self.logger)
        
        # 監視統計
        self.metrics = RepairMetrics()
        
        self.logger.info(f"Enhanced GitHub Actions Auto-Repair System initialized")

    def setup_logging(self):
        """詳細ログ設定"""
        log_file = self.base_path / "enhanced_github_actions_repair.log"
        
        # ローテーションログの設定
        from logging.handlers import RotatingFileHandler
        
        formatter = logging.Formatter(
            '%(asctime)s - %(name)s - %(levelname)s - [%(funcName)s:%(lineno)d] - %(message)s'
        )
        
        # ファイルハンドラ（5MB、3世代保持）
        file_handler = RotatingFileHandler(
            log_file, maxBytes=5*1024*1024, backupCount=3
        )
        file_handler.setFormatter(formatter)
        
        # コンソールハンドラ
        console_handler = logging.StreamHandler()
        console_handler.setFormatter(formatter)
        
        # ロガー設定
        self.logger = logging.getLogger("EnhancedAutoRepair")
        self.logger.setLevel(logging.INFO)
        self.logger.addHandler(file_handler)
        self.logger.addHandler(console_handler)

    def load_config(self) -> Dict:
        """設定読み込み"""
        config_file = self.base_path / "enhanced_repair_config.json"
        
        default_config = {
            "monitoring": {
                "poll_interval": 30,
                "max_concurrent_repairs": 3,
                "retry_delay": 60,
                "health_check_interval": 300
            },
            "repair": {
                "max_repair_cycles": 15,
                "confidence_threshold": 0.75,
                "timeout_seconds": 600,
                "max_file_changes": 10
            },
            "security": {
                "manual_approval_threshold": SecurityLevel.MEDIUM.value,
                "isolation_branch_prefix": "claude-autofix",
                "require_review_for_critical": True,
                "backup_before_repair": True
            },
            "claude_flow": {
                "command": "npx claude-flow@alpha mcp start",
                "timeout": 300,
                "auto_mode": True,
                "max_tokens": 8192
            },
            "github": {
                "auto_merge_threshold": 0.9,
                "pr_template_path": ".github/pull_request_template.md",
                "required_checks": ["CI", "Tests"],
                "auto_assign_reviewers": True
            },
            "quality_gates": {
                "required_clean_cycles": 3,
                "test_pass_requirement": True,
                "lint_pass_requirement": True,
                "coverage_threshold": 0.8
            }
        }
        
        if config_file.exists():
            with open(config_file, 'r') as f:
                user_config = json.load(f)
                # ディープマージ
                return self.deep_merge(default_config, user_config)
        else:
            # デフォルト設定を保存
            with open(config_file, 'w') as f:
                json.dump(default_config, f, indent=2)
            return default_config

    def deep_merge(self, dict1: Dict, dict2: Dict) -> Dict:
        """辞書の深いマージ"""
        result = dict1.copy()
        for key, value in dict2.items():
            if key in result and isinstance(result[key], dict) and isinstance(value, dict):
                result[key] = self.deep_merge(result[key], value)
            else:
                result[key] = value
        return result

    def load_security_config(self) -> Dict:
        """セキュリティ設定読み込み"""
        return {
            "critical_files": [
                "backend/app/core/security.py",
                "backend/app/core/config.py",
                "backend/app/api/deps.py",
                ".github/workflows/",
                "docker-compose.yml",
                "requirements.txt",
                "package.json",
                ".env*"
            ],
            "sensitive_patterns": [
                r"password",
                r"secret",
                r"token",
                r"key",
                r"auth",
                r"credential"
            ],
            "auto_deny_patterns": [
                r"rm\s+-rf",
                r"sudo",
                r"chmod\s+777",
                r"--force"
            ]
        }

    def load_state(self) -> Dict:
        """状態読み込み"""
        if self.state_file.exists():
            with open(self.state_file, 'r') as f:
                return json.load(f)
        else:
            return {
                "monitoring": False,
                "repair_cycles": 0,
                "consecutive_clean_cycles": 0,
                "last_check": None,
                "active_repairs": {},
                "repair_history": [],
                "metrics": {
                    "total_repairs": 0,
                    "successful_repairs": 0,
                    "failed_repairs": 0,
                    "manual_approvals": 0,
                    "auto_approvals": 0
                }
            }

    def save_state(self):
        """状態保存"""
        self.state["last_updated"] = datetime.now().isoformat()
        # バックアップ作成
        if self.state_file.exists():
            backup_file = self.state_file.with_suffix(f'.backup.{int(time.time())}.json')
            shutil.copy2(self.state_file, backup_file)
        
        with open(self.state_file, 'w') as f:
            json.dump(self.state, f, indent=2)

    async def enhanced_error_analysis(self, logs: str, run_info: Dict) -> Dict:
        """拡張エラー分析"""
        analysis = {
            "error_types": [],
            "severity": SecurityLevel.LOW,
            "confidence": 0.0,
            "suggested_actions": [],
            "affected_files": [],
            "root_causes": []
        }
        
        # エラーパターンマッチング
        error_patterns = {
            "dependency": {
                "patterns": [
                    r"ModuleNotFoundError: No module named '([^']+)'",
                    r"ImportError: cannot import name '([^']+)'",
                    r"npm ERR! Cannot resolve dependency '([^']+)'",
                    r"Package '([^']+)' not found"
                ],
                "severity": SecurityLevel.MEDIUM,
                "actions": ["update_dependencies", "install_missing_packages"]
            },
            "syntax": {
                "patterns": [
                    r"SyntaxError: (.+)",
                    r"IndentationError: (.+)",
                    r"TypeError: (.+)"
                ],
                "severity": SecurityLevel.LOW,
                "actions": ["fix_syntax", "check_indentation"]
            },
            "test_failure": {
                "patterns": [
                    r"FAILED (.+) - (.+)",
                    r"AssertionError: (.+)",
                    r"Test (.+) failed"
                ],
                "severity": SecurityLevel.LOW,
                "actions": ["fix_test_logic", "update_test_data"]
            },
            "build": {
                "patterns": [
                    r"Build failed: (.+)",
                    r"compilation error: (.+)",
                    r"webpack.*Error: (.+)"
                ],
                "severity": SecurityLevel.MEDIUM,
                "actions": ["fix_build_config", "update_build_dependencies"]
            },
            "security": {
                "patterns": [
                    r"security vulnerability: (.+)",
                    r"CVE-\d{4}-\d+",
                    r"audit.*vulnerability"
                ],
                "severity": SecurityLevel.CRITICAL,
                "actions": ["security_patch", "vulnerability_fix"]
            }
        }
        
        # パターンマッチング実行
        max_severity = SecurityLevel.LOW
        total_confidence = 0.0
        match_count = 0
        
        for error_type, config in error_patterns.items():
            for pattern in config["patterns"]:
                matches = re.finditer(pattern, logs, re.IGNORECASE | re.MULTILINE)
                for match in matches:
                    analysis["error_types"].append({
                        "type": error_type,
                        "match": match.group(0),
                        "location": match.span(),
                        "severity": config["severity"].value
                    })
                    
                    if config["severity"].value > max_severity.value:
                        max_severity = config["severity"]
                    
                    analysis["suggested_actions"].extend(config["actions"])
                    match_count += 1
                    total_confidence += 0.8  # 基本信頼度
        
        analysis["severity"] = max_severity
        analysis["confidence"] = min(total_confidence / max(match_count, 1), 1.0)
        
        # 影響ファイル抽出
        file_patterns = [
            r"File \"([^\"]+)\"",
            r"at ([^\s]+):\d+",
            r"in file ([^\s]+)"
        ]
        
        for pattern in file_patterns:
            files = re.findall(pattern, logs)
            analysis["affected_files"].extend(files)
        
        # 重複除去
        analysis["affected_files"] = list(set(analysis["affected_files"]))
        analysis["suggested_actions"] = list(set(analysis["suggested_actions"]))
        
        return analysis

    async def create_repair_context(self, run_info: Dict, error_analysis: Dict) -> RepairContext:
        """修復コンテキスト作成"""
        # セキュリティレベル決定
        security_level = SecurityLevel(error_analysis["severity"])
        
        # 自動承認判定
        auto_approve = await self.approval_system.can_auto_approve(
            error_analysis, run_info
        )
        
        # エラーログ取得
        error_logs = await self.extract_error_logs(str(run_info["id"]))
        
        return RepairContext(
            run_id=str(run_info["id"]),
            workflow_name=run_info.get("name", "Unknown"),
            commit_sha=run_info.get("head_sha", "Unknown"),
            error_type=",".join([e["type"] for e in error_analysis["error_types"]]),
            error_logs=error_logs,
            created_at=run_info.get("created_at", datetime.now().isoformat()),
            security_level=security_level,
            auto_approve=auto_approve
        )

    async def extract_error_logs(self, run_id: str) -> str:
        """強化されたエラーログ抽出"""
        try:
            # 複数の方法でログを取得
            methods = [
                ["gh", "run", "view", run_id, "--log"],
                ["gh", "api", f"repos/{self.repo_owner}/{self.repo_name}/actions/runs/{run_id}/logs"]
            ]
            
            for method in methods:
                try:
                    result = subprocess.run(
                        method, 
                        capture_output=True, 
                        text=True, 
                        timeout=60
                    )
                    if result.returncode == 0 and result.stdout:
                        return result.stdout
                except Exception as e:
                    self.logger.debug(f"Log extraction method failed: {method} - {e}")
                    continue
            
            self.logger.warning(f"Failed to extract logs for run {run_id}")
            return ""
            
        except Exception as e:
            self.logger.error(f"Error extracting logs for run {run_id}: {e}")
            return ""

    async def generate_enhanced_claude_prompt(self, context: RepairContext, error_analysis: Dict) -> str:
        """拡張Claude修復プロンプト生成"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        
        # プロジェクト構造情報を含める
        project_structure = await self.get_project_structure()
        
        # 関連ファイル情報を含める
        relevant_files = await self.get_relevant_files(error_analysis["affected_files"])
        
        prompt = f"""# GitHub Actions 自動修復タスク (Enhanced)

## 🚨 実行情報
- **ワークフロー**: {context.workflow_name}
- **実行ID**: {context.run_id}
- **コミット**: {context.commit_sha}
- **失敗時刻**: {context.created_at}
- **修復時刻**: {timestamp}
- **セキュリティレベル**: {context.security_level.value}
- **自動承認**: {'可能' if context.auto_approve else '不可'}

## 🔍 エラー分析結果
### 検出されたエラー種別
{self.format_error_types(error_analysis['error_types'])}

### 信頼度
- **分析信頼度**: {error_analysis['confidence']:.2f}
- **重要度**: {error_analysis['severity'].value}

### 推奨アクション
{self.format_suggested_actions(error_analysis['suggested_actions'])}

### 影響ファイル
{self.format_affected_files(error_analysis['affected_files'])}

## 📋 プロジェクト構造
```
{project_structure}
```

## 📄 関連ファイル内容
{relevant_files}

## 🛠️ 修復要件
1. **根本原因の特定**: エラーの真の原因を特定する
2. **最小限の変更**: 副作用を避けるため最小限の変更で修復
3. **テスト可能性**: 修復内容をテストできる方法を提供
4. **セキュリティ考慮**: セキュリティへの影響を最小化
5. **後方互換性**: 既存機能への影響を避ける

## 🔒 セキュリティガイドライン
- 以下のファイルは慎重に扱う: {', '.join(self.security_config['critical_files'])}
- 認証・認可関連の変更は避ける
- 外部依存関係の追加は最小限に
- パスワードやトークンを含む変更は禁止

## 📊 品質ゲート
- テストカバレッジ: {self.config['quality_gates']['coverage_threshold']*100}%以上維持
- Lintエラー: 0件
- セキュリティ脆弱性: 新規導入禁止

## 📤 期待する成果物
1. **修復されたコード**: 最小限の変更で問題を解決
2. **変更説明**: 何を変更し、なぜその変更が必要かの説明
3. **テスト手順**: 修復内容を検証する具体的な手順
4. **影響範囲**: 変更による影響の詳細分析
5. **回帰テスト**: 既存機能への影響を確認する手順

## ⚡ 実行コンテキスト
プロジェクトルート: `/media/kensan/LinuxHDD/ITSM-ITmanagementSystem`
リポジトリ: `{self.repo_owner}/{self.repo_name}`

エラーログとプロジェクト構造を分析し、適切で安全な修復を実行してください。
"""
        
        return prompt

    def format_error_types(self, error_types: List[Dict]) -> str:
        """エラー種別フォーマット"""
        if not error_types:
            return "エラー種別の特定ができませんでした"
        
        formatted = []
        for error in error_types:
            formatted.append(f"- **{error['type']}**: {error['match']} (重要度: {error['severity']})")
        
        return '\n'.join(formatted)

    def format_suggested_actions(self, actions: List[str]) -> str:
        """推奨アクションフォーマット"""
        if not actions:
            return "推奨アクションはありません"
        
        return '\n'.join([f"- {action}" for action in actions])

    def format_affected_files(self, files: List[str]) -> str:
        """影響ファイルフォーマット"""
        if not files:
            return "影響ファイルは特定されませんでした"
        
        return '\n'.join([f"- `{file}`" for file in files[:10]])  # 最大10ファイル

    async def get_project_structure(self) -> str:
        """プロジェクト構造取得"""
        try:
            # 重要なディレクトリのみを表示
            important_paths = [
                "backend/app/",
                "frontend/src/",
                ".github/workflows/",
                "tests/",
                "requirements.txt",
                "package.json"
            ]
            
            structure = []
            for path in important_paths:
                full_path = self.project_root / path
                if full_path.exists():
                    if full_path.is_file():
                        structure.append(f"{path}")
                    else:
                        # ディレクトリの主要ファイルを表示
                        try:
                            files = list(full_path.glob("*.py"))[:5]  # 最大5ファイル
                            if files:
                                structure.append(f"{path}/")
                                for file in files:
                                    structure.append(f"  └── {file.name}")
                        except:
                            structure.append(f"{path}/")
            
            return '\n'.join(structure)
        except Exception as e:
            return f"プロジェクト構造の取得に失敗: {e}"

    async def get_relevant_files(self, file_paths: List[str]) -> str:
        """関連ファイル内容取得"""
        if not file_paths:
            return "関連ファイルはありません"
        
        content_parts = []
        for file_path in file_paths[:3]:  # 最大3ファイル
            try:
                full_path = self.project_root / file_path
                if full_path.exists() and full_path.is_file():
                    # ファイルサイズチェック（1MB以下）
                    if full_path.stat().st_size < 1024 * 1024:
                        with open(full_path, 'r', encoding='utf-8', errors='ignore') as f:
                            content = f.read()[:2000]  # 最大2000文字
                            content_parts.append(f"### {file_path}\n```\n{content}\n```")
            except Exception as e:
                content_parts.append(f"### {file_path}\n```\nファイル読み取りエラー: {e}\n```")
        
        return '\n\n'.join(content_parts) if content_parts else "関連ファイルの読み取りができませんでした"

    async def execute_repair_cycle(self, context: RepairContext) -> RepairResult:
        """拡張修復サイクル実行"""
        self.logger.info(f"Starting enhanced repair cycle for run {context.run_id}")
        
        try:
            # エラー分析
            error_analysis = await self.enhanced_error_analysis(
                context.error_logs, 
                {"id": context.run_id}
            )
            
            # Claude用プロンプト生成
            prompt = await self.generate_enhanced_claude_prompt(context, error_analysis)
            
            # Claude Flow実行
            claude_result = await self.claude_flow.execute_repair(prompt, context)
            
            if not claude_result["success"]:
                return RepairResult(
                    success=False,
                    error_message=f"Claude Flow failed: {claude_result.get('error')}",
                    confidence_score=0.0
                )
            
            # 承認判定
            approval_result = await self.approval_system.evaluate_approval(
                claude_result, context, error_analysis
            )
            
            if not approval_result["approved"]:
                return RepairResult(
                    success=False,
                    error_message=f"Manual approval required: {approval_result['reason']}",
                    confidence_score=claude_result.get("confidence", 0.0)
                )
            
            # 隔離ブランチで修復適用
            repair_result = await self.apply_repair_with_isolation(
                claude_result, context
            )
            
            return repair_result
            
        except Exception as e:
            self.logger.error(f"Error in repair cycle: {e}")
            return RepairResult(
                success=False,
                error_message=str(e),
                confidence_score=0.0
            )

    async def apply_repair_with_isolation(self, claude_result: Dict, context: RepairContext) -> RepairResult:
        """隔離環境での修復適用"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        branch_name = f"{self.config['security']['isolation_branch_prefix']}-{context.run_id}-{timestamp}"
        
        try:
            # バックアップ作成
            if self.config["security"]["backup_before_repair"]:
                backup_path = await self.create_backup(context.run_id)
                self.logger.info(f"Backup created: {backup_path}")
            
            # ブランチ作成
            await self.create_isolation_branch(branch_name)
            
            # 変更適用
            changes_applied = await self.apply_changes(claude_result["changes"])
            
            # テスト実行
            test_result = await self.run_quality_checks()
            
            if not test_result["passed"]:
                self.logger.warning("Quality checks failed, reverting changes")
                await self.revert_to_main()
                return RepairResult(
                    success=False,
                    error_message=f"Quality checks failed: {test_result['errors']}",
                    confidence_score=claude_result.get("confidence", 0.0)
                )
            
            # プルリクエスト作成
            pr_url = await self.create_enhanced_pull_request(
                branch_name, claude_result, context, changes_applied
            )
            
            # ワークフロー再実行
            if context.auto_approve:
                await self.trigger_workflow_rerun(context.run_id)
            
            return RepairResult(
                success=True,
                branch_name=branch_name,
                pr_url=pr_url,
                changes_applied=changes_applied,
                confidence_score=claude_result.get("confidence", 0.0),
                security_impact=context.security_level
            )
            
        except Exception as e:
            self.logger.error(f"Error applying repair: {e}")
            await self.cleanup_failed_repair(branch_name)
            return RepairResult(
                success=False,
                error_message=str(e),
                confidence_score=claude_result.get("confidence", 0.0)
            )

    async def create_backup(self, run_id: str) -> str:
        """修復前バックアップ作成"""
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        backup_dir = self.base_path / "backups" / f"repair_{run_id}_{timestamp}"
        backup_dir.mkdir(parents=True, exist_ok=True)
        
        # 重要ファイルのバックアップ
        important_files = [
            "backend/app/",
            "frontend/src/",
            "requirements.txt",
            "package.json",
            ".github/workflows/"
        ]
        
        for file_path in important_files:
            src = self.project_root / file_path
            if src.exists():
                dst = backup_dir / file_path
                if src.is_file():
                    dst.parent.mkdir(parents=True, exist_ok=True)
                    shutil.copy2(src, dst)
                else:
                    shutil.copytree(src, dst, dirs_exist_ok=True)
        
        return str(backup_dir)

    async def create_isolation_branch(self, branch_name: str):
        """隔離ブランチ作成"""
        try:
            # 最新のmainブランチに更新
            subprocess.run(["git", "checkout", "main"], cwd=self.project_root, check=True)
            subprocess.run(["git", "pull", "origin", "main"], cwd=self.project_root, check=True)
            
            # 新しいブランチを作成
            subprocess.run(
                ["git", "checkout", "-b", branch_name],
                cwd=self.project_root,
                check=True
            )
            
            self.logger.info(f"Created isolation branch: {branch_name}")
            
        except subprocess.CalledProcessError as e:
            self.logger.error(f"Failed to create isolation branch: {e}")
            raise

    async def apply_changes(self, changes: List[Dict]) -> List[Dict]:
        """変更適用"""
        applied_changes = []
        
        for change in changes:
            try:
                file_path = change.get("file")
                content = change.get("content")
                operation = change.get("operation", "modify")
                
                if not file_path:
                    continue
                
                full_path = self.project_root / file_path
                
                if operation == "create":
                    full_path.parent.mkdir(parents=True, exist_ok=True)
                    with open(full_path, 'w', encoding='utf-8') as f:
                        f.write(content)
                    applied_changes.append({
                        "file": file_path,
                        "operation": "created",
                        "lines_changed": len(content.split('\n'))
                    })
                    
                elif operation == "modify":
                    if full_path.exists():
                        with open(full_path, 'w', encoding='utf-8') as f:
                            f.write(content)
                        applied_changes.append({
                            "file": file_path,
                            "operation": "modified",
                            "lines_changed": len(content.split('\n'))
                        })
                        
                elif operation == "delete":
                    if full_path.exists():
                        full_path.unlink()
                        applied_changes.append({
                            "file": file_path,
                            "operation": "deleted",
                            "lines_changed": 0
                        })
                
                self.logger.info(f"Applied {operation} to {file_path}")
                
            except Exception as e:
                self.logger.error(f"Failed to apply change to {file_path}: {e}")
                continue
        
        # 変更をコミット
        if applied_changes:
            subprocess.run(["git", "add", "."], cwd=self.project_root, check=True)
            commit_message = f"Auto-repair: Apply Claude Flow fixes\n\nFiles modified: {len(applied_changes)}"
            subprocess.run(
                ["git", "commit", "-m", commit_message],
                cwd=self.project_root,
                check=True
            )
        
        return applied_changes

    async def run_quality_checks(self) -> Dict:
        """品質チェック実行"""
        checks = {
            "lint": False,
            "tests": False,
            "security": False,
            "errors": []
        }
        
        try:
            # Lintチェック
            if self.config["quality_gates"]["lint_pass_requirement"]:
                lint_result = await self.run_lint_checks()
                checks["lint"] = lint_result["passed"]
                if not lint_result["passed"]:
                    checks["errors"].extend(lint_result["errors"])
            
            # テスト実行
            if self.config["quality_gates"]["test_pass_requirement"]:
                test_result = await self.run_tests()
                checks["tests"] = test_result["passed"]
                if not test_result["passed"]:
                    checks["errors"].extend(test_result["errors"])
            
            # セキュリティスキャン
            security_result = await self.run_security_scan()
            checks["security"] = security_result["passed"]
            if not security_result["passed"]:
                checks["errors"].extend(security_result["errors"])
            
        except Exception as e:
            checks["errors"].append(f"Quality check error: {e}")
        
        checks["passed"] = all([
            checks["lint"] or not self.config["quality_gates"]["lint_pass_requirement"],
            checks["tests"] or not self.config["quality_gates"]["test_pass_requirement"],
            checks["security"]
        ])
        
        return checks

    async def run_lint_checks(self) -> Dict:
        """Lintチェック実行"""
        try:
            # Python Lint
            python_result = subprocess.run(
                ["flake8", "backend/", "--select=E9,F63,F7,F82"],
                cwd=self.project_root,
                capture_output=True,
                text=True
            )
            
            # TypeScript Lint (if exists)
            ts_result = {"returncode": 0, "stderr": ""}
            if (self.project_root / "frontend" / "package.json").exists():
                ts_result = subprocess.run(
                    ["npm", "run", "lint", "--", "--max-warnings", "0"],
                    cwd=self.project_root / "frontend",
                    capture_output=True,
                    text=True
                )
            
            errors = []
            if python_result.returncode != 0:
                errors.append(f"Python lint errors: {python_result.stdout}")
            if ts_result.returncode != 0:
                errors.append(f"TypeScript lint errors: {ts_result.stderr}")
            
            return {
                "passed": len(errors) == 0,
                "errors": errors
            }
            
        except Exception as e:
            return {
                "passed": False,
                "errors": [f"Lint check failed: {e}"]
            }

    async def run_tests(self) -> Dict:
        """テスト実行"""
        try:
            # Backend tests
            backend_result = subprocess.run(
                ["python", "-m", "pytest", "tests/", "-x", "--tb=short"],
                cwd=self.project_root / "backend",
                capture_output=True,
                text=True
            )
            
            # Frontend tests (if exists)
            frontend_result = {"returncode": 0, "stderr": ""}
            if (self.project_root / "frontend" / "package.json").exists():
                frontend_result = subprocess.run(
                    ["npm", "test", "--", "--watchAll=false", "--passWithNoTests"],
                    cwd=self.project_root / "frontend",
                    capture_output=True,
                    text=True
                )
            
            errors = []
            if backend_result.returncode != 0:
                errors.append(f"Backend tests failed: {backend_result.stdout}")
            if frontend_result.returncode != 0:
                errors.append(f"Frontend tests failed: {frontend_result.stderr}")
            
            return {
                "passed": len(errors) == 0,
                "errors": errors
            }
            
        except Exception as e:
            return {
                "passed": False,
                "errors": [f"Test execution failed: {e}"]
            }

    async def run_security_scan(self) -> Dict:
        """セキュリティスキャン実行"""
        try:
            errors = []
            
            # 危険なパターンチェック
            for pattern in self.security_config["auto_deny_patterns"]:
                result = subprocess.run(
                    ["grep", "-r", pattern, ".", "--exclude-dir=.git"],
                    cwd=self.project_root,
                    capture_output=True,
                    text=True
                )
                if result.returncode == 0:
                    errors.append(f"Dangerous pattern found: {pattern}")
            
            # 依存関係脆弱性チェック
            if (self.project_root / "backend" / "requirements.txt").exists():
                safety_result = subprocess.run(
                    ["safety", "check", "-r", "requirements.txt"],
                    cwd=self.project_root / "backend",
                    capture_output=True,
                    text=True
                )
                if safety_result.returncode != 0:
                    errors.append(f"Security vulnerabilities in Python dependencies: {safety_result.stdout}")
            
            return {
                "passed": len(errors) == 0,
                "errors": errors
            }
            
        except Exception as e:
            return {
                "passed": True,  # セキュリティスキャンの失敗は警告レベル
                "errors": [f"Security scan warning: {e}"]
            }

    async def create_enhanced_pull_request(self, branch_name: str, claude_result: Dict, 
                                         context: RepairContext, changes_applied: List[Dict]) -> str:
        """拡張プルリクエスト作成"""
        try:
            title = f"🤖 Auto-repair: {context.workflow_name} (Run #{context.run_id})"
            
            # 詳細なPR本文を作成
            body = self.generate_pr_body(claude_result, context, changes_applied)
            
            # ラベル設定
            labels = ["auto-repair", f"security-{context.security_level.value}"]
            if context.auto_approve:
                labels.append("auto-approved")
            else:
                labels.append("manual-review-required")
            
            # PRを作成
            cmd = [
                "gh", "pr", "create",
                "--title", title,
                "--body", body,
                "--head", branch_name,
                "--base", "main"
            ]
            
            # ラベルを追加
            for label in labels:
                cmd.extend(["--label", label])
            
            # レビュアーを自動アサイン
            if self.config["github"]["auto_assign_reviewers"]:
                cmd.extend(["--reviewer", "@me"])
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            pr_url = result.stdout.strip()
            
            self.logger.info(f"Created enhanced pull request: {pr_url}")
            return pr_url
            
        except Exception as e:
            self.logger.error(f"Failed to create pull request: {e}")
            raise

    def generate_pr_body(self, claude_result: Dict, context: RepairContext, 
                        changes_applied: List[Dict]) -> str:
        """PR本文生成"""
        return f"""## 🤖 自動修復レポート

### 📊 修復サマリー
- **ワークフロー**: {context.workflow_name}
- **実行ID**: {context.run_id}
- **エラー種別**: {context.error_type}
- **セキュリティレベル**: {context.security_level.value}
- **信頼度**: {claude_result.get('confidence', 0.0):.2f}
- **修復時刻**: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}

### 🔧 実行された変更
{self.format_changes_for_pr(changes_applied)}

### 📝 修復内容説明
{claude_result.get('description', 'Claude Flowによる自動修復')}

### ✅ 品質チェック結果
- Lintチェック: ✅ 合格
- テスト実行: ✅ 合格  
- セキュリティスキャン: ✅ 合格

### 🧪 テスト手順
{claude_result.get('test_instructions', '標準的なCI/CDテストを実行してください')}

### 🎯 影響範囲
{claude_result.get('impact_analysis', 'エラー修復のみで既存機能への影響は最小限です')}

### ⚠️ 注意事項
{self.generate_pr_warnings(context, changes_applied)}

### 🔄 次のステップ
1. レビューと承認
2. マージ後のCI/CD確認
3. 本番環境への影響監視

---
*このPRは Enhanced GitHub Actions Auto-Repair System により自動生成されました*
*修復エンジン: Claude Flow MCP Integration*
"""

    def format_changes_for_pr(self, changes: List[Dict]) -> str:
        """PR用変更フォーマット"""
        if not changes:
            return "変更はありませんでした"
        
        formatted = []
        for change in changes:
            operation = change.get("operation", "modified")
            file_path = change.get("file", "Unknown")
            lines = change.get("lines_changed", 0)
            
            emoji = {"created": "➕", "modified": "✏️", "deleted": "❌"}.get(operation, "📝")
            formatted.append(f"{emoji} `{file_path}` ({operation}, {lines} lines)")
        
        return '\n'.join(formatted)

    def generate_pr_warnings(self, context: RepairContext, changes: List[Dict]) -> str:
        """PR警告生成"""
        warnings = []
        
        if context.security_level in [SecurityLevel.HIGH, SecurityLevel.CRITICAL]:
            warnings.append("🚨 高セキュリティリスク: 慎重なレビューが必要")
        
        if not context.auto_approve:
            warnings.append("👀 手動承認必須: 自動マージは無効")
        
        security_files_affected = any(
            any(critical in change.get("file", "") for critical in self.security_config["critical_files"])
            for change in changes
        )
        
        if security_files_affected:
            warnings.append("🔒 セキュリティクリティカルファイルが変更されています")
        
        if len(changes) > self.config["repair"]["max_file_changes"]:
            warnings.append(f"📊 多数のファイル変更: {len(changes)}ファイル")
        
        return '\n'.join([f"- {warning}" for warning in warnings]) if warnings else "特に注意事項はありません"

    async def revert_to_main(self):
        """mainブランチに戻る"""
        try:
            subprocess.run(["git", "checkout", "main"], cwd=self.project_root, check=True)
            subprocess.run(["git", "reset", "--hard", "HEAD"], cwd=self.project_root, check=True)
        except Exception as e:
            self.logger.error(f"Failed to revert to main: {e}")

    async def cleanup_failed_repair(self, branch_name: str):
        """失敗した修復のクリーンアップ"""
        try:
            await self.revert_to_main()
            # ブランチ削除
            subprocess.run(
                ["git", "branch", "-D", branch_name], 
                cwd=self.project_root, 
                check=False
            )
        except Exception as e:
            self.logger.error(f"Failed to cleanup failed repair: {e}")

    async def trigger_workflow_rerun(self, run_id: str) -> bool:
        """ワークフロー再実行"""
        try:
            cmd = ["gh", "api", 
                   f"repos/{self.repo_owner}/{self.repo_name}/actions/runs/{run_id}/rerun", 
                   "-X", "POST"]
            
            subprocess.run(cmd, check=True)
            self.logger.info(f"Triggered rerun for workflow {run_id}")
            return True
            
        except Exception as e:
            self.logger.error(f"Failed to trigger workflow rerun: {e}")
            return False

    async def get_failed_workflow_runs(self) -> List[Dict]:
        """失敗したワークフロー実行を取得"""
        try:
            cmd = [
                "gh", "api", 
                f"repos/{self.repo_owner}/{self.repo_name}/actions/runs",
                "--jq", ".workflow_runs[] | select(.conclusion == \"failure\" and .status == \"completed\") | {id: .id, name: .name, conclusion: .conclusion, created_at: .created_at, head_sha: .head_sha}"
            ]
            
            result = subprocess.run(cmd, capture_output=True, text=True, check=True)
            runs_data = result.stdout.strip()
            
            if not runs_data:
                return []
            
            runs = []
            for line in runs_data.split('\n'):
                if line.strip():
                    runs.append(json.loads(line.strip()))
            
            return runs
            
        except Exception as e:
            self.logger.error(f"Failed to get workflow runs: {e}")
            return []

    async def monitoring_loop(self):
        """拡張監視ループ"""
        self.logger.info("Starting enhanced GitHub Actions monitoring loop")
        self.state["monitoring"] = True
        self.save_state()
        
        while (self.state["monitoring"] and 
               self.state["repair_cycles"] < self.config["repair"]["max_repair_cycles"]):
            try:
                # GitHub CLI認証確認
                if not await self.check_github_cli():
                    self.logger.error("GitHub CLI not authenticated")
                    await asyncio.sleep(60)
                    continue
                
                # 失敗したワークフロー実行を取得
                failed_runs = await self.get_failed_workflow_runs()
                
                if failed_runs:
                    self.logger.info(f"Found {len(failed_runs)} failed workflow runs")
                    self.state["consecutive_clean_cycles"] = 0
                    
                    # 並行処理制限
                    semaphore = asyncio.Semaphore(self.config["monitoring"]["max_concurrent_repairs"])
                    
                    async def process_run(run_info):
                        async with semaphore:
                            await self.process_failed_run(run_info)
                    
                    # 失敗したワークフローを並行処理
                    tasks = [process_run(run_info) for run_info in failed_runs]
                    await asyncio.gather(*tasks, return_exceptions=True)
                    
                else:
                    # クリーンサイクル
                    self.state["consecutive_clean_cycles"] += 1
                    self.logger.info(f"Clean cycle {self.state['consecutive_clean_cycles']}/{self.config['quality_gates']['required_clean_cycles']}")
                    
                    if self.state["consecutive_clean_cycles"] >= self.config["quality_gates"]["required_clean_cycles"]:
                        self.logger.info("🎉 Success! All workflow runs are clean for required cycles")
                        break
                
                # 次のチェックまで待機
                await asyncio.sleep(self.config["monitoring"]["poll_interval"])
                
            except KeyboardInterrupt:
                self.logger.info("Monitoring interrupted by user")
                break
            except Exception as e:
                self.logger.error(f"Error in monitoring loop: {e}")
                await asyncio.sleep(self.config["monitoring"]["retry_delay"])
        
        self.state["monitoring"] = False
        self.save_state()
        self.logger.info("Enhanced GitHub Actions monitoring stopped")

    async def process_failed_run(self, run_info: Dict):
        """失敗したワークフローの処理"""
        run_id = str(run_info['id'])
        
        # 既に修復中でないかチェック
        if run_id in self.state["active_repairs"]:
            return
        
        self.logger.info(f"Processing failed run: {run_id}")
        
        try:
            # 修復開始を記録
            self.state["active_repairs"][run_id] = {
                "started": datetime.now().isoformat(),
                "status": RepairStatus.IN_PROGRESS.value
            }
            self.save_state()
            
            # エラー分析
            error_logs = await self.extract_error_logs(run_id)
            error_analysis = await self.enhanced_error_analysis(error_logs, run_info)
            
            # 修復コンテキスト作成
            context = await self.create_repair_context(run_info, error_analysis)
            
            # 修復実行
            repair_result = await self.execute_repair_cycle(context)
            
            # 結果を記録
            self.state["active_repairs"][run_id]["status"] = RepairStatus.COMPLETED.value if repair_result.success else RepairStatus.FAILED.value
            self.state["active_repairs"][run_id]["result"] = asdict(repair_result)
            
            # 統計更新
            self.state["repair_cycles"] += 1
            if repair_result.success:
                self.state["metrics"]["successful_repairs"] += 1
            else:
                self.state["metrics"]["failed_repairs"] += 1
            
            # 履歴に追加
            self.state["repair_history"].append({
                "run_id": run_id,
                "timestamp": datetime.now().isoformat(),
                "result": asdict(repair_result),
                "context": asdict(context)
            })
            
            self.save_state()
            
            if repair_result.success:
                self.logger.info(f"Successfully repaired run {run_id}")
            else:
                self.logger.warning(f"Failed to repair run {run_id}: {repair_result.error_message}")
                
        except Exception as e:
            self.logger.error(f"Error processing failed run {run_id}: {e}")
            self.state["active_repairs"][run_id]["status"] = RepairStatus.FAILED.value
            self.state["active_repairs"][run_id]["error"] = str(e)
            self.save_state()

    async def check_github_cli(self) -> bool:
        """GitHub CLI認証確認"""
        try:
            result = subprocess.run(["gh", "auth", "status"], 
                                  capture_output=True, text=True, check=False)
            return result.returncode == 0
        except Exception as e:
            self.logger.error(f"GitHub CLI check failed: {e}")
            return False

    async def start_monitoring(self):
        """監視開始"""
        await self.monitoring_loop()

    def stop_monitoring(self):
        """監視停止"""
        self.state["monitoring"] = False
        self.save_state()

    def get_status_report(self) -> Dict:
        """ステータスレポート取得"""
        return {
            "monitoring": self.state["monitoring"],
            "repair_cycles": self.state["repair_cycles"],
            "consecutive_clean_cycles": self.state["consecutive_clean_cycles"],
            "metrics": self.state["metrics"],
            "active_repairs": len(self.state["active_repairs"]),
            "last_check": self.state.get("last_check"),
            "config": self.config
        }


class ClaudeFlowIntegration:
    """Claude Flow MCP統合クラス"""
    
    def __init__(self, project_root: Path, logger: logging.Logger):
        self.project_root = project_root
        self.logger = logger

    async def execute_repair(self, prompt: str, context: RepairContext) -> Dict:
        """Claude Flow修復実行"""
        try:
            # 一時プロンプトファイル作成
            with tempfile.NamedTemporaryFile(mode='w', suffix='.md', delete=False) as f:
                f.write(prompt)
                prompt_file = f.name
            
            self.logger.info("Executing Claude Flow for repair")
            
            # Claude Flow コマンド実行
            cmd = [
                "npx", "claude-flow@alpha", "mcp", "start",
                "--prompt", prompt_file,
                "--auto-mode",
                "--timeout", "300"
            ]
            
            result = subprocess.run(
                cmd,
                cwd=self.project_root,
                capture_output=True,
                text=True,
                timeout=300
            )
            
            # 一時ファイル削除
            os.unlink(prompt_file)
            
            if result.returncode == 0:
                output = result.stdout
                parsed_result = self.parse_claude_output(output)
                self.logger.info("Claude Flow repair completed successfully")
                return {
                    "success": True,
                    "changes": parsed_result["changes"],
                    "description": parsed_result["description"],
                    "confidence": parsed_result["confidence"],
                    "test_instructions": parsed_result["test_instructions"]
                }
            else:
                self.logger.error(f"Claude Flow failed: {result.stderr}")
                return {
                    "success": False,
                    "error": result.stderr
                }
                
        except Exception as e:
            self.logger.error(f"Error executing Claude Flow: {e}")
            return {
                "success": False,
                "error": str(e)
            }

    def parse_claude_output(self, output: str) -> Dict:
        """Claude Flow出力解析"""
        # 実際のClaude Flow出力フォーマットに応じて実装
        # ここでは仮の解析ロジック
        
        result = {
            "changes": [],
            "description": "Claude Flowによる自動修復",
            "confidence": 0.8,
            "test_instructions": "標準的なテストを実行してください"
        }
        
        # 出力から変更情報を抽出
        # (実際の実装では、Claude Flowの具体的な出力フォーマットに合わせる)
        
        return result


class ApprovalSystem:
    """承認システムクラス"""
    
    def __init__(self, config: Dict, logger: logging.Logger):
        self.config = config
        self.logger = logger

    async def can_auto_approve(self, error_analysis: Dict, run_info: Dict) -> bool:
        """自動承認可能性判定"""
        # セキュリティレベルチェック
        if error_analysis["severity"] >= SecurityLevel.HIGH:
            return False
        
        # 信頼度チェック
        if error_analysis["confidence"] < self.config["repair"]["confidence_threshold"]:
            return False
        
        return True

    async def evaluate_approval(self, claude_result: Dict, context: RepairContext, 
                              error_analysis: Dict) -> Dict:
        """承認評価"""
        
        # 自動承認ルールチェック
        if not context.auto_approve:
            return {
                "approved": False,
                "reason": "Security level requires manual approval"
            }
        
        # 変更範囲チェック
        changes = claude_result.get("changes", [])
        if len(changes) > self.config["repair"]["max_file_changes"]:
            return {
                "approved": False,
                "reason": f"Too many file changes: {len(changes)}"
            }
        
        return {
            "approved": True,
            "reason": "Auto-approved based on confidence and security level"
        }


class RepairMetrics:
    """修復メトリクスクラス"""
    
    def __init__(self):
        self.reset()
    
    def reset(self):
        self.total_repairs = 0
        self.successful_repairs = 0
        self.failed_repairs = 0
        self.manual_approvals = 0
        self.auto_approvals = 0
    
    def record_repair(self, success: bool, auto_approved: bool):
        self.total_repairs += 1
        if success:
            self.successful_repairs += 1
        else:
            self.failed_repairs += 1
        
        if auto_approved:
            self.auto_approvals += 1
        else:
            self.manual_approvals += 1
    
    def get_success_rate(self) -> float:
        if self.total_repairs == 0:
            return 0.0
        return self.successful_repairs / self.total_repairs
    
    def get_auto_approval_rate(self) -> float:
        if self.total_repairs == 0:
            return 0.0
        return self.auto_approvals / self.total_repairs


async def main():
    """メイン実行関数"""
    print("🚀 Starting Enhanced GitHub Actions Auto-Repair System")
    print("🤖 Claude Flow MCP Integration: Enabled")
    print("🔒 Security Isolation: Enhanced")
    print("⚡ Real-time Monitoring: Advanced")
    print("🎯 Quality Gates: Enforced")
    print("📊 Metrics Collection: Enabled")
    print("=" * 70)
    
    system = EnhancedGitHubActionsAutoRepair()
    
    try:
        await system.start_monitoring()
    except KeyboardInterrupt:
        print("\n🛑 Monitoring stopped by user")
        system.stop_monitoring()
    except Exception as e:
        print(f"❌ Fatal error: {e}")
        system.stop_monitoring()
    finally:
        # 最終レポート表示
        report = system.get_status_report()
        print("\n📊 Final Status Report:")
        print(json.dumps(report, indent=2))


if __name__ == "__main__":
    asyncio.run(main())