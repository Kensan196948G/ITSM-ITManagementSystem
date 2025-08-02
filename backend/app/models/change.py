"""変更管理モデル"""

from sqlalchemy import (
    Column,
    String,
    Text,
    DateTime,
    ForeignKey,
    Enum as SQLEnum,
    Integer,
)
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

import uuid

from app.db.base import Base
from app.models.common import UUID


class ChangeType(str, enum.Enum):
    """変更タイプ"""

    STANDARD = "standard"
    NORMAL = "normal"
    EMERGENCY = "emergency"


class ChangeStatus(str, enum.Enum):
    """変更ステータス"""

    DRAFT = "draft"
    SUBMITTED = "submitted"
    UNDER_REVIEW = "under_review"
    APPROVED = "approved"
    REJECTED = "rejected"
    SCHEDULED = "scheduled"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


class RiskLevel(str, enum.Enum):
    """リスクレベル"""

    LOW = "low"
    MEDIUM = "medium"
    HIGH = "high"
    VERY_HIGH = "very_high"


class Change(Base):
    """変更要求モデル"""

    __tablename__ = "changes"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    change_number = Column(String(20), unique=True, nullable=False)
    tenant_id = Column(UUID(), nullable=False)
    title = Column(String(500), nullable=False)
    type = Column(SQLEnum(ChangeType), default=ChangeType.NORMAL, nullable=False)
    description = Column(Text)
    justification = Column(Text)
    status = Column(SQLEnum(ChangeStatus), default=ChangeStatus.DRAFT, nullable=False)
    risk_level = Column(SQLEnum(RiskLevel), default=RiskLevel.MEDIUM, nullable=False)
    implementation_plan = Column(Text)
    rollback_plan = Column(Text)
    test_plan = Column(Text)

    # スケジュール
    scheduled_start = Column(DateTime(timezone=True))
    scheduled_end = Column(DateTime(timezone=True))
    actual_start = Column(DateTime(timezone=True))
    actual_end = Column(DateTime(timezone=True))

    # 担当者
    requester_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    implementer_id = Column(UUID(), ForeignKey("users.id"))

    # CAB（Change Advisory Board）
    cab_required = Column(String(1), default="N")  # Y/N

    # 監査情報
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )

    # リレーション
    requester = relationship("User", foreign_keys=[requester_id])
    implementer = relationship("User", foreign_keys=[implementer_id])
    approvals = relationship(
        "ChangeApproval", back_populates="change", cascade="all, delete-orphan"
    )
    tasks = relationship(
        "ChangeTask", back_populates="change", cascade="all, delete-orphan"
    )


class ChangeApproval(Base):
    """変更承認モデル"""

    __tablename__ = "change_approvals"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    change_id = Column(UUID(), ForeignKey("changes.id"), nullable=False)
    approver_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    decision = Column(String(20))  # approved, rejected, pending
    comments = Column(Text)
    decided_at = Column(DateTime(timezone=True))
    approval_order = Column(Integer, default=1)

    # リレーション
    change = relationship("Change", back_populates="approvals")
    approver = relationship("User")


class ChangeTask(Base):
    """変更タスクモデル"""

    __tablename__ = "change_tasks"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    change_id = Column(UUID(), ForeignKey("changes.id"), nullable=False)
    task_name = Column(String(500), nullable=False)
    description = Column(Text)
    assignee_id = Column(UUID(), ForeignKey("users.id"))
    status = Column(String(20), default="pending")  # pending, in_progress, completed
    scheduled_start = Column(DateTime(timezone=True))
    scheduled_end = Column(DateTime(timezone=True))
    actual_start = Column(DateTime(timezone=True))
    actual_end = Column(DateTime(timezone=True))
    order_sequence = Column(Integer, default=1)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # リレーション
    change = relationship("Change", back_populates="tasks")
    assignee = relationship("User")
