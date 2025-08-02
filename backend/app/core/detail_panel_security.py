"""詳細パネル用セキュリティ機能"""

from typing import Dict, List, Optional, Any, Union
from uuid import UUID
from datetime import datetime, timedelta
import json
import hashlib
from functools import wraps

from fastapi import HTTPException, status, Depends
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.api.v1.auth import get_current_user_id
from app.core.cache import cache_manager
from app.core.logging import get_logger

logger = get_logger(__name__)


class DetailPanelSecurityManager:
    """詳細パネル用セキュリティマネージャー"""
    
    def __init__(self, db: Session):
        self.db = db
    
    def check_entity_access(
        self,
        user_id: UUID,
        entity_type: str,
        entity_id: UUID,
        access_type: str = "read"
    ) -> bool:
        """エンティティアクセス権限チェック"""
        try:
            # キャッシュキーを生成
            cache_key = f"entity_access:{user_id}:{entity_type}:{entity_id}:{access_type}"
            
            # キャッシュから取得
            cached_result = cache_manager.get(cache_key)
            if cached_result is not None:
                return cached_result
            
            # アクセス権限チェックロジック
            has_access = self._check_entity_permission(
                user_id, entity_type, entity_id, access_type
            )
            
            # キャッシュに保存（5分間）
            cache_manager.set(cache_key, has_access, expire=300)
            
            return has_access
            
        except Exception as e:
            logger.error(f"Entity access check failed: {e}")
            return False
    
    def _check_entity_permission(
        self,
        user_id: UUID,
        entity_type: str,
        entity_id: UUID,
        access_type: str
    ) -> bool:
        """具体的な権限チェック実装"""
        from app.models.user import User
        from app.models.incident import Incident
        
        # ユーザー情報を取得
        user = self.db.query(User).filter(User.id == user_id).first()
        if not user or not user.is_active:
            return False
        
        # 管理者は全アクセス許可
        if user.role == "admin":
            return True
        
        # エンティティタイプ別権限チェック
        if entity_type == "incident":
            return self._check_incident_access(user, entity_id, access_type)
        elif entity_type == "user":
            return self._check_user_access(user, entity_id, access_type)
        
        return False
    
    def _check_incident_access(
        self,
        user: Any,
        incident_id: UUID,
        access_type: str
    ) -> bool:
        """インシデントアクセス権限チェック"""
        from app.models.incident import Incident
        
        incident = self.db.query(Incident).filter(Incident.id == incident_id).first()
        if not incident:
            return False
        
        # 自分が報告者または担当者の場合
        if incident.reporter_id == user.id or incident.assignee_id == user.id:
            return True
        
        # 同じチームの場合
        if incident.team_id and incident.team_id == user.team_id:
            return True
        
        # マネージャー権限の場合
        if user.role in ["manager", "team_lead"] and access_type == "read":
            return True
        
        return False
    
    def _check_user_access(
        self,
        user: Any,
        target_user_id: UUID,
        access_type: str
    ) -> bool:
        """ユーザーアクセス権限チェック"""
        # 自分自身の情報は常にアクセス可能
        if user.id == target_user_id:
            return True
        
        # マネージャーは部下の情報にアクセス可能
        if user.role in ["manager", "team_lead"]:
            return self._is_subordinate(user.id, target_user_id)
        
        # 同じチームのメンバーは読み取り可能
        if access_type == "read":
            return self._is_same_team(user.id, target_user_id)
        
        return False
    
    def _is_subordinate(self, manager_id: UUID, user_id: UUID) -> bool:
        """部下かどうかチェック"""
        from app.models.user import User
        
        user = self.db.query(User).filter(User.id == user_id).first()
        return user and user.manager_id == manager_id
    
    def _is_same_team(self, user_id: UUID, target_user_id: UUID) -> bool:
        """同じチームかどうかチェック"""
        from app.models.user import User
        
        user1 = self.db.query(User).filter(User.id == user_id).first()
        user2 = self.db.query(User).filter(User.id == target_user_id).first()
        
        if not user1 or not user2:
            return False
        
        return user1.team_id and user1.team_id == user2.team_id


class RateLimiter:
    """レート制限機能"""
    
    def __init__(self, max_requests: int = 100, time_window: int = 60):
        self.max_requests = max_requests
        self.time_window = time_window
    
    def check_rate_limit(self, user_id: UUID, endpoint: str) -> bool:
        """レート制限チェック"""
        cache_key = f"rate_limit:{user_id}:{endpoint}"
        
        # 現在のリクエスト数を取得
        current_requests = cache_manager.get(cache_key) or 0
        
        if current_requests >= self.max_requests:
            return False
        
        # リクエスト数をインクリメント
        cache_manager.set(
            cache_key, 
            current_requests + 1, 
            expire=self.time_window
        )
        
        return True


