"""パフォーマンス監視ミドルウェア"""

import time
import gzip
import logging
from typing import Callable
from fastapi import Request, Response
from fastapi.responses import JSONResponse
from starlette.middleware.base import BaseHTTPMiddleware

from app.core.performance import perf_monitor
from app.core.cache import cache_manager

logger = logging.getLogger(__name__)


class PerformanceMonitorMiddleware(BaseHTTPMiddleware):
    """パフォーマンス監視ミドルウェア"""
    
    def __init__(self, app, exclude_paths: list = None):
        super().__init__(app)
        self.exclude_paths = exclude_paths or ["/health", "/docs", "/openapi.json", "/favicon.ico"]
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """リクエスト処理とパフォーマンス監視"""
        
        # 除外パスの処理
        if any(request.url.path.startswith(path) for path in self.exclude_paths):
            response = await call_next(request)
            return response
        
        start_time = time.time()
        
        try:
            # リクエスト処理
            response = await call_next(request)
            
            # レスポンス時間を計算
            process_time = time.time() - start_time
            
            # パフォーマンス監視に記録
            endpoint = f"{request.method} {request.url.path}"
            perf_monitor.record_request_time(process_time, endpoint)
            
            # ヘッダーに処理時間を追加
            response.headers["X-Process-Time"] = str(round(process_time, 4))
            
            # 遅いリクエストをログに記録
            if process_time > 0.5:
                logger.warning(
                    f"Slow request: {endpoint} took {process_time:.3f}s, "
                    f"User-Agent: {request.headers.get('user-agent', 'Unknown')}"
                )
            
            return response
            
        except Exception as e:
            # エラー時もパフォーマンスを記録
            process_time = time.time() - start_time
            endpoint = f"{request.method} {request.url.path}"
            perf_monitor.record_request_time(process_time, endpoint)
            
            logger.error(f"Request failed: {endpoint} took {process_time:.3f}s, Error: {str(e)}")
            raise


class ResponseCompressionMiddleware(BaseHTTPMiddleware):
    """レスポンス圧縮ミドルウェア"""
    
    def __init__(self, app, min_size: int = 1000, compression_level: int = 6):
        super().__init__(app)
        self.min_size = min_size
        self.compression_level = compression_level
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """レスポンス圧縮処理"""
        
        response = await call_next(request)
        
        # 圧縮対象の判定
        if not self._should_compress(request, response):
            return response
        
        # レスポンスボディを取得
        body = b""
        async for chunk in response.body_iterator:
            body += chunk
        
        # サイズが最小サイズ未満は圧縮しない
        if len(body) < self.min_size:
            return Response(
                content=body,
                status_code=response.status_code,
                headers=dict(response.headers),
                media_type=response.media_type
            )
        
        # gzip圧縮
        try:
            compressed_body = gzip.compress(body, compresslevel=self.compression_level)
            
            # 圧縮効果がある場合のみ使用
            if len(compressed_body) < len(body):
                response.headers["content-encoding"] = "gzip"
                response.headers["content-length"] = str(len(compressed_body))
                
                return Response(
                    content=compressed_body,
                    status_code=response.status_code,
                    headers=dict(response.headers),
                    media_type=response.media_type
                )
        except Exception as e:
            logger.warning(f"Compression failed: {e}")
        
        # 圧縮に失敗した場合は元のレスポンスを返す
        return Response(
            content=body,
            status_code=response.status_code,
            headers=dict(response.headers),
            media_type=response.media_type
        )
    
    def _should_compress(self, request: Request, response: Response) -> bool:
        """圧縮すべきかどうかを判定"""
        
        # Accept-Encodingヘッダーをチェック
        accept_encoding = request.headers.get("accept-encoding", "")
        if "gzip" not in accept_encoding:
            return False
        
        # すでに圧縮されている
        if response.headers.get("content-encoding"):
            return False
        
        # content-typeをチェック
        content_type = response.headers.get("content-type", "")
        compressible_types = [
            "application/json",
            "application/javascript",
            "text/html",
            "text/css",
            "text/plain",
            "text/xml",
            "application/xml"
        ]
        
        return any(content_type.startswith(ct) for ct in compressible_types)


class CacheHeaderMiddleware(BaseHTTPMiddleware):
    """キャッシュヘッダー設定ミドルウェア"""
    
    def __init__(self, app):
        super().__init__(app)
        self.cache_rules = {
            "/api/v1/dashboard/metrics": 300,  # 5分
            "/api/v1/incidents": 120,          # 2分
            "/api/v1/users": 600,              # 10分
            "/api/v1/categories": 3600,        # 1時間
            "/api/v1/teams": 3600,             # 1時間
        }
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """キャッシュヘッダー設定"""
        
        response = await call_next(request)
        
        # GETリクエストのみ対象
        if request.method != "GET":
            return response
        
        # パスに基づいてキャッシュ時間を設定
        path = request.url.path
        cache_time = None
        
        for rule_path, time_seconds in self.cache_rules.items():
            if path.startswith(rule_path):
                cache_time = time_seconds
                break
        
        if cache_time:
            response.headers["Cache-Control"] = f"max-age={cache_time}, must-revalidate"
            response.headers["ETag"] = f'"{hash(str(response.body))}"'
        else:
            response.headers["Cache-Control"] = "no-cache, no-store, must-revalidate"
            response.headers["Pragma"] = "no-cache"
            response.headers["Expires"] = "0"
        
        return response


class SecurityHeaderMiddleware(BaseHTTPMiddleware):
    """セキュリティヘッダー設定ミドルウェア"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """セキュリティヘッダー設定"""
        
        response = await call_next(request)
        
        # セキュリティヘッダーを追加
        security_headers = {
            "X-Content-Type-Options": "nosniff",
            "X-Frame-Options": "DENY",
            "X-XSS-Protection": "1; mode=block",
            "Referrer-Policy": "strict-origin-when-cross-origin",
            "Content-Security-Policy": "default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'",
        }
        
        for header, value in security_headers.items():
            response.headers[header] = value
        
        return response


class HealthCheckMiddleware(BaseHTTPMiddleware):
    """ヘルスチェック用ミドルウェア"""
    
    async def dispatch(self, request: Request, call_next: Callable) -> Response:
        """ヘルスチェック処理"""
        
        # ヘルスチェックエンドポイント
        if request.url.path == "/health":
            stats = perf_monitor.get_stats()
            cache_stats = cache_manager.get_stats()
            
            health_data = {
                "status": "healthy",
                "timestamp": time.time(),
                "performance": stats,
                "cache": cache_stats,
                "version": "1.0.0"
            }
            
            return JSONResponse(content=health_data)
        
        return await call_next(request)


def setup_performance_middleware(app):
    """パフォーマンス関連ミドルウェアをセットアップ"""
    
    # ミドルウェアを追加（逆順で追加される）
    app.add_middleware(HealthCheckMiddleware)
    app.add_middleware(SecurityHeaderMiddleware)
    app.add_middleware(CacheHeaderMiddleware)
    app.add_middleware(ResponseCompressionMiddleware, min_size=1000, compression_level=6)
    app.add_middleware(PerformanceMonitorMiddleware, exclude_paths=["/health", "/docs", "/openapi.json"])
    
    logger.info("✅ パフォーマンス監視ミドルウェアがセットアップされました")