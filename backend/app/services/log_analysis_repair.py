"""エラーログ自動分析・修復提案システム"""

import asyncio
import re
import json
import logging
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple, Set
from dataclasses import dataclass, asdict
from enum import Enum
from pathlib import Path
import sqlite3
import aiofiles
from collections import defaultdict, Counter
import hashlib

logger = logging.getLogger(__name__)


class ErrorCategory(Enum):
    """エラーカテゴリ"""
    SYNTAX_ERROR = "syntax_error"
    RUNTIME_ERROR = "runtime_error"
    LOGIC_ERROR = "logic_error"
    CONFIGURATION_ERROR = "configuration_error"
    DEPENDENCY_ERROR = "dependency_error"
    RESOURCE_ERROR = "resource_error"
    NETWORK_ERROR = "network_error"
    DATABASE_ERROR = "database_error"
    AUTHENTICATION_ERROR = "authentication_error"
    AUTHORIZATION_ERROR = "authorization_error"
    VALIDATION_ERROR = "validation_error"
    INTEGRATION_ERROR = "integration_error"
    PERFORMANCE_ERROR = "performance_error"
    UNKNOWN_ERROR = "unknown_error"


class ErrorSeverity(Enum):
    """エラー重要度"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class RepairConfidence(Enum):
    """修復信頼度"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


@dataclass
class LogEntry:
    """ログエントリ"""
    timestamp: float
    level: str
    message: str
    source_file: Optional[str] = None
    line_number: Optional[int] = None
    function_name: Optional[str] = None
    stack_trace: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        return asdict(self)


