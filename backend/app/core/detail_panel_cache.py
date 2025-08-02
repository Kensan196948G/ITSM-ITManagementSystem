"""詳細パネル用キャッシュ戦略"""

from typing import Dict, List, Optional, Any, Callable, Union
from uuid import UUID
from datetime import datetime, timedelta
import json
import hashlib
from functools import wraps
import asyncio

from app.core.cache import cache_manager
from app.core.logging import get_logger

logger = get_logger(__name__)


class DetailPanelCacheManager:
    """詳細パネル用キャッシュマネージャー"""
    
    # キャッシュ有効期限設定（秒）
    CACHE_EXPIRY = {
        "incident_detail": 300,      # 5分
        "user_detail": 600,          # 10分
        "incident_timeline": 180,    # 3分
        "user_activities": 240,      # 4分
        "custom_fields": 1800,       # 30分
        "statistics": 120,           # 2分
        "related_data": 360,         # 6分
    }
    
    # キャッシュキープレフィックス
    CACHE_PREFIXES = {
        "incident_detail": "inc_detail",
        "user_detail": "user_detail",
        "incident_timeline": "inc_timeline",
        "user_activities": "user_activities",
        "custom_fields": "custom_fields",
        "statistics": "stats",
        "related_data": "related",
    }
    
    def __init__(self):
        pass
    
    def generate_cache_key(
        self,
        cache_type: str,
        entity_id: UUID,
        user_id: UUID,
        **params
    ) -> str:
        """キャッシュキーを生成"""
        prefix = self.CACHE_PREFIXES.get(cache_type, cache_type)
        
        # パラメータをソートしてハッシュ化
        param_hash = self._hash_params(params)
        
        return f"{prefix}:{entity_id}:{user_id}:{param_hash}"
    
    def _hash_params(self, params: Dict[str, Any]) -> str:
        """パラメータのハッシュ値を生成"""
        # None値を除去し、値をソート
        clean_params = {k: v for k, v in params.items() if v is not None}
        param_str = json.dumps(clean_params, sort_keys=True, default=str)
        return hashlib.md5(param_str.encode()).hexdigest()[:8]
    
    async def get_or_set(
        self,
        cache_type: str,
        entity_id: UUID,
        user_id: UUID,
        fetch_function: Callable,
        fetch_args: tuple = (),
        fetch_kwargs: Dict[str, Any] = None,
        **cache_params
    ) -> Any:
        """キャッシュから取得、なければフェッチして保存"""
        if fetch_kwargs is None:
            fetch_kwargs = {}
        
        # キャッシュキーを生成
        cache_key = self.generate_cache_key(
            cache_type, entity_id, user_id, **cache_params
        )
        
        # キャッシュから取得を試行
        cached_data = cache_manager.get(cache_key)
        if cached_data is not None:
            logger.debug(f"Cache hit: {cache_key}")
            return cached_data
        
        # キャッシュミスの場合、データを取得
        try:
            if asyncio.iscoroutinefunction(fetch_function):
                data = await fetch_function(*fetch_args, **fetch_kwargs)
            else:
                data = fetch_function(*fetch_args, **fetch_kwargs)
            
            # キャッシュに保存
            expiry = self.CACHE_EXPIRY.get(cache_type, 300)
            cache_manager.set(cache_key, data, expire=expiry)
            
            logger.debug(f"Cache set: {cache_key} (expiry: {expiry}s)")
            return data
            
        except Exception as e:
            logger.error(f"Failed to fetch data for cache key {cache_key}: {e}")
            raise
    
    def invalidate_entity_cache(
        self,
        entity_type: str,
        entity_id: UUID,
        user_id: Optional[UUID] = None
    ):
        """エンティティ関連のキャッシュを無効化"""
        patterns = []
        
        if entity_type == "incident":
            patterns.extend([
                f"inc_detail:{entity_id}:*",
                f"inc_timeline:{entity_id}:*",
                f"stats:*:{entity_id}:*",
                f"related:*:{entity_id}:*"
            ])
        elif entity_type == "user":
            patterns.extend([
                f"user_detail:{entity_id}:*",
                f"user_activities:{entity_id}:*",
                f"stats:*:{entity_id}:*"
            ])
        
        # パターンマッチングでキャッシュ削除
        for pattern in patterns:
            cache_manager.delete_pattern(pattern)
            logger.debug(f"Invalidated cache pattern: {pattern}")
    
    def invalidate_user_cache(self, user_id: UUID):
        """ユーザー関連のキャッシュを無効化"""
        patterns = [
            f"*:{user_id}:*",
            f"user_detail:{user_id}:*"
        ]
        
        for pattern in patterns:
            cache_manager.delete_pattern(pattern)
            logger.debug(f"Invalidated user cache pattern: {pattern}")
    
    def warm_cache(
        self,
        entity_type: str,
        entity_ids: List[UUID],
        user_id: UUID,
        include_related: bool = True
    ):
        """キャッシュの事前ウォーミング"""
        # 非同期でキャッシュを事前準備
        # 実装は具体的なサービス層で行う
        pass


