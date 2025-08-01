"""チームモデル"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.db.base import Base
from app.models.common import UUID


class Team(Base):
    """チームモデル"""

    __tablename__ = "teams"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    manager_id = Column(UUID(), ForeignKey("users.id"))
    parent_team_id = Column(UUID(), ForeignKey("teams.id"))
    is_active = Column(Boolean, default=True)

    # 監査情報
    created_by = Column(UUID(), ForeignKey("users.id"))
    updated_by = Column(UUID(), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at = Column(DateTime(timezone=True))

    # リレーション
    manager = relationship("User", foreign_keys=[manager_id])
    parent_team = relationship("Team", remote_side=[id], back_populates="child_teams")
    child_teams = relationship("Team", back_populates="parent_team")
    incidents = relationship("Incident", back_populates="team")


class TeamMember(Base):
    """チームメンバーモデル"""

    __tablename__ = "team_members"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(), ForeignKey("teams.id"), nullable=False)
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    role = Column(String(50), default="member")  # member, lead, admin
    is_active = Column(Boolean, default=True)
    joined_at = Column(DateTime(timezone=True), server_default=func.now())
    left_at = Column(DateTime(timezone=True))

    # リレーション
    team = relationship("Team")
    user = relationship("User")
