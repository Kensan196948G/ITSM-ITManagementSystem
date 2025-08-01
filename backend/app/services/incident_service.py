"""インシデント管理サービス"""

from datetime import datetime
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func
from fastapi import HTTPException, status

from app.models.incident import Incident, IncidentHistory, IncidentWorkNote, IncidentStatus
from app.schemas.incident import (
    IncidentCreate, IncidentUpdate, IncidentResponse, 
    IncidentWorkNoteCreate, IncidentWorkNoteResponse
)
from app.schemas.common import PaginationMeta, PaginationLinks

logger = logging.getLogger(__name__)


class IncidentService:
    """インシデント管理サービスクラス"""

    def __init__(self, db: Session):
        self.db = db

    def create_incident(self, incident_data: IncidentCreate, current_user_id: UUID) -> IncidentResponse:
        """インシデントを作成する"""
        try:
            # インシデント番号を生成
            incident_number = self._generate_incident_number()
            
            # インシデントを作成
            db_incident = Incident(
                incident_number=incident_number,
                tenant_id=self._get_user_tenant_id(current_user_id),
                title=incident_data.title,
                description=incident_data.description,
                priority=incident_data.priority,
                impact=incident_data.impact,
                urgency=incident_data.urgency,
                category_id=incident_data.category_id,
                reporter_id=incident_data.reporter_id,
                assignee_id=incident_data.assignee_id,
                team_id=incident_data.team_id,
                created_by=current_user_id,
                updated_by=current_user_id
            )
            
            # SLA期限を設定
            self._set_sla_dates(db_incident)
            
            self.db.add(db_incident)
            self.db.commit()
            self.db.refresh(db_incident)
            
            # 履歴を記録
            self._record_history(db_incident.id, "created", None, "new", current_user_id)
            
            logger.info(f"Incident created: {incident_number} by user {current_user_id}")
            
            return self._build_incident_response(db_incident)
            
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating incident: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="インシデントの作成中にエラーが発生しました"
            )

    def get_incident(self, incident_id: UUID, current_user_id: UUID) -> IncidentResponse:
        """インシデントを取得する"""
        incident = self._get_incident_by_id(incident_id, current_user_id)
        return self._build_incident_response(incident)

    def update_incident(
        self, 
        incident_id: UUID, 
        incident_data: IncidentUpdate, 
        current_user_id: UUID
    ) -> IncidentResponse:
        """インシデントを更新する"""
        try:
            incident = self._get_incident_by_id(incident_id, current_user_id)
            
            # 変更履歴を記録するため、更新前の値を保存
            old_values = {
                "status": incident.status,
                "priority": incident.priority,
                "assignee_id": incident.assignee_id
            }
            
            # フィールドを更新
            update_data = incident_data.model_dump(exclude_unset=True)
            for field, value in update_data.items():
                if hasattr(incident, field):
                    setattr(incident, field, value)
            
            incident.updated_by = current_user_id
            
            # ステータス変更時の特別処理
            if incident_data.status and incident_data.status != old_values["status"]:
                self._handle_status_change(incident, incident_data.status)
            
            self.db.commit()
            self.db.refresh(incident)
            
            # 履歴を記録
            self._record_changes(incident.id, old_values, update_data, current_user_id)
            
            logger.info(f"Incident updated: {incident.incident_number} by user {current_user_id}")
            
            return self._build_incident_response(incident)
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating incident {incident_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="インシデントの更新中にエラーが発生しました"
            )

    def list_incidents(
        self, 
        current_user_id: UUID,
        page: int = 1,
        per_page: int = 20,
        status: Optional[List[str]] = None,
        priority: Optional[List[str]] = None,
        assignee_id: Optional[UUID] = None,
        category_id: Optional[UUID] = None,
        q: Optional[str] = None,
        sort: Optional[str] = None
    ) -> Dict[str, Any]:
        """インシデント一覧を取得する"""
        try:
            # ベースクエリ
            query = self.db.query(Incident).filter(
                and_(
                    Incident.tenant_id == self._get_user_tenant_id(current_user_id),
                    Incident.deleted_at.is_(None)
                )
            )
            
            # フィルター適用
            if status:
                query = query.filter(Incident.status.in_(status))
            
            if priority:
                query = query.filter(Incident.priority.in_(priority))
            
            if assignee_id:
                query = query.filter(Incident.assignee_id == assignee_id)
            
            if category_id:
                query = query.filter(Incident.category_id == category_id)
            
            if q:
                search_term = f"%{q}%"
                query = query.filter(
                    or_(
                        Incident.title.ilike(search_term),
                        Incident.description.ilike(search_term),
                        Incident.incident_number.ilike(search_term)
                    )
                )
            
            # ソート
            if sort:
                if sort.startswith("-"):
                    field = sort[1:]
                    if hasattr(Incident, field):
                        query = query.order_by(desc(getattr(Incident, field)))
                else:
                    if hasattr(Incident, sort):
                        query = query.order_by(asc(getattr(Incident, sort)))
            else:
                query = query.order_by(desc(Incident.created_at))
            
            # 総件数を取得
            total_count = query.count()
            
            # ページネーション
            offset = (page - 1) * per_page
            incidents = query.offset(offset).limit(per_page).all()
            
            # レスポンス構築
            incident_list = [self._build_incident_response(incident) for incident in incidents]
            
            # メタ情報
            total_pages = (total_count + per_page - 1) // per_page
            meta = PaginationMeta(
                current_page=page,
                total_pages=total_pages,
                total_count=total_count,
                per_page=per_page
            )
            
            # リンク情報
            base_url = "/api/v1/incidents"
            links = PaginationLinks(
                first=f"{base_url}?page=1&per_page={per_page}",
                prev=f"{base_url}?page={page-1}&per_page={per_page}" if page > 1 else None,
                next=f"{base_url}?page={page+1}&per_page={per_page}" if page < total_pages else None,
                last=f"{base_url}?page={total_pages}&per_page={per_page}"
            )
            
            return {
                "data": incident_list,
                "meta": meta.model_dump(),
                "links": links.model_dump()
            }
            
        except Exception as e:
            logger.error(f"Error listing incidents: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="インシデント一覧の取得中にエラーが発生しました"
            )

    def add_work_note(
        self, 
        incident_id: UUID, 
        note_data: IncidentWorkNoteCreate, 
        current_user_id: UUID
    ) -> IncidentWorkNoteResponse:
        """作業ノートを追加する"""
        try:
            # インシデントの存在確認
            incident = self._get_incident_by_id(incident_id, current_user_id)
            
            # 作業ノートを作成
            work_note = IncidentWorkNote(
                incident_id=incident_id,
                content=note_data.content,
                note_type=note_data.note_type,
                is_public="Y" if note_data.is_public else "N",
                created_by=current_user_id
            )
            
            self.db.add(work_note)
            self.db.commit()
            self.db.refresh(work_note)
            
            logger.info(f"Work note added to incident {incident.incident_number} by user {current_user_id}")
            
            return IncidentWorkNoteResponse(
                id=work_note.id,
                incident_id=work_note.incident_id,
                content=work_note.content,
                note_type=work_note.note_type,
                is_public=work_note.is_public == "Y",
                user={"id": current_user_id, "display_name": "Current User", "email": "user@example.com"},
                created_at=work_note.created_at,
                updated_at=work_note.updated_at
            )
            
        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error adding work note to incident {incident_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="作業ノートの追加中にエラーが発生しました"
            )

    def _get_incident_by_id(self, incident_id: UUID, current_user_id: UUID) -> Incident:
        """IDでインシデントを取得する（権限チェック付き）"""
        incident = self.db.query(Incident).filter(
            and_(
                Incident.id == incident_id,
                Incident.tenant_id == self._get_user_tenant_id(current_user_id),
                Incident.deleted_at.is_(None)
            )
        ).first()
        
        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="指定されたインシデントが見つかりません"
            )
        
        return incident

    def _generate_incident_number(self) -> str:
        """インシデント番号を生成する"""
        # 簡単な実装：今日の日付 + 連番
        today = datetime.now().strftime("%Y%m%d")
        count = self.db.query(func.count(Incident.id)).filter(
            Incident.incident_number.like(f"INC{today}%")
        ).scalar() or 0
        
        return f"INC{today}{count+1:04d}"

    def _get_user_tenant_id(self, user_id: UUID) -> UUID:
        """ユーザーのテナントIDを取得する（仮実装）"""
        # 実際の実装では、ユーザーテーブルから取得
        return UUID("12345678-1234-1234-1234-123456789012")

    def _set_sla_dates(self, incident: Incident):
        """SLA期限を設定する"""
        # 優先度に応じた期限設定（仮実装）
        now = datetime.now()
        if incident.priority == "critical":
            incident.response_due_at = now.replace(hour=now.hour + 1)
            incident.resolution_due_at = now.replace(hour=now.hour + 4)
        elif incident.priority == "high":
            incident.response_due_at = now.replace(hour=now.hour + 2)
            incident.resolution_due_at = now.replace(hour=now.hour + 8)
        else:
            incident.response_due_at = now.replace(hour=now.hour + 4)
            incident.resolution_due_at = now.replace(day=now.day + 1)

    def _handle_status_change(self, incident: Incident, new_status: IncidentStatus):
        """ステータス変更時の処理"""
        now = datetime.now()
        
        if new_status == IncidentStatus.IN_PROGRESS and not incident.responded_at:
            incident.responded_at = now
        elif new_status == IncidentStatus.RESOLVED and not incident.resolved_at:
            incident.resolved_at = now
        elif new_status == IncidentStatus.CLOSED and not incident.closed_at:
            incident.closed_at = now

    def _record_history(self, incident_id: UUID, field_name: str, old_value: Any, new_value: Any, user_id: UUID):
        """履歴を記録する"""
        history = IncidentHistory(
            incident_id=incident_id,
            field_name=field_name,
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(new_value) if new_value is not None else None,
            changed_by=user_id
        )
        self.db.add(history)

    def _record_changes(self, incident_id: UUID, old_values: Dict, new_values: Dict, user_id: UUID):
        """変更履歴を記録する"""
        for field, new_value in new_values.items():
            if field in old_values and old_values[field] != new_value:
                self._record_history(incident_id, field, old_values[field], new_value, user_id)

    def _build_incident_response(self, incident: Incident) -> IncidentResponse:
        """インシデントレスポンスを構築する"""
        # SLA情報を構築
        sla_info = {
            "response_due": incident.response_due_at,
            "resolution_due": incident.resolution_due_at,
            "response_met": None if not incident.responded_at else incident.responded_at <= incident.response_due_at,
            "resolution_met": None if not incident.resolved_at else incident.resolved_at <= incident.resolution_due_at
        }
        
        return IncidentResponse(
            id=incident.id,
            incident_number=incident.incident_number,
            title=incident.title,
            description=incident.description,
            status=incident.status,
            priority=incident.priority,
            impact=incident.impact,
            urgency=incident.urgency,
            category_id=incident.category_id,
            assignee_id=incident.assignee_id,
            team_id=incident.team_id,
            reporter={"id": incident.reporter_id, "display_name": "Reporter User", "email": "reporter@example.com"} if incident.reporter_id else None,
            assignee={"id": incident.assignee_id, "display_name": "Assignee User", "email": "assignee@example.com"} if incident.assignee_id else None,
            category={"id": incident.category_id, "name": "Category Name"} if incident.category_id else None,
            team={"id": incident.team_id, "name": "Team Name"} if incident.team_id else None,
            response_due_at=incident.response_due_at,
            resolution_due_at=incident.resolution_due_at,
            responded_at=incident.responded_at,
            resolved_at=incident.resolved_at,
            closed_at=incident.closed_at,
            resolution=incident.resolution,
            created_at=incident.created_at,
            updated_at=incident.updated_at,
            sla=sla_info
        )