"""共通スキーマ"""

from typing import Optional, List, Any
from uuid import UUID

from pydantic import BaseModel, Field


class ErrorDetail(BaseModel):
    """エラー詳細スキーマ"""
    field: str
    message: str


class ErrorResponse(BaseModel):
    """エラーレスポンススキーマ"""
    code: str
    message: str
    details: Optional[List[ErrorDetail]] = None
    request_id: Optional[str] = None


class APIError(BaseModel):
    """APIエラースキーマ"""
    error: ErrorResponse


class PaginationMeta(BaseModel):
    """ページネーションメタ情報"""
    current_page: int
    total_pages: int
    total_count: int
    per_page: int


class PaginationLinks(BaseModel):
    """ページネーションリンク"""
    first: Optional[str] = None
    prev: Optional[str] = None
    next: Optional[str] = None
    last: Optional[str] = None


class PaginatedResponse(BaseModel):
    """ページネーション付きレスポンス"""
    data: List[Any]
    meta: PaginationMeta
    links: Optional[PaginationLinks] = None


class FilterParams(BaseModel):
    """フィルターパラメータ基底クラス"""
    page: int = Field(1, ge=1, description="ページ番号")
    per_page: int = Field(20, ge=1, le=100, description="1ページあたりの件数")
    sort: Optional[str] = Field(None, description="ソート順")
    q: Optional[str] = Field(None, description="フリーワード検索")


class SuccessResponse(BaseModel):
    """成功レスポンス"""
    message: str
    data: Optional[Any] = None