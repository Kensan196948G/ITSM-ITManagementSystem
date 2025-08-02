"""インシデントスキーマ"""

from datetime import datetime
from typing import Optional, List
from uuid import UUID

from pydantic import BaseModel, Field, ConfigDict

from app.models.incident import IncidentStatus, Priority, Impact


class IncidentBase(BaseModel):
    """インシデント基底スキーマ"""
    title: str = Field(..., min_length=1, max_length=500, description="インシデントタイトル")
    description: Optional[str] = Field(None, description="インシデント詳細")
    priority: Priority = Field(Priority.MEDIUM, description="優先度")
    impact: Impact = Field(Impact.LOW, description="影響度")
    urgency: Priority = Field(Priority.MEDIUM, description="緊急度")
    category_id: Optional[UUID] = Field(None, description="カテゴリID")
    assignee_id: Optional[UUID] = Field(None, description="担当者ID")
    team_id: Optional[UUID] = Field(None, description="チームID")


class IncidentCreate(IncidentBase):
    """インシデント作成スキーマ"""
    reporter_id: UUID = Field(..., description="報告者ID")


class IncidentUpdate(BaseModel):
    """インシデント更新スキーマ"""
    title: Optional[str] = Field(None, min_length=1, max_length=500)
    description: Optional[str] = None
    status: Optional[IncidentStatus] = None
    priority: Optional[Priority] = None
    impact: Optional[Impact] = None
    urgency: Optional[Priority] = None
    assignee_id: Optional[UUID] = None
    team_id: Optional[UUID] = None
    resolution: Optional[str] = None


class UserInfo(BaseModel):
    """ユーザー情報スキーマ"""
    id: UUID
    display_name: Optional[str]
    email: str

    model_config = ConfigDict(from_attributes=True)


class CategoryInfo(BaseModel):
    """カテゴリ情報スキーマ"""
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class TeamInfo(BaseModel):
    """チーム情報スキーマ"""
    id: UUID
    name: str

    model_config = ConfigDict(from_attributes=True)


class SLAInfo(BaseModel):
    """SLA情報スキーマ"""
    response_due: Optional[datetime]
    resolution_due: Optional[datetime]
    response_met: Optional[bool]
    resolution_met: Optional[bool]


class IncidentResponse(IncidentBase):
    """インシデントレスポンススキーマ"""
    id: UUID
    incident_number: str
    status: IncidentStatus
    reporter: Optional[UserInfo]
    assignee: Optional[UserInfo]
    category: Optional[CategoryInfo]
    team: Optional[TeamInfo]
    response_due_at: Optional[datetime]
    resolution_due_at: Optional[datetime]
    responded_at: Optional[datetime]
    resolved_at: Optional[datetime]
    closed_at: Optional[datetime]
    resolution: Optional[str]
    created_at: datetime
    updated_at: datetime
    sla: SLAInfo

    model_config = ConfigDict(from_attributes=True)


class IncidentListResponse(BaseModel):
    """インシデント一覧レスポンススキーマ"""
    data: List[IncidentResponse]
    meta: dict
    links: Optional[dict] = None


class IncidentWorkNoteBase(BaseModel):
    """作業ノート基底スキーマ"""
    content: str = Field(..., min_length=1, description="ノート内容")
    note_type: str = Field("work_note", description="ノートタイプ")
    is_public: bool = Field(False, description="公開フラグ")


class IncidentWorkNoteCreate(IncidentWorkNoteBase):
    """作業ノート作成スキーマ"""
    pass


class IncidentWorkNoteResponse(IncidentWorkNoteBase):
    """作業ノートレスポンススキーマ"""
    id: UUID
    incident_id: UUID
    user: UserInfo
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentHistoryResponse(BaseModel):
    """インシデント履歴レスポンススキーマ"""
    id: UUID
    incident_id: UUID
    field_name: str
    old_value: Optional[str]
    new_value: Optional[str]
    user: UserInfo
    changed_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentAttachmentResponse(BaseModel):
    """インシデント添付ファイルレスポンススキーマ"""
    id: UUID
    incident_id: UUID
    file_name: str
    file_size: str
    content_type: Optional[str]
    uploaded_by: UserInfo
    uploaded_at: datetime

    model_config = ConfigDict(from_attributes=True)


class RelatedIncidentInfo(BaseModel):
    """関連インシデント情報スキーマ"""
    id: UUID
    incident_number: str
    title: str
    status: IncidentStatus
    priority: Priority
    created_at: datetime

    model_config = ConfigDict(from_attributes=True)


class IncidentDetailResponse(IncidentResponse):
    """インシデント詳細レスポンススキーマ（詳細パネル用）"""
    # 基本情報は IncidentResponse から継承
    
    # 詳細情報
    work_notes: List[IncidentWorkNoteResponse] = Field(default_factory=list)
    histories: List[IncidentHistoryResponse] = Field(default_factory=list)
    attachments: List[IncidentAttachmentResponse] = Field(default_factory=list)
    related_incidents: List[RelatedIncidentInfo] = Field(default_factory=list)
    
    # 統計情報
    stats: dict = Field(default_factory=dict)
    
    # カスタムフィールド
    custom_fields: dict = Field(default_factory=dict)
    
    # メタデータ
    metadata: dict = Field(default_factory=dict)


class IncidentTimelineEntry(BaseModel):
    """インシデントタイムラインエントリ"""
    id: UUID
    type: str  # 'status_change', 'assignment', 'work_note', 'attachment'
    title: str
    description: Optional[str]
    user: UserInfo
    timestamp: datetime
    details: Optional[dict] = None


class IncidentTimelineResponse(BaseModel):
    """インシデントタイムラインレスポンス"""
    incident_id: UUID
    timeline: List[IncidentTimelineEntry]
    total_count: int


class IncidentFieldUpdate(BaseModel):
    """インシデントフィールド更新スキーマ"""
    field_name: str = Field(..., description="更新対象フィールド名")
    field_value: Optional[str] = Field(None, description="新しい値")
    comment: Optional[str] = Field(None, description="更新理由・コメント")


class IncidentBulkUpdate(BaseModel):
    """インシデント一括更新スキーマ"""
    incident_ids: List[UUID] = Field(..., min_items=1, max_items=100, description="更新対象インシデントID一覧")
    updates: Dict[str, Any] = Field(..., description="更新内容")
    comment: Optional[str] = Field(None, description="一括更新理由")


class CustomFieldUpdate(BaseModel):
    """カスタムフィールド更新スキーマ"""
    field_key: str = Field(..., description="カスタムフィールドキー")
    field_value: Optional[str] = Field(None, description="カスタムフィールド値")
    field_type: str = Field("text", description="フィールドタイプ")  # text, number, date, select, multiselect
    
    
class IncidentCustomFieldsUpdate(BaseModel):
    """インシデントカスタムフィールド更新スキーマ"""
    custom_fields: List[CustomFieldUpdate] = Field(..., description="カスタムフィールド一覧")