class DataSanitizer:
    """データサニタイズ機能"""
    
    @staticmethod
    def sanitize_output(data: Dict[str, Any], user_role: str) -> Dict[str, Any]:
        """出力データのサニタイズ"""
        if user_role == "admin":
            return data
        
        # 機密情報を除去
        sensitive_fields = {
            "password_hash", "two_factor_secret", "api_tokens",
            "internal_notes", "audit_trail", "system_metadata"
        }
        
        return DataSanitizer._remove_sensitive_fields(data, sensitive_fields)
    
    @staticmethod
    def _remove_sensitive_fields(
        data: Union[Dict, List, Any], 
        sensitive_fields: set
    ) -> Union[Dict, List, Any]:
        """機密フィールドの除去"""
        if isinstance(data, dict):
            return {
                k: DataSanitizer._remove_sensitive_fields(v, sensitive_fields)
                for k, v in data.items()
                if k not in sensitive_fields
            }
        elif isinstance(data, list):
            return [
                DataSanitizer._remove_sensitive_fields(item, sensitive_fields)
                for item in data
            ]
        else:
            return data
    
    @staticmethod
    def validate_input(data: Dict[str, Any], allowed_fields: set) -> Dict[str, Any]:
        """入力データの検証"""
        validated_data = {}
        
        for key, value in data.items():
            if key in allowed_fields:
                validated_data[key] = DataSanitizer._sanitize_value(value)
        
        return validated_data
    
    @staticmethod
    def _sanitize_value(value: Any) -> Any:
        """値のサニタイズ"""
        if isinstance(value, str):
            # XSS攻撃対策
            value = value.replace("<script>", "").replace("</script>", "")
            value = value.replace("javascript:", "").replace("data:", "")
            
            # SQL Injection対策
            value = value.replace("'", "''").replace(";", "")
        
        return value


def require_entity_access(entity_type: str, access_type: str = "read"):
    """エンティティアクセス権限デコレータ"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            # 関数の引数からentity_idを取得
            entity_id = None
            if "incident_id" in kwargs:
                entity_id = kwargs["incident_id"]
            elif "user_id" in kwargs:
                entity_id = kwargs["user_id"]
            elif "entity_id" in kwargs:
                entity_id = kwargs["entity_id"]
            
            if not entity_id:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail="エンティティIDが指定されていません"
                )
            
            # セキュリティチェック
            db = kwargs.get("db")
            current_user_id = kwargs.get("current_user_id")
            
            if not db or not current_user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="認証が必要です"
                )
            
            security_manager = DetailPanelSecurityManager(db)
            
            if not security_manager.check_entity_access(
                current_user_id, entity_type, entity_id, access_type
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="このリソースにアクセスする権限がありません"
                )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


def apply_rate_limit(max_requests: int = 100, time_window: int = 60):
    """レート制限デコレータ"""
    def decorator(func):
        @wraps(func)
        async def wrapper(*args, **kwargs):
            current_user_id = kwargs.get("current_user_id")
            
            if current_user_id:
                rate_limiter = RateLimiter(max_requests, time_window)
                endpoint = func.__name__
                
                if not rate_limiter.check_rate_limit(current_user_id, endpoint):
                    raise HTTPException(
                        status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                        detail="リクエスト制限を超過しました。しばらく待ってから再試行してください。"
                    )
            
            return await func(*args, **kwargs)
        
        return wrapper
    return decorator


class AuditLogger:
    """監査ログ機能"""
    
    @staticmethod
    def log_detail_panel_access(
        user_id: UUID,
        entity_type: str,
        entity_id: UUID,
        action: str,
        request_data: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """詳細パネルアクセスログ"""
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": str(user_id),
            "entity_type": entity_type,
            "entity_id": str(entity_id),
            "action": action,
            "ip_address": ip_address,
            "user_agent": user_agent,
            "request_data_hash": None
        }
        
        if request_data:
            # リクエストデータのハッシュを記録（機密性のため）
            data_str = json.dumps(request_data, sort_keys=True)
            log_data["request_data_hash"] = hashlib.sha256(
                data_str.encode()
            ).hexdigest()
        
        logger.info(f"DetailPanel Access: {json.dumps(log_data)}")
    
    @staticmethod
    def log_security_violation(
        user_id: UUID,
        violation_type: str,
        details: Dict[str, Any],
        ip_address: Optional[str] = None
    ):
        """セキュリティ違反ログ"""
        log_data = {
            "timestamp": datetime.utcnow().isoformat(),
            "user_id": str(user_id),
            "violation_type": violation_type,
            "details": details,
            "ip_address": ip_address,
            "severity": "HIGH"
        }
        
        logger.warning(f"Security Violation: {json.dumps(log_data)}")


def get_security_manager(db: Session = Depends(get_db)) -> DetailPanelSecurityManager:
    """セキュリティマネージャーの依存性注入"""
    return DetailPanelSecurityManager(db)