"""CI/CD API セキュリティ強化モジュール"""

import json
import logging
import os
import hashlib
import time
from datetime import datetime, timedelta
from typing import Dict, List, Optional, Any, Tuple
from fastapi import HTTPException, Request, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
import jwt

from app.core.config import settings
from app.core.exceptions import ITSMException

logger = logging.getLogger(__name__)

# セキュリティ設定
GITHUB_WEBHOOK_SECRET = os.getenv("GITHUB_WEBHOOK_SECRET", "")
JWT_SECRET_KEY = settings.SECRET_KEY
JWT_ALGORITHM = "HS256"
JWT_EXPIRATION_HOURS = 24

# レート制限設定
RATE_LIMIT_STORAGE: Dict[str, Dict[str, Any]] = {}
RATE_LIMIT_WINDOW = 3600  # 1時間
DEFAULT_RATE_LIMIT = 100  # 1時間あたりのリクエスト数

# セキュリティヘッダー
SECURITY_HEADERS = {
    "X-Content-Type-Options": "nosniff",
    "X-Frame-Options": "DENY",
    "X-XSS-Protection": "1; mode=block",
    "Strict-Transport-Security": "max-age=31536000; includeSubDomains",
    "Content-Security-Policy": "default-src 'self'",
    "Referrer-Policy": "strict-origin-when-cross-origin"
}

# 認証スキーム
security = HTTPBearer()


