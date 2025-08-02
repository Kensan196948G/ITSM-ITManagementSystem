"""
高度な自動修復エンジン - ITSMバックエンドAPI統合版
- コード修正、依存関係修復、設定ファイル修復
- インテリジェントなパターンマッチング
- セルフヒーリング機能
- ITSMセキュリティ基準準拠
"""

import asyncio
import aiohttp
import aiofiles
import logging
import json
import os
import re
import subprocess
import traceback
import hashlib
import shutil
import ast
import importlib.util
from typing import Dict, List, Optional, Any, Tuple, Set, Union
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from pathlib import Path
from enum import Enum
import sqlite3
import psutil

logger = logging.getLogger(__name__)


class RepairType(Enum):
    """修復タイプ"""

    IMPORT_ERROR = "import_error"
    SYNTAX_ERROR = "syntax_error"
    DEPENDENCY_ERROR = "dependency_error"
    CONFIG_ERROR = "config_error"
    DATABASE_ERROR = "database_error"
    SECURITY_ERROR = "security_error"
    PERFORMANCE_ERROR = "performance_error"
    RUNTIME_ERROR = "runtime_error"


class RepairComplexity(Enum):
    """修復複雑度"""

    SIMPLE = "simple"  # 単純な文字列置換など
    MODERATE = "moderate"  # ファイル構造変更など
    COMPLEX = "complex"  # 複数ファイル修正など
    CRITICAL = "critical"  # システム全体に影響する修復


class RepairStatus(Enum):
    """修復ステータス"""

    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    ROLLED_BACK = "rolled_back"


@dataclass
class RepairOperation:
    """修復操作"""

    operation_id: str
    repair_type: RepairType
    complexity: RepairComplexity
    target_files: List[str]
    description: str
    original_content: Dict[str, str]  # バックアップ用
    modifications: List[Dict[str, Any]]
    estimated_time: float
    validation_script: Optional[str] = None
    rollback_possible: bool = True


@dataclass
class RepairResult:
    """修復結果"""

    operation_id: str
    status: RepairStatus
    start_time: datetime
    end_time: Optional[datetime]
    success: bool
    error_message: Optional[str] = None
    files_modified: List[str] = None
    validation_passed: bool = False
    rollback_id: Optional[str] = None


