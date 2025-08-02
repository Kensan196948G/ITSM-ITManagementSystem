"""問題管理モデル"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Enum as SQLEnum
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import enum

import uuid

from app.db.base import Base
from app.models.common import UUID


class ProblemStatus(str, enum.Enum):
    """問題ステータス"""
    DRAFT = "draft"
    UNDER_INVESTIGATION = "under_investigation"
    ROOT_CAUSE_ANALYSIS = "root_cause_analysis"
    SOLUTION_DEVELOPMENT = "solution_development"
    SOLUTION_TESTING = "solution_testing"
    RESOLVED = "resolved"
    CLOSED = "closed"
    CANCELLED = "cancelled"


class ProblemCategory(str, enum.Enum):
    """問題カテゴリ"""
    SOFTWARE = "software"
    HARDWARE = "hardware"
    NETWORK = "network"
    SECURITY = "security"
    PROCESS = "process"
    USER_ERROR = "user_error"
    EXTERNAL = "external"
    OTHER = "other"


class BusinessImpact(str, enum.Enum):
    """ビジネス影響度"""
    CRITICAL = "critical"  # サービス完全停止
    HIGH = "high"      # 主要機能停止
    MEDIUM = "medium"    # 一部機能制限
    LOW = "low"        # 軽微な影響
    NONE = "none"      # 影響なし


class RCAPhase(str, enum.Enum):
    """RCAフェーズ"""
    NOT_STARTED = "not_started"
    DATA_COLLECTION = "data_collection"
    ANALYSIS = "analysis"
    ROOT_CAUSE_IDENTIFICATION = "root_cause_identification"
    SOLUTION_PLANNING = "solution_planning"
    COMPLETED = "completed"


class Problem(Base):
    """問題モデル"""
    __tablename__ = "problems"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    problem_number = Column(String(20), unique=True, nullable=False)
    tenant_id = Column(UUID(), nullable=False)
    title = Column(String(500), nullable=False)
    description = Column(Text)
    status = Column(SQLEnum(ProblemStatus), default=ProblemStatus.DRAFT, nullable=False)
    priority = Column(String(20), default="medium", nullable=False)
    category = Column(SQLEnum(ProblemCategory), default=ProblemCategory.OTHER, nullable=False)
    business_impact = Column(SQLEnum(BusinessImpact), default=BusinessImpact.LOW, nullable=False)
    impact_analysis = Column(Text)
    root_cause = Column(Text)
    permanent_solution = Column(Text)
    assignee_id = Column(UUID(), ForeignKey("users.id"))
    rca_phase = Column(SQLEnum(RCAPhase), default=RCAPhase.NOT_STARTED, nullable=False)
    rca_details = Column(Text)  # JSON形式のRCA詳細
    rca_started_at = Column(DateTime(timezone=True))
    rca_completed_at = Column(DateTime(timezone=True))
    rca_findings = Column(Text)  # JSON形式のRCA調査結果
    affected_services = Column(Text)  # JSON形式の影響サービス一覧
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # リレーション
    assignee = relationship("User", back_populates="problems")
    related_incidents = relationship("ProblemIncident", back_populates="problem")
    known_errors = relationship("KnownError", back_populates="problem", cascade="all, delete-orphan")


class ProblemIncident(Base):
    """問題とインシデントの関連モデル"""
    __tablename__ = "problem_incidents"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    problem_id = Column(UUID(), ForeignKey("problems.id"), nullable=False)
    incident_id = Column(UUID(), ForeignKey("incidents.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # リレーション
    problem = relationship("Problem", back_populates="related_incidents")
    incident = relationship("Incident")


class KnownError(Base):
    """既知のエラーモデル"""
    __tablename__ = "known_errors"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    problem_id = Column(UUID(), ForeignKey("problems.id"), nullable=False)
    title = Column(String(500), nullable=False)
    symptoms = Column(Text)
    root_cause = Column(Text)
    workaround = Column(Text)
    solution = Column(Text)
    category = Column(SQLEnum(ProblemCategory), default=ProblemCategory.OTHER, nullable=False)
    tags = Column(Text)  # JSON形式のタグ一覧
    search_keywords = Column(Text)  # 検索用キーワード
    is_published = Column(String(1), default="N")  # Y/N
    usage_count = Column(String(10), default="0")
    last_used_at = Column(DateTime(timezone=True))
    created_by = Column(UUID(), ForeignKey("users.id"))
    updated_by = Column(UUID(), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # リレーション
    problem = relationship("Problem", back_populates="known_errors")
    creator = relationship("User", foreign_keys=[created_by])
    updater = relationship("User", foreign_keys=[updated_by])