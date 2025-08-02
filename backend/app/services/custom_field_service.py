"""カスタムフィールドサービス"""

from typing import List, Optional, Dict, Any
from uuid import UUID

from sqlalchemy.orm import Session
from app.models.common import CustomField
from app.schemas.custom_field import (
    CustomFieldCreate,
    CustomFieldUpdate,
    CustomFieldResponse,
)


class CustomFieldService:
    """カスタムフィールドサービス"""

    def __init__(self, db: Session):
        self.db = db

    def create_custom_field(self, custom_field_data: CustomFieldCreate) -> CustomField:
        """カスタムフィールドを作成"""
        custom_field = CustomField(**custom_field_data.model_dump())
        self.db.add(custom_field)
        self.db.commit()
        self.db.refresh(custom_field)
        return custom_field

    def get_custom_field(self, field_id: UUID) -> Optional[CustomField]:
        """カスタムフィールドを取得"""
        return self.db.query(CustomField).filter(CustomField.id == field_id).first()

    def get_custom_fields(self, skip: int = 0, limit: int = 100) -> List[CustomField]:
        """カスタムフィールド一覧を取得"""
        return self.db.query(CustomField).offset(skip).limit(limit).all()

    def update_custom_field(
        self, field_id: UUID, field_data: CustomFieldUpdate
    ) -> Optional[CustomField]:
        """カスタムフィールドを更新"""
        custom_field = self.get_custom_field(field_id)
        if not custom_field:
            return None

        update_data = field_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(custom_field, field, value)

        self.db.commit()
        self.db.refresh(custom_field)
        return custom_field

    def delete_custom_field(self, field_id: UUID) -> bool:
        """カスタムフィールドを削除"""
        custom_field = self.get_custom_field(field_id)
        if not custom_field:
            return False

        self.db.delete(custom_field)
        self.db.commit()
        return True
