"""
自動修復システム - バックエンドエラーの自動検出・修復
"""

import json
import os
import asyncio
import logging
import traceback
import re
from datetime import datetime, timedelta
from typing import Dict, List, Any, Optional, Tuple
from pathlib import Path
from dataclasses import dataclass, asdict
from enum import Enum

import aiofiles
import sqlalchemy
from fastapi import FastAPI
from pydantic import ValidationError
import subprocess


class ErrorType(Enum):
    """エラータイプの定義"""
    SQLALCHEMY_MODEL = "sqlalchemy_model"
    FASTAPI_ENDPOINT = "fastapi_endpoint"
    PYDANTIC_VALIDATION = "pydantic_validation"
    DATABASE_CONNECTION = "database_connection"
    CORS_CONFIGURATION = "cors_configuration"
    AUTHENTICATION = "authentication"
    IMPORT_ERROR = "import_error"
    SYNTAX_ERROR = "syntax_error"
    UNKNOWN = "unknown"


class FixStatus(Enum):
    """修復ステータス"""
    PENDING = "pending"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    FAILED = "failed"
    SKIPPED = "skipped"


@dataclass
class DetectedError:
    """検出されたエラー情報"""
    id: str
    error_type: ErrorType
    severity: str  # critical, high, medium, low
    message: str
    file_path: Optional[str]
    line_number: Optional[int]
    stack_trace: Optional[str]
    detected_at: str
    context: Dict[str, Any]


@dataclass
class FixAction:
    """修復アクション"""
    id: str
    error_id: str
    fix_type: str
    description: str
    file_changes: Dict[str, str]  # file_path -> content
    commands: List[str]
    validation_tests: List[str]
    status: FixStatus
    applied_at: Optional[str]
    result: Optional[str]


