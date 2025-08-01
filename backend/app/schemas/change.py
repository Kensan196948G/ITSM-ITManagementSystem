"""変更管理スキーマ"""

from datetime import datetime
from typing import Optional, List, Dict, Any
from uuid import UUID

from pydantic import BaseModel, Field

from app.models.change import ChangeType, ChangeStatus, RiskLevel


class ChangeBase(BaseModel):
    """変更基底スキーマ"""
    title: str = Field(..., min_length=1, max_length=500, description="変更タイトル")
    type: ChangeType = Field(ChangeType.NORMAL, description="変更タイプ")
    description: Optional[str] = Field(None, description="変更詳細")
    justification: Optional[str] = Field(None, description="変更理由")
    risk_level: RiskLevel = Field(RiskLevel.MEDIUM, description="リスクレベル")
    implementation_plan: Optional[str] = Field(None, description="実施計画")
    rollback_plan: Optional[str] = Field(None, description="ロールバック計画")
    test_plan: Optional[str] = Field(None, description="テスト計画")
    scheduled_start: Optional[datetime] = Field(None, description="予定開始日時")
    scheduled_end: Optional[datetime] = Field(None, description="予定終了日時")
    implementer_id: Optional[UUID] = Field(None, description="実施者ID")
    cab_required: bool = Field(False, description="CAB承認必要フラグ")


class ChangeCreate(ChangeBase):
    """変更作成スキーマ"""
    requester_id: UUID = Field(..., description="要求者ID")
    affected_ci_ids: Optional[List[UUID]] = Field([], description="影響するCI ID一覧")
    approvers: Optional[List[UUID]] = Field([], description="承認者ID一覧")


class ChangeUpdate(BaseModel):
    """変更更新スキーマ"""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[ChangeStatus] = None
    risk_level: Optional[RiskLevel] = None
    implementation_plan: Optional[str] = None
    rollback_plan: Optional[str] = None
    test_plan: Optional[str] = None
    scheduled_start: Optional[datetime] = None
    scheduled_end: Optional[datetime] = None
    actual_start: Optional[datetime] = None
    actual_end: Optional[datetime] = None
    implementer_id: Optional[UUID] = None


class ChangeApprovalRequest(BaseModel):
    """変更承認リクエストスキーマ"""
    decision: str = Field(..., description="承認決定（approved, rejected）")
    comments: Optional[str] = Field(None, description="承認コメント")
    conditions: Optional[List[str]] = Field([], description="承認条件")


class UserInfo(BaseModel):
    """ユーザー情報スキーマ"""
    id: UUID
    display_name: Optional[str]
    email: str

    class Config:
        from_attributes = True


class ChangeApprovalResponse(BaseModel):
    """変更承認レスポンススキーマ"""
    id: UUID
    approver: UserInfo
    decision: Optional[str]
    comments: Optional[str]
    decided_at: Optional[datetime]
    approval_order: int

    class Config:
        from_attributes = True


class ChangeTaskResponse(BaseModel):
    """変更タスクレスポンススキーマ"""
    id: UUID
    task_name: str
    description: Optional[str]
    assignee: Optional[UserInfo]
    status: str
    scheduled_start: Optional[datetime]
    scheduled_end: Optional[datetime]
    actual_start: Optional[datetime]
    actual_end: Optional[datetime]
    order_sequence: int

    class Config:
        from_attributes = True


class RiskAssessment(BaseModel):
    """リスク評価スキーマ"""
    level: RiskLevel
    impact: Optional[str]
    likelihood: Optional[str]


class ChangeResponse(ChangeBase):
    """変更レスポンススキーマ"""
    id: UUID
    change_number: str
    status: ChangeStatus
    requester: Optional[UserInfo]
    implementer: Optional[UserInfo]
    actual_start: Optional[datetime]
    actual_end: Optional[datetime]
    approvals: Optional[List[ChangeApprovalResponse]]
    tasks: Optional[List[ChangeTaskResponse]]
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True


class ChangeListResponse(BaseModel):
    """変更一覧レスポンススキーマ"""
    data: List[ChangeResponse]
    meta: dict
    links: Optional[dict] = None


class ChangeCalendarItem(BaseModel):
    """変更カレンダーアイテムスキーマ"""
    id: UUID
    change_number: str
    title: str
    type: ChangeType
    risk_level: RiskLevel
    scheduled_start: Optional[datetime]
    scheduled_end: Optional[datetime]
    status: ChangeStatus
    affected_services: Optional[List[str]]


class ChangeCalendarResponse(BaseModel):
    """変更カレンダーレスポンススキーマ"""
    data: List[ChangeCalendarItem]


class ChangeTaskCreate(BaseModel):
    """変更タスク作成スキーマ"""
    task_name: str = Field(..., min_length=1, max_length=500, description="タスク名")
    description: Optional[str] = Field(None, description="タスク詳細")
    assignee_id: Optional[UUID] = Field(None, description="担当者ID")
    scheduled_start: Optional[datetime] = Field(None, description="予定開始日時")
    scheduled_end: Optional[datetime] = Field(None, description="予定終了日時")
    order_sequence: int = Field(1, description="実行順序")