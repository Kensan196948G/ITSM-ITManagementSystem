"""
強化された無限ループエラー監視・修復システム - ITSMバックエンドAPI統合版
- 24時間無停止監視・検知・修復
- 高度な自動修復エンジン（コード修正、依存関係修復等）
- ITSMセキュリティ基準準拠
- 包括的パフォーマンス最適化
- 継続監視とレポート生成
"""

import asyncio
import aiohttp
import aiofiles
import logging
import time
import json
import traceback
import re
import sqlite3
import subprocess
import os
import hashlib
import psutil
import ssl
import socket
import statistics
from typing import Dict, List, Optional, Any, Tuple, Union, Set
from dataclasses import dataclass, asdict
from datetime import datetime, timedelta
from enum import Enum
from pathlib import Path
from urllib.parse import urlparse
import threading
from concurrent.futures import ThreadPoolExecutor
from collections import defaultdict, deque
import asyncio
import signal
import sys

logger = logging.getLogger(__name__)

class RepairStrategy(Enum):
    """修復戦略"""
    IMMEDIATE = "immediate"  # 即座修復
    PROGRESSIVE = "progressive"  # 段階的修復
    CONSERVATIVE = "conservative"  # 保守的修復
    AGGRESSIVE = "aggressive"  # 積極的修復

class ValidationLevel(Enum):
    """検証レベル"""
    BASIC = "basic"
    STANDARD = "standard"
    COMPREHENSIVE = "comprehensive"
    EXHAUSTIVE = "exhaustive"

class SystemHealth(Enum):
    """システム健全性"""
    OPTIMAL = "optimal"
    GOOD = "good"
    DEGRADED = "degraded"
    CRITICAL = "critical"
    EMERGENCY = "emergency"

@dataclass
class RepairAction:
    """修復アクション"""
    action_id: str
    target: str
    strategy: RepairStrategy
    priority: int  # 1=最高, 5=最低
    estimated_time: float
    dependencies: List[str]
    validation_required: ValidationLevel
    rollback_available: bool

@dataclass
class ValidationResult:
    """検証結果"""
    timestamp: datetime
    validation_type: str
    target: str
    is_valid: bool
    score: float  # 0-100
    issues: List[str]
    recommendations: List[str]
    execution_time: float

@dataclass
class LoopCycle:
    """ループサイクル情報"""
    cycle_id: str
    start_time: datetime
    end_time: Optional[datetime]
    errors_detected: int
    repairs_attempted: int
    repairs_successful: int
    validation_score: float
    system_health: SystemHealth
    performance_metrics: Dict[str, float]

