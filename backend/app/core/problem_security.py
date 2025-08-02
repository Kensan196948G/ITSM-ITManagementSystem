"""問題管理セキュリティ"""

from typing import Optional, List, Dict, Any
from uuid import UUID
from datetime import datetime
import logging
import hashlib
import json

from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from app.models.problem import Problem, KnownError, ProblemStatus
from app.core.logging import audit_logger

logger = logging.getLogger("app.security")


class ProblemSecurityManager:
    """問題管理セキュリティマネージャー"""
    
    # アクションタイプ定数
    ACTION_CREATE = "CREATE"
    ACTION_READ = "READ"
    ACTION_UPDATE = "UPDATE"
    ACTION_DELETE = "DELETE"
    ACTION_RCA_START = "RCA_START"
    ACTION_RCA_UPDATE = "RCA_UPDATE"
    ACTION_BULK_UPDATE = "BULK_UPDATE"
    ACTION_BULK_DELETE = "BULK_DELETE"
    ACTION_EXPORT = "EXPORT"
    
    # リソースタイプ定数
    RESOURCE_PROBLEM = "PROBLEM"
    RESOURCE_KNOWN_ERROR = "KNOWN_ERROR"
    RESOURCE_RCA = "RCA"
    
    @staticmethod
    def check_permission(
        user_id: UUID,
        action: str,
        resource_type: str,
        resource_id: Optional[UUID] = None,
        resource_data: Optional[Dict[str, Any]] = None
    ) -> bool:
        """権限チェック"""
        try:
            # 基本的な権限ロジック（実際の実装では外部システムと連携）
            # ここでは簡略化した実装
            
            # システム管理者は全ての操作が可能
            if ProblemSecurityManager._is_system_admin(user_id):
                return True
            
            # 問題管理者は問題関連の操作が可能
            if ProblemSecurityManager._is_problem_manager(user_id):
                if resource_type in [
                    ProblemSecurityManager.RESOURCE_PROBLEM,
                    ProblemSecurityManager.RESOURCE_RCA
                ]:
                    return True
            
            # 既知エラー管理者は既知エラーの操作が可能
            if ProblemSecurityManager._is_knowledge_manager(user_id):
                if resource_type == ProblemSecurityManager.RESOURCE_KNOWN_ERROR:
                    return True
            
            # 読み取り専用ユーザーは参照のみ可能
            if action == ProblemSecurityManager.ACTION_READ:
                return ProblemSecurityManager._is_read_only_user(user_id)
            
            return False
            
        except Exception as e:
            logger.error(f"Permission check failed: {e}")
            return False
    
    @staticmethod
    def _is_system_admin(user_id: UUID) -> bool:
        """システム管理者チェック"""
        # 実際の実装では外部システムまたはDB連携
        return str(user_id) == "12345678-1234-1234-1234-123456789012"
    
    @staticmethod
    def _is_problem_manager(user_id: UUID) -> bool:
        """問題管理者チェック"""
        # 実際の実装では外部システムまたはDB連携
        return True  # 仮実装
    
    @staticmethod
    def _is_knowledge_manager(user_id: UUID) -> bool:
        """ナレッジ管理者チェック"""
        # 実際の実装では外部システムまたはDB連携
        return True  # 仮実装
    
    @staticmethod
    def _is_read_only_user(user_id: UUID) -> bool:
        """読み取り専用ユーザーチェック"""
        # 実際の実装では外部システムまたはDB連携
        return True  # 仮実装
    
    @staticmethod
    def log_security_event(
        user_id: UUID,
        action: str,
        resource_type: str,
        resource_id: Optional[UUID] = None,
        success: bool = True,
        details: Optional[Dict[str, Any]] = None,
        ip_address: Optional[str] = None,
        user_agent: Optional[str] = None
    ):
        """セキュリティイベントログ"""
        try:
            event_data = {
                "user_id": str(user_id),
                "action": action,
                "resource_type": resource_type,
                "resource_id": str(resource_id) if resource_id else None,
                "success": success,
                "timestamp": datetime.utcnow().isoformat(),
                "ip_address": ip_address,
                "user_agent": user_agent,
                "details": details or {}
            }
            
            # 監査ログに記録
            audit_logger.info(
                f"Security Event: {action} on {resource_type}",
                extra={
                    "event_type": "SECURITY",
                    "event_data": event_data
                }
            )
            
            # 失敗の場合は警告レベルでログ
            if not success:
                logger.warning(
                    f"Security violation: User {user_id} attempted {action} on {resource_type}",
                    extra=event_data
                )
            
        except Exception as e:
            logger.error(f"Failed to log security event: {e}")
    
    @staticmethod
    def validate_problem_data(problem_data: Dict[str, Any]) -> List[str]:
        """問題データバリデーション"""
        errors = []
        
        try:
            # タイトル検証
            title = problem_data.get("title", "").strip()
            if not title:
                errors.append("タイトルは必須です")
            elif len(title) > 500:
                errors.append("タイトルは500文字以下である必要があります")
            elif ProblemSecurityManager._contains_sensitive_data(title):
                errors.append("タイトルに機密情報が含まれている可能性があります")
            
            # 説明検証
            description = problem_data.get("description", "")
            if description and len(description) > 10000:
                errors.append("説明は10000文字以下である必要があります")
            elif description and ProblemSecurityManager._contains_sensitive_data(description):
                errors.append("説明に機密情報が含まれている可能性があります")
            
            # 優先度検証
            priority = problem_data.get("priority")
            if priority and priority not in ["low", "medium", "high", "critical", "urgent"]:
                errors.append("無効な優先度が指定されています")
            
            # 影響分析検証
            impact_analysis = problem_data.get("impact_analysis", "")
            if impact_analysis and len(impact_analysis) > 5000:
                errors.append("影響分析は5000文字以下である必要があります")
            
            # 関連インシデント数制限
            related_incidents = problem_data.get("related_incident_ids", [])
            if len(related_incidents) > 100:
                errors.append("関連インシデントは100件以下である必要があります")
            
        except Exception as e:
            logger.error(f"Problem data validation failed: {e}")
            errors.append("データ検証中にエラーが発生しました")
        
        return errors
    
    @staticmethod
    def validate_known_error_data(known_error_data: Dict[str, Any]) -> List[str]:
        """既知エラーデータバリデーション"""
        errors = []
        
        try:
            # タイトル検証
            title = known_error_data.get("title", "").strip()
            if not title:
                errors.append("タイトルは必須です")
            elif len(title) > 500:
                errors.append("タイトルは500文字以下である必要があります")
            elif ProblemSecurityManager._contains_sensitive_data(title):
                errors.append("タイトルに機密情報が含まれている可能性があります")
            
            # 各フィールドの文字数制限
            fields_to_check = {
                "symptoms": 5000,
                "root_cause": 5000,
                "workaround": 5000,
                "solution": 5000,
                "search_keywords": 1000
            }
            
            for field, max_length in fields_to_check.items():
                value = known_error_data.get(field, "")
                if value and len(value) > max_length:
                    errors.append(f"{field}は{max_length}文字以下である必要があります")
                elif value and ProblemSecurityManager._contains_sensitive_data(value):
                    errors.append(f"{field}に機密情報が含まれている可能性があります")
            
            # タグ数制限
            tags = known_error_data.get("tags", [])
            if len(tags) > 20:
                errors.append("タグは20個以下である必要があります")
            
            # タグ内容検証
            for tag in tags:
                if len(tag) > 50:
                    errors.append("各タグは50文字以下である必要があります")
                elif ProblemSecurityManager._contains_sensitive_data(tag):
                    errors.append("タグに機密情報が含まれている可能性があります")
            
        except Exception as e:
            logger.error(f"Known error data validation failed: {e}")
            errors.append("データ検証中にエラーが発生しました")
        
        return errors
    
    @staticmethod
    def _contains_sensitive_data(text: str) -> bool:
        """機密情報検出"""
        if not text:
            return False
        
        # 機密情報パターンの検出（簡略化）
        sensitive_patterns = [
            # パスワードパターン
            r'password\s*[:=]\s*\w+',
            r'passwd\s*[:=]\s*\w+',
            r'pwd\s*[:=]\s*\w+',
            # API キーパターン
            r'api[_-]?key\s*[:=]\s*[a-zA-Z0-9]+',
            r'secret[_-]?key\s*[:=]\s*[a-zA-Z0-9]+',
            # クレジットカード番号（簡略）
            r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
            # 社会保障番号（日本のマイナンバー形式）
            r'\b\d{4}[-\s]?\d{4}[-\s]?\d{4}\b',
        ]
        
        import re
        text_lower = text.lower()
        
        for pattern in sensitive_patterns:
            if re.search(pattern, text_lower, re.IGNORECASE):
                return True
        
        return False
    
    @staticmethod
    def sanitize_data(data: Dict[str, Any]) -> Dict[str, Any]:
        """データサニタイゼーション"""
        sanitized = {}
        
        try:
            for key, value in data.items():
                if isinstance(value, str):
                    # HTMLタグ除去
                    import html
                    value = html.escape(value)
                    
                    # SQLインジェクション対策（基本的なパターン）
                    dangerous_patterns = [
                        r"('\s*(or|and)\s*')",
                        r"(\bunion\s+select\b)",
                        r"(\bdrop\s+table\b)",
                        r"(\bdelete\s+from\b)",
                        r"(\binsert\s+into\b)",
                        r"(\bupdate\s+set\b)"
                    ]
                    
                    import re
                    for pattern in dangerous_patterns:
                        if re.search(pattern, value.lower()):
                            logger.warning(f"Potential SQL injection detected in field {key}")
                            value = re.sub(pattern, "", value, flags=re.IGNORECASE)
                    
                    sanitized[key] = value.strip()
                elif isinstance(value, list):
                    sanitized[key] = [
                        ProblemSecurityManager.sanitize_data({"item": item})["item"]
                        if isinstance(item, str) else item
                        for item in value
                    ]
                else:
                    sanitized[key] = value
                    
        except Exception as e:
            logger.error(f"Data sanitization failed: {e}")
            return data  # 失敗時は元データを返す
        
        return sanitized
    
    @staticmethod
    def generate_data_hash(data: Dict[str, Any]) -> str:
        """データ整合性ハッシュ生成"""
        try:
            # データを正規化してハッシュ化
            normalized_data = json.dumps(data, sort_keys=True, default=str)
            return hashlib.sha256(normalized_data.encode()).hexdigest()
        except Exception as e:
            logger.error(f"Hash generation failed: {e}")
            return ""
    
    @staticmethod
    def verify_data_integrity(data: Dict[str, Any], expected_hash: str) -> bool:
        """データ整合性検証"""
        try:
            current_hash = ProblemSecurityManager.generate_data_hash(data)
            return current_hash == expected_hash
        except Exception as e:
            logger.error(f"Data integrity verification failed: {e}")
            return False
    
    @staticmethod
    def check_rate_limit(user_id: UUID, action: str) -> bool:
        """レート制限チェック"""
        try:
            # 簡略化されたレート制限実装
            # 実際の実装ではRedisやメモリキャッシュを使用
            
            # ユーザーごとのアクションカウンターをチェック
            # ここでは常にTrueを返す（実装例）
            return True
            
        except Exception as e:
            logger.error(f"Rate limit check failed: {e}")
            return False


def require_permission(action: str, resource_type: str):
    """権限チェックデコレーター"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            # current_user_id を kwargs から取得
            current_user_id = kwargs.get("current_user_id")
            if not current_user_id:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="認証が必要です"
                )
            
            # 権限チェック
            if not ProblemSecurityManager.check_permission(
                current_user_id, action, resource_type
            ):
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="この操作を実行する権限がありません"
                )
            
            return func(*args, **kwargs)
        return wrapper
    return decorator


def audit_action(action: str, resource_type: str):
    """監査ログデコレーター"""
    def decorator(func):
        def wrapper(*args, **kwargs):
            current_user_id = kwargs.get("current_user_id")
            resource_id = kwargs.get("problem_id") or kwargs.get("known_error_id")
            
            try:
                result = func(*args, **kwargs)
                
                # 成功時のログ
                ProblemSecurityManager.log_security_event(
                    user_id=current_user_id,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    success=True
                )
                
                return result
                
            except Exception as e:
                # 失敗時のログ
                ProblemSecurityManager.log_security_event(
                    user_id=current_user_id,
                    action=action,
                    resource_type=resource_type,
                    resource_id=resource_id,
                    success=False,
                    details={"error": str(e)}
                )
                raise
                
        return wrapper
    return decorator