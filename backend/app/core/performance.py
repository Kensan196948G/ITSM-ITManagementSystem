"""パフォーマンス最適化ユーティリティ"""

import time
import gzip
import asyncio
from typing import Any, Dict, List, Optional, Callable
from functools import wraps
from contextlib import asynccontextmanager
import logging

from fastapi import Request, Response
from fastapi.responses import Response as FastAPIResponse
from sqlalchemy.orm import Session, joinedload, selectinload
from sqlalchemy import text

logger = logging.getLogger(__name__)


class PerformanceMonitor:
    """パフォーマンス監視クラス"""
    
    def __init__(self):
        self.request_times: List[float] = []
        self.slow_queries: List[Dict[str, Any]] = []
        self.cache_hits = 0
        self.cache_misses = 0
    
    def record_request_time(self, duration: float, endpoint: str):
        """リクエスト時間を記録"""
        self.request_times.append(duration)
        if duration > 0.5:  # 500ms以上は警告
            logger.warning(f"Slow request: {endpoint} took {duration:.3f}s")
    
    def record_query_time(self, duration: float, query: str):
        """クエリ時間を記録"""
        if duration > 0.1:  # 100ms以上のクエリは記録
            self.slow_queries.append({
                "duration": duration,
                "query": query[:200],  # 最初の200文字のみ
                "timestamp": time.time()
            })
    
    def cache_hit(self):
        """キャッシュヒットを記録"""
        self.cache_hits += 1
    
    def cache_miss(self):
        """キャッシュミスを記録"""
        self.cache_misses += 1
    
    def get_stats(self) -> Dict[str, Any]:
        """統計情報を取得"""
        if not self.request_times:
            return {"no_data": True}
        
        avg_time = sum(self.request_times) / len(self.request_times)
        max_time = max(self.request_times)
        slow_requests = sum(1 for t in self.request_times if t > 0.5)
        
        cache_total = self.cache_hits + self.cache_misses
        cache_hit_rate = (self.cache_hits / cache_total * 100) if cache_total > 0 else 0
        
        return {
            "request_count": len(self.request_times),
            "avg_response_time": round(avg_time, 3),
            "max_response_time": round(max_time, 3),
            "slow_requests": slow_requests,
            "slow_request_rate": round(slow_requests / len(self.request_times) * 100, 2),
            "cache_hit_rate": round(cache_hit_rate, 2),
            "slow_queries_count": len(self.slow_queries),
            "recent_slow_queries": self.slow_queries[-10:]  # 最新の10件
        }


# グローバル監視インスタンス
perf_monitor = PerformanceMonitor()


def measure_time(func_name: str = None):
    """実行時間を測定するデコレーター"""
    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = await func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                name = func_name or func.__name__
                if duration > 0.1:  # 100ms以上は記録
                    logger.info(f"Function {name} took {duration:.3f}s")
        
        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            start_time = time.time()
            try:
                result = func(*args, **kwargs)
                return result
            finally:
                duration = time.time() - start_time
                name = func_name or func.__name__
                if duration > 0.1:  # 100ms以上は記録
                    logger.info(f"Function {name} took {duration:.3f}s")
        
        # async関数かどうかを判定
        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper
    
    return decorator


class QueryOptimizer:
    """クエリ最適化ヘルパー"""
    
    @staticmethod
    def optimize_incident_query(db: Session, base_query):
        """インシデントクエリの最適化"""
        return base_query.options(
            joinedload("reporter"),
            joinedload("assignee"),
            joinedload("category"),
            selectinload("attachments"),
            selectinload("work_logs")
        )
    
    @staticmethod
    def optimize_user_query(db: Session, base_query):
        """ユーザークエリの最適化"""
        return base_query.options(
            selectinload("reported_incidents"),
            selectinload("assigned_incidents")
        )
    
    @staticmethod
    def add_pagination(query, page: int, page_size: int):
        """ページネーション追加"""
        offset = (page - 1) * page_size
        return query.offset(offset).limit(page_size)


