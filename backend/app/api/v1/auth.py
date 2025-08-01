"""認証API"""

from datetime import datetime, timedelta
from typing import Optional, List, Dict, Any
from uuid import UUID
from functools import wraps

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi import status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from passlib.context import CryptContext
from jose import JWTError, jwt

from app.db.base import get_db
from app.models.user import User, UserRole
from app.core.config import settings
from app.schemas.auth import LoginRequest, LoginResponse, UserInfo


router = APIRouter()
security = HTTPBearer()
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


class AuthService:
    """認証サービス"""
    
    @staticmethod
    def verify_password(plain_password: str, hashed_password: str) -> bool:
        """パスワード検証"""
        return pwd_context.verify(plain_password, hashed_password)
    
    @staticmethod
    def get_password_hash(password: str) -> str:
        """パスワードハッシュ化"""
        return pwd_context.hash(password)
    
    @staticmethod
    def create_access_token(data: dict, expires_delta: Optional[timedelta] = None) -> str:
        """アクセストークン作成"""
        to_encode = data.copy()
        if expires_delta:
            expire = datetime.utcnow() + expires_delta
        else:
            expire = datetime.utcnow() + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "access"
        })
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def create_refresh_token(data: dict) -> str:
        """リフレッシュトークン作成"""
        to_encode = data.copy()
        expire = datetime.utcnow() + timedelta(days=7)  # 7日間有効
        
        to_encode.update({
            "exp": expire,
            "iat": datetime.utcnow(),
            "type": "refresh"
        })
        encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
        return encoded_jwt
    
    @staticmethod
    def decode_token(token: str) -> dict:
        """トークンデコード"""
        try:
            payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
            return payload
        except JWTError:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="無効なトークンです",
                headers={"WWW-Authenticate": "Bearer"},
            )


def get_current_user(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """現在のユーザーを取得"""
    token = credentials.credentials
    payload = AuthService.decode_token(token)
    
    user_id: str = payload.get("sub")
    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="無効なトークンです",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    user = db.query(User).filter(User.id == UUID(user_id)).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザーが見つかりません",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="非アクティブなユーザーです",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    return user


def get_current_user_id(current_user: User = Depends(get_current_user)) -> UUID:
    """現在のユーザーIDを取得"""
    return current_user.id


def get_current_active_user(current_user: User = Depends(get_current_user)) -> User:
    """現在のアクティブユーザーを取得"""
    if not current_user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="非アクティブなユーザーです"
        )
    return current_user


def require_role(allowed_roles: List[UserRole]):
    """指定されたロールが必要な権限チェック"""
    def role_checker(current_user: User = Depends(get_current_active_user)):
        if current_user.role not in allowed_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="この操作を実行する権限がありません"
            )
        return current_user
    return role_checker


def require_permission(resource: str, action: str):
    """指定されたリソース・アクションの権限チェック"""
    def permission_checker(current_user: User = Depends(get_current_active_user)):
        if not check_user_permission(current_user, resource, action):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"{resource}に対する{action}権限がありません"
            )
        return current_user
    return permission_checker


def check_user_permission(user: User, resource: str, action: str) -> bool:
    """ユーザーの権限をチェックする"""
    # ロールベースの権限チェック
    role_permissions = get_role_permissions(user.role)
    
    # 管理者は全権限
    if user.role == UserRole.ADMIN:
        return True
    
    # リソース別権限チェック
    for permission in role_permissions:
        perm_resource = permission.get("resource")
        perm_actions = permission.get("actions", [])
        
        # ワイルドカード権限
        if perm_resource == "*" and "*" in perm_actions:
            return True
        
        # リソースマッチング
        if perm_resource == resource or perm_resource == "*":
            if action in perm_actions or "*" in perm_actions:
                # 条件付き権限のチェック
                conditions = permission.get("conditions", {})
                if conditions and not check_permission_conditions(user, conditions):
                    continue
                return True
    
    return False


