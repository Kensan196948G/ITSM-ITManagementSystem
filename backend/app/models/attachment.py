"""添付ファイルモデル"""

from sqlalchemy import Column, String, Text, DateTime, ForeignKey, Integer, Boolean
from sqlalchemy.sql import func
from sqlalchemy.orm import relationship
import uuid

from app.db.base import Base
from app.models.common import UUID


class Attachment(Base):
    """添付ファイルモデル"""

    __tablename__ = "attachments"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    resource_type = Column(
        String(50), nullable=False
    )  # incidents, problems, changes, users
    resource_id = Column(UUID(), nullable=False)

    # ファイル情報
    original_filename = Column(String(255), nullable=False)
    stored_filename = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_size = Column(Integer, nullable=False)  # バイト数
    content_type = Column(String(100))
    file_hash = Column(String(64))  # SHA256ハッシュ

    # メタデータ
    description = Column(Text)
    tags = Column(String(500))  # カンマ区切りのタグ

    # アクセス制御
    is_public = Column(Boolean, default=False)
    access_level = Column(String(20), default="private")  # private, internal, public

    # 監査情報
    uploaded_by = Column(UUID(), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(
        DateTime(timezone=True), server_default=func.now(), onupdate=func.now()
    )
    deleted_at = Column(DateTime(timezone=True))
    deleted_by = Column(UUID(), ForeignKey("users.id"))

    # リレーション
    uploader = relationship(
        "User", back_populates="uploaded_attachments", foreign_keys=[uploaded_by]
    )
    deleter = relationship("User", foreign_keys=[deleted_by])
    scan_results = relationship(
        "AttachmentScanResult",
        back_populates="attachment",
        cascade="all, delete-orphan",
    )
    access_logs = relationship(
        "AttachmentAccessLog", back_populates="attachment", cascade="all, delete-orphan"
    )


class AttachmentScanResult(Base):
    """添付ファイルスキャン結果モデル"""

    __tablename__ = "attachment_scan_results"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    attachment_id = Column(UUID(), ForeignKey("attachments.id"), nullable=False)

    # スキャン情報
    scan_status = Column(
        String(20), nullable=False
    )  # clean, infected, suspicious, error
    scan_engine = Column(String(50))
    engine_version = Column(String(50))
    scanned_at = Column(DateTime(timezone=True))

    # 結果情報
    threats_found = Column(Integer, default=0)
    threat_names = Column(Text)  # JSON形式の脅威名リスト
    scan_details = Column(Text)  # JSON形式の詳細情報

    # 監査情報
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # リレーション
    attachment = relationship("Attachment", back_populates="scan_results")


class AttachmentAccessLog(Base):
    """添付ファイルアクセスログモデル"""

    __tablename__ = "attachment_access_logs"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    attachment_id = Column(UUID(), ForeignKey("attachments.id"), nullable=False)

    # アクセス情報
    user_id = Column(UUID(), ForeignKey("users.id"), nullable=False)
    action_type = Column(String(20), nullable=False)  # download, preview, view_info
    client_ip = Column(String(45))  # IPv6対応
    user_agent = Column(Text)

    # 監査情報
    accessed_at = Column(DateTime(timezone=True), server_default=func.now())

    # リレーション
    attachment = relationship("Attachment", back_populates="access_logs")
    user = relationship("User")


class AttachmentVersion(Base):
    """添付ファイルバージョン履歴モデル"""

    __tablename__ = "attachment_versions"

    id = Column(UUID(), primary_key=True, default=uuid.uuid4)
    attachment_id = Column(UUID(), ForeignKey("attachments.id"), nullable=False)

    # バージョン情報
    version_number = Column(Integer, nullable=False)
    version_comment = Column(Text)

    # ファイル情報（バージョン固有）
    stored_filename = Column(String(255), nullable=False)
    file_path = Column(Text, nullable=False)
    file_size = Column(Integer, nullable=False)
    file_hash = Column(String(64))

    # 監査情報
    created_by = Column(UUID(), ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # リレーション
    attachment = relationship("Attachment")
    creator = relationship("User")