class CICDSecurityManager:
    """CI/CD APIセキュリティマネージャー"""
    
    def __init__(self):
        self.failed_attempts: Dict[str, List[datetime]] = {}
        self.blocked_ips: Dict[str, datetime] = {}
        self.api_keys: Dict[str, Dict[str, Any]] = {}
        self._load_api_keys()
    
    def _load_api_keys(self) -> None:
        """APIキーを読み込み"""
        try:
            # 環境変数またはファイルからAPIキーを読み込み
            api_keys_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/.claude-flow/api-keys.json"
            if os.path.exists(api_keys_file):
                with open(api_keys_file, 'r') as f:
                    self.api_keys = json.load(f)
            else:
                # デフォルトのAPIキー設定
                self.api_keys = {
                    "admin": {
                        "key": hashlib.sha256("admin_default_key".encode()).hexdigest(),
                        "permissions": ["read", "write", "admin"],
                        "rate_limit": 1000,
                        "created_at": datetime.now().isoformat()
                    },
                    "ci_service": {
                        "key": hashlib.sha256("ci_service_key".encode()).hexdigest(),
                        "permissions": ["read", "write"],
                        "rate_limit": 500,
                        "created_at": datetime.now().isoformat()
                    }
                }
        except Exception as e:
            logger.error(f"Error loading API keys: {e}")
            self.api_keys = {}
    
    def verify_github_webhook(self, payload: bytes, signature: str) -> bool:
        """GitHub Webhookの署名を検証"""
        if not GITHUB_WEBHOOK_SECRET:
            logger.warning("GitHub webhook secret not configured")
            return False
        
        expected_signature = "sha256=" + hashlib.sha256(
            GITHUB_WEBHOOK_SECRET.encode() + payload
        ).hexdigest()
        
        return hashlib.compare_digest(expected_signature, signature)
    
    def create_jwt_token(self, user_data: Dict[str, Any]) -> str:
        """JWTトークンを作成"""
        try:
            payload = {
                "user_id": user_data.get("id"),
                "email": user_data.get("email"),
                "permissions": user_data.get("permissions", []),
                "exp": datetime.utcnow() + timedelta(hours=JWT_EXPIRATION_HOURS),
                "iat": datetime.utcnow(),
                "iss": "itsm-devapi"
            }
            
            token = jwt.encode(payload, JWT_SECRET_KEY, algorithm=JWT_ALGORITHM)
            return token
            
        except Exception as e:
            logger.error(f"Error creating JWT token: {e}")
            raise ITSMException(
                status_code=500,
                error_code="TOKEN_CREATION_ERROR",
                message="トークンの作成に失敗しました"
            )
    
    def verify_jwt_token(self, token: str) -> Dict[str, Any]:
        """JWTトークンを検証"""
        try:
            payload = jwt.decode(token, JWT_SECRET_KEY, algorithms=[JWT_ALGORITHM])
            return payload
            
        except jwt.ExpiredSignatureError:
            raise ITSMException(
                status_code=401,
                error_code="TOKEN_EXPIRED",
                message="トークンが期限切れです"
            )
        except jwt.InvalidTokenError:
            raise ITSMException(
                status_code=401,
                error_code="INVALID_TOKEN",
                message="無効なトークンです"
            )
    
    def verify_api_key(self, api_key: str) -> Tuple[bool, Dict[str, Any]]:
        """APIキーを検証"""
        for key_name, key_data in self.api_keys.items():
            if hashlib.compare_digest(key_data["key"], api_key):
                return True, key_data
        return False, {}
    
    def check_rate_limit(self, identifier: str, limit: int = DEFAULT_RATE_LIMIT) -> bool:
        """レート制限をチェック"""
        current_time = time.time()
        window_start = current_time - RATE_LIMIT_WINDOW
        
        if identifier not in RATE_LIMIT_STORAGE:
            RATE_LIMIT_STORAGE[identifier] = {
                "requests": [],
                "blocked_until": None
            }
        
        storage = RATE_LIMIT_STORAGE[identifier]
        
        # ブロック中かチェック
        if storage["blocked_until"] and current_time < storage["blocked_until"]:
            return False
        
        # 古いリクエスト記録を削除
        storage["requests"] = [
            req_time for req_time in storage["requests"] 
            if req_time > window_start
        ]
        
        # レート制限チェック
        if len(storage["requests"]) >= limit:
            # 一時的にブロック
            storage["blocked_until"] = current_time + 300  # 5分間ブロック
            logger.warning(f"Rate limit exceeded for {identifier}")
            return False
        
        # リクエストを記録
        storage["requests"].append(current_time)
        return True
    
    def check_ip_blocked(self, ip_address: str) -> bool:
        """IPアドレスがブロックされているかチェック"""
        if ip_address in self.blocked_ips:
            blocked_until = self.blocked_ips[ip_address]
            if datetime.now() < blocked_until:
                return True
            else:
                # ブロック期間が過ぎた場合は削除
                del self.blocked_ips[ip_address]
        return False
    
    def record_failed_attempt(self, identifier: str) -> None:
        """失敗試行を記録"""
        current_time = datetime.now()
        
        if identifier not in self.failed_attempts:
            self.failed_attempts[identifier] = []
        
        # 古い記録を削除（過去1時間）
        cutoff_time = current_time - timedelta(hours=1)
        self.failed_attempts[identifier] = [
            attempt for attempt in self.failed_attempts[identifier]
            if attempt > cutoff_time
        ]
        
        # 新しい失敗を記録
        self.failed_attempts[identifier].append(current_time)
        
        # 失敗回数が閾値を超えた場合はIPをブロック
        if len(self.failed_attempts[identifier]) >= 5:
            self.blocked_ips[identifier] = current_time + timedelta(hours=1)
            logger.warning(f"IP {identifier} blocked due to repeated failures")
    
    def validate_request_data(self, data: Dict[str, Any], 
                            required_fields: List[str]) -> bool:
        """リクエストデータの検証"""
        try:
            # 必須フィールドのチェック
            for field in required_fields:
                if field not in data:
                    raise ITSMException(
                        status_code=400,
                        error_code="MISSING_REQUIRED_FIELD",
                        message=f"必須フィールドが不足しています: {field}"
                    )
            
            # データ型の検証
            for key, value in data.items():
                if isinstance(value, str):
                    # SQLインジェクション対策
                    if any(keyword in value.lower() for keyword in 
                          ['select', 'insert', 'update', 'delete', 'drop', 'union']):
                        raise ITSMException(
                            status_code=400,
                            error_code="INVALID_INPUT",
                            message="不正な入力が検出されました"
                        )
                    
                    # XSS対策
                    if any(tag in value.lower() for tag in 
                          ['<script', '<iframe', '<object', '<embed']):
                        raise ITSMException(
                            status_code=400,
                            error_code="INVALID_INPUT",
                            message="不正な入力が検出されました"
                        )
            
            return True
            
        except ITSMException:
            raise
        except Exception as e:
            logger.error(f"Error validating request data: {e}")
            raise ITSMException(
                status_code=500,
                error_code="VALIDATION_ERROR",
                message="データ検証エラー"
            )
    
    def log_security_event(self, event_type: str, details: Dict[str, Any]) -> None:
        """セキュリティイベントをログに記録"""
        try:
            security_log = {
                "timestamp": datetime.now().isoformat(),
                "event_type": event_type,
                "details": details,
                "severity": self._get_event_severity(event_type)
            }
            
            # セキュリティログファイルに記録
            log_file = "/media/kensan/LinuxHDD/ITSM-ITmanagementSystem/backend/logs/security.log"
            os.makedirs(os.path.dirname(log_file), exist_ok=True)
            
            with open(log_file, 'a') as f:
                f.write(json.dumps(security_log) + "\n")
            
            # 重要なイベントの場合はアラート
            if security_log["severity"] in ["high", "critical"]:
                logger.warning(f"Security event: {event_type} - {details}")
                
        except Exception as e:
            logger.error(f"Error logging security event: {e}")
    
    def _get_event_severity(self, event_type: str) -> str:
        """イベントの重要度を判定"""
        high_severity_events = [
            "authentication_failure",
            "rate_limit_exceeded",
            "ip_blocked",
            "invalid_token",
            "webhook_verification_failed"
        ]
        
        critical_severity_events = [
            "sql_injection_attempt",
            "xss_attempt",
            "multiple_failed_attempts"
        ]
        
        if event_type in critical_severity_events:
            return "critical"
        elif event_type in high_severity_events:
            return "high"
        else:
            return "medium"


