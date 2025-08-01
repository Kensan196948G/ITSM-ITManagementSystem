"""共通モデル"""

from sqlalchemy import Column, String, Text, DateTime, UUID, ForeignKey, Integer, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.base import Base


class Category(Base):
    """カテゴリモデル"""
    __tablename__ = "categories"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(100), nullable=False)
    category_type = Column(String(50), nullable=False)  # incident, problem, change
    parent_category_id = Column(UUID(as_uuid=True), ForeignKey("categories.id"))
    description = Column(Text)
    icon = Column(String(50))
    display_order = Column(Integer, default=0)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # リレーション
    incidents = relationship("Incident", back_populates="category")
    parent = relationship("Category", remote_side=[id])


class Team(Base):
    """チームモデル"""
    __tablename__ = "teams"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(100), nullable=False)
    description = Column(Text)
    parent_team_id = Column(UUID(as_uuid=True), ForeignKey("teams.id"))
    manager_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # リレーション
    manager = relationship("User")
    incidents = relationship("Incident", back_populates="team")
    parent = relationship("Team", remote_side=[id])


class Priority(Base):
    """優先度マスタモデル"""
    __tablename__ = "priorities"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    name = Column(String(50), nullable=False)
    level = Column(Integer, nullable=False)
    color = Column(String(7))  # HEXカラーコード
    sla_response_minutes = Column(Integer)
    sla_resolution_minutes = Column(Integer)
    is_active = Column(Boolean, default=True)