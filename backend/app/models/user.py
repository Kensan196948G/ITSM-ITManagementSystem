"""ユーザーモデル"""

from sqlalchemy import Boolean, Column, String, DateTime, Text, UUID
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship

from app.db.base import Base


class User(Base):
    """ユーザーモデル"""
    __tablename__ = "users"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=func.gen_random_uuid())
    tenant_id = Column(UUID(as_uuid=True), nullable=False)
    employee_id = Column(String(50), unique=True, nullable=False)
    email = Column(String(255), unique=True, nullable=False, index=True)
    username = Column(String(100), unique=True, nullable=False)
    first_name = Column(String(100), nullable=False)
    last_name = Column(String(100), nullable=False)
    display_name = Column(String(200))
    phone = Column(String(50))
    mobile = Column(String(50))
    timezone = Column(String(50), default="Asia/Tokyo")
    locale = Column(String(10), default="ja_JP")
    is_active = Column(Boolean, default=True)
    last_login_at = Column(DateTime(timezone=True))
    password_hash = Column(String(255))
    mfa_enabled = Column(Boolean, default=False)
    mfa_secret = Column(String(255))
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())
    deleted_at = Column(DateTime(timezone=True))

    # リレーション
    reported_incidents = relationship("Incident", back_populates="reporter", foreign_keys="Incident.reporter_id")
    assigned_incidents = relationship("Incident", back_populates="assignee", foreign_keys="Incident.assignee_id")
    problems = relationship("Problem", back_populates="assignee")
    
    @property
    def full_name(self) -> str:
        """フルネームを返す"""
        return f"{self.first_name} {self.last_name}"