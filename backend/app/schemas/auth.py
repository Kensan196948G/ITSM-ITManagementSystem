"""認証スキーマ"""

from uuid import UUID
from pydantic import BaseModel, EmailStr, Field


class LoginRequest(BaseModel):
    """ログインリクエスト"""
    username: str = Field(..., description="ユーザー名またはメールアドレス")
    password: str = Field(..., description="パスワード")


class UserInfo(BaseModel):
    """ユーザー情報"""
    id: UUID
    username: str
    email: EmailStr
    display_name: str
    is_active: bool


class LoginResponse(BaseModel):
    """ログインレスポンス"""
    access_token: str
    token_type: str = "bearer"
    expires_in: int  # 秒
    user: UserInfo


class TokenData(BaseModel):
    """トークンデータ"""
    username: str
    user_id: UUID