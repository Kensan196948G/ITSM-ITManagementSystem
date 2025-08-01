"""問題管理スキーマ"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.problem import ProblemStatus


class ProblemBase(BaseModel):
    """問題基底スキーマ"""
    title: str = Field(..., min_length=1, max_length=500, description="問題タイトル")
    description: Optional[str] = Field(None, description="問題詳細")
    priority: str = Field("medium", description="優先度")
    impact_analysis: Optional[str] = Field(None, description="影響分析")
    assignee_id: Optional[UUID] = Field(None, description="担当者ID")


class ProblemCreate(ProblemBase):
    """問題作成スキーマ"""
    related_incident_ids: Optional[List[UUID]] = Field([], description="関連インシデントID一覧")


class ProblemUpdate(BaseModel):
    """問題更新スキーマ"""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[ProblemStatus] = None
    priority: Optional[str] = None
    impact_analysis: Optional[str] = None
    root_cause: Optional[str] = None
    permanent_solution: Optional[str] = None
    assignee_id: Optional[UUID] = None
    rca_details: Optional[Dict[str, Any]] = None


class RCAUpdate(BaseModel):
    """根本原因分析更新スキーマ"""
    analysis_type: str = Field(..., description="分析タイプ（例: 5why, fishbone）")
    root_cause: str = Field(..., description="根本原因")
    analysis_details: Dict[str, Any] = Field(..., description="分析詳細")
    permanent_solution: str = Field(..., description="恒久対策")


class UserInfo(BaseModel):
    """ユーザー情報スキーマ"""
    id: UUID
    display_name: Optional[str]
    email: str

    class Config:
        from_attributes = True


class RelatedIncident(BaseModel):
    """関連インシデントスキーマ"""
    id: UUID
    incident_number: str
    title: str
    status: str

    class Config:
        from_attributes = True


class KnownErrorResponse(BaseModel):
    """既知のエラーレスポンススキーマ"""
    id: UUID
    title: str
    symptoms: Optional[str]
    root_cause: Optional[str]
    workaround: Optional[str]
    solution: Optional[str]
    is_published: bool
    usage_count: int
    created_at: datetime

    class Config:
        from_attributes = True


class ProblemResponse(ProblemBase):
    """問題レスポンススキーマ"""
    id: UUID
    problem_number: str
    status: ProblemStatus
    root_cause: Optional[str]
    permanent_solution: Optional[str]
    assignee: Optional[UserInfo]
    rca_details: Optional[Dict[str, Any]]
    related_incidents: Optional[List[RelatedIncident]]
    known_errors: Optional[List[KnownErrorResponse]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ProblemListResponse(BaseModel):
    """問題一覧レスポンススキーマ"""
    data: List[ProblemResponse]
    meta: dict
    links: Optional[dict] = None


class KnownErrorCreate(BaseModel):
    """既知のエラー作成スキーマ"""
    title: str = Field(..., min_length=1, max_length=500, description="タイトル")
    symptoms: Optional[str] = Field(None, description="症状")
    root_cause: Optional[str] = Field(None, description="根本原因")
    workaround: Optional[str] = Field(None, description="回避策")
    solution: Optional[str] = Field(None, description="解決策")
    is_published: bool = Field(False, description="公開フラグ")