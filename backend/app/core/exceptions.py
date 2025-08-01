"""カスタム例外クラス"""

from typing import Any, Dict, Optional, List


class ITSMException(Exception):
    """ITSM基底例外クラス"""
    
    def __init__(
        self,
        message: str,
        error_code: str = "ITSM_ERROR",
        details: Optional[List[Dict[str, str]]] = None,
        status_code: int = 500
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or []
        self.status_code = status_code
        super().__init__(self.message)


class ValidationException(ITSMException):
    """バリデーション例外"""
    
    def __init__(
        self,
        message: str = "入力データが不正です",
        details: Optional[List[Dict[str, str]]] = None
    ):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            details=details,
            status_code=400
        )


class NotFoundError(ITSMException):
    """リソース未発見例外"""
    
    def __init__(self, resource: str, identifier: Any):
        message = f"{resource}が見つかりません: {identifier}"
        super().__init__(
            message=message,
            error_code="NOT_FOUND",
            status_code=404
        )


class PermissionDeniedError(ITSMException):
    """権限不足例外"""
    
    def __init__(self, action: str, resource: str):
        message = f"{resource}に対する{action}権限がありません"
        super().__init__(
            message=message,
            error_code="PERMISSION_DENIED",
            status_code=403
        )


class BusinessRuleViolationError(ITSMException):
    """ビジネスルール違反例外"""
    
    def __init__(self, rule: str, message: str):
        super().__init__(
            message=f"ビジネスルール違反: {rule} - {message}",
            error_code="BUSINESS_RULE_VIOLATION",
            status_code=409
        )


class DuplicateResourceError(ITSMException):
    """重複リソース例外"""
    
    def __init__(self, resource: str, field: str, value: Any):
        message = f"{resource}の{field}は既に存在します: {value}"
        super().__init__(
            message=message,
            error_code="DUPLICATE_RESOURCE",
            status_code=409
        )


class ExternalServiceError(ITSMException):
    """外部サービスエラー"""
    
    def __init__(self, service: str, message: str):
        super().__init__(
            message=f"外部サービスエラー [{service}]: {message}",
            error_code="EXTERNAL_SERVICE_ERROR",
            status_code=502
        )


class RateLimitExceededError(ITSMException):
    """レート制限超過例外"""
    
    def __init__(self, limit: int, window: str):
        message = f"レート制限を超過しました: {limit}リクエスト/{window}"
        super().__init__(
            message=message,
            error_code="RATE_LIMIT_EXCEEDED",
            status_code=429
        )