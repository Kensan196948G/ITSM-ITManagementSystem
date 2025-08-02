"""キャッシュ管理"""

import json
import pickle
from datetime import datetime, timedelta
from typing import Any, Optional, Union, Dict, List
from functools import wraps
import hashlib
import redis
from redis import Redis
from sqlalchemy.orm import Session

from app.core.config import settings


class CacheManager:
    """キャッシュマネージャー"""

    def __init__(self):
        self.redis_client: Optional[Redis] = None
        self._connect()

    def _connect(self):
        """Redisに接続"""
        try:
            self.redis_client = redis.from_url(
                settings.REDIS_URL,
                decode_responses=False,
                socket_connect_timeout=5,
                socket_timeout=5,
                retry_on_timeout=True,
            )
            # 接続テスト
            self.redis_client.ping()
        except Exception as e:
            print(f"Redis接続エラー: {e}")
            self.redis_client = None

    def is_available(self) -> bool:
        """キャッシュが利用可能かどうか"""
        return self.redis_client is not None

    def generate_key(self, prefix: str, **kwargs) -> str:
        """キャッシュキーを生成"""
        key_data = json.dumps(kwargs, sort_keys=True, default=str)
        key_hash = hashlib.md5(key_data.encode()).hexdigest()
        return f"{prefix}:{key_hash}"

    def set(self, key: str, value: Any, expire: int = 300) -> bool:
        """値をキャッシュに設定"""
        if not self.is_available():
            return False

        try:
            serialized_value = pickle.dumps(value)
            return self.redis_client.setex(key, expire, serialized_value)
        except Exception as e:
            print(f"キャッシュ設定エラー: {e}")
            return False

    def get(self, key: str) -> Optional[Any]:
        """キャッシュから値を取得"""
        if not self.is_available():
            return None

        try:
            cached_value = self.redis_client.get(key)
            if cached_value:
                return pickle.loads(cached_value)
            return None
        except Exception as e:
            print(f"キャッシュ取得エラー: {e}")
            return None

    def delete(self, key: str) -> bool:
        """キャッシュから値を削除"""
        if not self.is_available():
            return False

        try:
            return self.redis_client.delete(key) > 0
        except Exception as e:
            print(f"キャッシュ削除エラー: {e}")
            return False

    def delete_pattern(self, pattern: str) -> int:
        """パターンに一致するキーを削除"""
        if not self.is_available():
            return 0

        try:
            keys = self.redis_client.keys(pattern)
            if keys:
                return self.redis_client.delete(*keys)
            return 0
        except Exception as e:
            print(f"キャッシュパターン削除エラー: {e}")
            return 0

    def clear_all(self) -> bool:
        """全キャッシュをクリア"""
        if not self.is_available():
            return False

        try:
            self.redis_client.flushdb()
            return True
        except Exception as e:
            print(f"キャッシュクリアエラー: {e}")
            return False

    def get_stats(self) -> Dict[str, Any]:
        """キャッシュ統計情報を取得"""
        if not self.is_available():
            return {"available": False}

        try:
            info = self.redis_client.info()
            return {
                "available": True,
                "used_memory": info.get("used_memory_human"),
                "connected_clients": info.get("connected_clients"),
                "total_commands_processed": info.get("total_commands_processed"),
                "keyspace_hits": info.get("keyspace_hits", 0),
                "keyspace_misses": info.get("keyspace_misses", 0),
            }
        except Exception as e:
            print(f"キャッシュ統計取得エラー: {e}")
            return {"available": False, "error": str(e)}


# グローバルキャッシュマネージャー
cache_manager = CacheManager()


def cache_result(
    prefix: str, expire: int = 300, key_builder: Optional[callable] = None
):
    """結果をキャッシュするデコレーター"""

    def decorator(func):
        @wraps(func)
        async def async_wrapper(*args, **kwargs):
            # キーを生成
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                cache_key = cache_manager.generate_key(prefix, args=args, kwargs=kwargs)

            # キャッシュから取得を試行
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result

            # 関数を実行してキャッシュに保存
            result = await func(*args, **kwargs)
            cache_manager.set(cache_key, result, expire)
            return result

        @wraps(func)
        def sync_wrapper(*args, **kwargs):
            # キーを生成
            if key_builder:
                cache_key = key_builder(*args, **kwargs)
            else:
                cache_key = cache_manager.generate_key(prefix, args=args, kwargs=kwargs)

            # キャッシュから取得を試行
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result

            # 関数を実行してキャッシュに保存
            result = func(*args, **kwargs)
            cache_manager.set(cache_key, result, expire)
            return result

        # async関数かどうかを判定
        import asyncio

        if asyncio.iscoroutinefunction(func):
            return async_wrapper
        else:
            return sync_wrapper

    return decorator


def invalidate_cache_pattern(pattern: str):
    """パターンに一致するキャッシュを無効化"""
    return cache_manager.delete_pattern(pattern)


def dashboard_cache_key(user_id: str, days: int = 30) -> str:
    """ダッシュボード用キャッシュキー生成"""
    return f"dashboard:metrics:{user_id}:{days}"


def incidents_list_cache_key(
    user_id: str, page: int = 1, page_size: int = 20, **filters
) -> str:
    """インシデント一覧用キャッシュキー生成"""
    filter_str = json.dumps(filters, sort_keys=True, default=str)
    filter_hash = hashlib.md5(filter_str.encode()).hexdigest()
    return f"incidents:list:{user_id}:{page}:{page_size}:{filter_hash}"


def user_permissions_cache_key(user_id: str) -> str:
    """ユーザー権限用キャッシュキー生成"""
    return f"user:permissions:{user_id}"


# キャッシュ無効化のヘルパー関数
class CacheInvalidator:
    """キャッシュ無効化ヘルパー"""

    @staticmethod
    def invalidate_user_cache(user_id: str):
        """ユーザー関連キャッシュを無効化"""
        patterns = [
            f"dashboard:*:{user_id}:*",
            f"incidents:*:{user_id}:*",
            f"user:permissions:{user_id}",
            f"user:stats:{user_id}:*",
        ]
        for pattern in patterns:
            invalidate_cache_pattern(pattern)

    @staticmethod
    def invalidate_incident_cache(tenant_id: str = None):
        """インシデント関連キャッシュを無効化"""
        patterns = ["incidents:list:*", "dashboard:metrics:*", "dashboard:charts:*"]
        if tenant_id:
            patterns = [f"{p}:{tenant_id}" for p in patterns]

        for pattern in patterns:
            invalidate_cache_pattern(pattern)

    @staticmethod
    def invalidate_dashboard_cache(user_id: str = None):
        """ダッシュボード関連キャッシュを無効化"""
        if user_id:
            invalidate_cache_pattern(f"dashboard:*:{user_id}:*")
        else:
            invalidate_cache_pattern("dashboard:*")


# 初期化時のヘルスチェック
def init_cache():
    """キャッシュシステムの初期化"""
    if cache_manager.is_available():
        print("✅ Redis キャッシュが利用可能です")
        stats = cache_manager.get_stats()
        print(f"📊 キャッシュ統計: {stats}")
    else:
        print(
            "⚠️  Redis キャッシュが利用できません。パフォーマンスが低下する可能性があります"
        )
