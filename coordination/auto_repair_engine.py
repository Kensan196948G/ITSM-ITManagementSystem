#!/usr/bin/env python3
"""
自動修復エンジン
- 依存関係、設定、テスト、ビルドエラーの自動修復
- 段階的修復アプローチによる高い成功率
- 修復履歴とパフォーマンス追跡
"""

import asyncio
import json
import logging
import subprocess
import time
from datetime import datetime, timedelta
from pathlib import Path
from typing import Dict, List, Optional, Tuple, Any
import yaml
import os
import shutil
from dataclasses import dataclass
from enum import Enum

class RepairStatus(Enum):
    SUCCESS = "success"
    FAILED = "failed"
    PARTIAL = "partial"
    SKIPPED = "skipped"
    IN_PROGRESS = "in_progress"

class RepairPriority(Enum):
    CRITICAL = 1
    HIGH = 2
    MEDIUM = 3
    LOW = 4

@dataclass
class RepairAction:
    """修復アクション"""
    name: str
    command: str
    description: str
    working_dir: Optional[str]
    timeout: int
    retry_count: int
    prerequisites: List[str]
    validation_command: Optional[str]
    priority: RepairPriority

@dataclass
class RepairResult:
    """修復結果"""
    action: RepairAction
    status: RepairStatus
    output: str
    error: str
    duration: float
    timestamp: datetime
    retry_attempt: int