# グローバルセキュリティマネージャーインスタンス
security_manager = CICDSecurityManager()


# 依存関数
async def verify_api_authentication(credentials: HTTPAuthorizationCredentials = Depends(security)) -> Dict[str, Any]:
    """API認証を検証"""
    try:
        token = credentials.credentials
        
        # JWTトークンの検証を試行
        try:
            payload = security_manager.verify_jwt_token(token)
            return {
                "type": "jwt",
                "user_id": payload.get("user_id"),
                "email": payload.get("email"),
                "permissions": payload.get("permissions", [])
            }
        except ITSMException:
            pass
        
        # APIキーの検証を試行
        is_valid, key_data = security_manager.verify_api_key(token)
        if is_valid:
            return {
                "type": "api_key",
                "permissions": key_data.get("permissions", []),
                "rate_limit": key_data.get("rate_limit", DEFAULT_RATE_LIMIT)
            }
        
        # どちらも無効な場合
        security_manager.log_security_event("authentication_failure", {
            "token_prefix": token[:10] if len(token) > 10 else "short_token"
        })
        
        raise ITSMException(
            status_code=401,
            error_code="AUTHENTICATION_FAILED",
            message="認証に失敗しました"
        )
        
    except ITSMException:
        raise
    except Exception as e:
        logger.error(f"Error in API authentication: {e}")
        raise ITSMException(
            status_code=500,
            error_code="AUTHENTICATION_ERROR",
            message="認証処理エラー"
        )


async def check_ci_permissions(auth_data: Dict[str, Any] = Depends(verify_api_authentication)) -> Dict[str, Any]:
    """CI/CD操作権限をチェック"""
    required_permissions = ["write"]
    
    user_permissions = auth_data.get("permissions", [])
    
    if not any(perm in user_permissions for perm in required_permissions):
        security_manager.log_security_event("permission_denied", {
            "user_permissions": user_permissions,
            "required_permissions": required_permissions
        })
        
        raise ITSMException(
            status_code=403,
            error_code="INSUFFICIENT_PERMISSIONS",
            message="CI/CD操作の権限がありません"
        )
    
    return auth_data


