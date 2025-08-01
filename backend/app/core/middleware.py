"""ミドルウェア定義"""

import time
import uuid
from typing import Callable

from fastapi import Request, Response
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.middleware.base import RequestResponseEndpoint

from app.core.logging import audit_logger
import logging

logger = logging.getLogger("app")


class RequestContextMiddleware(BaseHTTPMiddleware):
    """リクエストコンテキストミドルウェア"""
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # リクエストIDを生成
        request_id = str(uuid.uuid4())
        request.state.request_id = request_id
        
        # レスポンスヘッダーにリクエストIDを設定
        response = await call_next(request)
        response.headers["X-Request-ID"] = request_id
        
        return response


class LoggingMiddleware(BaseHTTPMiddleware):
    """ログ記録ミドルウェア"""
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        start_time = time.time()
        
        # リクエスト情報をログ
        client_ip = request.client.host
        user_agent = request.headers.get("User-Agent", "")
        method = request.method
        url = str(request.url)
        request_id = getattr(request.state, "request_id", "unknown")
        
        logger.info(
            f"Request started - {method} {url}",
            extra={
                "request_id": request_id,
                "client_ip": client_ip,
                "user_agent": user_agent,
                "method": method,
                "url": url
            }
        )
        
        # リクエスト処理
        response = await call_next(request)
        
        # レスポンス時間を計算
        process_time = time.time() - start_time
        
        # レスポンス情報をログ
        logger.info(
            f"Request completed - {method} {url} - {response.status_code} - {process_time:.3f}s",
            extra={
                "request_id": request_id,
                "client_ip": client_ip,
                "method": method,
                "url": url,
                "status_code": response.status_code,
                "process_time": process_time
            }
        )
        
        # レスポンスヘッダーに処理時間を設定
        response.headers["X-Process-Time"] = f"{process_time:.3f}"
        
        return response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """セキュリティヘッダーミドルウェア"""
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        response = await call_next(request)
        
        # セキュリティヘッダーを設定
        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Content-Security-Policy"] = "default-src 'self'"
        
        return response


class RateLimitMiddleware(BaseHTTPMiddleware):
    """レート制限ミドルウェア（簡易実装）"""
    
    def __init__(self, app, max_requests: int = 1000, window_minutes: int = 60):
        super().__init__(app)
        self.max_requests = max_requests
        self.window_minutes = window_minutes
        self.requests = {}  # 実際の実装ではRedisを使用
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        client_ip = request.client.host
        current_time = int(time.time() / 60)  # 分単位のタイムスタンプ
        
        # クライアントIPごとのリクエスト数をカウント
        key = f"{client_ip}:{current_time}"
        
        if key not in self.requests:
            self.requests[key] = 0
        
        self.requests[key] += 1
        
        # レート制限チェック
        if self.requests[key] > self.max_requests:
            audit_logger.log_security_event(
                event_type="rate_limit_exceeded",
                user_id="unknown",
                description=f"Rate limit exceeded for IP: {client_ip}",
                severity="high",
                client_ip=client_ip,
                details={"requests": self.requests[key], "limit": self.max_requests}
            )
            
            from fastapi import HTTPException, status
            raise HTTPException(
                status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                detail="レート制限を超過しました"
            )
        
        # 古いエントリをクリーンアップ（簡易実装）
        keys_to_remove = [k for k in self.requests.keys() 
                         if int(k.split(':')[1]) < current_time - self.window_minutes]
        for k in keys_to_remove:
            del self.requests[k]
        
        response = await call_next(request)
        
        # レート制限ヘッダーを設定
        response.headers["X-RateLimit-Limit"] = str(self.max_requests)
        response.headers["X-RateLimit-Remaining"] = str(self.max_requests - self.requests[key])
        response.headers["X-RateLimit-Reset"] = str((current_time + 1) * 60)
        
        return response


class AuditMiddleware(BaseHTTPMiddleware):
    """監査ログミドルウェア"""
    
    async def dispatch(
        self, request: Request, call_next: RequestResponseEndpoint
    ) -> Response:
        # 特定のエンドポイントのみ監査ログを記録
        if self._should_audit(request):
            client_ip = request.client.host
            user_agent = request.headers.get("User-Agent", "")
            method = request.method
            path = request.url.path
            
            # ユーザーIDを取得（認証実装後）
            user_id = self._get_user_id(request)
            
            # 監査ログ記録
            audit_logger.log_user_action(
                user_id=user_id,
                action=method,
                resource_type=self._extract_resource_type(path),
                resource_id=self._extract_resource_id(path),
                client_ip=client_ip,
                user_agent=user_agent
            )
        
        response = await call_next(request)
        return response
    
    def _should_audit(self, request: Request) -> bool:
        """監査対象かどうかを判定"""
        # GET以外のメソッドは監査対象
        if request.method != "GET":
            return True
        
        # 特定のパスは監査対象
        audit_paths = ["/api/v1/incidents", "/api/v1/problems", "/api/v1/changes"]
        return any(request.url.path.startswith(path) for path in audit_paths)
    
    def _get_user_id(self, request: Request) -> str:
        """リクエストからユーザーIDを取得（仮実装）"""
        # 実際の実装では認証トークンから取得
        return getattr(request.state, "user_id", "anonymous")
    
    def _extract_resource_type(self, path: str) -> str:
        """パスからリソースタイプを抽出"""
        if "/incidents" in path:
            return "incident"
        elif "/problems" in path:
            return "problem"
        elif "/changes" in path:
            return "change"
        return "unknown"
    
    def _extract_resource_id(self, path: str) -> str:
        """パスからリソースIDを抽出"""
        parts = path.strip("/").split("/")
        if len(parts) >= 3:
            # /api/v1/incidents/{id} のような形式からIDを抽出
            potential_id = parts[-1]
            if potential_id not in ["work-notes", "history", "approve", "resolve"]:
                return potential_id
        return "unknown"