class CacheableQueryBuilder:
    """キャッシュ可能なクエリビルダー"""
    
    def __init__(self, db_session):
        self.db = db_session
        self.cache_manager = DetailPanelCacheManager()
    
    async def get_incident_with_relations(
        self,
        incident_id: UUID,
        user_id: UUID,
        include_work_notes: bool = True,
        include_histories: bool = True,
        include_attachments: bool = True,
        include_related: bool = True
    ) -> Dict[str, Any]:
        """関連データを含むインシデント詳細を取得"""
        
        def fetch_incident_data():
            from app.models.incident import Incident
            from sqlalchemy.orm import joinedload
            
            # メインクエリ
            query = self.db.query(Incident).options(
                joinedload(Incident.reporter),
                joinedload(Incident.assignee),
                joinedload(Incident.category),
                joinedload(Incident.team)
            ).filter(Incident.id == incident_id)
            
            incident = query.first()
            if not incident:
                return None
            
            result = {
                "incident": incident,
                "work_notes": [],
                "histories": [],
                "attachments": [],
                "related_incidents": []
            }
            
            # 関連データを条件に応じて取得
            if include_work_notes:
                result["work_notes"] = incident.work_notes
            
            if include_histories:
                result["histories"] = incident.histories
            
            if include_attachments:
                result["attachments"] = incident.attachments
            
            if include_related:
                result["related_incidents"] = self._get_related_incidents(incident_id)
            
            return result
        
        return await self.cache_manager.get_or_set(
            cache_type="incident_detail",
            entity_id=incident_id,
            user_id=user_id,
            fetch_function=fetch_incident_data,
            include_work_notes=include_work_notes,
            include_histories=include_histories,
            include_attachments=include_attachments,
            include_related=include_related
        )
    
    def _get_related_incidents(self, incident_id: UUID) -> List[Dict[str, Any]]:
        """関連インシデントを取得"""
        # 実装は具体的な関連性ロジックに依存
        # 例: 同じカテゴリ、同じ報告者、類似タイトルなど
        return []
    
    async def get_user_with_performance(
        self,
        user_id: UUID,
        requesting_user_id: UUID,
        include_tickets: bool = True,
        include_performance: bool = True,
        include_activities: bool = True,
        days: int = 30
    ) -> Dict[str, Any]:
        """パフォーマンス情報を含むユーザー詳細を取得"""
        
        def fetch_user_data():
            from app.models.user import User
            from app.models.incident import Incident
            from sqlalchemy import func, and_
            
            user = self.db.query(User).filter(User.id == user_id).first()
            if not user:
                return None
            
            result = {
                "user": user,
                "assigned_tickets": [],
                "performance_metrics": {},
                "recent_activities": []
            }
            
            if include_tickets:
                # 担当チケットを取得
                tickets = self.db.query(Incident).filter(
                    Incident.assignee_id == user_id,
                    Incident.status.in_(["new", "assigned", "in_progress"])
                ).limit(20).all()
                result["assigned_tickets"] = tickets
            
            if include_performance:
                # パフォーマンス指標を計算
                result["performance_metrics"] = self._calculate_user_performance(
                    user_id, days
                )
            
            if include_activities:
                # 最近の活動を取得
                result["recent_activities"] = self._get_user_activities(
                    user_id, days
                )
            
            return result
        
        return await self.cache_manager.get_or_set(
            cache_type="user_detail",
            entity_id=user_id,
            user_id=requesting_user_id,
            fetch_function=fetch_user_data,
            include_tickets=include_tickets,
            include_performance=include_performance,
            include_activities=include_activities,
            days=days
        )
    
    def _calculate_user_performance(
        self,
        user_id: UUID,
        days: int
    ) -> Dict[str, Any]:
        """ユーザーパフォーマンス指標を計算"""
        from app.models.incident import Incident
        from sqlalchemy import func, and_
        
        date_threshold = datetime.utcnow() - timedelta(days=days)
        
        # 解決チケット数
        resolved_count = self.db.query(func.count(Incident.id)).filter(
            and_(
                Incident.assignee_id == user_id,
                Incident.status == "resolved",
                Incident.resolved_at >= date_threshold
            )
        ).scalar() or 0
        
        # 平均解決時間
        avg_resolution_time = self.db.query(
            func.avg(
                func.extract(
                    'epoch',
                    Incident.resolved_at - Incident.created_at
                ) / 3600.0
            )
        ).filter(
            and_(
                Incident.assignee_id == user_id,
                Incident.status == "resolved",
                Incident.resolved_at >= date_threshold
            )
        ).scalar() or 0
        
        return {
            "resolved_tickets_count": resolved_count,
            "avg_resolution_time_hours": float(avg_resolution_time),
            "sla_compliance_rate": self._calculate_sla_compliance(user_id, days)
        }
    
    def _calculate_sla_compliance(self, user_id: UUID, days: int) -> float:
        """SLA遵守率を計算"""
        # SLA遵守率の計算ロジック
        # 実装は具体的なSLA定義に依存
        return 95.0  # プレースホルダー
    
    def _get_user_activities(
        self,
        user_id: UUID,
        days: int
    ) -> List[Dict[str, Any]]:
        """ユーザーの最近の活動を取得"""
        # 活動ログテーブルがある場合の実装
        # プレースホルダーとして空のリストを返す
        return []


def cache_result(
    cache_type: str,
    expire: int = 300,
    key_generator: Optional[Callable] = None
):
    """キャッシュ結果デコレータ"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            cache_manager_instance = DetailPanelCacheManager()
            
            # キャッシュキーを生成
            if key_generator:
                cache_key = key_generator(*args, **kwargs)
            else:
                # デフォルトのキー生成
                key_parts = [func.__name__] + [str(arg) for arg in args]
                key_parts.extend([f"{k}:{v}" for k, v in kwargs.items()])
                cache_key = ":".join(key_parts)
            
            # キャッシュから取得を試行
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # 関数を実行
            if asyncio.iscoroutinefunction(func):
                result = await func(*args, **kwargs)
            else:
                result = func(*args, **kwargs)
            
            # キャッシュに保存
            cache_manager.set(cache_key, result, expire=expire)
            
            return result
        
        return wrapper
    return decorator


# グローバルキャッシュマネージャーインスタンス
detail_panel_cache = DetailPanelCacheManager()