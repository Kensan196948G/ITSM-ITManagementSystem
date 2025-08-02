"""インシデント管理サービス"""

from datetime import datetime, timedelta
from typing import List, Optional, Dict, Any
from uuid import UUID
import logging

from sqlalchemy.orm import Session
from sqlalchemy import and_, or_, desc, asc, func
from fastapi import HTTPException, status

from app.models.incident import (
    Incident,
    IncidentHistory,
    IncidentWorkNote,
    IncidentStatus,
)
from app.schemas.incident import (
    IncidentCreate,
    IncidentUpdate,
    IncidentResponse,
    IncidentWorkNoteCreate,
    IncidentWorkNoteResponse,
    IncidentHistoryResponse,
    IncidentDetailResponse,
    IncidentTimelineResponse,
    IncidentTimelineEntry,
    IncidentFieldUpdate,
    IncidentBulkUpdate,
    IncidentCustomFieldsUpdate,
)
from app.schemas.common import PaginationMeta, PaginationLinks

logger = logging.getLogger(__name__)


class IncidentService:
    """インシデント管理サービスクラス"""

    def __init__(self, db: Session):
        self.db = db

    def create_incident(
        self, incident_data: IncidentCreate, current_user_id: UUID
    ) -> IncidentResponse:
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
                updated_by=current_user_id,
            )

            # SLA期限を設定
            self._set_sla_dates(db_incident)

            self.db.add(db_incident)
            self.db.commit()
            self.db.refresh(db_incident)

            # 履歴を記録
            self._record_history(
                db_incident.id, "created", None, "new", current_user_id
            )

            logger.info(
                f"Incident created: {incident_number} by user {current_user_id}"
            )

            return self._build_incident_response(db_incident)

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error creating incident: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="インシデントの作成中にエラーが発生しました",
            )

    def get_incident(
        self, incident_id: UUID, current_user_id: UUID
    ) -> IncidentResponse:
        """インシデントを取得する"""
        incident = self._get_incident_by_id(incident_id, current_user_id)
        return self._build_incident_response(incident)

    def update_incident(
        self, incident_id: UUID, incident_data: IncidentUpdate, current_user_id: UUID
    ) -> IncidentResponse:
        """インシデントを更新する"""
        try:
            incident = self._get_incident_by_id(incident_id, current_user_id)

            # 変更履歴を記録するため、更新前の値を保存
            old_values = {
                "status": incident.status,
                "priority": incident.priority,
                "assignee_id": incident.assignee_id,
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

            logger.info(
                f"Incident updated: {incident.incident_number} by user {current_user_id}"
            )

            return self._build_incident_response(incident)

        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating incident {incident_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="インシデントの更新中にエラーが発生しました",
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
        sort: Optional[str] = None,
        # 高度フィルタリング用パラメータ
        date_from: Optional[datetime] = None,
        date_to: Optional[datetime] = None,
        due_date_from: Optional[datetime] = None,
        due_date_to: Optional[datetime] = None,
        sla_status: Optional[str] = None,
        has_attachments: Optional[bool] = None,
        last_updated_days: Optional[int] = None,
        search_fields: Optional[List[str]] = None,
        reporter_id: Optional[UUID] = None,
        team_id: Optional[UUID] = None,
        impact: Optional[List[str]] = None,
        urgency: Optional[List[str]] = None,
    ) -> Dict[str, Any]:
        """インシデント一覧を取得する"""
        try:
            # ベースクエリ
            query = self.db.query(Incident).filter(
                and_(
                    Incident.tenant_id == self._get_user_tenant_id(current_user_id),
                    Incident.deleted_at.is_(None),
                )
            )

            # 基本フィルター適用
            if status:
                query = query.filter(Incident.status.in_(status))

            if priority:
                query = query.filter(Incident.priority.in_(priority))

            if impact:
                query = query.filter(Incident.impact.in_(impact))

            if urgency:
                query = query.filter(Incident.urgency.in_(urgency))

            if assignee_id:
                query = query.filter(Incident.assignee_id == assignee_id)

            if reporter_id:
                query = query.filter(Incident.reporter_id == reporter_id)

            if team_id:
                query = query.filter(Incident.team_id == team_id)

            if category_id:
                query = query.filter(Incident.category_id == category_id)

            # 日時フィルター
            if date_from:
                query = query.filter(Incident.created_at >= date_from)

            if date_to:
                query = query.filter(Incident.created_at <= date_to)

            if due_date_from:
                query = query.filter(Incident.resolution_due_at >= due_date_from)

            if due_date_to:
                query = query.filter(Incident.resolution_due_at <= due_date_to)

            # 最終更新日フィルター
            if last_updated_days:
                cutoff_date = datetime.utcnow() - timedelta(days=last_updated_days)
                query = query.filter(Incident.updated_at >= cutoff_date)

            # SLAステータスフィルター
            if sla_status:
                current_time = datetime.utcnow()
                if sla_status == "compliant":
                    # 期限内で解決済み、または期限まで余裕がある未解決
                    query = query.filter(
                        or_(
                            and_(
                                Incident.status == IncidentStatus.RESOLVED,
                                Incident.resolved_at <= Incident.resolution_due_at,
                            ),
                            and_(
                                Incident.status.in_(
                                    [
                                        IncidentStatus.NEW,
                                        IncidentStatus.ASSIGNED,
                                        IncidentStatus.IN_PROGRESS,
                                    ]
                                ),
                                Incident.resolution_due_at > current_time,
                            ),
                        )
                    )
                elif sla_status == "at_risk":
                    # 期限まで24時間未満の未解決
                    risk_threshold = current_time + timedelta(hours=24)
                    query = query.filter(
                        and_(
                            Incident.status.in_(
                                [
                                    IncidentStatus.NEW,
                                    IncidentStatus.ASSIGNED,
                                    IncidentStatus.IN_PROGRESS,
                                ]
                            ),
                            Incident.resolution_due_at <= risk_threshold,
                            Incident.resolution_due_at > current_time,
                        )
                    )
                elif sla_status == "violated":
                    # 期限超過の未解決、または期限超過後に解決
                    query = query.filter(
                        or_(
                            and_(
                                Incident.status.in_(
                                    [
                                        IncidentStatus.NEW,
                                        IncidentStatus.ASSIGNED,
                                        IncidentStatus.IN_PROGRESS,
                                    ]
                                ),
                                Incident.resolution_due_at < current_time,
                            ),
                            and_(
                                Incident.status == IncidentStatus.RESOLVED,
                                Incident.resolved_at > Incident.resolution_due_at,
                            ),
                        )
                    )

            # 添付ファイルフィルター
            if has_attachments is not None:
                from app.models.incident import IncidentAttachment

                if has_attachments:
                    query = query.join(IncidentAttachment).filter(
                        IncidentAttachment.incident_id == Incident.id
                    )
                else:
                    subquery = (
                        self.db.query(IncidentAttachment.incident_id)
                        .filter(IncidentAttachment.incident_id == Incident.id)
                        .exists()
                    )
                    query = query.filter(~subquery)

            # 高度検索
            if q:
                search_term = f"%{q}%"
                search_conditions = []

                # 検索対象フィールドを決定
                if not search_fields:
                    search_fields = ["title", "description", "incident_number"]

                if "title" in search_fields:
                    search_conditions.append(Incident.title.ilike(search_term))
                if "description" in search_fields:
                    search_conditions.append(Incident.description.ilike(search_term))
                if "incident_number" in search_fields:
                    search_conditions.append(
                        Incident.incident_number.ilike(search_term)
                    )
                if "resolution" in search_fields:
                    search_conditions.append(Incident.resolution.ilike(search_term))

                # 作業ノートも検索対象に含める
                if "comments" in search_fields:
                    from app.models.incident import IncidentWorkNote

                    work_note_subquery = (
                        self.db.query(IncidentWorkNote.incident_id)
                        .filter(
                            and_(
                                IncidentWorkNote.incident_id == Incident.id,
                                IncidentWorkNote.content.ilike(search_term),
                            )
                        )
                        .exists()
                    )
                    search_conditions.append(work_note_subquery)

                if search_conditions:
                    query = query.filter(or_(*search_conditions))

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
            incident_list = [
                self._build_incident_response(incident) for incident in incidents
            ]

            # メタ情報
            total_pages = (total_count + per_page - 1) // per_page
            meta = PaginationMeta(
                current_page=page,
                total_pages=total_pages,
                total_count=total_count,
                per_page=per_page,
            )

            # リンク情報
            base_url = "/api/v1/incidents"
            links = PaginationLinks(
                first=f"{base_url}?page=1&per_page={per_page}",
                prev=(
                    f"{base_url}?page={page-1}&per_page={per_page}"
                    if page > 1
                    else None
                ),
                next=(
                    f"{base_url}?page={page+1}&per_page={per_page}"
                    if page < total_pages
                    else None
                ),
                last=f"{base_url}?page={total_pages}&per_page={per_page}",
            )

            return {
                "data": incident_list,
                "meta": meta.model_dump(),
                "links": links.model_dump(),
            }

        except Exception as e:
            logger.error(f"Error listing incidents: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="インシデント一覧の取得中にエラーが発生しました",
            )

    def add_work_note(
        self,
        incident_id: UUID,
        note_data: IncidentWorkNoteCreate,
        current_user_id: UUID,
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
                created_by=current_user_id,
            )

            self.db.add(work_note)
            self.db.commit()
            self.db.refresh(work_note)

            logger.info(
                f"Work note added to incident {incident.incident_number} by user {current_user_id}"
            )

            return IncidentWorkNoteResponse(
                id=work_note.id,
                incident_id=work_note.incident_id,
                content=work_note.content,
                note_type=work_note.note_type,
                is_public=work_note.is_public == "Y",
                user={
                    "id": current_user_id,
                    "display_name": "Current User",
                    "email": "user@example.com",
                },
                created_at=work_note.created_at,
                updated_at=work_note.updated_at,
            )

        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error adding work note to incident {incident_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="作業ノートの追加中にエラーが発生しました",
            )

    def get_incident_history(
        self, incident_id: UUID, current_user_id: UUID
    ) -> List[IncidentHistoryResponse]:
        """インシデント履歴を取得する"""
        try:
            # インシデントの存在確認
            incident = self._get_incident_by_id(incident_id, current_user_id)

            # 履歴を取得
            histories = (
                self.db.query(IncidentHistory)
                .filter(IncidentHistory.incident_id == incident_id)
                .order_by(desc(IncidentHistory.changed_at))
                .all()
            )

            history_list = []
            for history in histories:
                history_list.append(
                    IncidentHistoryResponse(
                        id=history.id,
                        incident_id=history.incident_id,
                        field_name=history.field_name,
                        old_value=history.old_value,
                        new_value=history.new_value,
                        changed_by=history.changed_by,
                        changed_at=history.changed_at,
                        user={
                            "id": history.changed_by,
                            "display_name": "User Name",
                            "email": "user@example.com",
                        },
                    )
                )

            return history_list

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error retrieving incident history {incident_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="インシデント履歴の取得中にエラーが発生しました",
            )

    def get_work_notes(
        self, incident_id: UUID, current_user_id: UUID, include_private: bool = False
    ) -> List[IncidentWorkNoteResponse]:
        """作業ノート一覧を取得する"""
        try:
            # インシデントの存在確認
            incident = self._get_incident_by_id(incident_id, current_user_id)

            # 作業ノートを取得
            query = self.db.query(IncidentWorkNote).filter(
                IncidentWorkNote.incident_id == incident_id
            )

            # プライベートノートのフィルタリング
            if not include_private:
                query = query.filter(IncidentWorkNote.is_public == "Y")

            work_notes = query.order_by(desc(IncidentWorkNote.created_at)).all()

            note_list = []
            for note in work_notes:
                note_list.append(
                    IncidentWorkNoteResponse(
                        id=note.id,
                        incident_id=note.incident_id,
                        content=note.content,
                        note_type=note.note_type,
                        is_public=note.is_public == "Y",
                        user={
                            "id": note.created_by,
                            "display_name": "User Name",
                            "email": "user@example.com",
                        },
                        created_at=note.created_at,
                        updated_at=note.updated_at,
                    )
                )

            return note_list

        except HTTPException:
            raise
        except Exception as e:
            logger.error(
                f"Error retrieving work notes for incident {incident_id}: {str(e)}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="作業ノート一覧の取得中にエラーが発生しました",
            )

    def update_work_note(
        self,
        incident_id: UUID,
        note_id: UUID,
        note_data: IncidentWorkNoteCreate,
        current_user_id: UUID,
    ) -> IncidentWorkNoteResponse:
        """作業ノートを更新する"""
        try:
            # インシデントの存在確認
            incident = self._get_incident_by_id(incident_id, current_user_id)

            # 作業ノートを取得
            work_note = (
                self.db.query(IncidentWorkNote)
                .filter(
                    and_(
                        IncidentWorkNote.id == note_id,
                        IncidentWorkNote.incident_id == incident_id,
                    )
                )
                .first()
            )

            if not work_note:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="指定された作業ノートが見つかりません",
                )

            # 更新権限チェック（作成者のみ更新可能）
            if work_note.created_by != current_user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="作業ノートの更新権限がありません",
                )

            # 作業ノートを更新
            work_note.content = note_data.content
            work_note.note_type = note_data.note_type
            work_note.is_public = "Y" if note_data.is_public else "N"
            work_note.updated_at = datetime.utcnow()

            self.db.commit()
            self.db.refresh(work_note)

            logger.info(f"Work note {note_id} updated by user {current_user_id}")

            return IncidentWorkNoteResponse(
                id=work_note.id,
                incident_id=work_note.incident_id,
                content=work_note.content,
                note_type=work_note.note_type,
                is_public=work_note.is_public == "Y",
                user={
                    "id": current_user_id,
                    "display_name": "Current User",
                    "email": "user@example.com",
                },
                created_at=work_note.created_at,
                updated_at=work_note.updated_at,
            )

        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating work note {note_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="作業ノートの更新中にエラーが発生しました",
            )

    def delete_work_note(self, incident_id: UUID, note_id: UUID, current_user_id: UUID):
        """作業ノートを削除する"""
        try:
            # インシデントの存在確認
            incident = self._get_incident_by_id(incident_id, current_user_id)

            # 作業ノートを取得
            work_note = (
                self.db.query(IncidentWorkNote)
                .filter(
                    and_(
                        IncidentWorkNote.id == note_id,
                        IncidentWorkNote.incident_id == incident_id,
                    )
                )
                .first()
            )

            if not work_note:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="指定された作業ノートが見つかりません",
                )

            # 削除権限チェック（作成者のみ削除可能）
            if work_note.created_by != current_user_id:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="作業ノートの削除権限がありません",
                )

            # 作業ノートを削除
            self.db.delete(work_note)
            self.db.commit()

            logger.info(f"Work note {note_id} deleted by user {current_user_id}")

        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error deleting work note {note_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="作業ノートの削除中にエラーが発生しました",
            )

    def _get_incident_by_id(self, incident_id: UUID, current_user_id: UUID) -> Incident:
        """IDでインシデントを取得する（権限チェック付き）"""
        incident = (
            self.db.query(Incident)
            .filter(
                and_(
                    Incident.id == incident_id,
                    Incident.tenant_id == self._get_user_tenant_id(current_user_id),
                    Incident.deleted_at.is_(None),
                )
            )
            .first()
        )

        if not incident:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="指定されたインシデントが見つかりません",
            )

        return incident

    def _generate_incident_number(self) -> str:
        """インシデント番号を生成する"""
        # 簡単な実装：今日の日付 + 連番
        today = datetime.now().strftime("%Y%m%d")
        count = (
            self.db.query(func.count(Incident.id))
            .filter(Incident.incident_number.like(f"INC{today}%"))
            .scalar()
            or 0
        )

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

    def _record_history(
        self,
        incident_id: UUID,
        field_name: str,
        old_value: Any,
        new_value: Any,
        user_id: UUID,
    ):
        """履歴を記録する"""
        history = IncidentHistory(
            incident_id=incident_id,
            field_name=field_name,
            old_value=str(old_value) if old_value is not None else None,
            new_value=str(new_value) if new_value is not None else None,
            changed_by=user_id,
        )
        self.db.add(history)

    def _record_changes(
        self, incident_id: UUID, old_values: Dict, new_values: Dict, user_id: UUID
    ):
        """変更履歴を記録する"""
        for field, new_value in new_values.items():
            if field in old_values and old_values[field] != new_value:
                self._record_history(
                    incident_id, field, old_values[field], new_value, user_id
                )

    def _build_incident_response(self, incident: Incident) -> IncidentResponse:
        """インシデントレスポンスを構築する"""
        # SLA情報を構築
        sla_info = {
            "response_due": incident.response_due_at,
            "resolution_due": incident.resolution_due_at,
            "response_met": (
                None
                if not incident.responded_at
                else incident.responded_at <= incident.response_due_at
            ),
            "resolution_met": (
                None
                if not incident.resolved_at
                else incident.resolved_at <= incident.resolution_due_at
            ),
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
            reporter=(
                {
                    "id": incident.reporter_id,
                    "display_name": "Reporter User",
                    "email": "reporter@example.com",
                }
                if incident.reporter_id
                else None
            ),
            assignee=(
                {
                    "id": incident.assignee_id,
                    "display_name": "Assignee User",
                    "email": "assignee@example.com",
                }
                if incident.assignee_id
                else None
            ),
            category=(
                {"id": incident.category_id, "name": "Category Name"}
                if incident.category_id
                else None
            ),
            team=(
                {"id": incident.team_id, "name": "Team Name"}
                if incident.team_id
                else None
            ),
            response_due_at=incident.response_due_at,
            resolution_due_at=incident.resolution_due_at,
            responded_at=incident.responded_at,
            resolved_at=incident.resolved_at,
            closed_at=incident.closed_at,
            resolution=incident.resolution,
            created_at=incident.created_at,
            updated_at=incident.updated_at,
            sla=sla_info,
        )

    # ===== 詳細パネル用の拡張メソッド =====

    def get_incident_detail(
        self,
        incident_id: UUID,
        current_user_id: UUID,
        include_work_notes: bool = True,
        include_histories: bool = True,
        include_attachments: bool = True,
        include_related: bool = True,
        include_stats: bool = True,
    ) -> IncidentDetailResponse:
        """詳細パネル用のインシデント詳細情報を取得する"""
        try:
            # 基本インシデント情報を取得
            incident = self._get_incident_by_id(incident_id, current_user_id)
            base_response = self._build_incident_response(incident)

            # 詳細情報を構築
            detail_data = {
                **base_response.model_dump(),
                "work_notes": [],
                "histories": [],
                "attachments": [],
                "related_incidents": [],
                "stats": {},
                "custom_fields": {},
                "metadata": {
                    "last_viewed": datetime.utcnow().isoformat(),
                    "viewer_id": str(current_user_id),
                },
            }

            # 条件に応じて詳細情報を取得
            if include_work_notes:
                detail_data["work_notes"] = self.get_work_notes(
                    incident_id, current_user_id, True
                )

            if include_histories:
                detail_data["histories"] = self.get_incident_history(
                    incident_id, current_user_id
                )

            if include_attachments:
                detail_data["attachments"] = self.get_incident_attachments(
                    incident_id, current_user_id
                )

            if include_related:
                detail_data["related_incidents"] = self.get_related_incidents(
                    incident_id, current_user_id
                )

            if include_stats:
                detail_data["stats"] = self.get_incident_statistics(
                    incident_id, current_user_id
                )

            return IncidentDetailResponse(**detail_data)

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting incident detail {incident_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="インシデント詳細情報の取得中にエラーが発生しました",
            )

    def get_incident_timeline(
        self,
        incident_id: UUID,
        current_user_id: UUID,
        limit: int = 50,
        offset: int = 0,
        event_types: Optional[List[str]] = None,
    ) -> IncidentTimelineResponse:
        """インシデントのタイムラインを取得する"""
        try:
            # インシデントの存在確認
            incident = self._get_incident_by_id(incident_id, current_user_id)

            timeline_entries = []

            # 履歴からタイムラインエントリを生成
            histories = (
                self.db.query(IncidentHistory)
                .filter(IncidentHistory.incident_id == incident_id)
                .order_by(desc(IncidentHistory.changed_at))
                .all()
            )

            for history in histories:
                timeline_entries.append(
                    IncidentTimelineEntry(
                        id=history.id,
                        type=(
                            "status_change"
                            if history.field_name == "status"
                            else "field_update"
                        ),
                        title=f"{history.field_name} updated",
                        description=f"Changed from '{history.old_value}' to '{history.new_value}'",
                        user={
                            "id": history.changed_by,
                            "display_name": "User",
                            "email": "user@example.com",
                        },
                        timestamp=history.changed_at,
                        details={
                            "field_name": history.field_name,
                            "old_value": history.old_value,
                            "new_value": history.new_value,
                        },
                    )
                )

            # 作業ノートからタイムラインエントリを生成
            work_notes = (
                self.db.query(IncidentWorkNote)
                .filter(IncidentWorkNote.incident_id == incident_id)
                .order_by(desc(IncidentWorkNote.created_at))
                .all()
            )

            for note in work_notes:
                timeline_entries.append(
                    IncidentTimelineEntry(
                        id=note.id,
                        type="work_note",
                        title="Work note added",
                        description=(
                            note.content[:100] + "..."
                            if len(note.content) > 100
                            else note.content
                        ),
                        user={
                            "id": note.created_by,
                            "display_name": "User",
                            "email": "user@example.com",
                        },
                        timestamp=note.created_at,
                        details={
                            "note_type": note.note_type,
                            "is_public": note.is_public == "Y",
                        },
                    )
                )

            # タイムスタンプでソート
            timeline_entries.sort(key=lambda x: x.timestamp, reverse=True)

            # ページネーション適用
            total_count = len(timeline_entries)
            timeline_entries = timeline_entries[offset : offset + limit]

            return IncidentTimelineResponse(
                incident_id=incident_id,
                timeline=timeline_entries,
                total_count=total_count,
            )

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting incident timeline {incident_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="インシデントタイムラインの取得中にエラーが発生しました",
            )

    def get_incident_attachments(
        self, incident_id: UUID, current_user_id: UUID
    ) -> List[Dict[str, Any]]:
        """インシデントの添付ファイル一覧を取得する"""
        try:
            # インシデントの存在確認
            incident = self._get_incident_by_id(incident_id, current_user_id)

            # 添付ファイルを取得（モデルが存在する場合）
            # 現在は空のリストを返す
            return []

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting incident attachments {incident_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="添付ファイル一覧の取得中にエラーが発生しました",
            )

    def get_related_incidents(
        self,
        incident_id: UUID,
        current_user_id: UUID,
        relation_type: Optional[str] = None,
        limit: int = 10,
    ) -> List[Dict[str, Any]]:
        """関連インシデントを取得する"""
        try:
            # インシデントの存在確認
            incident = self._get_incident_by_id(incident_id, current_user_id)

            # 関連インシデントのロジック（例：同じカテゴリ、同じ報告者など）
            related_query = (
                self.db.query(Incident)
                .filter(
                    and_(
                        Incident.id != incident_id,
                        Incident.deleted_at.is_(None),
                        or_(
                            Incident.category_id == incident.category_id,
                            Incident.reporter_id == incident.reporter_id,
                            Incident.assignee_id == incident.assignee_id,
                        ),
                    )
                )
                .limit(limit)
            )

            related_incidents = related_query.all()

            result = []
            for related in related_incidents:
                result.append(
                    {
                        "id": related.id,
                        "incident_number": related.incident_number,
                        "title": related.title,
                        "status": related.status,
                        "priority": related.priority,
                        "created_at": related.created_at,
                        "relation_type": (
                            "same_category"
                            if related.category_id == incident.category_id
                            else "same_reporter"
                        ),
                    }
                )

            return result

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting related incidents {incident_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="関連インシデントの取得中にエラーが発生しました",
            )

    def get_incident_statistics(
        self, incident_id: UUID, current_user_id: UUID
    ) -> Dict[str, Any]:
        """インシデントの統計情報を取得する"""
        try:
            # インシデントの存在確認
            incident = self._get_incident_by_id(incident_id, current_user_id)

            # 基本統計を計算
            stats = {
                "age_hours": (datetime.utcnow() - incident.created_at).total_seconds()
                / 3600,
                "work_notes_count": self.db.query(func.count(IncidentWorkNote.id))
                .filter(IncidentWorkNote.incident_id == incident_id)
                .scalar()
                or 0,
                "history_count": self.db.query(func.count(IncidentHistory.id))
                .filter(IncidentHistory.incident_id == incident_id)
                .scalar()
                or 0,
                "attachments_count": 0,  # 添付ファイルテーブルが実装されたら更新
                "sla_status": self._calculate_sla_status(incident),
                "time_to_resolution": None,
            }

            # 解決時間を計算（解決済みの場合）
            if incident.resolved_at:
                stats["time_to_resolution"] = (
                    incident.resolved_at - incident.created_at
                ).total_seconds() / 3600

            return stats

        except HTTPException:
            raise
        except Exception as e:
            logger.error(f"Error getting incident statistics {incident_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="統計情報の取得中にエラーが発生しました",
            )

    def update_incident_field(
        self,
        incident_id: UUID,
        field_update: IncidentFieldUpdate,
        current_user_id: UUID,
    ) -> IncidentResponse:
        """インシデントの単一フィールドを更新する"""
        try:
            # インシデントを取得
            incident = self._get_incident_by_id(incident_id, current_user_id)

            # 更新前の値を保存
            old_value = getattr(incident, field_update.field_name, None)

            # フィールドを更新
            if hasattr(incident, field_update.field_name):
                setattr(incident, field_update.field_name, field_update.field_value)
                incident.updated_by = current_user_id
                incident.updated_at = datetime.utcnow()

                # 履歴を記録
                self._record_history(
                    incident_id,
                    field_update.field_name,
                    old_value,
                    field_update.field_value,
                    current_user_id,
                )

                # コメントがある場合は作業ノートとして追加
                if field_update.comment:
                    comment_note = IncidentWorkNote(
                        incident_id=incident_id,
                        content=f"Field update: {field_update.field_name} - {field_update.comment}",
                        note_type="field_update",
                        is_public="Y",
                        created_by=current_user_id,
                    )
                    self.db.add(comment_note)

                self.db.commit()
                self.db.refresh(incident)

                logger.info(
                    f"Field {field_update.field_name} updated for incident {incident_id}"
                )

                return self._build_incident_response(incident)
            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"フィールド '{field_update.field_name}' は更新できません",
                )

        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating incident field {incident_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="フィールド更新中にエラーが発生しました",
            )

    def update_incident_custom_fields(
        self,
        incident_id: UUID,
        custom_fields_update: IncidentCustomFieldsUpdate,
        current_user_id: UUID,
    ) -> IncidentResponse:
        """インシデントのカスタムフィールドを更新する"""
        try:
            # インシデントを取得
            incident = self._get_incident_by_id(incident_id, current_user_id)

            # カスタムフィールドの更新（実装は具体的なカスタムフィールドテーブル構造に依存）
            # ここではプレースホルダー実装

            incident.updated_by = current_user_id
            incident.updated_at = datetime.utcnow()

            self.db.commit()
            self.db.refresh(incident)

            logger.info(f"Custom fields updated for incident {incident_id}")

            return self._build_incident_response(incident)

        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(f"Error updating custom fields {incident_id}: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="カスタムフィールド更新中にエラーが発生しました",
            )

    def bulk_update_incidents(
        self, bulk_update: IncidentBulkUpdate, current_user_id: UUID
    ) -> Dict[str, Any]:
        """インシデントを一括更新する"""
        try:
            updated_count = 0
            failed_updates = []

            for incident_id in bulk_update.incident_ids:
                try:
                    # インシデントを取得
                    incident = self._get_incident_by_id(incident_id, current_user_id)

                    # 更新内容を適用
                    for field, value in bulk_update.updates.items():
                        if hasattr(incident, field):
                            old_value = getattr(incident, field)
                            setattr(incident, field, value)

                            # 履歴を記録
                            self._record_history(
                                incident_id, field, old_value, value, current_user_id
                            )

                    incident.updated_by = current_user_id
                    incident.updated_at = datetime.utcnow()

                    # コメントがある場合は作業ノートとして追加
                    if bulk_update.comment:
                        comment_note = IncidentWorkNote(
                            incident_id=incident_id,
                            content=f"Bulk update: {bulk_update.comment}",
                            note_type="bulk_update",
                            is_public="Y",
                            created_by=current_user_id,
                        )
                        self.db.add(comment_note)

                    updated_count += 1

                except Exception as e:
                    logger.error(f"Failed to update incident {incident_id}: {str(e)}")
                    failed_updates.append(
                        {"incident_id": str(incident_id), "error": str(e)}
                    )

            self.db.commit()

            logger.info(f"Bulk update completed: {updated_count} incidents updated")

            return {
                "updated_count": updated_count,
                "failed_count": len(failed_updates),
                "failed_updates": failed_updates,
                "total_requested": len(bulk_update.incident_ids),
            }

        except Exception as e:
            self.db.rollback()
            logger.error(f"Error in bulk update: {str(e)}")
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="一括更新中にエラーが発生しました",
            )

    def execute_quick_action(
        self,
        incident_id: UUID,
        action: str,
        parameters: Dict[str, Any],
        current_user_id: UUID,
    ) -> Dict[str, Any]:
        """クイックアクションを実行する"""
        try:
            # インシデントを取得
            incident = self._get_incident_by_id(incident_id, current_user_id)

            result = {"action": action, "success": True, "message": ""}

            # アクション別処理
            if action == "assign_to_me":
                incident.assignee_id = current_user_id
                result["message"] = "インシデントが自分に割り当てられました"

            elif action == "escalate":
                # エスカレーション処理
                if incident.priority == "low":
                    incident.priority = "medium"
                elif incident.priority == "medium":
                    incident.priority = "high"
                elif incident.priority == "high":
                    incident.priority = "critical"
                result["message"] = (
                    f"優先度が {incident.priority} にエスカレートされました"
                )

            elif action == "start_work":
                incident.status = IncidentStatus.IN_PROGRESS
                if not incident.responded_at:
                    incident.responded_at = datetime.utcnow()
                result["message"] = "作業を開始しました"

            elif action == "resolve":
                incident.status = IncidentStatus.RESOLVED
                incident.resolved_at = datetime.utcnow()
                if parameters.get("resolution"):
                    incident.resolution = parameters["resolution"]
                result["message"] = "インシデントが解決されました"

            else:
                raise HTTPException(
                    status_code=status.HTTP_400_BAD_REQUEST,
                    detail=f"不明なアクション: {action}",
                )

            incident.updated_by = current_user_id
            incident.updated_at = datetime.utcnow()

            # 履歴を記録
            self._record_history(
                incident_id, "quick_action", None, action, current_user_id
            )

            self.db.commit()

            logger.info(f"Quick action '{action}' executed for incident {incident_id}")

            return result

        except HTTPException:
            raise
        except Exception as e:
            self.db.rollback()
            logger.error(
                f"Error executing quick action {action} for incident {incident_id}: {str(e)}"
            )
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="クイックアクション実行中にエラーが発生しました",
            )

    def _calculate_sla_status(self, incident: Incident) -> str:
        """SLAステータスを計算する"""
        now = datetime.utcnow()

        if incident.resolution_due_at and now > incident.resolution_due_at:
            return "violated"
        elif (
            incident.resolution_due_at
            and now > incident.resolution_due_at - timedelta(hours=2)
        ):
            return "at_risk"
        else:
            return "compliant"
