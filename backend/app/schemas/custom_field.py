"""カスタムフィールドスキーマ"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict


class CustomFieldBase(BaseModel):
    """カスタムフィールド基底スキーマ"""
    name: str = Field(..., min_length=1, max_length=100, description="フィールド名")
    field_type: str = Field(..., description="フィールドタイプ")
    is_required: bool = Field(default=False, description="必須フィールドか")
    default_value: Optional[str] = Field(None, description="デフォルト値")
    options: Optional[Dict[str, Any]] = Field(None, description="フィールドオプション")


class CustomFieldCreate(CustomFieldBase):
    """カスタムフィールド作成スキーマ"""
    pass


class CustomFieldUpdate(BaseModel):
    """カスタムフィールド更新スキーマ"""
    name: Optional[str] = Field(None, min_length=1, max_length=100, description="フィールド名")
    field_type: Optional[str] = Field(None, description="フィールドタイプ")
    is_required: Optional[bool] = Field(None, description="必須フィールドか")
    default_value: Optional[str] = Field(None, description="デフォルト値")
    options: Optional[Dict[str, Any]] = Field(None, description="フィールドオプション")


class CustomFieldResponse(CustomFieldBase):
    """カスタムフィールドレスポンススキーマ"""
    model_config = ConfigDict(from_attributes=True)
    
    id: UUID = Field(..., description="カスタムフィールドID")
    created_at: datetime = Field(..., description="作成日時")
    updated_at: datetime = Field(..., description="更新日時")


class CustomFieldListResponse(BaseModel):
    """カスタムフィールド一覧レスポンススキーマ"""
    items: List[CustomFieldResponse] = Field(..., description="カスタムフィールド一覧")
    total: int = Field(..., description="総件数")
    page: int = Field(..., description="ページ番号")
    size: int = Field(..., description="ページサイズ")
    pages: int = Field(..., description="総ページ数")