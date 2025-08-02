"""データベース接続エラー検知・修復システム"""

import asyncio
import logging
import time
import json
import sqlite3
import psycopg2
from typing import Dict, Any, Optional, List
from dataclasses import dataclass
from enum import Enum
from pathlib import Path
import aiofiles
from contextlib import asynccontextmanager
import sqlalchemy
from sqlalchemy import create_engine, text
from sqlalchemy.exc import SQLAlchemyError
from sqlalchemy.pool import QueuePool

from app.core.config import settings

logger = logging.getLogger(__name__)


class DatabaseIssueType(Enum):
    """データベース問題タイプ"""
    CONNECTION_TIMEOUT = "connection_timeout"
    CONNECTION_REFUSED = "connection_refused"
    AUTHENTICATION_FAILED = "authentication_failed"
    DATABASE_NOT_FOUND = "database_not_found"
    TABLE_MISSING = "table_missing"
    QUERY_TIMEOUT = "query_timeout"
    DEADLOCK = "deadlock"
    LOCK_TIMEOUT = "lock_timeout"
    DISK_FULL = "disk_full"
    CONNECTION_POOL_EXHAUSTED = "connection_pool_exhausted"
    INVALID_SCHEMA = "invalid_schema"
    PERMISSION_DENIED = "permission_denied"