class ErrorDetector:
    """エラー検出器"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.backend_root = self.project_root / "backend"
        self.coordination_dir = self.project_root / "coordination"
        self.logger = logging.getLogger(__name__)
        
    async def detect_errors_from_logs(self) -> List[DetectedError]:
        """ログファイルからエラーを検出"""
        errors = []
        
        # ログファイルのパス
        log_paths = [
            self.backend_root / "logs" / "itsm.log",
            self.backend_root / "logs" / "itsm_error.log",
            self.project_root / "logs" / "git-sync.log"
        ]
        
        for log_path in log_paths:
            if log_path.exists():
                errors.extend(await self._parse_log_file(log_path))
                
        return errors
    
    async def _parse_log_file(self, log_path: Path) -> List[DetectedError]:
        """ログファイルを解析してエラーを抽出"""
        errors = []
        
        try:
            async with aiofiles.open(log_path, 'r', encoding='utf-8') as f:
                content = await f.read()
                
            # エラーパターンの定義
            error_patterns = {
                ErrorType.SQLALCHEMY_MODEL: [
                    r"sqlalchemy\.exc\.(\w+): (.+)",
                    r"AttributeError: .+has no attribute.+",
                    r"IntegrityError: .+"
                ],
                ErrorType.FASTAPI_ENDPOINT: [
                    r"FastAPI.+error: (.+)",
                    r"Starlette.+error: (.+)",
                    r"uvicorn\.error: (.+)"
                ],
                ErrorType.PYDANTIC_VALIDATION: [
                    r"pydantic\.ValidationError: (.+)",
                    r"validation error for (.+)"
                ],
                ErrorType.DATABASE_CONNECTION: [
                    r"could not connect to server: (.+)",
                    r"database connection failed: (.+)",
                    r"sqlite3\.OperationalError: (.+)"
                ],
                ErrorType.CORS_CONFIGURATION: [
                    r"CORS.+error: (.+)",
                    r"Access-Control.+error: (.+)"
                ],
                ErrorType.IMPORT_ERROR: [
                    r"ImportError: (.+)",
                    r"ModuleNotFoundError: (.+)"
                ],
                ErrorType.SYNTAX_ERROR: [
                    r"SyntaxError: (.+)",
                    r"IndentationError: (.+)"
                ]
            }
            
            lines = content.split('\n')
            for i, line in enumerate(lines):
                for error_type, patterns in error_patterns.items():
                    for pattern in patterns:
                        match = re.search(pattern, line, re.IGNORECASE)
                        if match:
                            error = DetectedError(
                                id=f"error_{datetime.now().strftime('%Y%m%d_%H%M%S')}_{i}",
                                error_type=error_type,
                                severity=self._determine_severity(error_type, line),
                                message=match.group(1) if match.groups() else line.strip(),
                                file_path=str(log_path),
                                line_number=i + 1,
                                stack_trace=self._extract_stack_trace(lines, i),
                                detected_at=datetime.now().isoformat(),
                                context={"log_file": str(log_path), "full_line": line}
                            )
                            errors.append(error)
                            
        except Exception as e:
            self.logger.error(f"ログファイル解析エラー {log_path}: {e}")
            
        return errors
    
    def _determine_severity(self, error_type: ErrorType, line: str) -> str:
        """エラーの重要度を判定"""
        if error_type == ErrorType.DATABASE_CONNECTION:
            return "critical"
        elif error_type == ErrorType.SQLALCHEMY_MODEL:
            return "high"
        elif error_type in [ErrorType.FASTAPI_ENDPOINT, ErrorType.PYDANTIC_VALIDATION]:
            return "high"
        elif "critical" in line.lower() or "fatal" in line.lower():
            return "critical"
        elif "error" in line.lower():
            return "medium"
        else:
            return "low"
    
    def _extract_stack_trace(self, lines: List[str], error_line_idx: int) -> Optional[str]:
        """スタックトレースを抽出"""
        stack_lines = []
        
        # エラー行から前後を確認してスタックトレースを抽出
        start_idx = max(0, error_line_idx - 5)
        end_idx = min(len(lines), error_line_idx + 10)
        
        for i in range(start_idx, end_idx):
            line = lines[i].strip()
            if any(keyword in line.lower() for keyword in ["traceback", "file ", "line ", "error"]):
                stack_lines.append(line)
                
        return '\n'.join(stack_lines) if stack_lines else None
    
    async def check_code_syntax(self) -> List[DetectedError]:
        """Pythonコードの構文チェック"""
        errors = []
        
        # Pythonファイルを検索
        for py_file in self.backend_root.glob("**/*.py"):
            if py_file.name.startswith('.'):
                continue
                
            try:
                with open(py_file, 'r', encoding='utf-8') as f:
                    content = f.read()
                    
                # 構文チェック
                try:
                    compile(content, str(py_file), 'exec')
                except SyntaxError as e:
                    error = DetectedError(
                        id=f"syntax_error_{py_file.name}_{e.lineno}",
                        error_type=ErrorType.SYNTAX_ERROR,
                        severity="high",
                        message=str(e),
                        file_path=str(py_file),
                        line_number=e.lineno,
                        stack_trace=traceback.format_exc(),
                        detected_at=datetime.now().isoformat(),
                        context={"error_offset": e.offset, "error_text": e.text}
                    )
                    errors.append(error)
                    
            except Exception as e:
                self.logger.error(f"ファイル構文チェックエラー {py_file}: {e}")
                
        return errors


class AutoFixer:
    """自動修復器"""
    
    def __init__(self, project_root: str):
        self.project_root = Path(project_root)
        self.backend_root = self.project_root / "backend"
        self.logger = logging.getLogger(__name__)
        
    async def generate_fix(self, error: DetectedError) -> Optional[FixAction]:
        """エラーに対する修復アクションを生成"""
        
        fix_generators = {
            ErrorType.SQLALCHEMY_MODEL: self._fix_sqlalchemy_model,
            ErrorType.FASTAPI_ENDPOINT: self._fix_fastapi_endpoint,
            ErrorType.PYDANTIC_VALIDATION: self._fix_pydantic_validation,
            ErrorType.DATABASE_CONNECTION: self._fix_database_connection,
            ErrorType.CORS_CONFIGURATION: self._fix_cors_configuration,
            ErrorType.IMPORT_ERROR: self._fix_import_error,
            ErrorType.SYNTAX_ERROR: self._fix_syntax_error
        }
        
        generator = fix_generators.get(error.error_type)
        if generator:
            return await generator(error)
        return None
    
    async def _fix_sqlalchemy_model(self, error: DetectedError) -> Optional[FixAction]:
        """SQLAlchemyモデルエラーの修復"""
        file_changes = {}
        commands = []
        
        if "has no attribute" in error.message:
            # 属性エラーの場合、モデル定義を確認・修正
            if error.file_path:
                file_path = Path(error.file_path)
                if file_path.exists():
                    async with aiofiles.open(file_path, 'r') as f:
                        content = await f.read()
                    
                    # 一般的な修正パターンを適用
                    fixed_content = self._apply_sqlalchemy_fixes(content, error)
                    file_changes[str(file_path)] = fixed_content
        
        elif "IntegrityError" in error.message:
            # データ整合性エラーの場合
            commands = [
                "python init_database.py",  # データベース再初期化
                "python -m pytest tests/models/ -v"  # モデルテスト実行
            ]
        
        return FixAction(
            id=f"fix_{error.id}",
            error_id=error.id,
            fix_type="sqlalchemy_model_fix",
            description=f"SQLAlchemy model error fix: {error.message[:50]}...",
            file_changes=file_changes,
            commands=commands,
            validation_tests=["python -m pytest tests/models/", "python -c 'from app.models import *'"],
            status=FixStatus.PENDING,
            applied_at=None,
            result=None
        )
    
    def _apply_sqlalchemy_fixes(self, content: str, error: DetectedError) -> str:
        """SQLAlchemy固有の修正を適用"""
        fixes = []
        
        # よくある修正パターン
        patterns = [
            # relationshipの修正
            (r'relationship\("(\w+)"\)', r'relationship("\1", back_populates="\1s")'),
            # 外部キー制約の追加
            (r'(\w+_id) = Column\(Integer\)', r'\1 = Column(Integer, ForeignKey("\1.id"))'),
            # インポートの追加
            ('from sqlalchemy import', 'from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Text, Boolean\nfrom sqlalchemy.orm import relationship'),
        ]
        
        fixed_content = content
        for pattern, replacement in patterns:
            fixed_content = re.sub(pattern, replacement, fixed_content)
            
        return fixed_content
    
    async def _fix_fastapi_endpoint(self, error: DetectedError) -> Optional[FixAction]:
        """FastAPIエンドポイントエラーの修復"""
        file_changes = {}
        
        if error.file_path and Path(error.file_path).exists():
            async with aiofiles.open(error.file_path, 'r') as f:
                content = await f.read()
            
            # FastAPI固有の修正
            fixed_content = self._apply_fastapi_fixes(content, error)
            file_changes[error.file_path] = fixed_content
        
        return FixAction(
            id=f"fix_{error.id}",
            error_id=error.id,
            fix_type="fastapi_endpoint_fix",
            description=f"FastAPI endpoint fix: {error.message[:50]}...",
            file_changes=file_changes,
            commands=[],
            validation_tests=["python -m pytest tests/api/ -v"],
            status=FixStatus.PENDING,
            applied_at=None,
            result=None
        )
    
    def _apply_fastapi_fixes(self, content: str, error: DetectedError) -> str:
        """FastAPI固有の修正を適用"""
        fixes = [
            # 依存関数の修正
            (r'def (\w+)\(([^)]+)\):', r'def \1(\2, db: Session = Depends(get_db)):'),
            # レスポンス型の追加
            (r'@router\.(get|post|put|delete)\("([^"]+)"\)', r'@router.\1("\2", response_model=dict)'),
            # 例外処理の追加
            ('raise HTTPException', 'from fastapi import HTTPException\nraise HTTPException'),
        ]
        
        fixed_content = content
        for pattern, replacement in fixes:
            if re.search(pattern, content) and not re.search(replacement.split('\n')[-1], content):
                fixed_content = re.sub(pattern, replacement, fixed_content)
                
        return fixed_content
    
    async def _fix_pydantic_validation(self, error: DetectedError) -> Optional[FixAction]:
        """Pydanticバリデーションエラーの修復"""
        file_changes = {}
        
        if error.file_path and Path(error.file_path).exists():
            async with aiofiles.open(error.file_path, 'r') as f:
                content = await f.read()
            
            fixed_content = self._apply_pydantic_fixes(content, error)
            file_changes[error.file_path] = fixed_content
        
        return FixAction(
            id=f"fix_{error.id}",
            error_id=error.id,
            fix_type="pydantic_validation_fix",
            description=f"Pydantic validation fix: {error.message[:50]}...",
            file_changes=file_changes,
            commands=[],
            validation_tests=["python -c 'from app.schemas import *'"],
            status=FixStatus.PENDING,
            applied_at=None,
            result=None
        )
    
    def _apply_pydantic_fixes(self, content: str, error: DetectedError) -> str:
        """Pydantic固有の修正を適用"""
        fixes = [
            # フィールドバリデーションの追加
            (r'(\w+): str', r'\1: str = Field(..., min_length=1)'),
            (r'(\w+): int', r'\1: int = Field(..., ge=0)'),
            # オプショナルフィールドの修正
            (r'(\w+): (\w+) = None', r'\1: Optional[\2] = None'),
            # インポートの追加
            ('from pydantic import', 'from pydantic import BaseModel, Field, validator\nfrom typing import Optional'),
        ]
        
        fixed_content = content
        for pattern, replacement in fixes:
            fixed_content = re.sub(pattern, replacement, fixed_content)
            
        return fixed_content
    
    async def _fix_database_connection(self, error: DetectedError) -> Optional[FixAction]:
        """データベース接続エラーの修復"""
        return FixAction(
            id=f"fix_{error.id}",
            error_id=error.id,
            fix_type="database_connection_fix",
            description="Database connection fix",
            file_changes={},
            commands=[
                "python init_sqlite_db.py",  # SQLiteデータベース初期化
                "python -c 'from app.db.base import engine; engine.connect()'",  # 接続テスト
            ],
            validation_tests=["python -c 'from app.db.base import SessionLocal; SessionLocal()'"],
            status=FixStatus.PENDING,
            applied_at=None,
            result=None
        )
    
    async def _fix_cors_configuration(self, error: DetectedError) -> Optional[FixAction]:
        """CORS設定エラーの修復"""
        main_py_path = self.backend_root / "app" / "main.py"
        file_changes = {}
        
        if main_py_path.exists():
            async with aiofiles.open(main_py_path, 'r') as f:
                content = await f.read()
            
            # CORS設定の修正
            if "allow_origins" not in content:
                cors_fix = '''
# CORS設定
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)
'''
                # FastAPIアプリ作成後に挿入
                fixed_content = re.sub(
                    r'(app = FastAPI\([^)]+\))',
                    r'\1\n' + cors_fix,
                    content
                )
                file_changes[str(main_py_path)] = fixed_content
        
        return FixAction(
            id=f"fix_{error.id}",
            error_id=error.id,
            fix_type="cors_configuration_fix",
            description="CORS configuration fix",
            file_changes=file_changes,
            commands=[],
            validation_tests=["python -c 'from app.main import app'"],
            status=FixStatus.PENDING,
            applied_at=None,
            result=None
        )
    
    async def _fix_import_error(self, error: DetectedError) -> Optional[FixAction]:
        """インポートエラーの修復"""
        commands = []
        
        if "ModuleNotFoundError" in error.message:
            # 必要なパッケージのインストール
            module_match = re.search(r"No module named '(\w+)'", error.message)
            if module_match:
                module_name = module_match.group(1)
                commands.append(f"pip install {module_name}")
        
        return FixAction(
            id=f"fix_{error.id}",
            error_id=error.id,
            fix_type="import_error_fix",
            description=f"Import error fix: {error.message[:50]}...",
            file_changes={},
            commands=commands,
            validation_tests=["python -c 'import sys; print(sys.path)'"],
            status=FixStatus.PENDING,
            applied_at=None,
            result=None
        )
    
    async def _fix_syntax_error(self, error: DetectedError) -> Optional[FixAction]:
        """構文エラーの修復"""
        file_changes = {}
        
        if error.file_path and Path(error.file_path).exists():
            async with aiofiles.open(error.file_path, 'r') as f:
                lines = await f.readlines()
            
            # 構文エラーの修正を試行
            if error.line_number and error.line_number <= len(lines):
                line_idx = error.line_number - 1
                line = lines[line_idx]
                
                # 一般的な構文エラーの修正
                fixed_line = self._fix_syntax_line(line, error)
                if fixed_line != line:
                    lines[line_idx] = fixed_line
                    file_changes[error.file_path] = ''.join(lines)
        
        return FixAction(
            id=f"fix_{error.id}",
            error_id=error.id,
            fix_type="syntax_error_fix",
            description=f"Syntax error fix: {error.message[:50]}...",
            file_changes=file_changes,
            commands=[],
            validation_tests=[f"python -m py_compile {error.file_path}"],
            status=FixStatus.PENDING,
            applied_at=None,
            result=None
        )
    
    def _fix_syntax_line(self, line: str, error: DetectedError) -> str:
        """1行の構文エラーを修正"""
        # よくある構文エラーの修正パターン
        fixes = [
            # カンマの追加
            (r'(\w+)\s*$', r'\1,'),
            # コロンの追加
            (r'(if|elif|else|try|except|finally|for|while|def|class|with)\s+([^:]+)$', r'\1 \2:'),
            # 括弧の閉じ忘れ
            (r'\([^)]*$', line + ')'),
            # インデント修正
            (r'^(\s*)(.+)', lambda m: '    ' + m.group(2) if len(m.group(1)) % 4 != 0 else line),
        ]
        
        for pattern, replacement in fixes:
            if callable(replacement):
                match = re.match(pattern, line)
                if match:
                    return replacement(match)
            else:
                fixed = re.sub(pattern, replacement, line)
                if fixed != line:
                    return fixed
                    
        return line
    
    async def apply_fix(self, fix_action: FixAction) -> bool:
        """修復アクションを適用"""
        try:
            fix_action.status = FixStatus.IN_PROGRESS
            
            # ファイル変更の適用
            for file_path, new_content in fix_action.file_changes.items():
                async with aiofiles.open(file_path, 'w', encoding='utf-8') as f:
                    await f.write(new_content)
                self.logger.info(f"ファイル修正適用: {file_path}")
            
            # コマンド実行
            for command in fix_action.commands:
                result = subprocess.run(
                    command.split(),
                    cwd=self.backend_root,
                    capture_output=True,
                    text=True,
                    timeout=300
                )
                if result.returncode != 0:
                    self.logger.error(f"コマンド実行失敗: {command}\n{result.stderr}")
                    fix_action.status = FixStatus.FAILED
                    fix_action.result = f"Command failed: {result.stderr}"
                    return False
            
            # バリデーションテスト実行
            for test_command in fix_action.validation_tests:
                result = subprocess.run(
                    test_command.split(),
                    cwd=self.backend_root,
                    capture_output=True,
                    text=True,
                    timeout=60
                )
                if result.returncode != 0:
                    self.logger.warning(f"バリデーションテスト失敗: {test_command}")
            
            fix_action.status = FixStatus.COMPLETED
            fix_action.applied_at = datetime.now().isoformat()
            fix_action.result = "Successfully applied"
            
            return True
            
        except Exception as e:
            self.logger.error(f"修復適用エラー: {e}")
            fix_action.status = FixStatus.FAILED
            fix_action.result = str(e)
            return False


class AutoRepairSystem:
    """自動修復システムメインクラス"""
    
    def __init__(self, project_root: str = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem"):
        self.project_root = Path(project_root)
        self.coordination_dir = self.project_root / "coordination"
        self.errors_file = self.coordination_dir / "errors.json"
        self.fixes_file = self.coordination_dir / "fixes.json"
        
        self.detector = ErrorDetector(project_root)
        self.fixer = AutoFixer(project_root)
        self.logger = logging.getLogger(__name__)
        
        # 監視間隔（秒）
        self.monitoring_interval = 30
        self.is_running = False
    
    async def run_once(self) -> Dict[str, Any]:
        """1回の修復サイクルを実行"""
        self.logger.info("自動修復サイクル開始")
        
        # エラー検出
        detected_errors = []
        detected_errors.extend(await self.detector.detect_errors_from_logs())
        detected_errors.extend(await self.detector.check_code_syntax())
        
        # 重要度でソート
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        detected_errors.sort(key=lambda e: severity_order.get(e.severity, 4))
        
        # エラー情報を保存
        await self._save_errors(detected_errors)
        
        # 修復実行
        fixes_applied = []
        for error in detected_errors:
            if error.severity in ["critical", "high"]:
                fix_action = await self.fixer.generate_fix(error)
                if fix_action:
                    success = await self.fixer.apply_fix(fix_action)
                    fixes_applied.append(fix_action)
                    
                    if success:
                        self.logger.info(f"修復成功: {error.error_type.value} - {error.message[:50]}...")
                    else:
                        self.logger.error(f"修復失敗: {error.error_type.value} - {error.message[:50]}...")
        
        # 修復結果を保存
        await self._save_fixes(fixes_applied)
        
        # APIテスト実行
        test_results = await self._run_api_tests()
        
        # 結果サマリー
        result = {
            "cycle_completed_at": datetime.now().isoformat(),
            "errors_detected": len(detected_errors),
            "fixes_attempted": len(fixes_applied),
            "fixes_successful": len([f for f in fixes_applied if f.status == FixStatus.COMPLETED]),
            "test_results": test_results,
            "errors": [asdict(e) for e in detected_errors],
            "fixes": [asdict(f) for f in fixes_applied]
        }
        
        self.logger.info(f"修復サイクル完了: {result['fixes_successful']}/{result['fixes_attempted']} 修復成功")
        return result
    
    async def _save_errors(self, errors: List[DetectedError]):
        """エラー情報をファイルに保存"""
        error_data = {
            "backend_errors": [],
            "api_errors": [],
            "database_errors": [],
            "validation_errors": [],
            "cors_errors": [],
            "authentication_errors": [],
            "last_check": datetime.now().isoformat(),
            "error_count": len(errors)
        }
        
        for error in errors:
            error_dict = asdict(error)
            if error.error_type == ErrorType.SQLALCHEMY_MODEL:
                error_data["database_errors"].append(error_dict)
            elif error.error_type == ErrorType.FASTAPI_ENDPOINT:
                error_data["api_errors"].append(error_dict)
            elif error.error_type == ErrorType.PYDANTIC_VALIDATION:
                error_data["validation_errors"].append(error_dict)
            elif error.error_type == ErrorType.CORS_CONFIGURATION:
                error_data["cors_errors"].append(error_dict)
            elif error.error_type == ErrorType.AUTHENTICATION:
                error_data["authentication_errors"].append(error_dict)
            else:
                error_data["backend_errors"].append(error_dict)
        
        async with aiofiles.open(self.errors_file, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(error_data, indent=2, ensure_ascii=False))
    
    async def _save_fixes(self, fixes: List[FixAction]):
        """修復情報をファイルに保存"""
        try:
            # 既存の修復履歴を読み込み
            existing_fixes = []
            if self.fixes_file.exists():
                async with aiofiles.open(self.fixes_file, 'r', encoding='utf-8') as f:
                    data = json.loads(await f.read())
                    existing_fixes = data.get("fixes_applied", [])
        except:
            existing_fixes = []
        
        # 新しい修復を追加
        all_fixes = existing_fixes + [asdict(f) for f in fixes]
        successful_fixes = [f for f in all_fixes if f.get("status") == "completed"]
        
        fix_data = {
            "fixes_applied": all_fixes,
            "last_fix": datetime.now().isoformat() if fixes else None,
            "total_fixes": len(all_fixes),
            "success_rate": len(successful_fixes) / len(all_fixes) if all_fixes else 0.0,
            "failed_fixes": [f for f in all_fixes if f.get("status") == "failed"]
        }
        
        async with aiofiles.open(self.fixes_file, 'w', encoding='utf-8') as f:
            await f.write(json.dumps(fix_data, indent=2, ensure_ascii=False))
    
    async def _run_api_tests(self) -> Dict[str, Any]:
        """APIテストを実行"""
        try:
            # pytest実行
            result = subprocess.run(
                ["python", "-m", "pytest", "tests/api/", "-v", "--tb=short"],
                cwd=self.project_root / "backend",
                capture_output=True,
                text=True,
                timeout=300
            )
            
            return {
                "success": result.returncode == 0,
                "output": result.stdout,
                "errors": result.stderr,
                "executed_at": datetime.now().isoformat()
            }
        except Exception as e:
            return {
                "success": False,
                "output": "",
                "errors": str(e),
                "executed_at": datetime.now().isoformat()
            }
    
    async def start_monitoring(self):
        """継続監視を開始"""
        self.is_running = True
        self.logger.info("自動修復システム監視開始")
        
        while self.is_running:
            try:
                await self.run_once()
                await asyncio.sleep(self.monitoring_interval)
            except Exception as e:
                self.logger.error(f"監視サイクルエラー: {e}")
                await asyncio.sleep(self.monitoring_interval)
    
    def stop_monitoring(self):
        """監視を停止"""
        self.is_running = False
        self.logger.info("自動修復システム監視停止")


# 使用例
async def main():
    """メイン実行関数"""
    repair_system = AutoRepairSystem()
    
    # 1回実行
    result = await repair_system.run_once()
    print(json.dumps(result, indent=2, ensure_ascii=False))
    
    # 継続監視（必要に応じて）
    # await repair_system.start_monitoring()


if __name__ == "__main__":
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
    )
    asyncio.run(main())