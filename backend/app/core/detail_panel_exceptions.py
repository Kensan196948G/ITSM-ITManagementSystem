"""詳細パネル用例外処理とエラーハンドリング"""

from typing import Dict, Any, Optional, List
from uuid import UUID
from datetime import datetime
import traceback
import json

from fastapi import HTTPException, status, Request
from fastapi.responses import JSONResponse
from pydantic import BaseModel

from app.core.logging import get_logger
from app.core.detail_panel_security import AuditLogger

logger = get_logger(__name__)


class DetailPanelException(Exception):
    """詳細パネル用基底例外クラス"""
    
    def __init__(
        self,
        message: str,
        error_code: str = "DETAIL_PANEL_ERROR",
        details: Optional[Dict[str, Any]] = None,
        user_id: Optional[UUID] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None
    ):
        self.message = message
        self.error_code = error_code
        self.details = details or {}
        self.user_id = user_id
        self.entity_type = entity_type
        self.entity_id = entity_id
        self.timestamp = datetime.utcnow()
        super().__init__(message)


class EntityNotFoundError(DetailPanelException):
    """エンティティが見つからない場合の例外"""
    
    def __init__(
        self,
        entity_type: str,
        entity_id: UUID,
        user_id: Optional[UUID] = None
    ):
        message = f"{entity_type} with ID {entity_id} not found"
        super().__init__(
            message=message,
            error_code="ENTITY_NOT_FOUND",
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id
        )


class InsufficientPermissionError(DetailPanelException):
    """権限不足の場合の例外"""
    
    def __init__(
        self,
        user_id: UUID,
        entity_type: str,
        entity_id: UUID,
        required_permission: str
    ):
        message = f"Insufficient permission to access {entity_type} {entity_id}"
        super().__init__(
            message=message,
            error_code="INSUFFICIENT_PERMISSION",
            details={"required_permission": required_permission},
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id
        )


class ValidationError(DetailPanelException):
    """バリデーションエラー"""
    
    def __init__(
        self,
        message: str,
        field_errors: Dict[str, List[str]],
        user_id: Optional[UUID] = None
    ):
        super().__init__(
            message=message,
            error_code="VALIDATION_ERROR",
            details={"field_errors": field_errors},
            user_id=user_id
        )


class RateLimitExceededError(DetailPanelException):
    """レート制限超過エラー"""
    
    def __init__(
        self,
        user_id: UUID,
        endpoint: str,
        limit: int,
        reset_time: datetime
    ):
        message = f"Rate limit exceeded for endpoint {endpoint}"
        super().__init__(
            message=message,
            error_code="RATE_LIMIT_EXCEEDED",
            details={
                "endpoint": endpoint,
                "limit": limit,
                "reset_time": reset_time.isoformat()
            },
            user_id=user_id
        )


class DataProcessingError(DetailPanelException):
    """データ処理エラー"""
    
    def __init__(
        self,
        message: str,
        processing_step: str,
        user_id: Optional[UUID] = None,
        entity_type: Optional[str] = None,
        entity_id: Optional[UUID] = None
    ):
        super().__init__(
            message=message,
            error_code="DATA_PROCESSING_ERROR",
            details={"processing_step": processing_step},
            user_id=user_id,
            entity_type=entity_type,
            entity_id=entity_id
        )


class CacheError(DetailPanelException):
    """キャッシュ関連エラー"""
    
    def __init__(
        self,
        message: str,
        cache_operation: str,
        cache_key: Optional[str] = None
    ):
        super().__init__(
            message=message,
            error_code="CACHE_ERROR",
            details={
                "cache_operation": cache_operation,
                "cache_key": cache_key
            }
        )


class ErrorResponse(BaseModel):
    """統一エラーレスポンス形式"""
    error: bool = True
    error_code: str
    message: str
    details: Optional[Dict[str, Any]] = None
    timestamp: str
    trace_id: Optional[str] = None


