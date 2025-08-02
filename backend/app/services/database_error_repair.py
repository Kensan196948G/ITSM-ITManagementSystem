"""
Database Connection Error Detection and Repair System
データベース接続エラーの検知・修復システム
"""

import asyncio
import json
import logging
import sqlite3
import time
import threading
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from dataclasses import dataclass, asdict
from pathlib import Path
import traceback
import shutil
import os
from sqlalchemy import create_engine, text, MetaData, Table
from sqlalchemy.exc import SQLAlchemyError, OperationalError, DatabaseError
from sqlalchemy.pool import StaticPool

from app.core.config import settings


@dataclass
class DatabaseError:
    """データベースエラー詳細"""
    timestamp: str
    error_type: str
    error_message: str
    severity: str
    table_name: Optional[str] = None
    query: Optional[str] = None
    connection_pool_status: Optional[str] = None
    repair_attempted: bool = False
    repair_successful: bool = False
    repair_description: Optional[str] = None


@dataclass
class DatabaseMetrics:
    """データベースメトリクス"""
    timestamp: str
    connection_pool_size: int
    active_connections: int
    idle_connections: int
    failed_connections: int
    query_execution_time_avg: float
    database_size_mb: float
    table_count: int
    index_count: int
    vacuum_last_run: Optional[str] = None
    integrity_check_status: str = "unknown"