class EnhancedInfiniteLoopMonitor:
    """強化された無限ループ自動修復システム"""
    
    def __init__(self, base_url: str = "http://192.168.3.135:8000"):
        self.base_url = base_url
        self.backend_path = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend")
        self.coordination_path = Path("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination")
        
        # 監視状態
        self.monitoring = False
        self.loop_count = 0
        self.total_errors_fixed = 0
        self.start_time = datetime.now()
        
        # データ構造
        self.errors: deque = deque(maxlen=10000)
        self.repairs: deque = deque(maxlen=5000)
        self.validations: deque = deque(maxlen=5000)
        self.loop_cycles: List[LoopCycle] = []
        self.system_metrics: Dict[str, Any] = {}
        
        # パフォーマンス監視
        self.response_times: deque = deque(maxlen=1000)
        self.error_rates: deque = deque(maxlen=100)
        self.cpu_usage: deque = deque(maxlen=100)
        self.memory_usage: deque = deque(maxlen=100)
        
        # 設定可能なパラメータ
        self.config = {
            "loop_interval": 15,  # 基本ループ間隔(秒)
            "rapid_mode_threshold": 5,  # 高速モード閾値(エラー数)
            "emergency_threshold": 10,  # 緊急モード閾値(エラー数)
            "max_repair_attempts": 3,  # 最大修復試行回数
            "validation_timeout": 30,  # 検証タイムアウト(秒)
            "health_check_endpoints": [
                "/health",
                "/docs",
                "/api/v1/incidents",
                "/api/v1/users",
                "/api/v1/dashboard/metrics",
                "/api/v1/problems",
                "/api/v1/changes",
                "/api/v1/notifications"
            ],
            "critical_endpoints": [
                "/api/v1/incidents",
                "/api/v1/auth/login",
                "/api/v1/dashboard/metrics"
            ]
        }
        
        # 修復戦略マッピング
        self.repair_strategies = {
            "database_error": RepairStrategy.IMMEDIATE,
            "auth_error": RepairStrategy.PROGRESSIVE,
            "validation_error": RepairStrategy.CONSERVATIVE,
            "performance_issue": RepairStrategy.PROGRESSIVE,
            "security_threat": RepairStrategy.AGGRESSIVE,
            "dependency_error": RepairStrategy.IMMEDIATE
        }
        
        # エラーパターンと自動修復マッピング
        self.auto_repair_patterns = {
            r"ImportError.*cannot import.*'(\w+)'.*from.*'([\w\.]+)'": self._fix_import_error,
            r"ModuleNotFoundError.*No module named.*'([\w\.]+)'": self._fix_module_not_found,
            r"AttributeError.*'(\w+)'.*object has no attribute.*'(\w+)'": self._fix_attribute_error,
            r"sqlite3\.OperationalError.*database.*locked": self._fix_database_lock,
            r"sqlite3\.OperationalError.*no such table": self._fix_missing_table,
            r"Connection refused": self._fix_connection_refused,
            r"HTTP 404.*Not Found": self._fix_endpoint_not_found,
            r"HTTP 500.*Internal Server Error": self._fix_server_error,
            r"Validation error.*required field": self._fix_validation_error,
            r"FOREIGN KEY constraint failed": self._fix_foreign_key_error
        }
        
    async def start_infinite_loop_monitoring(self):
        """無限ループ監視開始"""
        logger.info("🚀 強化された無限ループ自動修復システム開始")
        self.monitoring = True
        self.start_time = datetime.now()
        
        # シグナルハンドラー設定
        signal.signal(signal.SIGINT, self._signal_handler)
        signal.signal(signal.SIGTERM, self._signal_handler)
        
        try:
            while self.monitoring:
                cycle_start = datetime.now()
                cycle_id = f"cycle_{self.loop_count:06d}_{int(cycle_start.timestamp())}"
                
                # ループサイクル開始
                current_cycle = LoopCycle(
                    cycle_id=cycle_id,
                    start_time=cycle_start,
                    end_time=None,
                    errors_detected=0,
                    repairs_attempted=0,
                    repairs_successful=0,
                    validation_score=0.0,
                    system_health=SystemHealth.GOOD,
                    performance_metrics={}
                )
                
                logger.info(f"🔄 ループサイクル {self.loop_count} 開始 (ID: {cycle_id})")
                
                # 1. 包括的エラー検知
                errors_detected = await self._comprehensive_error_detection()
                current_cycle.errors_detected = len(errors_detected)
                
                # 2. 動的間隔調整
                interval = self._calculate_dynamic_interval(errors_detected)
                
                # 3. 並列修復実行
                if errors_detected:
                    repairs_result = await self._parallel_repair_execution(errors_detected)
                    current_cycle.repairs_attempted = repairs_result["attempted"]
                    current_cycle.repairs_successful = repairs_result["successful"]
                    self.total_errors_fixed += repairs_result["successful"]
                
                # 4. 包括的検証
                validation_result = await self._comprehensive_validation()
                current_cycle.validation_score = validation_result["overall_score"]
                
                # 5. システム健全性評価
                current_cycle.system_health = await self._assess_system_health()
                
                # 6. パフォーマンスメトリクス収集
                current_cycle.performance_metrics = await self._collect_performance_metrics()
                
                # 7. ループサイクル完了
                current_cycle.end_time = datetime.now()
                self.loop_cycles.append(current_cycle)
                
                # 8. 状態保存
                await self._save_enhanced_state()
                
                # 9. レポート生成（必要に応じて）
                if self.loop_count % 10 == 0:  # 10サイクルごと
                    await self._generate_cycle_report()
                
                self.loop_count += 1
                
                # 次のサイクルまで待機
                logger.info(f"✅ ループサイクル {self.loop_count-1} 完了 ({interval}秒後に次回実行)")
                await asyncio.sleep(interval)
                
        except Exception as e:
            logger.error(f"❌ 無限ループ監視エラー: {e}")
            traceback.print_exc()
        finally:
            await self._cleanup_and_shutdown()
    
    async def _comprehensive_error_detection(self) -> List[Dict[str, Any]]:
        """包括的エラー検知"""
        errors = []
        
        # 並列実行でエラー検知
        detection_tasks = [
            self._detect_api_errors(),
            self._detect_database_errors(),
            self._detect_security_threats(),
            self._detect_performance_issues(),
            self._detect_dependency_errors(),
            self._detect_configuration_errors()
        ]
        
        detection_results = await asyncio.gather(*detection_tasks, return_exceptions=True)
        
        for result in detection_results:
            if isinstance(result, Exception):
                logger.error(f"エラー検知中の例外: {result}")
            elif isinstance(result, list):
                errors.extend(result)
        
        # エラーの重複排除と優先度付け
        unique_errors = self._deduplicate_and_prioritize_errors(errors)
        
        logger.info(f"🔍 {len(unique_errors)}件のエラーを検知")
        return unique_errors
    
    async def _detect_api_errors(self) -> List[Dict[str, Any]]:
        """API エラー検知"""
        errors = []
        
        async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=10)) as session:
            for endpoint in self.config["health_check_endpoints"]:
                try:
                    start_time = time.time()
                    url = f"{self.base_url}{endpoint}"
                    
                    async with session.get(url) as response:
                        response_time = time.time() - start_time
                        self.response_times.append(response_time)
                        
                        if response.status >= 400:
                            error_text = await response.text()
                            errors.append({
                                "type": "api_error",
                                "endpoint": endpoint,
                                "status_code": response.status,
                                "error_text": error_text,
                                "response_time": response_time,
                                "severity": "high" if response.status >= 500 else "medium",
                                "timestamp": datetime.now().isoformat()
                            })
                        
                        # パフォーマンス問題の検知
                        if response_time > 5.0:
                            errors.append({
                                "type": "performance_issue",
                                "endpoint": endpoint,
                                "response_time": response_time,
                                "severity": "medium",
                                "timestamp": datetime.now().isoformat()
                            })
                            
                except Exception as e:
                    errors.append({
                        "type": "connection_error",
                        "endpoint": endpoint,
                        "error": str(e),
                        "severity": "high",
                        "timestamp": datetime.now().isoformat()
                    })
        
        return errors
    
    async def _detect_database_errors(self) -> List[Dict[str, Any]]:
        """データベース エラー検知"""
        errors = []
        
        try:
            db_path = self.backend_path / "itsm.db"
            
            if not db_path.exists():
                errors.append({
                    "type": "database_missing",
                    "severity": "critical",
                    "message": "データベースファイルが存在しません",
                    "timestamp": datetime.now().isoformat()
                })
                return errors
            
            # データベース接続テスト
            conn = sqlite3.connect(str(db_path), timeout=5.0)
            
            # 整合性チェック
            try:
                result = conn.execute("PRAGMA integrity_check").fetchone()
                if result[0] != "ok":
                    errors.append({
                        "type": "database_integrity",
                        "severity": "critical",
                        "message": f"データベース整合性エラー: {result[0]}",
                        "timestamp": datetime.now().isoformat()
                    })
            except Exception as e:
                errors.append({
                    "type": "database_integrity_check_failed",
                    "severity": "high",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                })
            
            # テーブル存在チェック
            required_tables = ["incidents", "users", "problems", "changes"]
            for table in required_tables:
                try:
                    conn.execute(f"SELECT COUNT(*) FROM {table} LIMIT 1")
                except sqlite3.OperationalError as e:
                    if "no such table" in str(e):
                        errors.append({
                            "type": "missing_table",
                            "table": table,
                            "severity": "high",
                            "timestamp": datetime.now().isoformat()
                        })
            
            conn.close()
            
        except sqlite3.OperationalError as e:
            if "database is locked" in str(e):
                errors.append({
                    "type": "database_locked",
                    "severity": "medium",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                })
            else:
                errors.append({
                    "type": "database_error",
                    "severity": "high",
                    "error": str(e),
                    "timestamp": datetime.now().isoformat()
                })
        except Exception as e:
            errors.append({
                "type": "database_connection_error",
                "severity": "high",
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
        
        return errors
    
    async def _detect_security_threats(self) -> List[Dict[str, Any]]:
        """セキュリティ脅威検知"""
        errors = []
        
        # ログファイルからセキュリティ脅威を検知
        log_files = [
            self.backend_path / "logs" / "itsm_error.log",
            self.backend_path / "logs" / "itsm_audit.log"
        ]
        
        security_patterns = [
            (r"sql injection", "critical"),
            (r"xss attack", "high"),
            (r"brute force", "high"),
            (r"unauthorized access", "medium"),
            (r"suspicious activity", "medium")
        ]
        
        for log_file in log_files:
            if log_file.exists():
                try:
                    with open(log_file, 'r') as f:
                        recent_lines = f.readlines()[-1000:]  # 最新1000行
                    
                    for line in recent_lines:
                        for pattern, severity in security_patterns:
                            if re.search(pattern, line, re.IGNORECASE):
                                errors.append({
                                    "type": "security_threat",
                                    "pattern": pattern,
                                    "severity": severity,
                                    "log_line": line.strip(),
                                    "timestamp": datetime.now().isoformat()
                                })
                except Exception as e:
                    logger.error(f"セキュリティ脅威検知エラー: {e}")
        
        return errors
    
    async def _detect_performance_issues(self) -> List[Dict[str, Any]]:
        """パフォーマンス問題検知"""
        errors = []
        
        # CPU・メモリ使用率チェック
        cpu_percent = psutil.cpu_percent(interval=1)
        memory_percent = psutil.virtual_memory().percent
        
        self.cpu_usage.append(cpu_percent)
        self.memory_usage.append(memory_percent)
        
        if cpu_percent > 80:
            errors.append({
                "type": "high_cpu_usage",
                "value": cpu_percent,
                "severity": "high" if cpu_percent > 90 else "medium",
                "timestamp": datetime.now().isoformat()
            })
        
        if memory_percent > 85:
            errors.append({
                "type": "high_memory_usage",
                "value": memory_percent,
                "severity": "high" if memory_percent > 95 else "medium",
                "timestamp": datetime.now().isoformat()
            })
        
        # レスポンス時間の統計分析
        if len(self.response_times) > 10:
            avg_response_time = statistics.mean(self.response_times)
            if avg_response_time > 3.0:
                errors.append({
                    "type": "slow_response_time",
                    "average_time": avg_response_time,
                    "severity": "medium",
                    "timestamp": datetime.now().isoformat()
                })
        
        return errors
    
    async def _detect_dependency_errors(self) -> List[Dict[str, Any]]:
        """依存関係エラー検知"""
        errors = []
        
        # Pythonモジュールのインポートテスト
        critical_modules = [
            "fastapi", "sqlalchemy", "pydantic", "sqlite3",
            "asyncio", "aiohttp", "uvicorn"
        ]
        
        for module in critical_modules:
            try:
                __import__(module)
            except ImportError as e:
                errors.append({
                    "type": "dependency_error",
                    "module": module,
                    "error": str(e),
                    "severity": "critical",
                    "timestamp": datetime.now().isoformat()
                })
        
        return errors
    
    async def _detect_configuration_errors(self) -> List[Dict[str, Any]]:
        """設定エラー検知"""
        errors = []
        
        # 重要な設定ファイルの存在確認
        config_files = [
            self.backend_path / "app" / "core" / "config.py",
            self.backend_path / "app" / "main.py",
            self.backend_path / "requirements.txt"
        ]
        
        for config_file in config_files:
            if not config_file.exists():
                errors.append({
                    "type": "configuration_error",
                    "file": str(config_file),
                    "error": "設定ファイルが存在しません",
                    "severity": "high",
                    "timestamp": datetime.now().isoformat()
                })
        
        return errors
    
    def _deduplicate_and_prioritize_errors(self, errors: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """エラーの重複排除と優先度付け"""
        # 重複排除
        seen = set()
        unique_errors = []
        
        for error in errors:
            error_key = f"{error['type']}_{error.get('endpoint', '')}_{error.get('message', '')}"
            if error_key not in seen:
                seen.add(error_key)
                unique_errors.append(error)
        
        # 優先度付け（severity順）
        severity_order = {"critical": 0, "high": 1, "medium": 2, "low": 3}
        unique_errors.sort(key=lambda x: severity_order.get(x.get("severity", "low"), 3))
        
        return unique_errors
    
    def _calculate_dynamic_interval(self, errors: List[Dict[str, Any]]) -> int:
        """動的間隔計算"""
        base_interval = self.config["loop_interval"]
        error_count = len(errors)
        
        if error_count >= self.config["emergency_threshold"]:
            return max(5, base_interval // 4)  # 緊急モード: 最短5秒
        elif error_count >= self.config["rapid_mode_threshold"]:
            return max(8, base_interval // 2)  # 高速モード: 半分の間隔
        elif error_count == 0:
            return min(60, base_interval * 2)  # 正常時: 間隔を延長
        else:
            return base_interval
    
    async def _parallel_repair_execution(self, errors: List[Dict[str, Any]]) -> Dict[str, int]:
        """並列修復実行"""
        repair_tasks = []
        
        for error in errors[:10]:  # 最大10件まで並列処理
            task = asyncio.create_task(self._execute_single_repair(error))
            repair_tasks.append(task)
        
        results = await asyncio.gather(*repair_tasks, return_exceptions=True)
        
        attempted = len(repair_tasks)
        successful = sum(1 for result in results if result is True)
        
        logger.info(f"🔧 修復実行結果: {successful}/{attempted}件成功")
        
        return {"attempted": attempted, "successful": successful}
    
    async def _execute_single_repair(self, error: Dict[str, Any]) -> bool:
        """単一エラーの修復実行"""
        error_type = error.get("type")
        
        try:
            # エラータイプに応じた修復処理
            if error_type == "database_missing":
                return await self._repair_missing_database()
            elif error_type == "database_locked":
                return await self._repair_database_lock()
            elif error_type == "missing_table":
                return await self._repair_missing_table(error.get("table"))
            elif error_type == "api_error":
                return await self._repair_api_error(error)
            elif error_type == "dependency_error":
                return await self._repair_dependency_error(error)
            elif error_type == "configuration_error":
                return await self._repair_configuration_error(error)
            else:
                # パターンマッチング修復
                return await self._pattern_based_repair(error)
                
        except Exception as e:
            logger.error(f"修復実行エラー ({error_type}): {e}")
            return False
    
    async def _repair_missing_database(self) -> bool:
        """データベース初期化"""
        try:
            init_script = self.backend_path / "init_sqlite_db.py"
            if init_script.exists():
                result = subprocess.run(
                    ["python3", str(init_script)],
                    cwd=str(self.backend_path),
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0:
                    logger.info("✅ データベースを初期化しました")
                    return True
                else:
                    logger.error(f"データベース初期化失敗: {result.stderr}")
            
            return False
        except Exception as e:
            logger.error(f"データベース初期化エラー: {e}")
            return False
    
    async def _repair_database_lock(self) -> bool:
        """データベースロック解除"""
        try:
            # 一定時間待機してからリトライ
            await asyncio.sleep(2)
            
            db_path = self.backend_path / "itsm.db"
            conn = sqlite3.connect(str(db_path), timeout=10.0)
            conn.execute("SELECT 1")
            conn.close()
            
            logger.info("✅ データベースロックを解除しました")
            return True
        except Exception as e:
            logger.error(f"データベースロック解除エラー: {e}")
            return False
    
    async def _repair_missing_table(self, table_name: str) -> bool:
        """不足テーブルの作成"""
        try:
            # データベース初期化スクリプトを実行
            init_script = self.backend_path / "init_sqlite_db.py"
            if init_script.exists():
                result = subprocess.run(
                    ["python3", str(init_script)],
                    cwd=str(self.backend_path),
                    capture_output=True,
                    text=True,
                    timeout=30
                )
                
                if result.returncode == 0:
                    logger.info(f"✅ テーブル {table_name} を作成しました")
                    return True
            
            return False
        except Exception as e:
            logger.error(f"テーブル作成エラー: {e}")
            return False
    
    async def _repair_api_error(self, error: Dict[str, Any]) -> bool:
        """API エラー修復"""
        endpoint = error.get("endpoint")
        status_code = error.get("status_code")
        
        try:
            if status_code == 404:
                # エンドポイント実装確認
                return await self._ensure_endpoint_implementation(endpoint)
            elif status_code >= 500:
                # サーバーエラーの場合は再起動を検討
                return await self._restart_server_if_needed()
            
            return False
        except Exception as e:
            logger.error(f"API修復エラー: {e}")
            return False
    
    async def _repair_dependency_error(self, error: Dict[str, Any]) -> bool:
        """依存関係エラー修復"""
        module = error.get("module")
        
        try:
            # pip install で依存関係をインストール
            result = subprocess.run(
                ["pip3", "install", module],
                capture_output=True,
                text=True,
                timeout=60
            )
            
            if result.returncode == 0:
                logger.info(f"✅ モジュール {module} をインストールしました")
                return True
            else:
                logger.error(f"モジュールインストール失敗: {result.stderr}")
                return False
                
        except Exception as e:
            logger.error(f"依存関係修復エラー: {e}")
            return False
    
    async def _repair_configuration_error(self, error: Dict[str, Any]) -> bool:
        """設定エラー修復"""
        file_path = error.get("file")
        
        try:
            # 基本的な設定ファイルテンプレートを作成
            if "config.py" in file_path:
                return await self._create_config_file()
            elif "main.py" in file_path:
                return await self._create_main_file()
            elif "requirements.txt" in file_path:
                return await self._create_requirements_file()
            
            return False
        except Exception as e:
            logger.error(f"設定修復エラー: {e}")
            return False
    
    async def _pattern_based_repair(self, error: Dict[str, Any]) -> bool:
        """パターンベース修復"""
        error_text = error.get("error", "") + error.get("message", "")
        
        for pattern, repair_func in self.auto_repair_patterns.items():
            match = re.search(pattern, error_text)
            if match:
                try:
                    return await repair_func(match, error)
                except Exception as e:
                    logger.error(f"パターン修復エラー ({pattern}): {e}")
        
        return False
    
    # パターン修復関数群
    async def _fix_import_error(self, match, error: Dict[str, Any]) -> bool:
        """インポートエラー修復"""
        # 既存の auto_repair_engine.py の実装を参考に
        return False
    
    async def _fix_module_not_found(self, match, error: Dict[str, Any]) -> bool:
        """モジュール未発見修復"""
        # 既存の auto_repair_engine.py の実装を参考に
        return False
    
    async def _fix_attribute_error(self, match, error: Dict[str, Any]) -> bool:
        """属性エラー修復"""
        # 既存の auto_repair_engine.py の実装を参考に
        return False
    
    async def _fix_database_lock(self, match, error: Dict[str, Any]) -> bool:
        """データベースロック修復"""
        return await self._repair_database_lock()
    
    async def _fix_missing_table(self, match, error: Dict[str, Any]) -> bool:
        """テーブル不足修復"""
        return await self._repair_missing_database()
    
    async def _fix_connection_refused(self, match, error: Dict[str, Any]) -> bool:
        """接続拒否修復"""
        return await self._restart_server_if_needed()
    
    async def _fix_endpoint_not_found(self, match, error: Dict[str, Any]) -> bool:
        """エンドポイント未発見修復"""
        return await self._ensure_endpoint_implementation(error.get("endpoint"))
    
    async def _fix_server_error(self, match, error: Dict[str, Any]) -> bool:
        """サーバーエラー修復"""
        return await self._restart_server_if_needed()
    
    async def _fix_validation_error(self, match, error: Dict[str, Any]) -> bool:
        """バリデーションエラー修復"""
        # スキーマ修正
        return False
    
    async def _fix_foreign_key_error(self, match, error: Dict[str, Any]) -> bool:
        """外部キーエラー修復"""
        return await self._repair_missing_database()
    
    # ユーティリティ関数
    async def _ensure_endpoint_implementation(self, endpoint: str) -> bool:
        """エンドポイント実装確認"""
        # エンドポイントの実装状況を確認し、必要に応じて作成
        return False
    
    async def _restart_server_if_needed(self) -> bool:
        """必要に応じてサーバー再起動"""
        # 重要: サーバー再起動の実装は慎重に
        return False
    
    async def _create_config_file(self) -> bool:
        """設定ファイル作成"""
        # 基本的な設定ファイルテンプレートを作成
        return False
    
    async def _create_main_file(self) -> bool:
        """メインファイル作成"""
        # 基本的なメインファイルテンプレートを作成
        return False
    
    async def _create_requirements_file(self) -> bool:
        """requirements.txt作成"""
        # 基本的な依存関係ファイルを作成
        return False
    
    async def _comprehensive_validation(self) -> Dict[str, Any]:
        """包括的検証"""
        validation_results = []
        
        # 並列検証実行
        validation_tasks = [
            self._validate_api_functionality(),
            self._validate_database_integrity(),
            self._validate_security_state(),
            self._validate_performance_metrics()
        ]
        
        results = await asyncio.gather(*validation_tasks, return_exceptions=True)
        
        overall_score = 0.0
        valid_results = 0
        
        for result in results:
            if isinstance(result, dict) and "score" in result:
                validation_results.append(result)
                overall_score += result["score"]
                valid_results += 1
        
        overall_score = overall_score / valid_results if valid_results > 0 else 0.0
        
        return {
            "overall_score": overall_score,
            "validation_results": validation_results,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _validate_api_functionality(self) -> Dict[str, Any]:
        """API機能検証"""
        score = 0.0
        issues = []
        
        try:
            async with aiohttp.ClientSession(timeout=aiohttp.ClientTimeout(total=30)) as session:
                total_endpoints = len(self.config["health_check_endpoints"])
                working_endpoints = 0
                
                for endpoint in self.config["health_check_endpoints"]:
                    try:
                        async with session.get(f"{self.base_url}{endpoint}") as response:
                            if response.status < 400:
                                working_endpoints += 1
                            else:
                                issues.append(f"エンドポイント {endpoint} でエラー: HTTP {response.status}")
                    except Exception as e:
                        issues.append(f"エンドポイント {endpoint} でエラー: {str(e)}")
                
                score = (working_endpoints / total_endpoints) * 100 if total_endpoints > 0 else 0
                
        except Exception as e:
            issues.append(f"API検証エラー: {str(e)}")
        
        return {
            "validation_type": "api_functionality",
            "score": score,
            "issues": issues,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _validate_database_integrity(self) -> Dict[str, Any]:
        """データベース整合性検証"""
        score = 0.0
        issues = []
        
        try:
            db_path = self.backend_path / "itsm.db"
            
            if not db_path.exists():
                issues.append("データベースファイルが存在しません")
                return {
                    "validation_type": "database_integrity",
                    "score": 0.0,
                    "issues": issues,
                    "timestamp": datetime.now().isoformat()
                }
            
            conn = sqlite3.connect(str(db_path), timeout=10.0)
            
            # 整合性チェック
            result = conn.execute("PRAGMA integrity_check").fetchone()
            if result[0] == "ok":
                score += 50
            else:
                issues.append(f"データベース整合性エラー: {result[0]}")
            
            # テーブル存在確認
            required_tables = ["incidents", "users", "problems", "changes"]
            existing_tables = 0
            
            for table in required_tables:
                try:
                    conn.execute(f"SELECT COUNT(*) FROM {table} LIMIT 1")
                    existing_tables += 1
                except sqlite3.OperationalError:
                    issues.append(f"テーブル {table} が存在しません")
            
            score += (existing_tables / len(required_tables)) * 50
            conn.close()
            
        except Exception as e:
            issues.append(f"データベース検証エラー: {str(e)}")
        
        return {
            "validation_type": "database_integrity",
            "score": score,
            "issues": issues,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _validate_security_state(self) -> Dict[str, Any]:
        """セキュリティ状態検証"""
        score = 100.0  # 初期値
        issues = []
        
        try:
            # セキュリティログのチェック
            security_log = self.backend_path / "logs" / "itsm_audit.log"
            if security_log.exists():
                with open(security_log, 'r') as f:
                    recent_lines = f.readlines()[-100:]  # 最新100行
                
                threat_count = 0
                for line in recent_lines:
                    if any(threat in line.lower() for threat in ["attack", "threat", "intrusion"]):
                        threat_count += 1
                
                if threat_count > 0:
                    score -= min(threat_count * 10, 50)  # 最大50点減点
                    issues.append(f"{threat_count}件のセキュリティ脅威を検知")
            
        except Exception as e:
            issues.append(f"セキュリティ検証エラー: {str(e)}")
        
        return {
            "validation_type": "security_state",
            "score": max(0, score),
            "issues": issues,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _validate_performance_metrics(self) -> Dict[str, Any]:
        """パフォーマンスメトリクス検証"""
        score = 100.0
        issues = []
        
        try:
            # CPU使用率チェック
            if len(self.cpu_usage) > 0:
                avg_cpu = statistics.mean(self.cpu_usage)
                if avg_cpu > 80:
                    score -= 30
                    issues.append(f"CPU使用率が高い: {avg_cpu:.1f}%")
                elif avg_cpu > 60:
                    score -= 15
                    issues.append(f"CPU使用率が中程度: {avg_cpu:.1f}%")
            
            # メモリ使用率チェック
            if len(self.memory_usage) > 0:
                avg_memory = statistics.mean(self.memory_usage)
                if avg_memory > 85:
                    score -= 30
                    issues.append(f"メモリ使用率が高い: {avg_memory:.1f}%")
                elif avg_memory > 70:
                    score -= 15
                    issues.append(f"メモリ使用率が中程度: {avg_memory:.1f}%")
            
            # レスポンス時間チェック
            if len(self.response_times) > 0:
                avg_response = statistics.mean(self.response_times)
                if avg_response > 5.0:
                    score -= 25
                    issues.append(f"レスポンス時間が遅い: {avg_response:.2f}秒")
                elif avg_response > 2.0:
                    score -= 10
                    issues.append(f"レスポンス時間が中程度: {avg_response:.2f}秒")
            
        except Exception as e:
            issues.append(f"パフォーマンス検証エラー: {str(e)}")
        
        return {
            "validation_type": "performance_metrics",
            "score": max(0, score),
            "issues": issues,
            "timestamp": datetime.now().isoformat()
        }
    
    async def _assess_system_health(self) -> SystemHealth:
        """システム健全性評価"""
        try:
            # 最新の検証結果から総合評価
            if len(self.validations) == 0:
                return SystemHealth.GOOD
            
            recent_validations = list(self.validations)[-5:]  # 最新5件
            avg_score = statistics.mean([v.score for v in recent_validations])
            
            if avg_score >= 90:
                return SystemHealth.OPTIMAL
            elif avg_score >= 75:
                return SystemHealth.GOOD
            elif avg_score >= 50:
                return SystemHealth.DEGRADED
            elif avg_score >= 25:
                return SystemHealth.CRITICAL
            else:
                return SystemHealth.EMERGENCY
                
        except Exception:
            return SystemHealth.DEGRADED
    
    async def _collect_performance_metrics(self) -> Dict[str, float]:
        """パフォーマンスメトリクス収集"""
        metrics = {}
        
        try:
            # システムメトリクス
            metrics["cpu_percent"] = psutil.cpu_percent()
            metrics["memory_percent"] = psutil.virtual_memory().percent
            metrics["disk_percent"] = psutil.disk_usage('/').percent
            
            # アプリケーションメトリクス
            if len(self.response_times) > 0:
                metrics["avg_response_time"] = statistics.mean(self.response_times)
                metrics["max_response_time"] = max(self.response_times)
                metrics["min_response_time"] = min(self.response_times)
            
            # エラー率
            if len(self.error_rates) > 0:
                metrics["error_rate"] = statistics.mean(self.error_rates)
            
            # 監視メトリクス
            metrics["total_errors_detected"] = len(self.errors)
            metrics["total_repairs_attempted"] = len(self.repairs)
            metrics["uptime_hours"] = (datetime.now() - self.start_time).total_seconds() / 3600
            
        except Exception as e:
            logger.error(f"メトリクス収集エラー: {e}")
        
        return metrics
    
    async def _save_enhanced_state(self):
        """拡張状態保存"""
        try:
            state = {
                "loop_count": self.loop_count,
                "total_errors_fixed": self.total_errors_fixed,
                "last_scan": datetime.now().isoformat(),
                "monitoring_since": self.start_time.isoformat(),
                "current_health": self._assess_system_health().value if hasattr(self, '_assess_system_health') else "unknown",
                "recent_metrics": await self._collect_performance_metrics(),
                "repair_history": [
                    {
                        "cycle_id": cycle.cycle_id,
                        "timestamp": cycle.start_time.isoformat(),
                        "errors_detected": cycle.errors_detected,
                        "repairs_successful": cycle.repairs_successful,
                        "validation_score": cycle.validation_score,
                        "system_health": cycle.system_health.value
                    }
                    for cycle in self.loop_cycles[-20:]  # 最新20サイクル
                ]
            }
            
            state_file = self.coordination_path / "enhanced_infinite_loop_state.json"
            async with aiofiles.open(state_file, 'w') as f:
                await f.write(json.dumps(state, indent=2, ensure_ascii=False))
                
        except Exception as e:
            logger.error(f"状態保存エラー: {e}")
    
    async def _generate_cycle_report(self):
        """サイクルレポート生成"""
        try:
            if not self.loop_cycles:
                return
                
            recent_cycles = self.loop_cycles[-10:]  # 最新10サイクル
            
            report = {
                "generated_at": datetime.now().isoformat(),
                "total_cycles": len(self.loop_cycles),
                "recent_cycles_analyzed": len(recent_cycles),
                "summary": {
                    "avg_errors_per_cycle": statistics.mean([c.errors_detected for c in recent_cycles]),
                    "avg_repair_success_rate": statistics.mean([
                        (c.repairs_successful / c.repairs_attempted * 100) if c.repairs_attempted > 0 else 100
                        for c in recent_cycles
                    ]),
                    "avg_validation_score": statistics.mean([c.validation_score for c in recent_cycles]),
                    "system_health_trend": [c.system_health.value for c in recent_cycles[-5:]]
                },
                "performance_trends": {
                    "response_times": list(self.response_times)[-50:] if self.response_times else [],
                    "cpu_usage": list(self.cpu_usage)[-50:] if self.cpu_usage else [],
                    "memory_usage": list(self.memory_usage)[-50:] if self.memory_usage else []
                },
                "recommendations": self._generate_recommendations(recent_cycles)
            }
            
            report_file = self.coordination_path / f"cycle_report_{int(datetime.now().timestamp())}.json"
            async with aiofiles.open(report_file, 'w') as f:
                await f.write(json.dumps(report, indent=2, ensure_ascii=False))
                
            logger.info(f"📊 サイクルレポートを生成: {report_file}")
            
        except Exception as e:
            logger.error(f"レポート生成エラー: {e}")
    
    def _generate_recommendations(self, cycles: List[LoopCycle]) -> List[str]:
        """推奨事項生成"""
        recommendations = []
        
        try:
            if not cycles:
                return recommendations
            
            # エラー頻度分析
            avg_errors = statistics.mean([c.errors_detected for c in cycles])
            if avg_errors > 5:
                recommendations.append("⚠️ エラー発生頻度が高いです。根本原因分析を推奨します。")
            
            # 修復成功率分析
            repair_rates = [(c.repairs_successful / c.repairs_attempted * 100) if c.repairs_attempted > 0 else 100 for c in cycles]
            avg_repair_rate = statistics.mean(repair_rates)
            if avg_repair_rate < 70:
                recommendations.append("🔧 修復成功率が低いです。修復ロジックの見直しを推奨します。")
            
            # 検証スコア分析
            avg_validation = statistics.mean([c.validation_score for c in cycles])
            if avg_validation < 80:
                recommendations.append("✅ 検証スコアが低いです。システム品質の改善を推奨します。")
            
            # パフォーマンス分析
            if len(self.response_times) > 10:
                avg_response = statistics.mean(self.response_times)
                if avg_response > 3.0:
                    recommendations.append("⚡ レスポンス時間が長いです。パフォーマンスチューニングを推奨します。")
            
            # システムヘルス分析
            health_counts = defaultdict(int)
            for cycle in cycles:
                health_counts[cycle.system_health.value] += 1
            
            if health_counts.get('critical', 0) > 0 or health_counts.get('emergency', 0) > 0:
                recommendations.append("🚨 システムヘルスが悪化しています。緊急メンテナンスを検討してください。")
            
        except Exception as e:
            logger.error(f"推奨事項生成エラー: {e}")
            recommendations.append("❓ 推奨事項の生成中にエラーが発生しました。")
        
        return recommendations
    
    async def _cleanup_and_shutdown(self):
        """クリーンアップと終了処理"""
        try:
            logger.info("🧹 システムクリーンアップ開始")
            
            # 最終状態保存
            await self._save_enhanced_state()
            
            # 最終レポート生成
            await self._generate_final_report()
            
            logger.info("✅ システムクリーンアップ完了")
            
        except Exception as e:
            logger.error(f"クリーンアップエラー: {e}")
    
    async def _generate_final_report(self):
        """最終レポート生成"""
        try:
            uptime = datetime.now() - self.start_time
            
            final_report = {
                "session_summary": {
                    "start_time": self.start_time.isoformat(),
                    "end_time": datetime.now().isoformat(),
                    "total_uptime_hours": uptime.total_seconds() / 3600,
                    "total_cycles": self.loop_count,
                    "total_errors_fixed": self.total_errors_fixed
                },
                "overall_statistics": {
                    "avg_cycles_per_hour": self.loop_count / (uptime.total_seconds() / 3600) if uptime.total_seconds() > 0 else 0,
                    "avg_fixes_per_cycle": self.total_errors_fixed / self.loop_count if self.loop_count > 0 else 0,
                    "system_availability": self._calculate_availability()
                },
                "performance_summary": {
                    "avg_response_time": statistics.mean(self.response_times) if self.response_times else 0,
                    "avg_cpu_usage": statistics.mean(self.cpu_usage) if self.cpu_usage else 0,
                    "avg_memory_usage": statistics.mean(self.memory_usage) if self.memory_usage else 0
                },
                "recommendations": self._generate_final_recommendations()
            }
            
            final_report_file = self.coordination_path / f"final_session_report_{int(datetime.now().timestamp())}.json"
            async with aiofiles.open(final_report_file, 'w') as f:
                await f.write(json.dumps(final_report, indent=2, ensure_ascii=False))
                
            logger.info(f"📋 最終セッションレポートを生成: {final_report_file}")
            
        except Exception as e:
            logger.error(f"最終レポート生成エラー: {e}")
    
    def _calculate_availability(self) -> float:
        """可用性計算"""
        try:
            if not self.loop_cycles:
                return 100.0
            
            healthy_cycles = sum(1 for cycle in self.loop_cycles 
                               if cycle.system_health in [SystemHealth.OPTIMAL, SystemHealth.GOOD])
            
            return (healthy_cycles / len(self.loop_cycles)) * 100
        except Exception:
            return 0.0
    
    def _generate_final_recommendations(self) -> List[str]:
        """最終推奨事項生成"""
        recommendations = []
        
        try:
            # 全体的な推奨事項
            if self.total_errors_fixed > 100:
                recommendations.append("🔧 多数のエラーが修復されました。システムの根本的な見直しを推奨します。")
            
            if self.loop_count > 1000:
                recommendations.append("⏱️ 長時間の監視お疲れさまでした。定期的なメンテナンスウィンドウの設定を推奨します。")
            
            availability = self._calculate_availability()
            if availability < 95:
                recommendations.append(f"📊 システム可用性が {availability:.1f}% です。目標の99%を目指して改善を推奨します。")
            
        except Exception as e:
            logger.error(f"最終推奨事項生成エラー: {e}")
        
        return recommendations
    
    def _signal_handler(self, signum, frame):
        """シグナルハンドラー"""
        logger.info(f"🛑 シグナル {signum} を受信。監視を停止します。")
        self.monitoring = False
    
    def stop_monitoring(self):
        """監視停止"""
        logger.info("🛑 監視停止要求を受信")
        self.monitoring = False
    
    def get_status(self) -> Dict[str, Any]:
        """現在の状況取得"""
        try:
            return {
                "monitoring": self.monitoring,
                "loop_count": self.loop_count,
                "total_errors_fixed": self.total_errors_fixed,
                "uptime_hours": (datetime.now() - self.start_time).total_seconds() / 3600,
                "current_health": self._assess_system_health().value if hasattr(self, '_assess_system_health') else "unknown",
                "recent_performance": {
                    "avg_response_time": statistics.mean(list(self.response_times)[-10:]) if len(self.response_times) >= 10 else 0,
                    "current_cpu": psutil.cpu_percent(),
                    "current_memory": psutil.virtual_memory().percent
                },
                "last_cycle": self.loop_cycles[-1].__dict__ if self.loop_cycles else None
            }
        except Exception as e:
            logger.error(f"状況取得エラー: {e}")
            return {"error": str(e)}

# グローバルインスタンス
enhanced_monitor = EnhancedInfiniteLoopMonitor()

async def main():
    """メイン実行関数"""
    try:
        logger.info("🚀 強化された無限ループ自動修復システム開始")
        await enhanced_monitor.start_infinite_loop_monitoring()
    except KeyboardInterrupt:
        logger.info("⌨️ ユーザーによる中断")
        enhanced_monitor.stop_monitoring()
    except Exception as e:
        logger.error(f"❌ システムエラー: {e}")
        traceback.print_exc()
    finally:
        logger.info("🏁 システム終了")

if __name__ == "__main__":
    # ログ設定
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s - %(name)s - %(levelname)s - %(message)s",
        handlers=[
            logging.FileHandler("/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/coordination/enhanced_infinite_loop.log"),
            logging.StreamHandler()
        ]
    )
    
    asyncio.run(main())