@dataclass
class AnalyzedError:
    """分析されたエラー"""
    id: str
    timestamp: float
    category: ErrorCategory
    severity: ErrorSeverity
    original_message: str
    normalized_message: str
    affected_component: str
    frequency: int
    first_occurrence: float
    last_occurrence: float
    pattern_hash: str
    stack_trace: Optional[str] = None
    context: Optional[Dict[str, Any]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['category'] = self.category.value
        result['severity'] = self.severity.value
        return result


@dataclass
class RepairSuggestion:
    """修復提案"""
    error_id: str
    suggestion_id: str
    title: str
    description: str
    confidence: RepairConfidence
    estimated_effort: str
    priority: int
    steps: List[str]
    code_changes: Optional[List[Dict[str, str]]] = None
    configuration_changes: Optional[Dict[str, Any]] = None
    dependencies: Optional[List[str]] = None
    risks: Optional[List[str]] = None
    
    def to_dict(self) -> Dict[str, Any]:
        result = asdict(self)
        result['confidence'] = self.confidence.value
        return result


class LogPatternMatcher:
    """ログパターンマッチャー"""
    
    def __init__(self):
        self.error_patterns = self._load_error_patterns()
    
    def _load_error_patterns(self) -> List[Dict[str, Any]]:
        """エラーパターンを読み込み"""
        return [
            # Python エラー
            {
                "name": "AttributeError",
                "pattern": r"AttributeError: '(\w+)' object has no attribute '(\w+)'",
                "category": ErrorCategory.RUNTIME_ERROR,
                "severity": ErrorSeverity.MEDIUM,
                "component_pattern": r"File \"([^\"]+)\"",
                "variables": ["object_type", "attribute_name"]
            },
            {
                "name": "ImportError",
                "pattern": r"ImportError: No module named '(\w+)'",
                "category": ErrorCategory.DEPENDENCY_ERROR,
                "severity": ErrorSeverity.HIGH,
                "component_pattern": r"File \"([^\"]+)\"",
                "variables": ["module_name"]
            },
            {
                "name": "KeyError",
                "pattern": r"KeyError: '(\w+)'",
                "category": ErrorCategory.LOGIC_ERROR,
                "severity": ErrorSeverity.MEDIUM,
                "component_pattern": r"File \"([^\"]+)\"",
                "variables": ["key_name"]
            },
            {
                "name": "FileNotFoundError",
                "pattern": r"FileNotFoundError: \[Errno 2\] No such file or directory: '([^']+)'",
                "category": ErrorCategory.CONFIGURATION_ERROR,
                "severity": ErrorSeverity.HIGH,
                "component_pattern": r"File \"([^\"]+)\"",
                "variables": ["file_path"]
            },
            
            # Database エラー
            {
                "name": "DatabaseConnectionError",
                "pattern": r"(connection\s+refused|could\s+not\s+connect\s+to\s+server)",
                "category": ErrorCategory.DATABASE_ERROR,
                "severity": ErrorSeverity.CRITICAL,
                "component_pattern": r"",
                "variables": []
            },
            {
                "name": "SQLSyntaxError",
                "pattern": r"(syntax\s+error|invalid\s+syntax)",
                "category": ErrorCategory.SYNTAX_ERROR,
                "severity": ErrorSeverity.HIGH,
                "component_pattern": r"",
                "variables": []
            },
            
            # Network エラー
            {
                "name": "ConnectionTimeout",
                "pattern": r"(timeout|timed\s+out)",
                "category": ErrorCategory.NETWORK_ERROR,
                "severity": ErrorSeverity.MEDIUM,
                "component_pattern": r"",
                "variables": []
            },
            {
                "name": "ConnectionRefused",
                "pattern": r"connection\s+refused",
                "category": ErrorCategory.NETWORK_ERROR,
                "severity": ErrorSeverity.HIGH,
                "component_pattern": r"",
                "variables": []
            },
            
            # Authentication/Authorization エラー
            {
                "name": "AuthenticationFailure",
                "pattern": r"(authentication\s+failed|invalid\s+credentials)",
                "category": ErrorCategory.AUTHENTICATION_ERROR,
                "severity": ErrorSeverity.HIGH,
                "component_pattern": r"",
                "variables": []
            },
            {
                "name": "PermissionDenied",
                "pattern": r"(permission\s+denied|access\s+denied)",
                "category": ErrorCategory.AUTHORIZATION_ERROR,
                "severity": ErrorSeverity.MEDIUM,
                "component_pattern": r"",
                "variables": []
            },
            
            # Performance エラー
            {
                "name": "MemoryError",
                "pattern": r"(out\s+of\s+memory|memory\s+error)",
                "category": ErrorCategory.PERFORMANCE_ERROR,
                "severity": ErrorSeverity.CRITICAL,
                "component_pattern": r"",
                "variables": []
            },
            {
                "name": "CPUTimeout",
                "pattern": r"(cpu\s+limit|execution\s+timeout)",
                "category": ErrorCategory.PERFORMANCE_ERROR,
                "severity": ErrorSeverity.HIGH,
                "component_pattern": r"",
                "variables": []
            }
        ]
    
    def analyze_log_entry(self, log_entry: LogEntry) -> Optional[AnalyzedError]:
        """ログエントリを分析"""
        message = log_entry.message.lower()
        
        for pattern_info in self.error_patterns:
            match = re.search(pattern_info["pattern"], message, re.IGNORECASE)
            if match:
                # コンポーネント特定
                component = "unknown"
                if pattern_info["component_pattern"] and log_entry.stack_trace:
                    comp_match = re.search(pattern_info["component_pattern"], log_entry.stack_trace)
                    if comp_match:
                        component = Path(comp_match.group(1)).name
                
                # パターンハッシュ生成
                normalized_message = self._normalize_message(log_entry.message)
                pattern_hash = hashlib.md5(normalized_message.encode()).hexdigest()
                
                return AnalyzedError(
                    id=f"error_{int(log_entry.timestamp)}_{pattern_hash[:8]}",
                    timestamp=log_entry.timestamp,
                    category=pattern_info["category"],
                    severity=pattern_info["severity"],
                    original_message=log_entry.message,
                    normalized_message=normalized_message,
                    affected_component=component,
                    frequency=1,
                    first_occurrence=log_entry.timestamp,
                    last_occurrence=log_entry.timestamp,
                    pattern_hash=pattern_hash,
                    stack_trace=log_entry.stack_trace,
                    context=log_entry.context
                )
        
        # パターンにマッチしない場合は未知のエラー
        return AnalyzedError(
            id=f"error_{int(log_entry.timestamp)}_unknown",
            timestamp=log_entry.timestamp,
            category=ErrorCategory.UNKNOWN_ERROR,
            severity=ErrorSeverity.MEDIUM,
            original_message=log_entry.message,
            normalized_message=self._normalize_message(log_entry.message),
            affected_component="unknown",
            frequency=1,
            first_occurrence=log_entry.timestamp,
            last_occurrence=log_entry.timestamp,
            pattern_hash=hashlib.md5(log_entry.message.encode()).hexdigest(),
            stack_trace=log_entry.stack_trace,
            context=log_entry.context
        )
    
    def _normalize_message(self, message: str) -> str:
        """メッセージを正規化"""
        # 数値、ファイルパス、IDなどの変数部分を置換
        normalized = re.sub(r'\b\d+\b', '{NUMBER}', message)
        normalized = re.sub(r'/[^\s]+', '{PATH}', normalized)
        normalized = re.sub(r'[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}', '{UUID}', normalized)
        normalized = re.sub(r'\b[A-Fa-f0-9]{32}\b', '{HASH}', normalized)
        return normalized.lower().strip()


class RepairSuggestionEngine:
    """修復提案エンジン"""
    
    def __init__(self):
        self.repair_templates = self._load_repair_templates()
    
    def _load_repair_templates(self) -> Dict[ErrorCategory, List[Dict[str, Any]]]:
        """修復テンプレートを読み込み"""
        return {
            ErrorCategory.DEPENDENCY_ERROR: [
                {
                    "title": "Missing dependency installation",
                    "description": "Install the missing Python package",
                    "confidence": RepairConfidence.VERY_HIGH,
                    "effort": "Low (5-10 minutes)",
                    "priority": 1,
                    "steps": [
                        "Identify the missing package from the error message",
                        "Install using pip: pip install {package_name}",
                        "Update requirements.txt if needed",
                        "Restart the application"
                    ],
                    "risks": ["Package version conflicts"]
                },
                {
                    "title": "Add package to requirements",
                    "description": "Add missing package to requirements.txt",
                    "confidence": RepairConfidence.HIGH,
                    "effort": "Low (2-5 minutes)",
                    "priority": 2,
                    "steps": [
                        "Add package to requirements.txt",
                        "Run pip install -r requirements.txt",
                        "Commit changes to version control"
                    ]
                }
            ],
            
            ErrorCategory.CONFIGURATION_ERROR: [
                {
                    "title": "Create missing configuration file",
                    "description": "Create the missing configuration file with default values",
                    "confidence": RepairConfidence.HIGH,
                    "effort": "Medium (15-30 minutes)",
                    "priority": 1,
                    "steps": [
                        "Create the missing file or directory",
                        "Add appropriate default configuration",
                        "Set correct file permissions",
                        "Update documentation"
                    ],
                    "risks": ["Incorrect default values", "Permission issues"]
                }
            ],
            
            ErrorCategory.DATABASE_ERROR: [
                {
                    "title": "Database connection repair",
                    "description": "Fix database connection configuration",
                    "confidence": RepairConfidence.MEDIUM,
                    "effort": "Medium (20-45 minutes)",
                    "priority": 1,
                    "steps": [
                        "Check database service status",
                        "Verify connection parameters",
                        "Test database connectivity",
                        "Update connection pool settings if needed"
                    ],
                    "risks": ["Service disruption", "Data loss"]
                }
            ],
            
            ErrorCategory.RUNTIME_ERROR: [
                {
                    "title": "Null/attribute check",
                    "description": "Add proper null checks and attribute validation",
                    "confidence": RepairConfidence.MEDIUM,
                    "effort": "Low (10-20 minutes)",
                    "priority": 2,
                    "steps": [
                        "Identify the line causing the error",
                        "Add null/none checks before attribute access",
                        "Add proper error handling",
                        "Add logging for debugging"
                    ],
                    "code_changes": [
                        {
                            "type": "add_check",
                            "template": "if obj is not None and hasattr(obj, 'attribute'):"
                        }
                    ]
                }
            ],
            
            ErrorCategory.NETWORK_ERROR: [
                {
                    "title": "Add retry mechanism",
                    "description": "Implement retry logic for network operations",
                    "confidence": RepairConfidence.HIGH,
                    "effort": "Medium (30-60 minutes)",
                    "priority": 1,
                    "steps": [
                        "Implement exponential backoff retry",
                        "Add timeout configuration",
                        "Add proper error handling",
                        "Add monitoring and logging"
                    ],
                    "code_changes": [
                        {
                            "type": "retry_decorator",
                            "template": "@retry(max_attempts=3, backoff_factor=2)"
                        }
                    ]
                }
            ],
            
            ErrorCategory.PERFORMANCE_ERROR: [
                {
                    "title": "Memory optimization",
                    "description": "Optimize memory usage and add resource monitoring",
                    "confidence": RepairConfidence.MEDIUM,
                    "effort": "High (1-3 hours)",
                    "priority": 1,
                    "steps": [
                        "Profile memory usage",
                        "Identify memory leaks",
                        "Optimize data structures",
                        "Add memory monitoring"
                    ],
                    "risks": ["Performance degradation", "Feature changes"]
                }
            ]
        }
    
    def generate_suggestions(self, error: AnalyzedError) -> List[RepairSuggestion]:
        """修復提案を生成"""
        suggestions = []
        templates = self.repair_templates.get(error.category, [])
        
        for i, template in enumerate(templates):
            suggestion = RepairSuggestion(
                error_id=error.id,
                suggestion_id=f"{error.id}_suggestion_{i+1}",
                title=template["title"],
                description=template["description"],
                confidence=template["confidence"],
                estimated_effort=template["effort"],
                priority=template["priority"],
                steps=template["steps"],
                code_changes=template.get("code_changes"),
                configuration_changes=template.get("configuration_changes"),
                dependencies=template.get("dependencies"),
                risks=template.get("risks")
            )
            suggestions.append(suggestion)
        
        # エラー固有の提案を追加
        custom_suggestions = self._generate_custom_suggestions(error)
        suggestions.extend(custom_suggestions)
        
        # 優先度でソート
        suggestions.sort(key=lambda x: x.priority)
        
        return suggestions
    
    def _generate_custom_suggestions(self, error: AnalyzedError) -> List[RepairSuggestion]:
        """エラー固有の修復提案を生成"""
        suggestions = []
        
        # 頻度が高いエラーの場合
        if error.frequency > 10:
            suggestions.append(RepairSuggestion(
                error_id=error.id,
                suggestion_id=f"{error.id}_high_frequency",
                title="High frequency error - priority fix needed",
                description=f"This error has occurred {error.frequency} times. Immediate attention required.",
                confidence=RepairConfidence.HIGH,
                estimated_effort="High (immediate fix required)",
                priority=0,  # 最高優先度
                steps=[
                    "Investigate root cause immediately",
                    "Implement temporary workaround if possible",
                    "Plan permanent fix",
                    "Add monitoring to prevent recurrence"
                ],
                risks=["Service degradation", "User impact"]
            ))
        
        # スタックトレースがある場合
        if error.stack_trace:
            suggestions.append(RepairSuggestion(
                error_id=error.id,
                suggestion_id=f"{error.id}_stack_trace_analysis",
                title="Stack trace analysis",
                description="Detailed analysis of the stack trace to identify the exact cause",
                confidence=RepairConfidence.MEDIUM,
                estimated_effort="Medium (analysis required)",
                priority=3,
                steps=[
                    "Analyze the full stack trace",
                    "Identify the exact line causing the error",
                    "Review code changes in the affected area",
                    "Add additional logging if needed"
                ]
            ))
        
        return suggestions


class LogAnalysisDatabase:
    """ログ分析データベース"""
    
    def __init__(self, db_path: str = "log_analysis.db"):
        self.db_path = db_path
        self.init_database()
    
    def init_database(self):
        """データベース初期化"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # 分析エラーテーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS analyzed_errors (
                    id TEXT PRIMARY KEY,
                    timestamp REAL,
                    category TEXT,
                    severity TEXT,
                    original_message TEXT,
                    normalized_message TEXT,
                    affected_component TEXT,
                    frequency INTEGER,
                    first_occurrence REAL,
                    last_occurrence REAL,
                    pattern_hash TEXT,
                    stack_trace TEXT,
                    context TEXT
                )
            """)
            
            # 修復提案テーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS repair_suggestions (
                    suggestion_id TEXT PRIMARY KEY,
                    error_id TEXT,
                    title TEXT,
                    description TEXT,
                    confidence TEXT,
                    estimated_effort TEXT,
                    priority INTEGER,
                    steps TEXT,
                    code_changes TEXT,
                    configuration_changes TEXT,
                    dependencies TEXT,
                    risks TEXT,
                    applied BOOLEAN DEFAULT FALSE,
                    applied_timestamp REAL,
                    FOREIGN KEY (error_id) REFERENCES analyzed_errors (id)
                )
            """)
            
            # ログエントリテーブル
            cursor.execute("""
                CREATE TABLE IF NOT EXISTS log_entries (
                    id INTEGER PRIMARY KEY AUTOINCREMENT,
                    timestamp REAL,
                    level TEXT,
                    message TEXT,
                    source_file TEXT,
                    line_number INTEGER,
                    function_name TEXT,
                    stack_trace TEXT,
                    context TEXT
                )
            """)
            
            # インデックス作成
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_errors_category ON analyzed_errors (category)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_errors_severity ON analyzed_errors (severity)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_errors_timestamp ON analyzed_errors (timestamp)")
            cursor.execute("CREATE INDEX IF NOT EXISTS idx_suggestions_error_id ON repair_suggestions (error_id)")
            
            conn.commit()
    
    def save_log_entry(self, log_entry: LogEntry) -> int:
        """ログエントリを保存"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT INTO log_entries 
                (timestamp, level, message, source_file, line_number, 
                 function_name, stack_trace, context)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                log_entry.timestamp, log_entry.level, log_entry.message,
                log_entry.source_file, log_entry.line_number,
                log_entry.function_name, log_entry.stack_trace,
                json.dumps(log_entry.context) if log_entry.context else None
            ))
            return cursor.lastrowid
    
    def save_analyzed_error(self, error: AnalyzedError):
        """分析エラーを保存または更新"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            
            # 既存エラーをチェック
            cursor.execute("""
                SELECT frequency, first_occurrence FROM analyzed_errors 
                WHERE pattern_hash = ?
            """, (error.pattern_hash,))
            
            existing = cursor.fetchone()
            
            if existing:
                # 既存エラーを更新
                cursor.execute("""
                    UPDATE analyzed_errors SET
                        frequency = ?,
                        last_occurrence = ?,
                        severity = ?
                    WHERE pattern_hash = ?
                """, (
                    existing[0] + 1,
                    error.timestamp,
                    error.severity.value,
                    error.pattern_hash
                ))
            else:
                # 新規エラーを挿入
                cursor.execute("""
                    INSERT INTO analyzed_errors 
                    (id, timestamp, category, severity, original_message, 
                     normalized_message, affected_component, frequency, 
                     first_occurrence, last_occurrence, pattern_hash, 
                     stack_trace, context)
                    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
                """, (
                    error.id, error.timestamp, error.category.value,
                    error.severity.value, error.original_message,
                    error.normalized_message, error.affected_component,
                    error.frequency, error.first_occurrence,
                    error.last_occurrence, error.pattern_hash,
                    error.stack_trace, json.dumps(error.context) if error.context else None
                ))
    
    def save_repair_suggestion(self, suggestion: RepairSuggestion):
        """修復提案を保存"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                INSERT OR REPLACE INTO repair_suggestions 
                (suggestion_id, error_id, title, description, confidence,
                 estimated_effort, priority, steps, code_changes,
                 configuration_changes, dependencies, risks)
                VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            """, (
                suggestion.suggestion_id, suggestion.error_id, suggestion.title,
                suggestion.description, suggestion.confidence.value,
                suggestion.estimated_effort, suggestion.priority,
                json.dumps(suggestion.steps),
                json.dumps(suggestion.code_changes) if suggestion.code_changes else None,
                json.dumps(suggestion.configuration_changes) if suggestion.configuration_changes else None,
                json.dumps(suggestion.dependencies) if suggestion.dependencies else None,
                json.dumps(suggestion.risks) if suggestion.risks else None
            ))
    
    def get_top_errors(self, limit: int = 10) -> List[Dict[str, Any]]:
        """頻度の高いエラーを取得"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM analyzed_errors 
                ORDER BY frequency DESC, severity DESC
                LIMIT ?
            """, (limit,))
            
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]
    
    def get_suggestions_for_error(self, error_id: str) -> List[Dict[str, Any]]:
        """エラーの修復提案を取得"""
        with sqlite3.connect(self.db_path) as conn:
            cursor = conn.cursor()
            cursor.execute("""
                SELECT * FROM repair_suggestions 
                WHERE error_id = ?
                ORDER BY priority
            """, (error_id,))
            
            columns = [desc[0] for desc in cursor.description]
            return [dict(zip(columns, row)) for row in cursor.fetchall()]


class LogAnalysisEngine:
    """ログ分析エンジン"""
    
    def __init__(self):
        self.database = LogAnalysisDatabase()
        self.pattern_matcher = LogPatternMatcher()
        self.suggestion_engine = RepairSuggestionEngine()
        self.log_files = [
            Path("backend/logs/itsm.log"),
            Path("backend/logs/itsm_error.log"),
            Path("backend/logs/auto_repair.log"),
            Path("logs/itsm.log"),
            Path("logs/itsm_error.log")
        ]
    
    async def analyze_log_files(self) -> Dict[str, Any]:
        """ログファイルを分析"""
        analysis_results = {
            "timestamp": time.time(),
            "files_analyzed": 0,
            "entries_processed": 0,
            "errors_found": 0,
            "suggestions_generated": 0
        }
        
        for log_file in self.log_files:
            if log_file.exists():
                try:
                    result = await self._analyze_single_file(log_file)
                    analysis_results["files_analyzed"] += 1
                    analysis_results["entries_processed"] += result["entries_processed"]
                    analysis_results["errors_found"] += result["errors_found"]
                    analysis_results["suggestions_generated"] += result["suggestions_generated"]
                except Exception as e:
                    logger.error(f"Error analyzing {log_file}: {e}")
        
        return analysis_results
    
    async def _analyze_single_file(self, log_file: Path) -> Dict[str, Any]:
        """単一ログファイルを分析"""
        entries_processed = 0
        errors_found = 0
        suggestions_generated = 0
        
        try:
            async with aiofiles.open(log_file, 'r') as f:
                async for line in f:
                    try:
                        log_entry = self._parse_log_line(line.strip())
                        if log_entry:
                            # ログエントリを保存
                            self.database.save_log_entry(log_entry)
                            entries_processed += 1
                            
                            # エラーレベルの場合は分析
                            if log_entry.level.upper() in ['ERROR', 'CRITICAL', 'EXCEPTION']:
                                analyzed_error = self.pattern_matcher.analyze_log_entry(log_entry)
                                if analyzed_error:
                                    # 分析エラーを保存
                                    self.database.save_analyzed_error(analyzed_error)
                                    errors_found += 1
                                    
                                    # 修復提案を生成
                                    suggestions = self.suggestion_engine.generate_suggestions(analyzed_error)
                                    for suggestion in suggestions:
                                        self.database.save_repair_suggestion(suggestion)
                                        suggestions_generated += 1
                    
                    except Exception as e:
                        logger.error(f"Error processing log line: {e}")
                        
        except Exception as e:
            logger.error(f"Error reading log file {log_file}: {e}")
        
        return {
            "entries_processed": entries_processed,
            "errors_found": errors_found,
            "suggestions_generated": suggestions_generated
        }
    
    def _parse_log_line(self, line: str) -> Optional[LogEntry]:
        """ログ行を解析"""
        if not line.strip():
            return None
        
        # 基本的なログフォーマットを想定
        # 2024-01-01 12:00:00,123 - ERROR - message
        timestamp_pattern = r'(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2}[,\.]\d{3})'
        level_pattern = r'(DEBUG|INFO|WARNING|ERROR|CRITICAL|EXCEPTION)'
        
        # タイムスタンプとレベルを抽出
        match = re.search(f'{timestamp_pattern}.*?{level_pattern}.*?-\s*(.*)', line)
        if match:
            timestamp_str = match.group(1)
            level = match.group(2)
            message = match.group(3)
            
            # タイムスタンプをfloatに変換
            try:
                dt = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S,%f')
                timestamp = dt.timestamp()
            except ValueError:
                try:
                    dt = datetime.strptime(timestamp_str, '%Y-%m-%d %H:%M:%S.%f')
                    timestamp = dt.timestamp()
                except ValueError:
                    timestamp = time.time()
            
            # スタックトレースを検出
            stack_trace = None
            if 'traceback' in message.lower() or 'file "' in message.lower():
                stack_trace = message
            
            return LogEntry(
                timestamp=timestamp,
                level=level,
                message=message,
                stack_trace=stack_trace
            )
        
        return None
    
    async def generate_analysis_report(self) -> Dict[str, Any]:
        """分析レポートを生成"""
        top_errors = self.database.get_top_errors(20)
        
        # カテゴリ別統計
        category_stats = Counter()
        severity_stats = Counter()
        component_stats = Counter()
        
        for error in top_errors:
            category_stats[error['category']] += error['frequency']
            severity_stats[error['severity']] += error['frequency']
            component_stats[error['affected_component']] += error['frequency']
        
        # 修復提案統計
        total_suggestions = 0
        high_confidence_suggestions = 0
        
        for error in top_errors:
            suggestions = self.database.get_suggestions_for_error(error['id'])
            total_suggestions += len(suggestions)
            high_confidence_suggestions += len([s for s in suggestions if s['confidence'] in ['high', 'very_high']])
        
        report = {
            "timestamp": time.time(),
            "summary": {
                "total_unique_errors": len(top_errors),
                "total_error_occurrences": sum(e['frequency'] for e in top_errors),
                "total_suggestions": total_suggestions,
                "high_confidence_suggestions": high_confidence_suggestions
            },
            "top_errors": top_errors[:10],
            "statistics": {
                "by_category": dict(category_stats.most_common()),
                "by_severity": dict(severity_stats.most_common()),
                "by_component": dict(component_stats.most_common(10))
            },
            "recommendations": await self._generate_recommendations(top_errors)
        }
        
        return report
    
    async def _generate_recommendations(self, top_errors: List[Dict[str, Any]]) -> List[str]:
        """全体的な推奨事項を生成"""
        recommendations = []
        
        # 重要度の高いエラーをチェック
        critical_errors = [e for e in top_errors if e['severity'] == 'critical']
        if critical_errors:
            recommendations.append(f"Address {len(critical_errors)} critical errors immediately")
        
        # 頻度の高いエラーをチェック
        frequent_errors = [e for e in top_errors if e['frequency'] > 50]
        if frequent_errors:
            recommendations.append(f"Focus on {len(frequent_errors)} high-frequency errors")
        
        # カテゴリ別の推奨事項
        category_counts = Counter(e['category'] for e in top_errors)
        most_common_category = category_counts.most_common(1)
        if most_common_category:
            recommendations.append(f"Most errors are {most_common_category[0][0]} - consider systematic review")
        
        # コンポーネント別の推奨事項
        component_counts = Counter(e['affected_component'] for e in top_errors)
        most_problematic_component = component_counts.most_common(1)
        if most_problematic_component and most_problematic_component[0][0] != 'unknown':
            recommendations.append(f"Component '{most_problematic_component[0][0]}' needs attention")
        
        return recommendations
    
    async def start_continuous_analysis(self, interval: int = 300):
        """継続的なログ分析を開始"""
        logger.info("Starting continuous log analysis")
        
        while True:
            try:
                # ログファイルを分析
                analysis_results = await self.analyze_log_files()
                logger.info(f"Analyzed logs: {analysis_results}")
                
                # レポート生成
                if analysis_results["errors_found"] > 0:
                    report = await self.generate_analysis_report()
                    await self._save_report(report)
                
                await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"Error in continuous analysis: {e}")
                await asyncio.sleep(60)
    
    async def _save_report(self, report: Dict[str, Any]):
        """レポートをファイルに保存"""
        report_dir = Path("log_analysis_reports")
        report_dir.mkdir(exist_ok=True)
        
        timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
        report_file = report_dir / f"analysis_report_{timestamp}.json"
        
        async with aiofiles.open(report_file, 'w') as f:
            await f.write(json.dumps(report, indent=2, default=str))


# メイン実行用
async def main():
    """メイン実行関数"""
    engine = LogAnalysisEngine()
    
    try:
        # 一度分析を実行
        analysis_results = await engine.analyze_log_files()
        logger.info(f"Analysis completed: {analysis_results}")
        
        # レポート生成
        report = await engine.generate_analysis_report()
        await engine._save_report(report)
        
        # 継続的な分析を開始
        await engine.start_continuous_analysis()
        
    except KeyboardInterrupt:
        logger.info("Log analysis stopped by user")


if __name__ == "__main__":
    asyncio.run(main())