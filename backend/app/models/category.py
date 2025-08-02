"""カテゴリモデル"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.db.base import Base
from app.models.common import UUID


class Category(Base):
    """カテゴリモデル"""

    __tablename__ = "categories"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    tenant_id = Column(UUID(), nullable=False)
    name = Column(String(200), nullable=False)
    description = Column(Text)
    parent_id = Column(UUID(), ForeignKey("categories.id"))
    is_active = Column(Boolean, default=True)
    sort_order = Column(String(10), default="0")

    # 監査情報
    created_by = Column(UUID(), ForeignKey("users.id"))
    updated_by = Column(UUID(), ForeignKey("users.id"))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at = Column(DateTime(timezone=True))

    # リレーション
    parent = relationship("Category", remote_side=[id], back_populates="children")
    children = relationship("Category", back_populates="parent")
    incidents = relationship("Incident", back_populates="category")