async def check_rate_limit_middleware(request: Request) -> None:
    """レート制限ミドルウェア"""
    # クライアントIPアドレスを取得
    client_ip = request.client.host
    
    # IPブロックチェック
    if security_manager.check_ip_blocked(client_ip):
        security_manager.log_security_event("blocked_ip_request", {
            "ip": client_ip,
            "path": str(request.url.path)
        })
        
        raise ITSMException(
            status_code=429,
            error_code="IP_BLOCKED",
            message="IPアドレスがブロックされています"
        )
    
    # レート制限チェック
    if not security_manager.check_rate_limit(client_ip):
        security_manager.log_security_event("rate_limit_exceeded", {
            "ip": client_ip,
            "path": str(request.url.path)
        })
        
        raise ITSMException(
            status_code=429,
            error_code="RATE_LIMIT_EXCEEDED",
            message="レート制限に達しました"
        )


async def validate_github_webhook(request: Request) -> Dict[str, Any]:
    """GitHub Webhook署名を検証"""
    try:
        # 署名ヘッダーを取得
        signature = request.headers.get("X-Hub-Signature-256", "")
        if not signature:
            raise ITSMException(
                status_code=400,
                error_code="MISSING_SIGNATURE",
                message="Webhook署名が不足しています"
            )
        
        # リクエストボディを取得
        body = await request.body()
        
        # 署名を検証
        if not security_manager.verify_github_webhook(body, signature):
            security_manager.log_security_event("webhook_verification_failed", {
                "ip": request.client.host,
                "signature_prefix": signature[:20]
            })
            
            raise ITSMException(
                status_code=401,
                error_code="INVALID_WEBHOOK_SIGNATURE",
                message="Webhook署名が無効です"
            )
        
        # ペイロードを解析
        try:
            payload = json.loads(body.decode('utf-8'))
            return payload
        except json.JSONDecodeError:
            raise ITSMException(
                status_code=400,
                error_code="INVALID_JSON",
                message="無効なJSONペイロードです"
            )
            
    except ITSMException:
        raise
    except Exception as e:
        logger.error(f"Error validating GitHub webhook: {e}")
        raise ITSMException(
            status_code=500,
            error_code="WEBHOOK_VALIDATION_ERROR",
            message="Webhook検証エラー"
        )


# セキュリティヘッダーを追加する関数
def add_security_headers(response) -> None:
    """レスポンスにセキュリティヘッダーを追加"""
    for header, value in SECURITY_HEADERS.items():
        response.headers[header] = value


# CORS設定の強化
ALLOWED_ORIGINS = [
    "http://localhost:3000",  # 開発環境
    "http://localhost:8080",  # 開発環境
    "https://itsm.example.com",  # 本番環境（適切なドメインに変更）
]

def validate_cors_origin(origin: str) -> bool:
    """CORS オリジンを検証"""
    if settings.ENVIRONMENT == "development":
        return True
    return origin in ALLOWED_ORIGINS


# エラーハンドリングの強化
async def handle_security_exception(request: Request, exc: Exception) -> Dict[str, Any]:
    """セキュリティ例外を処理"""
    client_ip = request.client.host
    
    # セキュリティ例外を記録
    security_manager.log_security_event("security_exception", {
        "ip": client_ip,
        "path": str(request.url.path),
        "exception_type": type(exc).__name__,
        "exception_message": str(exc)
    })
    
    # 失敗試行を記録
    if isinstance(exc, ITSMException) and exc.status_code in [401, 403]:
        security_manager.record_failed_attempt(client_ip)
    
    return {
        "error": "セキュリティエラーが発生しました",
        "timestamp": datetime.now().isoformat(),
        "request_id": getattr(request.state, "request_id", "unknown")
    }