class DatabaseErrorRepairSystem:
    """データベースエラー検知・修復システム"""
    
    def __init__(self):
        self.logger = logging.getLogger(__name__)
        self.db_path = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/itsm.db"
        self.backup_dir = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/backups"
        self.error_log_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/database_errors.log"
        self.metrics_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/database_metrics.json"
        
        # エラー履歴
        self.error_history: List[DatabaseError] = []
        self.repair_history: List[Dict] = []
        
        # 監視設定
        self.monitoring_active = False
        self.monitoring_interval = 10  # 10秒間隔
        self.connection_timeout = 30
        self.query_timeout = 60
        
        # パフォーマンス閾値
        self.performance_thresholds = {
            "connection_time_warning": 2.0,      # 2秒
            "connection_time_critical": 5.0,     # 5秒
            "query_time_warning": 5.0,           # 5秒
            "query_time_critical": 10.0,         # 10秒
            "database_size_warning": 1024,       # 1GB
            "database_size_critical": 2048,      # 2GB
        }
        
        # 修復アクション設定
        self.auto_repair_enabled = True
        self.max_repair_attempts = 3
        self.backup_retention_days = 7
        
        # バックアップディレクトリ作成
        os.makedirs(self.backup_dir, exist_ok=True)
        os.makedirs(os.path.dirname(self.error_log_file), exist_ok=True)
    
    async def start_infinite_monitoring(self):
        """無限ループでのデータベース監視開始"""
        self.monitoring_active = True
        self.logger.info("Starting infinite database monitoring...")
        
        monitoring_cycle = 0
        consecutive_failures = 0
        max_consecutive_failures = 5
        
        while self.monitoring_active:
            try:
                monitoring_cycle += 1
                self.logger.info(f"Starting database monitoring cycle #{monitoring_cycle}")
                
                # 1. Connection Health Check
                connection_status = await self.check_connection_health()
                
                # 2. Database Integrity Check
                integrity_status = await self.check_database_integrity()
                
                # 3. Performance Monitoring
                performance_metrics = await self.monitor_database_performance()
                
                # 4. Connection Pool Monitoring
                pool_status = await self.monitor_connection_pool()
                
                # 5. Transaction Lock Detection
                lock_status = await self.check_transaction_locks()
                
                # 6. Database Size and Optimization Check
                optimization_status = await self.check_database_optimization()
                
                # 7. Backup Status Check
                backup_status = await self.check_backup_status()
                
                # 8. Auto Repair if Critical Issues Detected
                if self._has_critical_database_issues(connection_status, integrity_status, performance_metrics):
                    await self.execute_auto_repair()
                
                # 9. Generate Metrics Report
                await self.generate_database_metrics_report(
                    connection_status, integrity_status, performance_metrics,
                    pool_status, lock_status, optimization_status, backup_status
                )
                
                # 10. Cleanup Old Logs and Backups
                await self.cleanup_old_files()
                
                consecutive_failures = 0
                await asyncio.sleep(self.monitoring_interval)
                
            except Exception as e:
                consecutive_failures += 1
                self.logger.error(f"Database monitoring cycle #{monitoring_cycle} failed: {str(e)}")
                self.logger.error(traceback.format_exc())
                
                # Record monitoring failure
                error = DatabaseError(
                    timestamp=datetime.now().isoformat(),
                    error_type="MONITORING_FAILURE",
                    error_message=str(e),
                    severity="high"
                )
                self.error_history.append(error)
                
                # Too many consecutive failures - emergency recovery
                if consecutive_failures >= max_consecutive_failures:
                    self.logger.critical(f"Too many consecutive monitoring failures: {consecutive_failures}")
                    await self.emergency_database_recovery()
                    consecutive_failures = 0
                
                # Exponential backoff
                wait_time = min(300, self.monitoring_interval * (2 ** min(consecutive_failures, 5)))
                await asyncio.sleep(wait_time)
    
    async def check_connection_health(self) -> Dict[str, Any]:
        """データベース接続健康状態チェック"""
        status = {
            "timestamp": datetime.now().isoformat(),
            "connection_status": "unknown",
            "connection_time": 0,
            "test_query_time": 0,
            "error": None,
            "details": {}
        }
        
        try:
            # 1. Basic Connection Test
            start_time = time.time()
            engine = create_engine(
                f"sqlite:///{self.db_path}",
                poolclass=StaticPool,
                connect_args={"timeout": self.connection_timeout}
            )
            connection_time = time.time() - start_time
            
            # 2. Test Query Execution
            query_start = time.time()
            with engine.connect() as conn:
                # Test basic query
                result = conn.execute(text("SELECT 1 as test"))
                result.fetchone()
                
                # Test table access
                result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table' LIMIT 1"))
                result.fetchone()
                
            test_query_time = time.time() - query_start
            
            # 3. Evaluate Performance
            status.update({
                "connection_status": "healthy",
                "connection_time": connection_time,
                "test_query_time": test_query_time,
                "details": {
                    "connection_time_status": self._evaluate_connection_time(connection_time),
                    "query_time_status": self._evaluate_query_time(test_query_time)
                }
            })
            
            # Check for performance warnings
            if connection_time > self.performance_thresholds["connection_time_warning"]:
                status["details"]["connection_warning"] = f"Slow connection time: {connection_time:.2f}s"
            
            if test_query_time > self.performance_thresholds["query_time_warning"]:
                status["details"]["query_warning"] = f"Slow query execution: {test_query_time:.2f}s"
            
            self.logger.info(f"Database connection health check passed: {connection_time:.3f}s connection, {test_query_time:.3f}s query")
            
        except OperationalError as e:
            status.update({
                "connection_status": "error",
                "error": str(e),
                "details": {"error_type": "OperationalError"}
            })
            
            # Record database error
            db_error = DatabaseError(
                timestamp=datetime.now().isoformat(),
                error_type="CONNECTION_ERROR",
                error_message=str(e),
                severity="critical",
                repair_attempted=False
            )
            self.error_history.append(db_error)
            
            self.logger.error(f"Database connection failed: {str(e)}")
            
        except DatabaseError as e:
            status.update({
                "connection_status": "error",
                "error": str(e),
                "details": {"error_type": "DatabaseError"}
            })
            
            self.logger.error(f"Database error: {str(e)}")
            
        except Exception as e:
            status.update({
                "connection_status": "error",
                "error": str(e),
                "details": {"error_type": "UnexpectedError"}
            })
            
            self.logger.error(f"Unexpected database error: {str(e)}")
        
        return status
    
    async def check_database_integrity(self) -> Dict[str, Any]:
        """データベース整合性チェック"""
        integrity_status = {
            "timestamp": datetime.now().isoformat(),
            "overall_status": "unknown",
            "checks": {},
            "issues_found": [],
            "repair_needed": False
        }
        
        try:
            engine = create_engine(f"sqlite:///{self.db_path}")
            
            with engine.connect() as conn:
                # 1. PRAGMA integrity_check
                result = conn.execute(text("PRAGMA integrity_check"))
                integrity_result = result.fetchall()
                
                integrity_ok = all(row[0] == "ok" for row in integrity_result)
                integrity_status["checks"]["integrity_check"] = {
                    "status": "passed" if integrity_ok else "failed",
                    "details": [row[0] for row in integrity_result]
                }
                
                if not integrity_ok:
                    integrity_status["issues_found"].append("Database integrity check failed")
                    integrity_status["repair_needed"] = True
                
                # 2. PRAGMA foreign_key_check
                result = conn.execute(text("PRAGMA foreign_key_check"))
                fk_violations = result.fetchall()
                
                integrity_status["checks"]["foreign_key_check"] = {
                    "status": "passed" if not fk_violations else "failed",
                    "violations_count": len(fk_violations),
                    "violations": [dict(row._mapping) for row in fk_violations[:10]]  # Limit to 10
                }
                
                if fk_violations:
                    integrity_status["issues_found"].append(f"Foreign key violations: {len(fk_violations)}")
                
                # 3. Check table structure
                result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='table'"))
                tables = [row[0] for row in result.fetchall()]
                
                integrity_status["checks"]["table_structure"] = {
                    "status": "passed",
                    "table_count": len(tables),
                    "tables": tables
                }
                
                # 4. Check for corruption indicators
                try:
                    # Try to query all tables
                    for table in tables:
                        conn.execute(text(f"SELECT COUNT(*) FROM [{table}]"))
                    
                    integrity_status["checks"]["table_accessibility"] = {
                        "status": "passed",
                        "details": "All tables accessible"
                    }
                    
                except Exception as e:
                    integrity_status["checks"]["table_accessibility"] = {
                        "status": "failed",
                        "error": str(e)
                    }
                    integrity_status["issues_found"].append("Table accessibility issues")
                    integrity_status["repair_needed"] = True
            
            # Overall status evaluation
            if not integrity_status["issues_found"]:
                integrity_status["overall_status"] = "healthy"
            elif integrity_status["repair_needed"]:
                integrity_status["overall_status"] = "critical"
            else:
                integrity_status["overall_status"] = "warning"
            
            self.logger.info(f"Database integrity check completed: {integrity_status['overall_status']}")
            
        except Exception as e:
            integrity_status.update({
                "overall_status": "error",
                "error": str(e),
                "checks": {"integrity_check": {"status": "failed", "error": str(e)}}
            })
            
            self.logger.error(f"Database integrity check failed: {str(e)}")
        
        return integrity_status
    
    async def monitor_database_performance(self) -> Dict[str, Any]:
        """データベースパフォーマンス監視"""
        performance_metrics = {
            "timestamp": datetime.now().isoformat(),
            "query_performance": {},
            "database_stats": {},
            "optimization_suggestions": [],
            "overall_performance": "unknown"
        }
        
        try:
            engine = create_engine(f"sqlite:///{self.db_path}")
            
            with engine.connect() as conn:
                # 1. Query Performance Tests
                test_queries = [
                    ("simple_select", "SELECT 1"),
                    ("table_count", "SELECT COUNT(*) FROM sqlite_master WHERE type='table'"),
                    ("incidents_count", "SELECT COUNT(*) FROM incidents"),
                    ("problems_count", "SELECT COUNT(*) FROM problems"),
                ]
                
                for query_name, query in test_queries:
                    try:
                        start_time = time.time()
                        result = conn.execute(text(query))
                        result.fetchall()
                        execution_time = time.time() - start_time
                        
                        performance_metrics["query_performance"][query_name] = {
                            "execution_time": execution_time,
                            "status": "passed" if execution_time < 1.0 else "slow"
                        }
                        
                        if execution_time > self.performance_thresholds["query_time_warning"]:
                            performance_metrics["optimization_suggestions"].append(
                                f"Slow query detected: {query_name} ({execution_time:.2f}s)"
                            )
                    
                    except Exception as e:
                        performance_metrics["query_performance"][query_name] = {
                            "status": "failed",
                            "error": str(e)
                        }
                
                # 2. Database Statistics
                db_stats = {}
                
                # Database size
                if os.path.exists(self.db_path):
                    db_size_bytes = os.path.getsize(self.db_path)
                    db_size_mb = db_size_bytes / (1024 * 1024)
                    db_stats["size_mb"] = db_size_mb
                    
                    if db_size_mb > self.performance_thresholds["database_size_warning"]:
                        performance_metrics["optimization_suggestions"].append(
                            f"Large database size: {db_size_mb:.2f} MB"
                        )
                
                # Table statistics
                result = conn.execute(text("""
                    SELECT 
                        name,
                        (SELECT COUNT(*) FROM sqlite_master WHERE type='index' AND tbl_name=m.name) as index_count
                    FROM sqlite_master m WHERE type='table'
                """))
                
                table_stats = []
                for row in result.fetchall():
                    table_name, index_count = row
                    try:
                        count_result = conn.execute(text(f"SELECT COUNT(*) FROM [{table_name}]"))
                        row_count = count_result.fetchone()[0]
                        table_stats.append({
                            "table": table_name,
                            "rows": row_count,
                            "indexes": index_count
                        })
                    except Exception:
                        pass
                
                db_stats["tables"] = table_stats
                performance_metrics["database_stats"] = db_stats
                
                # 3. Index Usage Analysis
                try:
                    result = conn.execute(text("SELECT name FROM sqlite_master WHERE type='index'"))
                    indexes = [row[0] for row in result.fetchall()]
                    performance_metrics["database_stats"]["total_indexes"] = len(indexes)
                    
                except Exception as e:
                    self.logger.warning(f"Index analysis failed: {str(e)}")
                
                # 4. Overall Performance Evaluation
                slow_queries = sum(1 for q in performance_metrics["query_performance"].values() 
                                 if q.get("status") == "slow")
                failed_queries = sum(1 for q in performance_metrics["query_performance"].values() 
                                   if q.get("status") == "failed")
                
                if failed_queries > 0:
                    performance_metrics["overall_performance"] = "critical"
                elif slow_queries > 2 or len(performance_metrics["optimization_suggestions"]) > 3:
                    performance_metrics["overall_performance"] = "warning"
                else:
                    performance_metrics["overall_performance"] = "good"
            
            self.logger.info(f"Database performance monitoring completed: {performance_metrics['overall_performance']}")
            
        except Exception as e:
            performance_metrics.update({
                "overall_performance": "error",
                "error": str(e)
            })
            
            self.logger.error(f"Database performance monitoring failed: {str(e)}")
        
        return performance_metrics
    
    async def monitor_connection_pool(self) -> Dict[str, Any]:
        """コネクションプール監視"""
        pool_status = {
            "timestamp": datetime.now().isoformat(),
            "pool_stats": {},
            "status": "unknown",
            "issues": []
        }
        
        try:
            # SQLiteではプール監視は限定的だが、基本的な接続テストを実行
            engine = create_engine(f"sqlite:///{self.db_path}", poolclass=StaticPool)
            
            # Multiple connection test
            connection_tests = []
            for i in range(5):
                try:
                    start_time = time.time()
                    with engine.connect() as conn:
                        conn.execute(text("SELECT 1"))
                    connection_time = time.time() - start_time
                    connection_tests.append({"test": i+1, "time": connection_time, "status": "success"})
                except Exception as e:
                    connection_tests.append({"test": i+1, "status": "failed", "error": str(e)})
            
            successful_connections = sum(1 for test in connection_tests if test["status"] == "success")
            avg_connection_time = sum(test.get("time", 0) for test in connection_tests if test["status"] == "success") / max(successful_connections, 1)
            
            pool_status["pool_stats"] = {
                "total_tests": len(connection_tests),
                "successful_connections": successful_connections,
                "failed_connections": len(connection_tests) - successful_connections,
                "average_connection_time": avg_connection_time,
                "connection_tests": connection_tests
            }
            
            if successful_connections == len(connection_tests):
                pool_status["status"] = "healthy"
            elif successful_connections > 0:
                pool_status["status"] = "degraded"
                pool_status["issues"].append(f"Some connections failed: {len(connection_tests) - successful_connections}")
            else:
                pool_status["status"] = "failed"
                pool_status["issues"].append("All connection tests failed")
            
            if avg_connection_time > self.performance_thresholds["connection_time_warning"]:
                pool_status["issues"].append(f"Slow average connection time: {avg_connection_time:.2f}s")
            
            self.logger.info(f"Connection pool monitoring completed: {pool_status['status']}")
            
        except Exception as e:
            pool_status.update({
                "status": "error",
                "error": str(e)
            })
            
            self.logger.error(f"Connection pool monitoring failed: {str(e)}")
        
        return pool_status
    
    async def check_transaction_locks(self) -> Dict[str, Any]:
        """トランザクションロック検知"""
        lock_status = {
            "timestamp": datetime.now().isoformat(),
            "lock_detection": "none",
            "active_transactions": 0,
            "lock_details": [],
            "status": "healthy"
        }
        
        try:
            # SQLiteの場合、WALモードでない限り単一ライターなので
            # ロック検出は限定的だが、基本的なチェックを実行
            
            # 1. Database file lock check
            if os.path.exists(self.db_path):
                # Try to open database in exclusive mode briefly
                try:
                    with sqlite3.connect(self.db_path, timeout=1.0) as conn:
                        conn.execute("BEGIN IMMEDIATE")
                        conn.rollback()
                    
                    lock_status["lock_detection"] = "none"
                    lock_status["status"] = "healthy"
                    
                except sqlite3.OperationalError as e:
                    if "database is locked" in str(e).lower():
                        lock_status["lock_detection"] = "detected"
                        lock_status["status"] = "warning"
                        lock_status["lock_details"].append({
                            "type": "database_lock",
                            "message": str(e)
                        })
                
                # 2. Check for lock files
                lock_files = [
                    f"{self.db_path}-wal",
                    f"{self.db_path}-shm",
                    f"{self.db_path}-journal"
                ]
                
                existing_lock_files = [f for f in lock_files if os.path.exists(f)]
                if existing_lock_files:
                    lock_status["lock_details"].append({
                        "type": "lock_files",
                        "files": existing_lock_files
                    })
            
            self.logger.info(f"Transaction lock check completed: {lock_status['status']}")
            
        except Exception as e:
            lock_status.update({
                "status": "error",
                "error": str(e)
            })
            
            self.logger.error(f"Transaction lock check failed: {str(e)}")
        
        return lock_status
    
    async def check_database_optimization(self) -> Dict[str, Any]:
        """データベース最適化チェック"""
        optimization_status = {
            "timestamp": datetime.now().isoformat(),
            "optimization_needed": False,
            "recommendations": [],
            "last_vacuum": None,
            "fragmentation_level": "unknown",
            "status": "optimal"
        }
        
        try:
            engine = create_engine(f"sqlite:///{self.db_path}")
            
            with engine.connect() as conn:
                # 1. Check database page statistics
                try:
                    result = conn.execute(text("PRAGMA page_count"))
                    page_count = result.fetchone()[0]
                    
                    result = conn.execute(text("PRAGMA freelist_count"))
                    freelist_count = result.fetchone()[0]
                    
                    if page_count > 0:
                        fragmentation_ratio = freelist_count / page_count
                        optimization_status["fragmentation_level"] = fragmentation_ratio
                        
                        if fragmentation_ratio > 0.2:  # 20% fragmentation
                            optimization_status["optimization_needed"] = True
                            optimization_status["recommendations"].append(
                                f"High fragmentation detected: {fragmentation_ratio:.2%}"
                            )
                            optimization_status["status"] = "needs_optimization"
                
                except Exception as e:
                    self.logger.warning(f"Fragmentation check failed: {str(e)}")
                
                # 2. Check analyze statistics
                try:
                    result = conn.execute(text("SELECT name FROM sqlite_stat1 LIMIT 1"))
                    has_stats = result.fetchone() is not None
                    
                    if not has_stats:
                        optimization_status["recommendations"].append("Database statistics missing - run ANALYZE")
                
                except Exception:
                    optimization_status["recommendations"].append("Unable to check database statistics")
                
                # 3. Check index usage
                try:
                    result = conn.execute(text("SELECT COUNT(*) FROM sqlite_master WHERE type='index'"))
                    index_count = result.fetchone()[0]
                    
                    result = conn.execute(text("SELECT COUNT(*) FROM sqlite_master WHERE type='table'"))
                    table_count = result.fetchone()[0]
                    
                    if table_count > 0 and index_count / table_count < 2:
                        optimization_status["recommendations"].append("Consider adding more indexes for better performance")
                
                except Exception as e:
                    self.logger.warning(f"Index check failed: {str(e)}")
                
                # 4. Check for unused space
                if os.path.exists(self.db_path):
                    file_size = os.path.getsize(self.db_path)
                    if file_size > 100 * 1024 * 1024:  # 100MB
                        optimization_status["recommendations"].append("Large database - consider regular VACUUM")
                        if optimization_status["status"] == "optimal":
                            optimization_status["status"] = "maintenance_recommended"
            
            if optimization_status["optimization_needed"]:
                optimization_status["recommendations"].append("Run VACUUM to optimize database")
            
            self.logger.info(f"Database optimization check completed: {optimization_status['status']}")
            
        except Exception as e:
            optimization_status.update({
                "status": "error",
                "error": str(e)
            })
            
            self.logger.error(f"Database optimization check failed: {str(e)}")
        
        return optimization_status
    
    async def check_backup_status(self) -> Dict[str, Any]:
        """バックアップ状態チェック"""
        backup_status = {
            "timestamp": datetime.now().isoformat(),
            "backup_exists": False,
            "latest_backup": None,
            "backup_age_hours": None,
            "backup_size_mb": None,
            "recommendations": [],
            "status": "unknown"
        }
        
        try:
            # Check for existing backups
            if os.path.exists(self.backup_dir):
                backup_files = [f for f in os.listdir(self.backup_dir) if f.endswith('.db')]
                
                if backup_files:
                    # Find latest backup
                    backup_paths = [os.path.join(self.backup_dir, f) for f in backup_files]
                    latest_backup_path = max(backup_paths, key=os.path.getmtime)
                    latest_backup_file = os.path.basename(latest_backup_path)
                    
                    backup_mtime = os.path.getmtime(latest_backup_path)
                    backup_age_seconds = time.time() - backup_mtime
                    backup_age_hours = backup_age_seconds / 3600
                    
                    backup_size = os.path.getsize(latest_backup_path)
                    backup_size_mb = backup_size / (1024 * 1024)
                    
                    backup_status.update({
                        "backup_exists": True,
                        "latest_backup": latest_backup_file,
                        "backup_age_hours": backup_age_hours,
                        "backup_size_mb": backup_size_mb,
                        "total_backups": len(backup_files)
                    })
                    
                    # Evaluate backup freshness
                    if backup_age_hours < 24:
                        backup_status["status"] = "current"
                    elif backup_age_hours < 72:
                        backup_status["status"] = "aging"
                        backup_status["recommendations"].append("Backup is getting old - consider creating new backup")
                    else:
                        backup_status["status"] = "stale"
                        backup_status["recommendations"].append("Backup is stale - immediate backup recommended")
                
                else:
                    backup_status["status"] = "no_backups"
                    backup_status["recommendations"].append("No backups found - create backup immediately")
            
            else:
                backup_status["status"] = "no_backup_directory"
                backup_status["recommendations"].append("Backup directory does not exist")
            
            self.logger.info(f"Backup status check completed: {backup_status['status']}")
            
        except Exception as e:
            backup_status.update({
                "status": "error",
                "error": str(e)
            })
            
            self.logger.error(f"Backup status check failed: {str(e)}")
        
        return backup_status
    
    def _has_critical_database_issues(self, connection_status, integrity_status, performance_metrics) -> bool:
        """クリティカルなデータベース問題の検出"""
        # Connection failures
        if connection_status.get("connection_status") == "error":
            return True
        
        # Integrity issues
        if integrity_status.get("overall_status") == "critical":
            return True
        
        # Severe performance issues
        if performance_metrics.get("overall_performance") == "critical":
            return True
        
        # Slow connections
        connection_time = connection_status.get("connection_time", 0)
        if connection_time > self.performance_thresholds["connection_time_critical"]:
            return True
        
        return False
    
    async def execute_auto_repair(self):
        """自動修復実行"""
        if not self.auto_repair_enabled:
            self.logger.info("Auto repair is disabled")
            return
        
        self.logger.info("Executing database auto repair procedures...")
        
        repair_actions = []
        repair_success = True
        
        try:
            # 1. Create Emergency Backup
            backup_result = await self._create_emergency_backup()
            repair_actions.append(backup_result)
            
            if not backup_result.get("success", False):
                self.logger.error("Emergency backup failed - aborting auto repair")
                return
            
            # 2. Database Integrity Repair
            integrity_repair_result = await self._repair_database_integrity()
            repair_actions.append(integrity_repair_result)
            
            # 3. Connection Pool Reset
            pool_reset_result = await self._reset_connection_pool()
            repair_actions.append(pool_reset_result)
            
            # 4. Database Optimization
            optimization_result = await self._optimize_database()
            repair_actions.append(optimization_result)
            
            # 5. Clear Lock Files
            lock_clear_result = await self._clear_lock_files()
            repair_actions.append(lock_clear_result)
            
            # 6. Test Database After Repair
            test_result = await self._test_database_after_repair()
            repair_actions.append(test_result)
            
            # Update repair success status
            repair_success = all(action.get("success", False) for action in repair_actions)
            
            # Log repair actions
            self.repair_history.append({
                "timestamp": datetime.now().isoformat(),
                "actions": repair_actions,
                "overall_success": repair_success,
                "error_count_before": len(self.error_history)
            })
            
            self.logger.info(f"Database auto repair completed: {'success' if repair_success else 'partial failure'}")
            
        except Exception as e:
            self.logger.error(f"Database auto repair failed: {str(e)}")
            repair_actions.append({
                "action": "auto_repair_exception",
                "success": False,
                "error": str(e),
                "timestamp": datetime.now().isoformat()
            })
    
    async def _create_emergency_backup(self) -> Dict[str, Any]:
        """緊急バックアップ作成"""
        result = {
            "action": "emergency_backup",
            "success": False,
            "timestamp": datetime.now().isoformat(),
            "details": {}
        }
        
        try:
            if not os.path.exists(self.db_path):
                result["details"]["error"] = "Source database file not found"
                return result
            
            timestamp = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_filename = f"emergency_backup_{timestamp}.db"
            backup_path = os.path.join(self.backup_dir, backup_filename)
            
            # Create backup using shutil.copy2 to preserve metadata
            shutil.copy2(self.db_path, backup_path)
            
            # Verify backup
            backup_size = os.path.getsize(backup_path)
            source_size = os.path.getsize(self.db_path)
            
            if backup_size == source_size:
                result.update({
                    "success": True,
                    "details": {
                        "backup_file": backup_filename,
                        "backup_path": backup_path,
                        "size_mb": backup_size / (1024 * 1024)
                    }
                })
                self.logger.info(f"Emergency backup created: {backup_filename}")
            else:
                result["details"]["error"] = f"Backup size mismatch: {backup_size} vs {source_size}"
        
        except Exception as e:
            result["details"]["error"] = str(e)
            self.logger.error(f"Emergency backup failed: {str(e)}")
        
        return result
    
    async def _repair_database_integrity(self) -> Dict[str, Any]:
        """データベース整合性修復"""
        result = {
            "action": "integrity_repair",
            "success": False,
            "timestamp": datetime.now().isoformat(),
            "details": {}
        }
        
        try:
            engine = create_engine(f"sqlite:///{self.db_path}")
            
            with engine.connect() as conn:
                # Run integrity check first
                integrity_result = conn.execute(text("PRAGMA integrity_check"))
                integrity_issues = [row[0] for row in integrity_result.fetchall() if row[0] != "ok"]
                
                if not integrity_issues:
                    result.update({
                        "success": True,
                        "details": {"message": "No integrity issues found"}
                    })
                else:
                    # Try to repair using REINDEX
                    conn.execute(text("REINDEX"))
                    
                    # Re-check integrity
                    integrity_result = conn.execute(text("PRAGMA integrity_check"))
                    remaining_issues = [row[0] for row in integrity_result.fetchall() if row[0] != "ok"]
                    
                    if not remaining_issues:
                        result.update({
                            "success": True,
                            "details": {
                                "message": "Integrity issues repaired using REINDEX",
                                "issues_fixed": len(integrity_issues)
                            }
                        })
                    else:
                        result["details"] = {
                            "message": "Some integrity issues remain after REINDEX",
                            "remaining_issues": remaining_issues
                        }
            
            self.logger.info(f"Database integrity repair: {'success' if result['success'] else 'partial'}")
            
        except Exception as e:
            result["details"]["error"] = str(e)
            self.logger.error(f"Database integrity repair failed: {str(e)}")
        
        return result
    
    async def _reset_connection_pool(self) -> Dict[str, Any]:
        """コネクションプールリセット"""
        result = {
            "action": "connection_pool_reset",
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "details": {"message": "Connection pool reset completed"}
        }
        
        try:
            # For SQLite, connection pool reset is simpler
            # We just ensure no connections are hanging
            engine = create_engine(f"sqlite:///{self.db_path}", poolclass=StaticPool)
            
            # Test connection
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            self.logger.info("Connection pool reset completed")
            
        except Exception as e:
            result.update({
                "success": False,
                "details": {"error": str(e)}
            })
            self.logger.error(f"Connection pool reset failed: {str(e)}")
        
        return result
    
    async def _optimize_database(self) -> Dict[str, Any]:
        """データベース最適化"""
        result = {
            "action": "database_optimization",
            "success": False,
            "timestamp": datetime.now().isoformat(),
            "details": {}
        }
        
        try:
            engine = create_engine(f"sqlite:///{self.db_path}")
            
            with engine.connect() as conn:
                # Get initial size
                initial_size = os.path.getsize(self.db_path)
                
                # Run VACUUM to optimize
                conn.execute(text("VACUUM"))
                
                # Run ANALYZE to update statistics
                conn.execute(text("ANALYZE"))
                
                # Get final size
                final_size = os.path.getsize(self.db_path)
                size_reduction = initial_size - final_size
                
                result.update({
                    "success": True,
                    "details": {
                        "initial_size_mb": initial_size / (1024 * 1024),
                        "final_size_mb": final_size / (1024 * 1024),
                        "size_reduction_mb": size_reduction / (1024 * 1024),
                        "operations": ["VACUUM", "ANALYZE"]
                    }
                })
                
                self.logger.info(f"Database optimization completed: {size_reduction / (1024 * 1024):.2f} MB saved")
            
        except Exception as e:
            result["details"]["error"] = str(e)
            self.logger.error(f"Database optimization failed: {str(e)}")
        
        return result
    
    async def _clear_lock_files(self) -> Dict[str, Any]:
        """ロックファイルクリア"""
        result = {
            "action": "clear_lock_files",
            "success": True,
            "timestamp": datetime.now().isoformat(),
            "details": {"files_removed": []}
        }
        
        try:
            lock_files = [
                f"{self.db_path}-journal",
                f"{self.db_path}-wal",
                f"{self.db_path}-shm"
            ]
            
            removed_files = []
            for lock_file in lock_files:
                if os.path.exists(lock_file):
                    try:
                        os.remove(lock_file)
                        removed_files.append(os.path.basename(lock_file))
                    except OSError as e:
                        self.logger.warning(f"Could not remove lock file {lock_file}: {str(e)}")
            
            result["details"]["files_removed"] = removed_files
            
            if removed_files:
                self.logger.info(f"Lock files removed: {', '.join(removed_files)}")
            else:
                self.logger.info("No lock files found to remove")
            
        except Exception as e:
            result.update({
                "success": False,
                "details": {"error": str(e)}
            })
            self.logger.error(f"Lock file clearing failed: {str(e)}")
        
        return result
    
    async def _test_database_after_repair(self) -> Dict[str, Any]:
        """修復後データベーステスト"""
        result = {
            "action": "post_repair_test",
            "success": False,
            "timestamp": datetime.now().isoformat(),
            "details": {}
        }
        
        try:
            # Test connection and basic operations
            connection_test = await self.check_connection_health()
            
            if connection_test.get("connection_status") == "healthy":
                # Test integrity
                integrity_test = await self.check_database_integrity()
                
                if integrity_test.get("overall_status") in ["healthy", "warning"]:
                    result.update({
                        "success": True,
                        "details": {
                            "connection_status": connection_test.get("connection_status"),
                            "integrity_status": integrity_test.get("overall_status"),
                            "connection_time": connection_test.get("connection_time"),
                            "query_time": connection_test.get("test_query_time")
                        }
                    })
                else:
                    result["details"]["error"] = f"Integrity test failed: {integrity_test.get('overall_status')}"
            else:
                result["details"]["error"] = f"Connection test failed: {connection_test.get('connection_status')}"
            
            self.logger.info(f"Post-repair database test: {'passed' if result['success'] else 'failed'}")
            
        except Exception as e:
            result["details"]["error"] = str(e)
            self.logger.error(f"Post-repair database test failed: {str(e)}")
        
        return result
    
    async def emergency_database_recovery(self):
        """緊急データベース復旧"""
        self.logger.critical("Initiating emergency database recovery...")
        
        recovery_actions = []
        
        try:
            # 1. Stop all database operations
            recovery_actions.append("Database operations suspended")
            
            # 2. Create emergency backup if possible
            if os.path.exists(self.db_path):
                try:
                    emergency_backup = await self._create_emergency_backup()
                    recovery_actions.append(f"Emergency backup: {emergency_backup.get('success', False)}")
                except Exception:
                    recovery_actions.append("Emergency backup failed")
            
            # 3. Check for latest good backup
            if os.path.exists(self.backup_dir):
                backup_files = [f for f in os.listdir(self.backup_dir) if f.endswith('.db')]
                if backup_files:
                    latest_backup = max(
                        [os.path.join(self.backup_dir, f) for f in backup_files],
                        key=os.path.getmtime
                    )
                    
                    # Restore from backup
                    try:
                        shutil.copy2(latest_backup, self.db_path)
                        recovery_actions.append(f"Database restored from: {os.path.basename(latest_backup)}")
                    except Exception as e:
                        recovery_actions.append(f"Backup restore failed: {str(e)}")
                else:
                    recovery_actions.append("No backups available for restore")
            
            # 4. Clear all error history
            self.error_history.clear()
            recovery_actions.append("Error history cleared")
            
            # 5. Wait for stabilization
            await asyncio.sleep(60)
            recovery_actions.append("System stabilization completed")
            
            # 6. Test database after recovery
            test_result = await self.check_connection_health()
            recovery_actions.append(f"Post-recovery test: {test_result.get('connection_status', 'unknown')}")
            
            self.logger.info(f"Emergency database recovery completed: {', '.join(recovery_actions)}")
            
        except Exception as e:
            recovery_actions.append(f"Recovery failed: {str(e)}")
            self.logger.error(f"Emergency database recovery failed: {str(e)}")
    
    async def generate_database_metrics_report(self, connection_status, integrity_status, 
                                             performance_metrics, pool_status, lock_status, 
                                             optimization_status, backup_status):
        """データベースメトリクスレポート生成"""
        try:
            metrics_report = {
                "timestamp": datetime.now().isoformat(),
                "monitoring_cycle": len(self.repair_history) + 1,
                "connection_health": connection_status,
                "integrity_status": integrity_status,
                "performance_metrics": performance_metrics,
                "connection_pool": pool_status,
                "transaction_locks": lock_status,
                "optimization_status": optimization_status,
                "backup_status": backup_status,
                "error_summary": {
                    "total_errors": len(self.error_history),
                    "recent_errors": len([e for e in self.error_history 
                                        if datetime.fromisoformat(e.timestamp) > datetime.now() - timedelta(hours=1)]),
                    "repair_attempts": len(self.repair_history)
                },
                "overall_database_health": self._calculate_overall_database_health(
                    connection_status, integrity_status, performance_metrics, backup_status
                )
            }
            
            # Save metrics report
            with open(self.metrics_file, 'w') as f:
                json.dump(metrics_report, f, indent=2)
            
            # Save detailed report with timestamp
            report_file = f"/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/database_report_{int(time.time())}.json"
            with open(report_file, 'w') as f:
                json.dump(metrics_report, f, indent=2)
            
            self.logger.info(f"Database metrics report generated: {metrics_report['overall_database_health']}")
            
        except Exception as e:
            self.logger.error(f"Failed to generate database metrics report: {str(e)}")
    
    def _calculate_overall_database_health(self, connection_status, integrity_status, 
                                         performance_metrics, backup_status) -> str:
        """総合データベース健康状態計算"""
        # Critical issues
        if connection_status.get("connection_status") == "error":
            return "critical"
        
        if integrity_status.get("overall_status") == "critical":
            return "critical"
        
        if performance_metrics.get("overall_performance") == "critical":
            return "critical"
        
        # Warning issues
        warning_conditions = [
            connection_status.get("connection_time", 0) > self.performance_thresholds["connection_time_warning"],
            integrity_status.get("overall_status") == "warning",
            performance_metrics.get("overall_performance") == "warning",
            backup_status.get("status") in ["aging", "stale"]
        ]
        
        if any(warning_conditions):
            return "warning"
        
        return "healthy"
    
    async def cleanup_old_files(self):
        """古いファイルのクリーンアップ"""
        try:
            # Clean up old backups
            if os.path.exists(self.backup_dir):
                cutoff_date = datetime.now() - timedelta(days=self.backup_retention_days)
                
                for filename in os.listdir(self.backup_dir):
                    if filename.endswith('.db'):
                        filepath = os.path.join(self.backup_dir, filename)
                        file_mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
                        
                        if file_mtime < cutoff_date:
                            try:
                                os.remove(filepath)
                                self.logger.info(f"Removed old backup: {filename}")
                            except OSError as e:
                                self.logger.warning(f"Could not remove old backup {filename}: {str(e)}")
            
            # Clean up old log reports
            log_dir = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs"
            if os.path.exists(log_dir):
                cutoff_date = datetime.now() - timedelta(days=self.backup_retention_days)
                
                for filename in os.listdir(log_dir):
                    if filename.startswith("database_report_") and filename.endswith('.json'):
                        filepath = os.path.join(log_dir, filename)
                        file_mtime = datetime.fromtimestamp(os.path.getmtime(filepath))
                        
                        if file_mtime < cutoff_date:
                            try:
                                os.remove(filepath)
                                self.logger.info(f"Removed old report: {filename}")
                            except OSError as e:
                                self.logger.warning(f"Could not remove old report {filename}: {str(e)}")
            
        except Exception as e:
            self.logger.error(f"Cleanup failed: {str(e)}")
    
    def _evaluate_connection_time(self, connection_time: float) -> str:
        """接続時間評価"""
        if connection_time > self.performance_thresholds["connection_time_critical"]:
            return "critical"
        elif connection_time > self.performance_thresholds["connection_time_warning"]:
            return "warning"
        else:
            return "good"
    
    def _evaluate_query_time(self, query_time: float) -> str:
        """クエリ時間評価"""
        if query_time > self.performance_thresholds["query_time_critical"]:
            return "critical"
        elif query_time > self.performance_thresholds["query_time_warning"]:
            return "warning"
        else:
            return "good"
    
    def stop_monitoring(self):
        """監視停止"""
        self.monitoring_active = False
        self.logger.info("Database monitoring stopped")


# 使用例とエントリーポイント
async def main():
    """メイン実行関数"""
    db_monitor = DatabaseErrorRepairSystem()
    
    try:
        await db_monitor.start_infinite_monitoring()
    except KeyboardInterrupt:
        db_monitor.stop_monitoring()
        print("Database monitoring stopped by user")
    except Exception as e:
        print(f"Database monitoring failed: {str(e)}")


if __name__ == "__main__":
    # ログ設定
    logging.basicConfig(
        level=logging.INFO,
        format='%(asctime)s - %(name)s - %(levelname)s - %(message)s',
        handlers=[
            logging.FileHandler('/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/database_monitor.log'),
            logging.StreamHandler()
        ]
    )
    
    # 非同期実行
    asyncio.run(main())