class AutoRepairEngine:
    def __init__(self):
        self.base_path = Path(__file__).parent
        self.project_root = self.base_path.parent
        
        # ログ設定
        self.setup_logging()
        
        # 修復アクションの初期化
        self.repair_actions = self.initialize_repair_actions()
        
        # 実行統計
        self.execution_stats = {
            "total_repairs": 0,
            "successful_repairs": 0,
            "failed_repairs": 0,
            "average_duration": 0.0,
            "last_repair": None
        }
        
        # 修復履歴
        self.repair_history = []
        
        # 実行中フラグ
        self.repair_in_progress = False
        
        self.logger.info(f"Auto Repair Engine initialized with {len(self.repair_actions)} actions")

    def setup_logging(self):
        """ログ設定"""
        log_file = self.base_path / "auto_repair_engine.log"
        logging.basicConfig(
            level=logging.INFO,
            format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
            handlers=[
                logging.FileHandler(log_file),
                logging.StreamHandler()
            ]
        )
        self.logger = logging.getLogger("AutoRepairEngine")

    def initialize_repair_actions(self) -> Dict[str, List[RepairAction]]:
        """修復アクションの初期化"""
        actions = {
            "dependency": [
                RepairAction(
                    name="python_requirements_install",
                    command="pip install -r requirements.txt",
                    description="Install Python requirements",
                    working_dir="backend",
                    timeout=300,
                    retry_count=2,
                    prerequisites=[],
                    validation_command="python -c \"import sys; print('Python deps OK')\"",
                    priority=RepairPriority.CRITICAL
                ),
                RepairAction(
                    name="python_dev_install",
                    command="pip install -e .",
                    description="Install project in development mode",
                    working_dir=".",
                    timeout=120,
                    retry_count=2,
                    prerequisites=["python_requirements_install"],
                    validation_command="python -c \"import backend; print('Dev install OK')\"",
                    priority=RepairPriority.HIGH
                ),
                RepairAction(
                    name="npm_install",
                    command="npm ci",
                    description="Install NPM dependencies",
                    working_dir="frontend",
                    timeout=600,
                    retry_count=2,
                    prerequisites=[],
                    validation_command="npm list --depth=0",
                    priority=RepairPriority.CRITICAL
                ),
                RepairAction(
                    name="npm_clean_install",
                    command="rm -rf node_modules && npm install",
                    description="Clean NPM install",
                    working_dir="frontend",
                    timeout=900,
                    retry_count=1,
                    prerequisites=[],
                    validation_command="npm list --depth=0",
                    priority=RepairPriority.HIGH
                )
            ],
            "build": [
                RepairAction(
                    name="frontend_build",
                    command="npm run build",
                    description="Build frontend application",
                    working_dir="frontend",
                    timeout=300,
                    retry_count=2,
                    prerequisites=["npm_install"],
                    validation_command="test -d dist",
                    priority=RepairPriority.HIGH
                ),
                RepairAction(
                    name="python_compile_check",
                    command="python -m py_compile backend/app/main.py",
                    description="Check Python compilation",
                    working_dir=".",
                    timeout=60,
                    retry_count=1,
                    prerequisites=[],
                    validation_command="python -c \"import backend.app.main; print('Compile OK')\"",
                    priority=RepairPriority.MEDIUM
                ),
                RepairAction(
                    name="typescript_check",
                    command="npm run type-check",
                    description="TypeScript type checking",
                    working_dir="frontend",
                    timeout=120,
                    retry_count=1,
                    prerequisites=["npm_install"],
                    validation_command="npx tsc --noEmit",
                    priority=RepairPriority.MEDIUM
                )
            ],
            "test": [
                RepairAction(
                    name="python_unit_tests",
                    command="python -m pytest tests/unit/ -v --tb=short",
                    description="Run Python unit tests",
                    working_dir="backend",
                    timeout=180,
                    retry_count=1,
                    prerequisites=["python_requirements_install"],
                    validation_command="python -m pytest tests/unit/ --collect-only -q",
                    priority=RepairPriority.MEDIUM
                ),
                RepairAction(
                    name="javascript_unit_tests",
                    command="npm test -- --watchAll=false --coverage=false",
                    description="Run JavaScript unit tests",
                    working_dir="frontend",
                    timeout=180,
                    retry_count=1,
                    prerequisites=["npm_install"],
                    validation_command="npm run test -- --listTests",
                    priority=RepairPriority.MEDIUM
                ),
                RepairAction(
                    name="api_tests",
                    command="python -m pytest tests/api/ -v --tb=short",
                    description="Run API integration tests",
                    working_dir="backend",
                    timeout=300,
                    retry_count=1,
                    prerequisites=["python_requirements_install", "database_setup"],
                    validation_command="python -c \"import requests; print('API test deps OK')\"",
                    priority=RepairPriority.LOW
                )
            ],
            "database": [
                RepairAction(
                    name="database_setup",
                    command="python init_sqlite_db.py",
                    description="Initialize SQLite database",
                    working_dir="backend",
                    timeout=60,
                    retry_count=1,
                    prerequisites=[],
                    validation_command="test -f itsm.db",
                    priority=RepairPriority.HIGH
                ),
                RepairAction(
                    name="database_migration",
                    command="python -c \"from app.db.init_db import init_db; init_db()\"",
                    description="Run database migrations",
                    working_dir="backend",
                    timeout=120,
                    retry_count=1,
                    prerequisites=["database_setup"],
                    validation_command="python -c \"from app.db.base import get_session; print('DB OK')\"",
                    priority=RepairPriority.MEDIUM
                )
            ],
            "linting": [
                RepairAction(
                    name="python_linting_fix",
                    command="flake8 --select=E9,F63,F7,F82 . --show-source --statistics",
                    description="Python linting check",
                    working_dir="backend",
                    timeout=60,
                    retry_count=1,
                    prerequisites=[],
                    validation_command="flake8 --version",
                    priority=RepairPriority.LOW
                ),
                RepairAction(
                    name="javascript_lint_fix",
                    command="npm run lint -- --fix",
                    description="JavaScript/TypeScript linting fix",
                    working_dir="frontend",
                    timeout=120,
                    retry_count=1,
                    prerequisites=["npm_install"],
                    validation_command="npm run lint -- --version",
                    priority=RepairPriority.LOW
                )
            ],
            "config": [
                RepairAction(
                    name="config_validation",
                    command="python -c \"import yaml; yaml.safe_load(open('.github/workflows/ci.yml'))\"",
                    description="Validate CI configuration",
                    working_dir=".",
                    timeout=30,
                    retry_count=1,
                    prerequisites=[],
                    validation_command="python -c \"import yaml; print('YAML OK')\"",
                    priority=RepairPriority.LOW
                ),
                RepairAction(
                    name="env_setup",
                    command="test -f .env || cp .env.example .env || echo 'DATABASE_URL=sqlite:///./itsm.db' > .env",
                    description="Setup environment configuration",
                    working_dir="backend",
                    timeout=30,
                    retry_count=1,
                    prerequisites=[],
                    validation_command="test -f .env",
                    priority=RepairPriority.MEDIUM
                )
            ]
        }
        
        return actions

    async def execute_command(self, action: RepairAction, retry_attempt: int = 0) -> RepairResult:
        """コマンドを実行"""
        start_time = time.time()
        working_dir = self.project_root / action.working_dir if action.working_dir else self.project_root
        
        self.logger.info(f"Executing: {action.name} (attempt {retry_attempt + 1})")
        self.logger.debug(f"Command: {action.command} in {working_dir}")
        
        try:
            # 作業ディレクトリが存在するか確認
            if not working_dir.exists():
                self.logger.error(f"Working directory does not exist: {working_dir}")
                return RepairResult(
                    action=action,
                    status=RepairStatus.FAILED,
                    output="",
                    error=f"Working directory not found: {working_dir}",
                    duration=time.time() - start_time,
                    timestamp=datetime.now(),
                    retry_attempt=retry_attempt
                )
            
            # コマンド実行
            process = await asyncio.create_subprocess_shell(
                action.command,
                cwd=working_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            try:
                stdout, stderr = await asyncio.wait_for(
                    process.communicate(),
                    timeout=action.timeout
                )
                
                output = stdout.decode('utf-8', errors='ignore')
                error = stderr.decode('utf-8', errors='ignore')
                
                if process.returncode == 0:
                    status = RepairStatus.SUCCESS
                    self.logger.info(f"✅ Success: {action.name}")
                else:
                    status = RepairStatus.FAILED
                    self.logger.warning(f"❌ Failed: {action.name} (exit code: {process.returncode})")
                
            except asyncio.TimeoutError:
                process.kill()
                await process.wait()
                status = RepairStatus.FAILED
                output = ""
                error = f"Command timed out after {action.timeout} seconds"
                self.logger.error(f"⏰ Timeout: {action.name}")
            
        except Exception as e:
            status = RepairStatus.FAILED
            output = ""
            error = str(e)
            self.logger.error(f"💥 Error: {action.name} - {e}")
        
        duration = time.time() - start_time
        
        result = RepairResult(
            action=action,
            status=status,
            output=output,
            error=error,
            duration=duration,
            timestamp=datetime.now(),
            retry_attempt=retry_attempt
        )
        
        return result

    async def validate_action(self, action: RepairAction) -> bool:
        """アクションの検証を実行"""
        if not action.validation_command:
            return True
        
        try:
            working_dir = self.project_root / action.working_dir if action.working_dir else self.project_root
            
            process = await asyncio.create_subprocess_shell(
                action.validation_command,
                cwd=working_dir,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE
            )
            
            await asyncio.wait_for(process.communicate(), timeout=30)
            
            success = process.returncode == 0
            self.logger.debug(f"Validation {'✅ passed' if success else '❌ failed'}: {action.name}")
            return success
            
        except Exception as e:
            self.logger.warning(f"Validation error for {action.name}: {e}")
            return False

    async def check_prerequisites(self, action: RepairAction) -> bool:
        """前提条件をチェック"""
        for prereq in action.prerequisites:
            # 前提条件のアクションを探す
            prereq_action = None
            for category_actions in self.repair_actions.values():
                for act in category_actions:
                    if act.name == prereq:
                        prereq_action = act
                        break
                if prereq_action:
                    break
            
            if prereq_action:
                # 前提条件の検証を実行
                if not await self.validate_action(prereq_action):
                    self.logger.warning(f"Prerequisite not met: {prereq} for {action.name}")
                    return False
            else:
                self.logger.warning(f"Unknown prerequisite: {prereq} for {action.name}")
                return False
        
        return True

    async def execute_repair_category(self, category: str) -> List[RepairResult]:
        """カテゴリ別の修復実行"""
        if category not in self.repair_actions:
            self.logger.error(f"Unknown repair category: {category}")
            return []
        
        actions = self.repair_actions[category]
        results = []
        
        # 優先度順にソート
        sorted_actions = sorted(actions, key=lambda x: x.priority.value)
        
        self.logger.info(f"🔧 Starting repair category: {category} ({len(sorted_actions)} actions)")
        
        for action in sorted_actions:
            # 前提条件チェック
            if not await self.check_prerequisites(action):
                result = RepairResult(
                    action=action,
                    status=RepairStatus.SKIPPED,
                    output="",
                    error="Prerequisites not met",
                    duration=0.0,
                    timestamp=datetime.now(),
                    retry_attempt=0
                )
                results.append(result)
                continue
            
            # 修復実行（リトライ付き）
            for retry in range(action.retry_count + 1):
                result = await self.execute_command(action, retry)
                results.append(result)
                
                if result.status == RepairStatus.SUCCESS:
                    # 検証実行
                    if await self.validate_action(action):
                        self.logger.info(f"✅ Validated: {action.name}")
                        break
                    else:
                        self.logger.warning(f"⚠️ Validation failed: {action.name}")
                        result.status = RepairStatus.PARTIAL
                elif retry < action.retry_count:
                    self.logger.info(f"🔄 Retrying: {action.name} (attempt {retry + 2})")
                    await asyncio.sleep(2)  # リトライ前の待機
                else:
                    self.logger.error(f"❌ Final failure: {action.name}")
                    break
        
        return results

    async def execute_comprehensive_repair(self, categories: Optional[List[str]] = None) -> Dict[str, List[RepairResult]]:
        """包括的修復実行"""
        if self.repair_in_progress:
            self.logger.warning("Repair already in progress")
            return {}
        
        self.repair_in_progress = True
        start_time = time.time()
        
        if categories is None:
            # デフォルトの実行順序
            categories = ["dependency", "config", "database", "linting", "build", "test"]
        
        self.logger.info(f"🚀 Starting comprehensive repair: {categories}")
        
        all_results = {}
        
        try:
            for category in categories:
                if category in self.repair_actions:
                    results = await self.execute_repair_category(category)
                    all_results[category] = results
                    
                    # カテゴリ間の短い待機
                    await asyncio.sleep(1)
                else:
                    self.logger.warning(f"Unknown category: {category}")
            
            # 統計更新
            total_repairs = sum(len(results) for results in all_results.values())
            successful_repairs = sum(
                len([r for r in results if r.status == RepairStatus.SUCCESS])
                for results in all_results.values()
            )
            
            self.execution_stats.update({
                "total_repairs": self.execution_stats["total_repairs"] + total_repairs,
                "successful_repairs": self.execution_stats["successful_repairs"] + successful_repairs,
                "failed_repairs": self.execution_stats["failed_repairs"] + (total_repairs - successful_repairs),
                "last_repair": datetime.now().isoformat()
            })
            
            # 平均実行時間更新
            if total_repairs > 0:
                total_duration = sum(
                    sum(r.duration for r in results)
                    for results in all_results.values()
                )
                self.execution_stats["average_duration"] = total_duration / total_repairs
            
            # 修復履歴に追加
            self.repair_history.append({
                "timestamp": datetime.now().isoformat(),
                "categories": categories,
                "results": all_results,
                "duration": time.time() - start_time,
                "success_rate": successful_repairs / total_repairs if total_repairs > 0 else 0
            })
            
        finally:
            self.repair_in_progress = False
        
        duration = time.time() - start_time
        self.logger.info(f"🎉 Comprehensive repair completed in {duration:.2f}s")
        
        return all_results

    async def smart_repair(self, error_patterns: List[str]) -> Dict[str, List[RepairResult]]:
        """エラーパターンに基づくスマート修復"""
        self.logger.info(f"🧠 Smart repair for {len(error_patterns)} error patterns")
        
        # エラーパターンに基づいてカテゴリを決定
        repair_categories = set()
        
        for pattern in error_patterns:
            pattern_lower = pattern.lower()
            
            if any(keyword in pattern_lower for keyword in ["module", "import", "dependency", "requirements"]):
                repair_categories.add("dependency")
            
            if any(keyword in pattern_lower for keyword in ["build", "compile", "webpack", "vite"]):
                repair_categories.add("build")
            
            if any(keyword in pattern_lower for keyword in ["test", "failed", "assertion", "jest", "pytest"]):
                repair_categories.add("test")
            
            if any(keyword in pattern_lower for keyword in ["database", "connection", "migration"]):
                repair_categories.add("database")
            
            if any(keyword in pattern_lower for keyword in ["syntax", "lint", "style"]):
                repair_categories.add("linting")
            
            if any(keyword in pattern_lower for keyword in ["config", "yaml", "env"]):
                repair_categories.add("config")
        
        # デフォルトカテゴリを追加
        if not repair_categories:
            repair_categories = {"dependency", "config"}
        
        # 依存関係を考慮した順序で実行
        ordered_categories = []
        category_order = ["dependency", "config", "database", "linting", "build", "test"]
        
        for category in category_order:
            if category in repair_categories:
                ordered_categories.append(category)
        
        self.logger.info(f"🎯 Smart repair will execute: {ordered_categories}")
        
        return await self.execute_comprehensive_repair(ordered_categories)

    def save_repair_report(self, results: Dict[str, List[RepairResult]]) -> Path:
        """修復レポートを保存"""
        report_file = self.base_path / f"repair_report_{datetime.now().strftime('%Y%m%d_%H%M%S')}.json"
        
        # JSONシリアライズ可能な形式に変換
        serializable_results = {}
        for category, category_results in results.items():
            serializable_results[category] = []
            for result in category_results:
                serializable_results[category].append({
                    "action_name": result.action.name,
                    "description": result.action.description,
                    "status": result.status.value,
                    "output": result.output[:1000],  # 長いアウトプットは切り詰め
                    "error": result.error[:1000],
                    "duration": result.duration,
                    "timestamp": result.timestamp.isoformat(),
                    "retry_attempt": result.retry_attempt
                })
        
        report_data = {
            "timestamp": datetime.now().isoformat(),
            "results": serializable_results,
            "statistics": self.execution_stats,
            "summary": self.generate_summary(results)
        }
        
        with open(report_file, 'w') as f:
            json.dump(report_data, f, indent=2)
        
        self.logger.info(f"📊 Repair report saved: {report_file}")
        return report_file

    def generate_summary(self, results: Dict[str, List[RepairResult]]) -> Dict:
        """修復サマリーを生成"""
        total_actions = sum(len(category_results) for category_results in results.values())
        successful_actions = sum(
            len([r for r in category_results if r.status == RepairStatus.SUCCESS])
            for category_results in results.values()
        )
        
        category_summary = {}
        for category, category_results in results.items():
            success_count = len([r for r in category_results if r.status == RepairStatus.SUCCESS])
            category_summary[category] = {
                "total": len(category_results),
                "successful": success_count,
                "success_rate": success_count / len(category_results) if category_results else 0
            }
        
        return {
            "total_actions": total_actions,
            "successful_actions": successful_actions,
            "overall_success_rate": successful_actions / total_actions if total_actions > 0 else 0,
            "categories": category_summary
        }

    def get_statistics(self) -> Dict:
        """統計情報を取得"""
        return self.execution_stats.copy()


async def main():
    """テスト実行"""
    engine = AutoRepairEngine()
    
    # テスト: スマート修復
    test_patterns = [
        "ModuleNotFoundError: No module named 'fastapi'",
        "npm ERR! Cannot resolve dependency",
        "FAILED tests/test_api.py::test_create_user"
    ]
    
    print("🔧 Starting smart repair test...")
    results = await engine.smart_repair(test_patterns)
    
    # レポート保存
    report_file = engine.save_repair_report(results)
    print(f"📊 Report saved: {report_file}")
    
    # 統計表示
    stats = engine.get_statistics()
    print(f"📈 Statistics: {stats}")


if __name__ == "__main__":
    asyncio.run(main())