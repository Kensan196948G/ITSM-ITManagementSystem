"""問題管理スキーマ"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.problem import ProblemStatus, ProblemCategory, BusinessImpact, RCAPhase


class ProblemBase(BaseModel):
    """問題基底スキーマ"""

    title: str = Field(..., min_length=1, max_length=500, description="問題タイトル")
    description: Optional[str] = Field(None, description="問題詳細")
    priority: str = Field("medium", description="優先度")
    category: ProblemCategory = Field(ProblemCategory.OTHER, description="問題カテゴリ")
    business_impact: BusinessImpact = Field(
        BusinessImpact.LOW, description="ビジネス影響度"
    )
    impact_analysis: Optional[str] = Field(None, description="影響分析")
    affected_services: Optional[List[str]] = Field([], description="影響サービス")
    assignee_id: Optional[UUID] = Field(None, description="担当者ID")


class ProblemCreate(ProblemBase):
    """問題作成スキーマ"""

    related_incident_ids: Optional[List[UUID]] = Field(
        [], description="関連インシデントID一覧"
    )


class ProblemUpdate(BaseModel):
    """問題更新スキーマ"""

    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[ProblemStatus] = None
    priority: Optional[str] = None
    category: Optional[ProblemCategory] = None
    business_impact: Optional[BusinessImpact] = None
    impact_analysis: Optional[str] = None
    affected_services: Optional[List[str]] = None
    root_cause: Optional[str] = None
    permanent_solution: Optional[str] = None
    assignee_id: Optional[UUID] = None
    rca_details: Optional[Dict[str, Any]] = None


class RCAUpdate(BaseModel):
    """根本原因分析更新スキーマ"""

    analysis_type: str = Field(..., description="分析タイプ（例: 5why, fishbone）")
    phase: RCAPhase = Field(..., description="RCAフェーズ")
    root_cause: Optional[str] = Field(None, description="根本原因")
    analysis_details: Dict[str, Any] = Field(..., description="分析詳細")
    findings: Optional[List[Dict[str, Any]]] = Field([], description="調査結果")
    permanent_solution: Optional[str] = Field(None, description="恒久対策")


class RCAFindingCreate(BaseModel):
    """RCA調査結果作成スキーマ"""

    finding_type: str = Field(..., description="結果タイプ")
    description: str = Field(..., description="結果説明")
    evidence: Optional[str] = Field(None, description="根拠")
    impact: Optional[str] = Field(None, description="影響")
    recommendation: Optional[str] = Field(None, description="推奨事項")


class RCAStartRequest(BaseModel):
    """RCA開始リクエスト"""

    analysis_type: str = Field(..., description="分析手法")
    team_members: Optional[List[UUID]] = Field([], description="チームメンバー")
    initial_notes: Optional[str] = Field(None, description="初期メモ")


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
    problem_id: Optional[UUID]
    title: str
    symptoms: Optional[str]
    root_cause: Optional[str]
    workaround: Optional[str]
    solution: Optional[str]
    category: ProblemCategory
    tags: Optional[List[str]]
    search_keywords: Optional[str]
    is_published: bool
    usage_count: int
    last_used_at: Optional[datetime]
    created_by: Optional[UUID]
    updated_by: Optional[UUID]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


# 統計・分析関連スキーマ
class ProblemStatistics(BaseModel):
    """問題管理統計スキーマ"""

    total_problems: int
    by_status: Dict[str, int]
    by_priority: Dict[str, int]
    by_category: Dict[str, int]
    by_business_impact: Dict[str, int]
    avg_resolution_time: Optional[float]
    open_problems: int
    resolved_this_month: int
    rca_completion_rate: float

    class Config:
        from_attributes = True


class TrendData(BaseModel):
    """トレンドデータスキーマ"""

    period: str
    value: int
    label: str

    class Config:
        from_attributes = True


class ProblemTrends(BaseModel):
    """問題トレンドスキーマ"""

    created_trends: List[TrendData]
    resolved_trends: List[TrendData]
    category_trends: List[TrendData]
    impact_trends: List[TrendData]
    resolution_time_trends: List[TrendData]

    class Config:
        from_attributes = True


class KPIMetrics(BaseModel):
    """KPIメトリクススキーマ"""

    mttr: Optional[float]  # Mean Time To Repair
    mtbf: Optional[float]  # Mean Time Between Failures
    first_call_resolution_rate: float
    problem_recurrence_rate: float
    rca_effectiveness_score: float
    customer_satisfaction_score: Optional[float]
    sla_compliance_rate: float

    class Config:
        from_attributes = True


# 一括操作関連スキーマ
class BulkUpdateRequest(BaseModel):
    """一括更新リクエスト"""

    problem_ids: List[UUID]
    updates: ProblemUpdate

    class Config:
        from_attributes = True


class BulkDeleteRequest(BaseModel):
    """一括削除リクエスト"""

    problem_ids: List[UUID]
    reason: str

    class Config:
        from_attributes = True


class BulkOperationResult(BaseModel):
    """一括操作結果"""

    success_count: int
    failed_count: int
    failed_items: List[Dict[str, Any]]
    message: str

    class Config:
        from_attributes = True


class RCAInfo(BaseModel):
    """RCA情報スキーマ"""

    phase: RCAPhase
    started_at: Optional[datetime]
    completed_at: Optional[datetime]
    analysis_type: Optional[str]
    findings: Optional[List[Dict[str, Any]]]
    details: Optional[Dict[str, Any]]

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
    rca_info: Optional[RCAInfo]
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
    category: ProblemCategory = Field(ProblemCategory.OTHER, description="カテゴリ")
    tags: Optional[List[str]] = Field([], description="タグ")
    search_keywords: Optional[str] = Field(None, description="検索キーワード")
    is_published: bool = Field(False, description="公開フラグ")


class KnownErrorUpdate(BaseModel):
    """既知のエラー更新スキーマ"""

    title: Optional[str] = Field(None, min_length=1, max_length=500)
    symptoms: Optional[str] = None
    root_cause: Optional[str] = None
    workaround: Optional[str] = None
    solution: Optional[str] = None
    category: Optional[ProblemCategory] = None
    tags: Optional[List[str]] = None
    search_keywords: Optional[str] = None
    is_published: Optional[bool] = None
