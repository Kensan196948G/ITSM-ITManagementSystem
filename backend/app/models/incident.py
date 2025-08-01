"""インシデントモデル"""

from sqlalchemy import Column, String, Text, DateTime, UUID, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

from app.db.base import Base


class IncidentStatus(str, enum.Enum):
    """インシデントステータス"""
    NEW = "new"
    ASSIGNED = "assigned"
    IN_PROGRESS = "in_progress"
    RESOLVED = "resolved"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class Priority(str, enum.Enum):
    """優先度"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    CRITICAL = "critical"


class Impact(str, enum.Enum):
    """影響度"""
    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    EXTENSIVE = "extensive"


class Incident(Base):
    """インシデントモデル"""
    __tablename__ = "incidents"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    incident_number = Column(String(20), unique=True, nullable=False)
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    status = Column(SQLEnum(IncidentStatus), default=IncidentStatus.NEW, nullable=False)
    priority = Column(SQLEnum(Priority), default=Priority.MEDIUM, nullable=False)
    impact = Column(SQLEnum(Impact), default=Impact.LOW, nullable=False)
    urgency = Column(SQLEnum(Priority), default=Priority.MEDIUM, nullable=False)
    
    # 外部キー
    category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"))
    reporter_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    assignee_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"))
    
    # SLA関連
    response_due_at = Column(DateTime(timezone=True))
    resolution_due_at = Column(DateTime(timezone=True))
    responded_at = Column(DateTime(timezone=True))
    resolved_at = Column(DateTime(timezone=True))
    closed_at = Column(DateTime(timezone=True))
    
    # 解決情報
    resolution = Column(Text)
    
    # 監査情報
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    updated_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))

    # リレーション
    reporter = relationship("User", back_populates="reported_incidents", foreign_keys=[reporter_id])
    assignee = relationship("User", back_populates="assigned_incidents", foreign_keys=[assignee_id])
    category = relationship("Category", back_populates="incidents")
    team = relationship("Team", back_populates="incidents")
    histories = relationship("IncidentHistory", back_populates="incident", cascade="all, delete-orphan")
    work_notes = relationship("IncidentWorkNote", back_populates="incident", cascade="all, delete-orphan")
    attachments = relationship("IncidentAttachment", back_populates="incident", cascade="all, delete-orphan")


class IncidentHistory(Base):
    """インシデント履歴モデル"""
    __tablename__ = "incident_histories"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=False)
    field_name = Column(String(100), nullable=False)
    old_value = Column(Text)
    new_value = Column(Text)
    changed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    changed_at = Column(DateTime(timezone=True), server_default=func.now())

    # リレーション
    incident = relationship("Incident", back_populates="histories")
    user = relationship("User")


class IncidentWorkNote(Base):
    """インシデント作業ノートモデル"""
    __tablename__ = "incident_work_notes"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=False)
    note_type = Column(String(50), default="work_note", nullable=False)  # work_note, resolution_note
    content = Column(Text, nullable=False)
    is_public = Column(String(1), default="N")  # Y/N
    created_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # リレーション
    incident = relationship("Incident", back_populates="work_notes")
    user = relationship("User")


class IncidentAttachment(Base):
    """インシデント添付ファイルモデル"""
    __tablename__ = "incident_attachments"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    incident_id = Column(UUID(as_uuid=True), ForeignKey("incidents.id"), nullable=False)
    file_name = Column(String(255), nullable=False)
    file_size = Column(String(20), nullable=False)  # バイト数
    content_type = Column(String(100))
    storage_path = Column(Text, nullable=False)
    uploaded_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    uploaded_at = Column(DateTime(timezone=True), server_default=func.now())

    # リレーション
    incident = relationship("Incident", back_populates="attachments")
    user = relationship("User")