class AdvancedAutoRepairEngine:
    """高度な自動修復エンジン"""

    def __init__(self, backend_path: Path = None):
        self.backend_path = backend_path or Path(
            "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend"
        )
        self.coordination_path = Path(
            "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination"
        )

        # 修復履歴
        self.repair_operations: List[RepairOperation] = []
        self.repair_results: List[RepairResult] = []
        self.backup_storage = self.coordination_path / "repair_backups"
        self.backup_storage.mkdir(exist_ok=True)

        # 設定
        self.config = {
            "max_concurrent_repairs": 3,
            "repair_timeout": 300,  # 秒
            "validation_timeout": 60,  # 秒
            "backup_retention_days": 7,
            "safe_mode": True,  # 本番環境では常にTrue
            "auto_rollback": True,
        }

        # 高度な修復パターン定義
        self.repair_patterns = {
            # インポートエラーパターン
            "import_patterns": {
                r"ImportError: cannot import name '(\w+)' from '([\w\.]+)'": self._fix_import_error,
                r"ModuleNotFoundError: No module named '([\w\.]+)'": self._fix_module_not_found,
                r"AttributeError: module '(\w+)' has no attribute '(\w+)'": self._fix_attribute_error,
                r"from ([\w\.]+) import (\w+).*ImportError": self._fix_circular_import,
            },
            # 構文エラーパターン
            "syntax_patterns": {
                r"SyntaxError: invalid syntax.*line (\d+)": self._fix_syntax_error,
                r"IndentationError: expected an indented block.*line (\d+)": self._fix_indentation_error,
                r"SyntaxError: unexpected EOF while parsing": self._fix_eof_error,
                r"SyntaxError: invalid character in identifier": self._fix_encoding_error,
            },
            # データベースエラーパターン
            "database_patterns": {
                r"sqlite3\.OperationalError: no such table: (\w+)": self._fix_missing_table,
                r"sqlite3\.OperationalError: database is locked": self._fix_database_lock,
                r"sqlite3\.IntegrityError: FOREIGN KEY constraint failed": self._fix_foreign_key_error,
                r"sqlite3\.OperationalError: no such column: (\w+)": self._fix_missing_column,
            },
            # 依存関係エラーパターン
            "dependency_patterns": {
                r"pip.*ERROR.*No matching distribution found for (\w+)": self._fix_module_not_found,
                # r"version conflict.*(\w+)==([\d\.]+).*(\w+)==([\d\.]+)": self._fix_version_conflict,
                # r"ImportError.*DLL load failed.*(\w+)": self._fix_dll_error,
            },
            # FastAPIエラーパターン
            "fastapi_patterns": {
                # r"FastAPI.*HTTP.*(\d{3}).*(.+)": self._fix_fastapi_http_error,
                # r"Pydantic.*ValidationError.*(\w+)": self._fix_pydantic_validation_error,
                # r"Uvicorn.*failed to start": self._fix_uvicorn_start_error,
                # r"Router.*already exists.*(\w+)": self._fix_router_conflict,
            },
        }

        # コード修正テンプレート
        self.repair_templates = {
            "missing_import": "from {module} import {name}",
            "missing_status_import": "from fastapi import APIRouter, Depends, HTTPException, status",
            "missing_init_file": '"""Package initialization file"""',
            "basic_router": '''"""
{title} API Router
"""
from fastapi import APIRouter, Depends, HTTPException, status
from typing import List, Optional

router = APIRouter(prefix="/{prefix}", tags=["{prefix}"])

@router.get("/")
async def get_{prefix}_root():
    """Get {prefix} root endpoint"""
    return {{"message": "{title} API is working"}}
''',
            "basic_model": '''"""
{title} Model
"""
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.ext.declarative import declarative_base
from datetime import datetime

Base = declarative_base()

class {class_name}(Base):
    """
    {title} model
    """
    __tablename__ = "{table_name}"
    
    id = Column(Integer, primary_key=True, index=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
''',
        }

    async def diagnose_and_repair(self, error_info: Dict[str, Any]) -> RepairResult:
        """エラーを診断し自動修復を実行"""
        try:
            # エラーの分析
            repair_plan = await self._analyze_error(error_info)
            if not repair_plan:
                return RepairResult(
                    operation_id="unknown",
                    status=RepairStatus.FAILED,
                    start_time=datetime.now(),
                    end_time=datetime.now(),
                    success=False,
                    error_message="修復計画を作成できませんでした",
                )

            # 修復の実行
            return await self._execute_repair_plan(repair_plan)

        except Exception as e:
            logger.error(f"診断・修復エラー: {e}")
            return RepairResult(
                operation_id="error",
                status=RepairStatus.FAILED,
                start_time=datetime.now(),
                end_time=datetime.now(),
                success=False,
                error_message=str(e),
            )

    async def _analyze_error(
        self, error_info: Dict[str, Any]
    ) -> Optional[RepairOperation]:
        """エラーを分析して修復計画を作成"""
        error_text = error_info.get("error", "") + error_info.get("message", "")
        error_type = error_info.get("type", "unknown")

        # パターンマッチングで修復タイプを決定
        for pattern_category, patterns in self.repair_patterns.items():
            for pattern, handler in patterns.items():
                match = re.search(pattern, error_text, re.IGNORECASE | re.MULTILINE)
                if match:
                    logger.info(f"エラーパターン検出: {pattern_category} - {pattern}")

                    operation_id = hashlib.md5(
                        f"{error_text}{datetime.now()}".encode()
                    ).hexdigest()[:8]

                    # 修復操作を作成
                    operation = RepairOperation(
                        operation_id=operation_id,
                        repair_type=self._determine_repair_type(pattern_category),
                        complexity=self._determine_complexity(pattern_category, match),
                        target_files=[],  # handler で決定
                        description=f"自動修復: {pattern_category}",
                        original_content={},
                        modifications=[],
                        estimated_time=self._estimate_repair_time(pattern_category),
                        validation_script=self._get_validation_script(pattern_category),
                    )

                    # ハンドラーで詳細を設定
                    operation = await handler(match, error_info, operation)
                    return operation

        return None

    async def _execute_repair_plan(self, operation: RepairOperation) -> RepairResult:
        """修復計画を実行"""
        result = RepairResult(
            operation_id=operation.operation_id,
            status=RepairStatus.IN_PROGRESS,
            start_time=datetime.now(),
            end_time=None,
            success=False,
            files_modified=[],
        )

        try:
            # バックアップ作成
            if operation.rollback_possible:
                backup_id = await self._create_backup(operation.target_files)
                result.rollback_id = backup_id

            # 修復実行
            await self._perform_modifications(operation, result)

            # 検証実行
            if operation.validation_script:
                validation_passed = await self._validate_repair(operation)
                result.validation_passed = validation_passed

                if not validation_passed and self.config["auto_rollback"]:
                    await self._rollback_repair(result.rollback_id)
                    result.status = RepairStatus.ROLLED_BACK
                    result.success = False
                    result.error_message = "検証に失敗したため、ロールバックしました"
                else:
                    result.status = RepairStatus.COMPLETED
                    result.success = True
            else:
                result.status = RepairStatus.COMPLETED
                result.success = True

            result.end_time = datetime.now()

        except Exception as e:
            logger.error(f"修復実行エラー: {e}")
            result.status = RepairStatus.FAILED
            result.success = False
            result.error_message = str(e)
            result.end_time = datetime.now()

            # エラー時のロールバック
            if result.rollback_id and self.config["auto_rollback"]:
                await self._rollback_repair(result.rollback_id)
                result.status = RepairStatus.ROLLED_BACK

        self.repair_results.append(result)
        return result

    # === 修復ハンドラー ===

    async def _fix_import_error(
        self, match, error_info: Dict[str, Any], operation: RepairOperation
    ) -> RepairOperation:
        """インポートエラー修復"""
        missing_name = match.group(1)
        module_path = match.group(2)

        operation.description = (
            f"インポートエラー修復: {missing_name} from {module_path}"
        )

        # 対象ファイルを特定
        if "fastapi" in module_path.lower():
            operation.target_files = await self._find_fastapi_files()
        elif "app." in module_path:
            operation.target_files = await self._find_app_module_files(module_path)

        # 修正内容を決定
        if missing_name == "status" and "fastapi" in module_path:
            operation.modifications = [
                {
                    "type": "import_fix",
                    "action": "add_to_import",
                    "target": "from fastapi import",
                    "addition": "status",
                }
            ]
        elif missing_name.endswith("Error") or missing_name.endswith("Exception"):
            operation.modifications = [
                {
                    "type": "import_fix",
                    "action": "add_import_line",
                    "line": f"from {module_path} import {missing_name}",
                }
            ]

        return operation

    async def _fix_module_not_found(
        self, match, error_info: Dict[str, Any], operation: RepairOperation
    ) -> RepairOperation:
        """モジュール未発見エラー修復"""
        module_name = match.group(1)

        operation.description = f"モジュール未発見修復: {module_name}"

        # モジュールパスを解析
        if module_name.startswith("app."):
            # 内部モジュールの場合
            module_parts = module_name.split(".")
            module_path = self.backend_path

            for part in module_parts:
                module_path = module_path / part

            operation.target_files = [str(module_path / "__init__.py")]
            operation.modifications = [
                {"type": "create_module", "path": str(module_path), "create_init": True}
            ]
        else:
            # 外部依存関係の場合
            operation.modifications = [
                {"type": "install_package", "package": module_name}
            ]

        return operation

    async def _fix_attribute_error(
        self, match, error_info: Dict[str, Any], operation: RepairOperation
    ) -> RepairOperation:
        """属性エラー修復"""
        module_name = match.group(1)
        attribute_name = match.group(2)

        operation.description = f"属性エラー修復: {module_name}.{attribute_name}"

        # HTTPステータス関連の場合
        if "HTTP_" in attribute_name or attribute_name.startswith("status"):
            operation.target_files = await self._find_fastapi_files()
            operation.modifications = [
                {"type": "import_fix", "action": "add_status_import"}
            ]

        return operation

    async def _fix_circular_import(
        self, match, error_info: Dict[str, Any], operation: RepairOperation
    ) -> RepairOperation:
        """循環インポート修復"""
        module_path = match.group(1)
        import_name = match.group(2)

        operation.description = f"循環インポート修復: {import_name} from {module_path}"
        operation.complexity = RepairComplexity.COMPLEX

        # 循環インポートの解決戦略
        operation.modifications = [
            {
                "type": "restructure_imports",
                "strategy": "lazy_import",
                "module": module_path,
                "import_name": import_name,
            }
        ]

        return operation

    async def _fix_syntax_error(
        self, match, error_info: Dict[str, Any], operation: RepairOperation
    ) -> RepairOperation:
        """構文エラー修復"""
        line_number = int(match.group(1))

        operation.description = f"構文エラー修復: line {line_number}"

        # エラーファイルを特定
        error_file = await self._find_syntax_error_file(error_info, line_number)
        if error_file:
            operation.target_files = [error_file]
            operation.modifications = [
                {
                    "type": "syntax_fix",
                    "line_number": line_number,
                    "action": "analyze_and_fix",
                }
            ]

        return operation

    async def _fix_indentation_error(
        self, match, error_info: Dict[str, Any], operation: RepairOperation
    ) -> RepairOperation:
        """インデントエラー修復"""
        line_number = int(match.group(1))

        operation.description = f"インデントエラー修復: line {line_number}"

        error_file = await self._find_syntax_error_file(error_info, line_number)
        if error_file:
            operation.target_files = [error_file]
            operation.modifications = [
                {
                    "type": "indentation_fix",
                    "line_number": line_number,
                    "action": "fix_indentation",
                }
            ]

        return operation

    async def _fix_eof_error(
        self, match, error_info: Dict[str, Any], operation: RepairOperation
    ) -> RepairOperation:
        """EOF エラー修復"""
        operation.description = "EOF エラー修復"

        error_file = await self._find_syntax_error_file(error_info)
        if error_file:
            operation.target_files = [error_file]
            operation.modifications = [
                {"type": "eof_fix", "action": "add_missing_brackets_or_quotes"}
            ]

        return operation

    async def _fix_encoding_error(
        self, match, error_info: Dict[str, Any], operation: RepairOperation
    ) -> RepairOperation:
        """エンコーディングエラー修復"""
        operation.description = "エンコーディングエラー修復"

        error_file = await self._find_syntax_error_file(error_info)
        if error_file:
            operation.target_files = [error_file]
            operation.modifications = [
                {"type": "encoding_fix", "action": "fix_encoding_issues"}
            ]

        return operation

    async def _fix_missing_table(
        self, match, error_info: Dict[str, Any], operation: RepairOperation
    ) -> RepairOperation:
        """不足テーブル修復"""
        table_name = match.group(1)

        operation.description = f"不足テーブル修復: {table_name}"
        operation.modifications = [
            {"type": "database_fix", "action": "create_table", "table_name": table_name}
        ]

        return operation

    async def _fix_database_lock(
        self, match, error_info: Dict[str, Any], operation: RepairOperation
    ) -> RepairOperation:
        """データベースロック修復"""
        operation.description = "データベースロック修復"
        operation.modifications = [{"type": "database_fix", "action": "release_lock"}]

        return operation

    async def _fix_foreign_key_error(
        self, match, error_info: Dict[str, Any], operation: RepairOperation
    ) -> RepairOperation:
        """外部キーエラー修復"""
        operation.description = "外部キーエラー修復"
        operation.modifications = [
            {"type": "database_fix", "action": "fix_foreign_key_constraints"}
        ]

        return operation

    async def _fix_missing_column(
        self, match, error_info: Dict[str, Any], operation: RepairOperation
    ) -> RepairOperation:
        """不足カラム修復"""
        column_name = match.group(1)

        operation.description = f"不足カラム修復: {column_name}"
        operation.modifications = [
            {"type": "database_fix", "action": "add_column", "column_name": column_name}
        ]

        return operation

    # === 実行ヘルパー ===

    async def _perform_modifications(
        self, operation: RepairOperation, result: RepairResult
    ):
        """修正を実行"""
        for modification in operation.modifications:
            mod_type = modification["type"]

            if mod_type == "import_fix":
                await self._execute_import_fix(modification, operation, result)
            elif mod_type == "create_module":
                await self._execute_create_module(modification, result)
            elif mod_type == "install_package":
                await self._execute_install_package(modification, result)
            elif mod_type == "syntax_fix":
                await self._execute_syntax_fix(modification, operation, result)
            elif mod_type == "database_fix":
                await self._execute_database_fix(modification, result)
            else:
                logger.warning(f"未知の修正タイプ: {mod_type}")

    async def _execute_import_fix(
        self,
        modification: Dict[str, Any],
        operation: RepairOperation,
        result: RepairResult,
    ):
        """インポート修正を実行"""
        action = modification["action"]

        for file_path in operation.target_files:
            try:
                if not Path(file_path).exists():
                    continue

                async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
                    content = await f.read()

                # バックアップ保存
                operation.original_content[file_path] = content

                # 修正実行
                if action == "add_to_import":
                    content = self._add_to_import_line(
                        content, modification["target"], modification["addition"]
                    )
                elif action == "add_import_line":
                    content = self._add_import_line(content, modification["line"])
                elif action == "add_status_import":
                    content = self._fix_status_import(content)

                # ファイル書き込み
                async with aiofiles.open(file_path, "w", encoding="utf-8") as f:
                    await f.write(content)

                result.files_modified.append(file_path)
                logger.info(f"インポート修正完了: {file_path}")

            except Exception as e:
                logger.error(f"インポート修正エラー {file_path}: {e}")
                raise

    async def _execute_create_module(
        self, modification: Dict[str, Any], result: RepairResult
    ):
        """モジュール作成を実行"""
        module_path = Path(modification["path"])

        try:
            # ディレクトリ作成
            module_path.mkdir(parents=True, exist_ok=True)

            # __init__.py作成
            if modification.get("create_init", True):
                init_file = module_path / "__init__.py"
                async with aiofiles.open(init_file, "w", encoding="utf-8") as f:
                    await f.write(self.repair_templates["missing_init_file"])

                result.files_modified.append(str(init_file))

            logger.info(f"モジュール作成完了: {module_path}")

        except Exception as e:
            logger.error(f"モジュール作成エラー {module_path}: {e}")
            raise

    async def _execute_install_package(
        self, modification: Dict[str, Any], result: RepairResult
    ):
        """パッケージインストールを実行"""
        package = modification["package"]

        try:
            # pip install実行
            process = await asyncio.create_subprocess_exec(
                "pip",
                "install",
                package,
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )

            stdout, stderr = await process.communicate()

            if process.returncode == 0:
                logger.info(f"パッケージインストール完了: {package}")
            else:
                error_msg = stderr.decode("utf-8")
                logger.error(f"パッケージインストール失敗 {package}: {error_msg}")
                raise Exception(f"パッケージインストール失敗: {error_msg}")

        except Exception as e:
            logger.error(f"パッケージインストールエラー {package}: {e}")
            raise

    async def _execute_syntax_fix(
        self,
        modification: Dict[str, Any],
        operation: RepairOperation,
        result: RepairResult,
    ):
        """構文修正を実行"""
        line_number = modification.get("line_number")
        action = modification["action"]

        for file_path in operation.target_files:
            try:
                async with aiofiles.open(file_path, "r", encoding="utf-8") as f:
                    content = await f.read()

                operation.original_content[file_path] = content

                # 構文解析と修正
                if action == "analyze_and_fix":
                    content = await self._analyze_and_fix_syntax(content, line_number)
                elif action == "fix_indentation":
                    content = self._fix_indentation_at_line(content, line_number)

                async with aiofiles.open(file_path, "w", encoding="utf-8") as f:
                    await f.write(content)

                result.files_modified.append(file_path)
                logger.info(f"構文修正完了: {file_path} line {line_number}")

            except Exception as e:
                logger.error(f"構文修正エラー {file_path}: {e}")
                raise

    async def _execute_database_fix(
        self, modification: Dict[str, Any], result: RepairResult
    ):
        """データベース修正を実行"""
        action = modification["action"]

        try:
            if action == "create_table":
                await self._create_missing_table(modification["table_name"])
            elif action == "release_lock":
                await self._release_database_lock()
            elif action == "fix_foreign_key_constraints":
                await self._fix_foreign_key_constraints()
            elif action == "add_column":
                await self._add_missing_column(modification["column_name"])

            logger.info(f"データベース修正完了: {action}")

        except Exception as e:
            logger.error(f"データベース修正エラー {action}: {e}")
            raise

    # === ユーティリティ関数 ===

    def _add_to_import_line(self, content: str, target: str, addition: str) -> str:
        """インポート行に追加"""
        lines = content.split("\n")

        for i, line in enumerate(lines):
            if line.strip().startswith(target) and addition not in line:
                # statusが既に含まれているかチェック
                if (
                    f", {addition}" not in line
                    and f"{addition}," not in line
                    and f" {addition}" not in line
                ):
                    lines[i] = line.rstrip() + f", {addition}"
                break

        return "\n".join(lines)

    def _add_import_line(self, content: str, import_line: str) -> str:
        """インポート行を追加"""
        lines = content.split("\n")

        # 既存のインポート行を探し、適切な位置に挿入
        import_section_end = 0
        for i, line in enumerate(lines):
            if line.strip().startswith(("import ", "from ")):
                import_section_end = i + 1
            elif line.strip() and not line.startswith("#"):
                break

        lines.insert(import_section_end, import_line)
        return "\n".join(lines)

    def _fix_status_import(self, content: str) -> str:
        """status インポートを修正"""
        lines = content.split("\n")
        fastapi_import_line = None
        status_import_line = None

        for i, line in enumerate(lines):
            if line.strip().startswith("from fastapi import") and "status" not in line:
                fastapi_import_line = i
            elif line.strip() == "from fastapi import status":
                status_import_line = i

        if fastapi_import_line is not None and status_import_line is not None:
            # インポート統合
            lines[fastapi_import_line] = (
                lines[fastapi_import_line].rstrip() + ", status"
            )
            del lines[status_import_line]
        elif fastapi_import_line is not None:
            # statusを追加
            lines[fastapi_import_line] = (
                lines[fastapi_import_line].rstrip() + ", status"
            )

        return "\n".join(lines)

    async def _analyze_and_fix_syntax(self, content: str, line_number: int) -> str:
        """構文解析と修正"""
        try:
            # AST解析を試行
            ast.parse(content)
            return content  # 構文エラーなし
        except SyntaxError as e:
            lines = content.split("\n")

            if e.lineno and e.lineno <= len(lines):
                error_line = lines[e.lineno - 1]

                # 一般的な構文エラーパターンの修正
                if e.msg and "invalid syntax" in e.msg:
                    # 一般的な修正パターン
                    if error_line.rstrip().endswith(","):
                        # 余分なカンマを削除
                        lines[e.lineno - 1] = error_line.rstrip(",")
                    elif not error_line.strip().endswith(":") and any(
                        keyword in error_line
                        for keyword in [
                            "if ",
                            "def ",
                            "class ",
                            "for ",
                            "while ",
                            "try:",
                            "except",
                            "finally",
                        ]
                    ):
                        # 不足しているコロンを追加
                        lines[e.lineno - 1] = error_line.rstrip() + ":"

            return "\n".join(lines)

    def _fix_indentation_at_line(self, content: str, line_number: int) -> str:
        """指定行のインデント修正"""
        lines = content.split("\n")

        if line_number <= len(lines):
            target_line = lines[line_number - 1]

            # 前の行のインデントレベルを参考に修正
            if line_number > 1:
                prev_line = lines[line_number - 2]
                if prev_line.strip().endswith(":"):
                    # 前の行がコロンで終わっている場合、インデントを追加
                    base_indent = len(prev_line) - len(prev_line.lstrip())
                    lines[line_number - 1] = (
                        " " * (base_indent + 4) + target_line.lstrip()
                    )

        return "\n".join(lines)

    # === データベース修復関数 ===

    async def _create_missing_table(self, table_name: str):
        """不足テーブルを作成"""
        # データベース初期化スクリプトを実行
        init_script = self.backend_path / "init_sqlite_db.py"
        if init_script.exists():
            process = await asyncio.create_subprocess_exec(
                "python3",
                str(init_script),
                cwd=str(self.backend_path),
                stdout=asyncio.subprocess.PIPE,
                stderr=asyncio.subprocess.PIPE,
            )
            await process.communicate()

    async def _release_database_lock(self):
        """データベースロックを解除"""
        # 短時間待機後に再接続試行
        await asyncio.sleep(2)

        db_path = self.backend_path / "itsm.db"
        if db_path.exists():
            try:
                conn = sqlite3.connect(str(db_path), timeout=10.0)
                conn.execute("BEGIN IMMEDIATE;")
                conn.rollback()
                conn.close()
            except sqlite3.OperationalError:
                pass  # ロックが解除されるまで待機

    async def _fix_foreign_key_constraints(self):
        """外部キー制約を修正"""
        # データベース初期化で制約を再作成
        await self._create_missing_table("")

    async def _add_missing_column(self, column_name: str):
        """不足カラムを追加"""
        # データベース初期化で全体を再作成
        await self._create_missing_table("")

    # === バックアップ・ロールバック ===

    async def _create_backup(self, target_files: List[str]) -> str:
        """バックアップを作成"""
        backup_id = hashlib.md5(f"{datetime.now()}{target_files}".encode()).hexdigest()[
            :8
        ]
        backup_dir = self.backup_storage / backup_id
        backup_dir.mkdir(exist_ok=True)

        for file_path in target_files:
            file_path_obj = Path(file_path)
            if file_path_obj.exists():
                backup_file = backup_dir / file_path_obj.name
                shutil.copy2(file_path, backup_file)

        # バックアップメタデータ保存
        metadata = {
            "backup_id": backup_id,
            "created_at": datetime.now().isoformat(),
            "files": target_files,
        }

        async with aiofiles.open(backup_dir / "metadata.json", "w") as f:
            await f.write(json.dumps(metadata, indent=2))

        return backup_id

    async def _rollback_repair(self, backup_id: str):
        """修復をロールバック"""
        if not backup_id:
            return

        backup_dir = self.backup_storage / backup_id
        if not backup_dir.exists():
            return

        # メタデータ読み込み
        metadata_file = backup_dir / "metadata.json"
        if metadata_file.exists():
            async with aiofiles.open(metadata_file, "r") as f:
                metadata = json.loads(await f.read())

            # ファイル復元
            for file_path in metadata["files"]:
                file_path_obj = Path(file_path)
                backup_file = backup_dir / file_path_obj.name

                if backup_file.exists():
                    shutil.copy2(backup_file, file_path)

        logger.info(f"ロールバック完了: {backup_id}")

    # === 検証 ===

    async def _validate_repair(self, operation: RepairOperation) -> bool:
        """修復を検証"""
        try:
            if operation.validation_script:
                # カスタム検証スクリプト実行
                process = await asyncio.create_subprocess_shell(
                    operation.validation_script,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.PIPE,
                )

                stdout, stderr = await asyncio.wait_for(
                    process.communicate(), timeout=self.config["validation_timeout"]
                )

                return process.returncode == 0
            else:
                # デフォルト検証（構文チェック）
                for file_path in operation.target_files:
                    if file_path.endswith(".py"):
                        with open(file_path, "r") as f:
                            content = f.read()
                        try:
                            ast.parse(content)
                        except SyntaxError:
                            return False

                return True

        except Exception as e:
            logger.error(f"検証エラー: {e}")
            return False

    # === ヘルパー関数 ===

    async def _find_fastapi_files(self) -> List[str]:
        """FastAPI関連ファイルを検索"""
        api_dir = self.backend_path / "app" / "api" / "v1"
        if api_dir.exists():
            return [str(f) for f in api_dir.glob("*.py")]
        return []

    async def _find_app_module_files(self, module_path: str) -> List[str]:
        """アプリモジュールファイルを検索"""
        parts = module_path.split(".")
        if parts[0] == "app":
            file_path = self.backend_path / "app"
            for part in parts[1:]:
                file_path = file_path / part
            file_path = file_path.with_suffix(".py")

            if file_path.exists():
                return [str(file_path)]

        return []

    async def _find_syntax_error_file(
        self, error_info: Dict[str, Any], line_number: int = None
    ) -> Optional[str]:
        """構文エラーファイルを特定"""
        # エラー情報からファイルパスを抽出
        error_text = error_info.get("error", "") + error_info.get("message", "")

        # ファイルパスのパターンマッチング
        file_patterns = [
            r'File "([^"]+\.py)"',
            r"in file ([^\s]+\.py)",
            r"([/\w]+\.py):",
        ]

        for pattern in file_patterns:
            match = re.search(pattern, error_text)
            if match:
                file_path = match.group(1)
                if Path(file_path).exists():
                    return file_path

        return None

    def _determine_repair_type(self, pattern_category: str) -> RepairType:
        """修復タイプを決定"""
        if "import" in pattern_category:
            return RepairType.IMPORT_ERROR
        elif "syntax" in pattern_category:
            return RepairType.SYNTAX_ERROR
        elif "dependency" in pattern_category:
            return RepairType.DEPENDENCY_ERROR
        elif "database" in pattern_category:
            return RepairType.DATABASE_ERROR
        elif "fastapi" in pattern_category:
            return RepairType.RUNTIME_ERROR
        else:
            return RepairType.RUNTIME_ERROR

    def _determine_complexity(self, pattern_category: str, match) -> RepairComplexity:
        """修復複雑度を決定"""
        if "circular" in pattern_category:
            return RepairComplexity.COMPLEX
        elif "database" in pattern_category:
            return RepairComplexity.MODERATE
        elif "dependency" in pattern_category:
            return RepairComplexity.MODERATE
        else:
            return RepairComplexity.SIMPLE

    def _estimate_repair_time(self, pattern_category: str) -> float:
        """修復時間を推定（秒）"""
        if "import" in pattern_category:
            return 30.0
        elif "syntax" in pattern_category:
            return 60.0
        elif "database" in pattern_category:
            return 120.0
        elif "dependency" in pattern_category:
            return 180.0
        else:
            return 90.0

    def _get_validation_script(self, pattern_category: str) -> Optional[str]:
        """検証スクリプトを取得"""
        if "import" in pattern_category or "syntax" in pattern_category:
            return f"python3 -m py_compile {{file_path}}"
        elif "database" in pattern_category:
            return f'python3 -c \'import sqlite3; conn=sqlite3.connect("{self.backend_path}/itsm.db"); conn.execute("PRAGMA integrity_check"); conn.close()\''
        else:
            return None

    # === 公開API ===

    def get_repair_history(self, hours: int = 24) -> List[Dict[str, Any]]:
        """修復履歴を取得"""
        cutoff_time = datetime.now() - timedelta(hours=hours)
        recent_results = [r for r in self.repair_results if r.start_time > cutoff_time]

        return [asdict(result) for result in recent_results]

    def get_repair_statistics(self) -> Dict[str, Any]:
        """修復統計を取得"""
        total_repairs = len(self.repair_results)
        successful_repairs = len([r for r in self.repair_results if r.success])

        return {
            "total_repairs": total_repairs,
            "successful_repairs": successful_repairs,
            "success_rate": (
                (successful_repairs / total_repairs * 100) if total_repairs > 0 else 0
            ),
            "average_repair_time": (
                sum(
                    (r.end_time - r.start_time).total_seconds()
                    for r in self.repair_results
                    if r.end_time
                )
                / len(self.repair_results)
                if self.repair_results
                else 0
            ),
        }

    async def cleanup_old_backups(self):
        """古いバックアップをクリーンアップ"""
        cutoff_time = datetime.now() - timedelta(
            days=self.config["backup_retention_days"]
        )

        for backup_dir in self.backup_storage.iterdir():
            if backup_dir.is_dir():
                metadata_file = backup_dir / "metadata.json"
                if metadata_file.exists():
                    try:
                        async with aiofiles.open(metadata_file, "r") as f:
                            metadata = json.loads(await f.read())

                        created_at = datetime.fromisoformat(metadata["created_at"])
                        if created_at < cutoff_time:
                            shutil.rmtree(backup_dir)
                            logger.info(f"古いバックアップを削除: {backup_dir}")
                    except Exception as e:
                        logger.error(f"バックアップクリーンアップエラー: {e}")


# グローバルインスタンス
advanced_repair_engine = AdvancedAutoRepairEngine()