class DetailPanelErrorHandler:
    """詳細パネル用エラーハンドラー"""
    
    def __init__(self):
        self.error_mappings = {
            EntityNotFoundError: status.HTTP_404_NOT_FOUND,
            InsufficientPermissionError: status.HTTP_403_FORBIDDEN,
            ValidationError: status.HTTP_400_BAD_REQUEST,
            RateLimitExceededError: status.HTTP_429_TOO_MANY_REQUESTS,
            DataProcessingError: status.HTTP_500_INTERNAL_SERVER_ERROR,
            CacheError: status.HTTP_503_SERVICE_UNAVAILABLE
        }
    
    def handle_exception(
        self,
        request: Request,
        exc: Exception,
        trace_id: Optional[str] = None
    ) -> JSONResponse:
        """例外をHTTPレスポンスに変換"""
        
        if isinstance(exc, DetailPanelException):
            return self._handle_detail_panel_exception(exc, trace_id)
        elif isinstance(exc, HTTPException):
            return self._handle_http_exception(exc, trace_id)
        else:
            return self._handle_generic_exception(exc, trace_id)
    
    def _handle_detail_panel_exception(
        self,
        exc: DetailPanelException,
        trace_id: Optional[str] = None
    ) -> JSONResponse:
        """詳細パネル例外の処理"""
        
        status_code = self.error_mappings.get(
            type(exc),
            status.HTTP_500_INTERNAL_SERVER_ERROR
        )
        
        # エラーログ記録
        self._log_error(exc, status_code, trace_id)
        
        # 監査ログ記録（権限エラーの場合）
        if isinstance(exc, InsufficientPermissionError):
            AuditLogger.log_security_violation(
                user_id=exc.user_id,
                violation_type="insufficient_permission",
                details={
                    "entity_type": exc.entity_type,
                    "entity_id": str(exc.entity_id),
                    "error_code": exc.error_code
                }
            )
        
        error_response = ErrorResponse(
            error_code=exc.error_code,
            message=exc.message,
            details=exc.details,
            timestamp=exc.timestamp.isoformat(),
            trace_id=trace_id
        )
        
        return JSONResponse(
            status_code=status_code,
            content=error_response.model_dump()
        )
    
    def _handle_http_exception(
        self,
        exc: HTTPException,
        trace_id: Optional[str] = None
    ) -> JSONResponse:
        """HTTPException の処理"""
        
        error_response = ErrorResponse(
            error_code="HTTP_ERROR",
            message=exc.detail,
            timestamp=datetime.utcnow().isoformat(),
            trace_id=trace_id
        )
        
        return JSONResponse(
            status_code=exc.status_code,
            content=error_response.model_dump()
        )
    
    def _handle_generic_exception(
        self,
        exc: Exception,
        trace_id: Optional[str] = None
    ) -> JSONResponse:
        """一般例外の処理"""
        
        # エラーログ記録
        logger.error(
            f"Unhandled exception: {type(exc).__name__}: {str(exc)}",
            extra={
                "trace_id": trace_id,
                "exception_type": type(exc).__name__,
                "traceback": traceback.format_exc()
            }
        )
        
        error_response = ErrorResponse(
            error_code="INTERNAL_SERVER_ERROR",
            message="An unexpected error occurred",
            timestamp=datetime.utcnow().isoformat(),
            trace_id=trace_id
        )
        
        return JSONResponse(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            content=error_response.model_dump()
        )
    
    def _log_error(
        self,
        exc: DetailPanelException,
        status_code: int,
        trace_id: Optional[str] = None
    ):
        """エラーログ記録"""
        
        log_level = "error" if status_code >= 500 else "warning"
        
        log_data = {
            "error_code": exc.error_code,
            "message": exc.message,
            "status_code": status_code,
            "user_id": str(exc.user_id) if exc.user_id else None,
            "entity_type": exc.entity_type,
            "entity_id": str(exc.entity_id) if exc.entity_id else None,
            "details": exc.details,
            "timestamp": exc.timestamp.isoformat(),
            "trace_id": trace_id
        }
        
        if log_level == "error":
            logger.error(f"DetailPanel Error: {json.dumps(log_data)}")
        else:
            logger.warning(f"DetailPanel Warning: {json.dumps(log_data)}")


class PerformanceMonitor:
    """パフォーマンス監視クラス"""
    
    def __init__(self):
        self.slow_query_threshold = 2.0  # 2秒
        self.memory_threshold = 100 * 1024 * 1024  # 100MB
    
    def check_query_performance(
        self,
        query_name: str,
        execution_time: float,
        user_id: Optional[UUID] = None
    ):
        """クエリパフォーマンスチェック"""
        
        if execution_time > self.slow_query_threshold:
            logger.warning(
                f"Slow query detected: {query_name}",
                extra={
                    "query_name": query_name,
                    "execution_time": execution_time,
                    "user_id": str(user_id) if user_id else None,
                    "threshold": self.slow_query_threshold
                }
            )
    
    def check_memory_usage(
        self,
        operation_name: str,
        memory_usage: int,
        user_id: Optional[UUID] = None
    ):
        """メモリ使用量チェック"""
        
        if memory_usage > self.memory_threshold:
            logger.warning(
                f"High memory usage detected: {operation_name}",
                extra={
                    "operation_name": operation_name,
                    "memory_usage": memory_usage,
                    "user_id": str(user_id) if user_id else None,
                    "threshold": self.memory_threshold
                }
            )


class CircuitBreaker:
    """サーキットブレーカーパターン実装"""
    
    def __init__(
        self,
        failure_threshold: int = 5,
        recovery_timeout: int = 60,
        expected_exception: type = Exception
    ):
        self.failure_threshold = failure_threshold
        self.recovery_timeout = recovery_timeout
        self.expected_exception = expected_exception
        self.failure_count = 0
        self.last_failure_time = None
        self.state = "CLOSED"  # CLOSED, OPEN, HALF_OPEN
    
    def call(self, func, *args, **kwargs):
        """サーキットブレーカー経由での関数呼び出し"""
        
        if self.state == "OPEN":
            if self._should_attempt_reset():
                self.state = "HALF_OPEN"
            else:
                raise DetailPanelException(
                    message="Service temporarily unavailable",
                    error_code="CIRCUIT_BREAKER_OPEN"
                )
        
        try:
            result = func(*args, **kwargs)
            self._on_success()
            return result
            
        except self.expected_exception as e:
            self._on_failure()
            raise
    
    def _should_attempt_reset(self) -> bool:
        """リセット試行判定"""
        return (
            self.last_failure_time and
            datetime.utcnow() - self.last_failure_time > 
            timedelta(seconds=self.recovery_timeout)
        )
    
    def _on_success(self):
        """成功時の処理"""
        self.failure_count = 0
        self.state = "CLOSED"
    
    def _on_failure(self):
        """失敗時の処理"""
        self.failure_count += 1
        self.last_failure_time = datetime.utcnow()
        
        if self.failure_count >= self.failure_threshold:
            self.state = "OPEN"


# グローバルインスタンス
detail_panel_error_handler = DetailPanelErrorHandler()
performance_monitor = PerformanceMonitor()