def compress_response(min_size: int = 1000):
    """レスポンス圧縮デコレーター"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            response = await func(*args, **kwargs)
            
            # FastAPIResponse以外は圧縮しない
            if not isinstance(response, FastAPIResponse):
                return response
            
            # レスポンスサイズが最小サイズ未満は圧縮しない
            if hasattr(response, 'body') and len(response.body) < min_size:
                return response
            
            # gzip圧縮
            if hasattr(response, 'body'):
                compressed_body = gzip.compress(response.body)
                if len(compressed_body) < len(response.body):
                    response.body = compressed_body
                    response.headers["content-encoding"] = "gzip"
                    response.headers["content-length"] = str(len(compressed_body))
            
            return response
        
        return wrapper
    return decorator


class DatabaseOptimizer:
    """データベース最適化"""
    
    @staticmethod
    def create_indexes(db: Session):
        """パフォーマンス向上のためのインデックス作成"""
        indexes = [
            # インシデント関連
            "CREATE INDEX IF NOT EXISTS idx_incidents_status ON incidents(status)",
            "CREATE INDEX IF NOT EXISTS idx_incidents_priority ON incidents(priority)",
            "CREATE INDEX IF NOT EXISTS idx_incidents_created_at ON incidents(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_incidents_assignee_id ON incidents(assignee_id)",
            "CREATE INDEX IF NOT EXISTS idx_incidents_reporter_id ON incidents(reporter_id)",
            "CREATE INDEX IF NOT EXISTS idx_incidents_category_id ON incidents(category_id)",
            
            # ユーザー関連
            "CREATE INDEX IF NOT EXISTS idx_users_email ON users(email)",
            "CREATE INDEX IF NOT EXISTS idx_users_username ON users(username)",
            "CREATE INDEX IF NOT EXISTS idx_users_is_active ON users(is_active)",
            "CREATE INDEX IF NOT EXISTS idx_users_role ON users(role)",
            "CREATE INDEX IF NOT EXISTS idx_users_department ON users(department)",
            
            # 作業ログ関連
            "CREATE INDEX IF NOT EXISTS idx_work_logs_incident_id ON work_logs(incident_id)",
            "CREATE INDEX IF NOT EXISTS idx_work_logs_created_at ON work_logs(created_at)",
            "CREATE INDEX IF NOT EXISTS idx_work_logs_user_id ON work_logs(user_id)",
            
            # 添付ファイル関連
            "CREATE INDEX IF NOT EXISTS idx_attachments_incident_id ON attachments(incident_id)",
            "CREATE INDEX IF NOT EXISTS idx_attachments_created_at ON attachments(created_at)",
            
            # 通知関連
            "CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read)",
            "CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at)",
        ]
        
        for index_sql in indexes:
            try:
                db.execute(text(index_sql))
                logger.info(f"Index created: {index_sql}")
            except Exception as e:
                logger.warning(f"Index creation failed: {index_sql}, Error: {e}")
        
        db.commit()
    
    @staticmethod
    def analyze_tables(db: Session):
        """テーブル統計情報を更新（PostgreSQL/SQLite対応）"""
        tables = [
            "incidents", "users", "work_logs", "attachments", 
            "notifications", "categories", "problems", "changes"
        ]
        
        for table in tables:
            try:
                # SQLiteの場合
                db.execute(text(f"ANALYZE {table}"))
                logger.info(f"Table analyzed: {table}")
            except Exception as e:
                logger.warning(f"Table analysis failed: {table}, Error: {e}")
        
        db.commit()


def optimize_json_response(data: Any) -> Any:
    """JSON レスポンスの最適化"""
    if isinstance(data, dict):
        # 空の値を除去
        return {k: optimize_json_response(v) for k, v in data.items() if v is not None}
    elif isinstance(data, list):
        return [optimize_json_response(item) for item in data]
    else:
        return data


class ConnectionPoolManager:
    """データベース接続プール管理"""
    
    @staticmethod
    def configure_pool_settings():
        """接続プール設定の推奨値"""
        return {
            "pool_size": 20,  # 基本接続数
            "max_overflow": 30,  # 追加接続数
            "pool_timeout": 30,  # 接続取得タイムアウト
            "pool_recycle": 3600,  # 接続リサイクル時間（1時間）
            "pool_pre_ping": True,  # 接続前の健全性チェック
        }


@asynccontextmanager
async def performance_context(operation_name: str):
    """パフォーマンス測定コンテキストマネージャー"""
    start_time = time.time()
    try:
        yield
    finally:
        duration = time.time() - start_time
        logger.info(f"Operation '{operation_name}' completed in {duration:.3f}s")
        if duration > 0.5:
            logger.warning(f"Slow operation detected: {operation_name}")


def batch_process(items: List[Any], batch_size: int = 100):
    """バッチ処理ヘルパー"""
    for i in range(0, len(items), batch_size):
        yield items[i:i + batch_size]


class MemoryOptimizer:
    """メモリ最適化"""
    
    @staticmethod
    def limit_response_size(data: Any, max_items: int = 1000) -> Any:
        """レスポンスサイズを制限"""
        if isinstance(data, list) and len(data) > max_items:
            return {
                "items": data[:max_items],
                "total": len(data),
                "truncated": True,
                "message": f"結果が{max_items}件に制限されました"
            }
        return data
    
    @staticmethod
    def selective_fields(data: Dict[str, Any], fields: Optional[List[str]] = None) -> Dict[str, Any]:
        """指定されたフィールドのみを返す"""
        if fields is None:
            return data
        
        return {k: v for k, v in data.items() if k in fields}


# 初期化関数
def init_performance_optimizations(db: Session):
    """パフォーマンス最適化の初期化"""
    try:
        # インデックス作成
        DatabaseOptimizer.create_indexes(db)
        
        # テーブル統計情報更新
        DatabaseOptimizer.analyze_tables(db)
        
        logger.info("✅ パフォーマンス最適化の初期化が完了しました")
    except Exception as e:
        logger.error(f"❌ パフォーマンス最適化の初期化に失敗: {e}")