def get_role_permissions(role: UserRole) -> List[Dict[str, Any]]:
    """ロールの権限定義を取得する"""
    role_permissions = {
        UserRole.ADMIN: [
            {"resource": "*", "actions": ["*"]},
        ],
        UserRole.MANAGER: [
            {"resource": "incidents", "actions": ["create", "read", "update", "delete"]},
            {"resource": "problems", "actions": ["create", "read", "update", "delete"]},
            {"resource": "changes", "actions": ["create", "read", "update", "delete"]},
            {"resource": "users", "actions": ["read", "update"], "conditions": {"department": "own"}},
            {"resource": "reports", "actions": ["read"]},
            {"resource": "dashboard", "actions": ["read"]},
            {"resource": "notifications", "actions": ["read", "send"]},
        ],
        UserRole.OPERATOR: [
            {"resource": "incidents", "actions": ["create", "read", "update"]},
            {"resource": "problems", "actions": ["create", "read", "update"]},
            {"resource": "changes", "actions": ["read", "update"]},
            {"resource": "users", "actions": ["read"], "conditions": {"own_only": True}},
            {"resource": "dashboard", "actions": ["read"]},
            {"resource": "notifications", "actions": ["read"]},
            {"resource": "attachments", "actions": ["create", "read", "delete"], "conditions": {"own_only": True}},
        ],
        UserRole.VIEWER: [
            {"resource": "incidents", "actions": ["read"]},
            {"resource": "problems", "actions": ["read"]},
            {"resource": "changes", "actions": ["read"]},
            {"resource": "reports", "actions": ["read"]},
            {"resource": "dashboard", "actions": ["read"]},
            {"resource": "notifications", "actions": ["read"]},
        ]
    }
    
    return role_permissions.get(role, [])


def check_permission_conditions(user: User, conditions: Dict[str, Any]) -> bool:
    """権限の条件をチェックする"""
    if conditions.get("own_only"):
        # 自分自身のリソースのみアクセス可能
        return True  # 実際の実装では、リソースの所有者チェックが必要
    
    if "department" in conditions:
        # 部署制限
        allowed_departments = conditions["department"]
        if allowed_departments == "own":
            return True  # 同じ部署のみ
        elif isinstance(allowed_departments, list):
            return user.department in allowed_departments
    
    return True


def require_admin(current_user: User = Depends(get_current_active_user)):
    """管理者権限が必要"""
    if current_user.role != UserRole.ADMIN:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="管理者権限が必要です"
        )
    return current_user


def require_manager_or_admin(current_user: User = Depends(get_current_active_user)):
    """マネージャー以上の権限が必要"""
    if current_user.role not in [UserRole.ADMIN, UserRole.MANAGER]:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="マネージャー以上の権限が必要です"
        )
    return current_user


@router.post("/login", response_model=LoginResponse, summary="ログイン")
async def login(
    login_data: LoginRequest,
    db: Session = Depends(get_db)
) -> LoginResponse:
    """ユーザーログイン"""
    # ユーザー検索（emailまたはusernameで）
    user = db.query(User).filter(
        (User.email == login_data.username) | (User.username == login_data.username)
    ).first()
    
    if not user or not AuthService.verify_password(login_data.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="ユーザー名またはパスワードが間違っています",
            headers={"WWW-Authenticate": "Bearer"},
        )
    
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="アカウントが無効です",
        )
    
    # アクセストークン作成
    access_token_expires = timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    access_token = AuthService.create_access_token(
        data={"sub": str(user.id), "username": user.username},
        expires_delta=access_token_expires
    )
    
    # ログイン時刻を更新
    user.last_login_at = datetime.utcnow()
    db.commit()
    
    return LoginResponse(
        access_token=access_token,
        token_type="bearer",
        expires_in=settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        user=UserInfo(
            id=user.id,
            username=user.username,
            email=user.email,
            display_name=user.display_name or user.full_name,
            is_active=user.is_active
        )
    )


@router.get("/me", response_model=UserInfo, summary="ユーザー情報取得")
async def get_user_info(current_user: User = Depends(get_current_user)) -> UserInfo:
    """現在のユーザー情報を取得"""
    return UserInfo(
        id=current_user.id,
        username=current_user.username,
        email=current_user.email,
        display_name=current_user.display_name or current_user.full_name,
        is_active=current_user.is_active
    )


@router.post("/logout", summary="ログアウト")
async def logout(current_user: User = Depends(get_current_user)):
    """ユーザーログアウト"""
    # 実際の実装では、トークンをブラックリストに追加するなどの処理が必要
    return {"message": "正常にログアウトしました"}