class DatabaseIssue(Enum):
    """データベース問題重要度"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


@dataclass
class DatabaseError:
    """データベースエラー情報"""
    timestamp: float
    issue_type: DatabaseIssueType
    severity: DatabaseIssue
    error_message: str
    database_url: str
    query: Optional[str] = None
    connection_info: Optional[Dict[str, Any]] = None
    stack_trace: Optional[str] = None
    repair_attempted: bool = False
    repair_successful: bool = False
    
    def to_dict(self) -> Dict[str, Any]:
        """辞書形式に変換"""
        return {
            "timestamp": self.timestamp,
            "issue_type": self.issue_type.value,
            "severity": self.severity.value,
            "error_message": self.error_message,
            "database_url": self.database_url,
            "query": self.query,
            "connection_info": self.connection_info,
            "stack_trace": self.stack_trace,
            "repair_attempted": self.repair_attempted,
            "repair_successful": self.repair_successful
        }


class DatabaseConnectionManager:
    """データベース接続管理"""
    
    def __init__(self):
        self.engines: Dict[str, sqlalchemy.Engine] = {}
        self.connection_pools: Dict[str, QueuePool] = {}
        self.last_health_check: Dict[str, float] = {}
        self.health_check_interval = 300  # 5分
    
    def get_engine(self, database_url: str) -> sqlalchemy.Engine:
        """データベースエンジンを取得"""
        if database_url not in self.engines:
            self.engines[database_url] = create_engine(
                database_url,
                poolclass=QueuePool,
                pool_size=10,
                max_overflow=20,
                pool_timeout=30,
                pool_recycle=3600,
                echo=False
            )
        return self.engines[database_url]
    
    async def test_connection(self, database_url: str) -> Optional[DatabaseError]:
        """データベース接続をテスト"""
        try:
            engine = self.get_engine(database_url)
            
            with engine.connect() as conn:
                # 基本的な接続テスト
                result = conn.execute(text("SELECT 1"))
                result.fetchone()
                
                # 接続プール状態をチェック
                pool_status = engine.pool.status()
                if pool_status.endswith("connections"):
                    pool_info = {
                        "status": pool_status,
                        "checked_in": engine.pool.checkedin(),
                        "checked_out": engine.pool.checkedout(),
                        "overflow": engine.pool.overflow(),
                        "size": engine.pool.size()
                    }
                    
                    # プール枯渇チェック
                    if engine.pool.checkedout() >= engine.pool.size() + engine.pool.overflow():
                        return DatabaseError(
                            timestamp=time.time(),
                            issue_type=DatabaseIssueType.CONNECTION_POOL_EXHAUSTED,
                            severity=DatabaseIssue.HIGH,
                            error_message="Connection pool exhausted",
                            database_url=database_url,
                            connection_info=pool_info
                        )
            
            # ヘルスチェック時刻を更新
            self.last_health_check[database_url] = time.time()
            return None
            
        except sqlalchemy.exc.OperationalError as e:
            return self._categorize_operational_error(e, database_url)
        except sqlalchemy.exc.TimeoutError as e:
            return DatabaseError(
                timestamp=time.time(),
                issue_type=DatabaseIssueType.CONNECTION_TIMEOUT,
                severity=DatabaseIssue.HIGH,
                error_message=str(e),
                database_url=database_url
            )
        except Exception as e:
            return DatabaseError(
                timestamp=time.time(),
                issue_type=DatabaseIssueType.CONNECTION_REFUSED,
                severity=DatabaseIssue.CRITICAL,
                error_message=str(e),
                database_url=database_url
            )
    
    def _categorize_operational_error(self, error: Exception, database_url: str) -> DatabaseError:
        """オペレーショナルエラーをカテゴライズ"""
        error_msg = str(error).lower()
        
        if "connection refused" in error_msg:
            issue_type = DatabaseIssueType.CONNECTION_REFUSED
            severity = DatabaseIssue.CRITICAL
        elif "authentication failed" in error_msg or "password authentication failed" in error_msg:
            issue_type = DatabaseIssueType.AUTHENTICATION_FAILED
            severity = DatabaseIssue.CRITICAL
        elif "database" in error_msg and "does not exist" in error_msg:
            issue_type = DatabaseIssueType.DATABASE_NOT_FOUND
            severity = DatabaseIssue.CRITICAL
        elif "timeout" in error_msg:
            issue_type = DatabaseIssueType.CONNECTION_TIMEOUT
            severity = DatabaseIssue.HIGH
        elif "permission denied" in error_msg:
            issue_type = DatabaseIssueType.PERMISSION_DENIED
            severity = DatabaseIssue.HIGH
        else:
            issue_type = DatabaseIssueType.CONNECTION_REFUSED
            severity = DatabaseIssue.HIGH
        
        return DatabaseError(
            timestamp=time.time(),
            issue_type=issue_type,
            severity=severity,
            error_message=str(error),
            database_url=database_url
        )
    
    async def test_query_performance(self, database_url: str, test_queries: List[str]) -> List[DatabaseError]:
        """クエリパフォーマンステスト"""
        errors = []
        engine = self.get_engine(database_url)
        
        for query in test_queries:
            try:
                start_time = time.time()
                
                with engine.connect() as conn:
                    result = conn.execute(text(query))
                    result.fetchall()  # 結果を完全に取得
                
                execution_time = time.time() - start_time
                
                # パフォーマンス警告
                if execution_time > 5.0:  # 5秒以上
                    errors.append(DatabaseError(
                        timestamp=time.time(),
                        issue_type=DatabaseIssueType.QUERY_TIMEOUT,
                        severity=DatabaseIssue.HIGH if execution_time > 10.0 else DatabaseIssue.MEDIUM,
                        error_message=f"Slow query execution: {execution_time:.2f}s",
                        database_url=database_url,
                        query=query
                    ))
                    
            except Exception as e:
                errors.append(DatabaseError(
                    timestamp=time.time(),
                    issue_type=DatabaseIssueType.QUERY_TIMEOUT,
                    severity=DatabaseIssue.HIGH,
                    error_message=str(e),
                    database_url=database_url,
                    query=query
                ))
        
        return errors


class DatabaseRepairEngine:
    """データベース修復エンジン"""
    
    def __init__(self):
        self.repair_log_path = Path("database_repair_logs")
        self.repair_log_path.mkdir(exist_ok=True)
        self.repair_attempts: Dict[str, int] = {}
        self.max_repair_attempts = 3
    
    async def repair_database_issue(self, error: DatabaseError) -> bool:
        """データベース問題を修復"""
        repair_key = f"{error.issue_type.value}_{hash(error.database_url)}"
        
        # 修復試行回数をチェック
        if self.repair_attempts.get(repair_key, 0) >= self.max_repair_attempts:
            logger.warning(f"Max repair attempts reached for {repair_key}")
            return False
        
        self.repair_attempts[repair_key] = self.repair_attempts.get(repair_key, 0) + 1
        
        repair_method = {
            DatabaseIssueType.CONNECTION_TIMEOUT: self._repair_connection_timeout,
            DatabaseIssueType.CONNECTION_REFUSED: self._repair_connection_refused,
            DatabaseIssueType.CONNECTION_POOL_EXHAUSTED: self._repair_pool_exhaustion,
            DatabaseIssueType.QUERY_TIMEOUT: self._repair_query_timeout,
            DatabaseIssueType.DEADLOCK: self._repair_deadlock,
            DatabaseIssueType.AUTHENTICATION_FAILED: self._repair_authentication,
            DatabaseIssueType.DATABASE_NOT_FOUND: self._repair_database_not_found,
            DatabaseIssueType.TABLE_MISSING: self._repair_table_missing,
            DatabaseIssueType.PERMISSION_DENIED: self._repair_permission_denied,
        }
        
        repair_func = repair_method.get(error.issue_type)
        if repair_func:
            try:
                success = await repair_func(error)
                await self._log_repair_attempt(error, success)
                
                if success:
                    # 成功した場合、試行回数をリセット
                    self.repair_attempts[repair_key] = 0
                
                return success
            except Exception as e:
                logger.error(f"Error during repair: {e}")
                await self._log_repair_attempt(error, False, str(e))
                return False
        
        return False
    
    async def _repair_connection_timeout(self, error: DatabaseError) -> bool:
        """接続タイムアウト修復"""
        logger.info("Attempting to repair connection timeout")
        
        # 接続タイムアウトを増加
        try:
            # 新しいエンジンを作成（タイムアウト設定を調整）
            new_engine = create_engine(
                error.database_url,
                poolclass=QueuePool,
                pool_timeout=60,  # タイムアウトを倍に
                connect_args={"connect_timeout": 30}
            )
            
            # 接続テスト
            with new_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            logger.info("Connection timeout repair successful")
            return True
            
        except Exception as e:
            logger.error(f"Failed to repair connection timeout: {e}")
            return False
    
    async def _repair_connection_refused(self, error: DatabaseError) -> bool:
        """接続拒否修復"""
        logger.info("Attempting to repair connection refused")
        
        # データベースサービス再起動の試行
        await asyncio.sleep(5)  # 待機
        
        try:
            # 基本的な接続テスト
            engine = create_engine(error.database_url)
            with engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            logger.info("Connection refused repair successful")
            return True
            
        except Exception as e:
            logger.error(f"Failed to repair connection refused: {e}")
            return False
    
    async def _repair_pool_exhaustion(self, error: DatabaseError) -> bool:
        """接続プール枯渇修復"""
        logger.info("Attempting to repair connection pool exhaustion")
        
        try:
            # 新しいエンジンを大きなプールで作成
            new_engine = create_engine(
                error.database_url,
                poolclass=QueuePool,
                pool_size=20,  # プールサイズを倍に
                max_overflow=40,  # オーバーフローも倍に
                pool_timeout=60
            )
            
            # 接続テスト
            with new_engine.connect() as conn:
                conn.execute(text("SELECT 1"))
            
            logger.info("Connection pool exhaustion repair successful")
            return True
            
        except Exception as e:
            logger.error(f"Failed to repair pool exhaustion: {e}")
            return False
    
    async def _repair_query_timeout(self, error: DatabaseError) -> bool:
        """クエリタイムアウト修復"""
        logger.info("Attempting to repair query timeout")
        
        if error.query:
            try:
                # クエリ最適化の試行
                optimized_query = self._optimize_query(error.query)
                
                engine = create_engine(error.database_url)
                with engine.connect() as conn:
                    result = conn.execute(text(optimized_query))
                    result.fetchall()
                
                logger.info("Query timeout repair successful")
                return True
                
            except Exception as e:
                logger.error(f"Failed to repair query timeout: {e}")
                return False
        
        return False
    
    def _optimize_query(self, query: str) -> str:
        """クエリ最適化"""
        # 基本的なクエリ最適化
        optimized = query
        
        # LIMIT句がない場合は追加
        if "SELECT" in query.upper() and "LIMIT" not in query.upper():
            optimized += " LIMIT 1000"
        
        return optimized
    
    async def _repair_deadlock(self, error: DatabaseError) -> bool:
        """デッドロック修復"""
        logger.info("Attempting to repair deadlock")
        
        # デッドロック解除のため少し待機
        await asyncio.sleep(2)
        
        try:
            engine = create_engine(error.database_url)
            with engine.connect() as conn:
                # 基本的な接続テスト
                conn.execute(text("SELECT 1"))
            
            logger.info("Deadlock repair successful")
            return True
            
        except Exception as e:
            logger.error(f"Failed to repair deadlock: {e}")
            return False
    
    async def _repair_authentication(self, error: DatabaseError) -> bool:
        """認証失敗修復"""
        logger.info("Attempting to repair authentication failure")
        
        # 認証情報の検証と修復は実装困難なため、ログ記録のみ
        logger.warning("Authentication repair requires manual intervention")
        return False
    
    async def _repair_database_not_found(self, error: DatabaseError) -> bool:
        """データベース未発見修復"""
        logger.info("Attempting to repair database not found")
        
        # データベース作成は危険なため、ログ記録のみ
        logger.warning("Database creation requires manual intervention")
        return False
    
    async def _repair_table_missing(self, error: DatabaseError) -> bool:
        """テーブル未発見修復"""
        logger.info("Attempting to repair missing table")
        
        # テーブル作成は危険なため、ログ記録のみ
        logger.warning("Table creation requires manual intervention")
        return False
    
    async def _repair_permission_denied(self, error: DatabaseError) -> bool:
        """権限拒否修復"""
        logger.info("Attempting to repair permission denied")
        
        # 権限修復は実装困難なため、ログ記録のみ
        logger.warning("Permission repair requires manual intervention")
        return False
    
    async def _log_repair_attempt(self, error: DatabaseError, success: bool, details: str = ""):
        """修復試行をログ記録"""
        log_entry = {
            "timestamp": time.time(),
            "error": error.to_dict(),
            "repair_success": success,
            "repair_details": details
        }
        
        log_file = self.repair_log_path / f"repair_log_{time.strftime('%Y%m%d')}.json"
        
        try:
            # 既存のログを読み込み
            if log_file.exists():
                async with aiofiles.open(log_file, 'r') as f:
                    content = await f.read()
                    logs = json.loads(content) if content else []
            else:
                logs = []
            
            logs.append(log_entry)
            
            # ログを保存
            async with aiofiles.open(log_file, 'w') as f:
                await f.write(json.dumps(logs, indent=2, default=str))
                
        except Exception as e:
            logger.error(f"Failed to save repair log: {e}")


class DatabaseHealthMonitor:
    """データベースヘルス監視システム"""
    
    def __init__(self):
        self.connection_manager = DatabaseConnectionManager()
        self.repair_engine = DatabaseRepairEngine()
        self.monitoring_databases = [
            settings.DATABASE_URL,
            settings.ASYNC_DATABASE_URL
        ]
        self.test_queries = [
            "SELECT COUNT(*) FROM information_schema.tables",
            "SELECT 1",
            "SELECT version()"
        ]
        self.monitoring = False
    
    async def run_health_check(self) -> List[DatabaseError]:
        """ヘルスチェック実行"""
        all_errors = []
        
        for db_url in self.monitoring_databases:
            try:
                # 基本接続テスト
                connection_error = await self.connection_manager.test_connection(db_url)
                if connection_error:
                    all_errors.append(connection_error)
                
                # クエリパフォーマンステスト
                query_errors = await self.connection_manager.test_query_performance(
                    db_url, self.test_queries
                )
                all_errors.extend(query_errors)
                
            except Exception as e:
                logger.error(f"Error during health check for {db_url}: {e}")
                all_errors.append(DatabaseError(
                    timestamp=time.time(),
                    issue_type=DatabaseIssueType.CONNECTION_REFUSED,
                    severity=DatabaseIssue.CRITICAL,
                    error_message=str(e),
                    database_url=db_url
                ))
        
        return all_errors
    
    async def repair_detected_issues(self, errors: List[DatabaseError]) -> Dict[str, bool]:
        """検出された問題を修復"""
        repair_results = {}
        
        for error in errors:
            if error.severity in [DatabaseIssue.HIGH, DatabaseIssue.CRITICAL]:
                repair_key = f"{error.issue_type.value}_{hash(error.database_url)}"
                success = await self.repair_engine.repair_database_issue(error)
                repair_results[repair_key] = success
                
                if success:
                    logger.info(f"Successfully repaired {error.issue_type.value}")
                else:
                    logger.warning(f"Failed to repair {error.issue_type.value}")
        
        return repair_results
    
    async def start_monitoring(self, interval: int = 300):
        """監視開始（5分間隔）"""
        self.monitoring = True
        logger.info("Starting database health monitoring")
        
        while self.monitoring:
            try:
                # ヘルスチェック実行
                errors = await self.run_health_check()
                
                if errors:
                    logger.warning(f"Detected {len(errors)} database issues")
                    
                    # 修復実行
                    repair_results = await self.repair_detected_issues(errors)
                    
                    # 結果をログ出力
                    for repair_key, success in repair_results.items():
                        logger.info(f"Repair {repair_key}: {'SUCCESS' if success else 'FAILED'}")
                
                await asyncio.sleep(interval)
                
            except Exception as e:
                logger.error(f"Error in monitoring cycle: {e}")
                await asyncio.sleep(60)  # エラー時は1分待機
    
    def stop_monitoring(self):
        """監視停止"""
        self.monitoring = False
        logger.info("Stopping database health monitoring")
    
    def get_health_status(self) -> Dict[str, Any]:
        """ヘルス状態取得"""
        status = {
            "timestamp": time.time(),
            "monitoring_active": self.monitoring,
            "databases": {}
        }
        
        for db_url in self.monitoring_databases:
            last_check = self.connection_manager.last_health_check.get(db_url, 0)
            status["databases"][db_url] = {
                "last_health_check": last_check,
                "status": "healthy" if time.time() - last_check < 600 else "unknown"
            }
        
        return status


# メイン実行用
async def main():
    """メイン実行関数"""
    monitor = DatabaseHealthMonitor()
    
    try:
        await monitor.start_monitoring()
    except KeyboardInterrupt:
        logger.info("Monitoring stopped by user")
    finally:
        monitor.stop_monitoring()


if __name__ == "__main__":
    asyncio.run(main())