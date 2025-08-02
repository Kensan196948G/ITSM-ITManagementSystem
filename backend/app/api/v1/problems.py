"""問題管理API"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
from collections import defaultdict
import json

from fastapi import APIRouter, Depends, HTTPException, Query, UploadFile, File
from fastapi import status as http_status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, text, desc, asc

from app.db.base import get_db
from app.models.problem import Problem, ProblemIncident, KnownError, ProblemStatus, ProblemCategory, BusinessImpact, RCAPhase
from app.schemas.problem import (
    ProblemCreate, ProblemUpdate, ProblemResponse, 
    RCAUpdate, RCAFindingCreate, RCAStartRequest, RCAInfo,
    KnownErrorCreate, KnownErrorUpdate, KnownErrorResponse,
    ProblemStatistics, ProblemTrends, KPIMetrics,
    BulkUpdateRequest, BulkDeleteRequest, BulkOperationResult
)
from app.schemas.common import SuccessResponse, APIError

router = APIRouter()


def get_current_user_id() -> UUID:
    """現在のユーザーIDを取得する（仮実装）"""
    return UUID("12345678-1234-1234-1234-123456789012")


def get_user_tenant_id(user_id: UUID) -> UUID:
    """ユーザーのテナントIDを取得する（仮実装）"""
    return UUID("12345678-1234-1234-1234-123456789012")


@router.post(
    "/",
    response_model=ProblemResponse,
    status_code=http_status.HTTP_201_CREATED,
    summary="問題作成",
    description="新しい問題を作成します",
    responses={
        201: {"description": "問題が正常に作成されました"},
        400: {"model": APIError, "description": "リクエストデータが不正です"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"}
    }
)
async def create_problem(
    problem_data: ProblemCreate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> ProblemResponse:
    """問題を作成する"""
    try:
        # 問題番号を生成
        from datetime import datetime
        from sqlalchemy import func
        
        today = datetime.now().strftime("%Y%m%d")
        count = db.query(func.count(Problem.id)).filter(
            Problem.problem_number.like(f"PRB{today}%")
        ).scalar() or 0
        
        problem_number = f"PRB{today}{count+1:04d}"
        
        # 問題を作成
        db_problem = Problem(
            problem_number=problem_number,
            tenant_id=get_user_tenant_id(current_user_id),
            title=problem_data.title,
            description=problem_data.description,
            priority=problem_data.priority,
            category=problem_data.category,
            business_impact=problem_data.business_impact,
            impact_analysis=problem_data.impact_analysis,
            affected_services=json.dumps(problem_data.affected_services) if problem_data.affected_services else None,
            assignee_id=problem_data.assignee_id
        )
        
        db.add(db_problem)
        db.commit()
        db.refresh(db_problem)
        
        # 関連インシデントを追加
        if problem_data.related_incident_ids:
            for incident_id in problem_data.related_incident_ids:
                relation = ProblemIncident(
                    problem_id=db_problem.id,
                    incident_id=incident_id
                )
                db.add(relation)
        
        db.commit()
        
        return ProblemResponse(
            id=db_problem.id,
            problem_number=db_problem.problem_number,
            title=db_problem.title,
            description=db_problem.description,
            status=db_problem.status,
            priority=db_problem.priority,
            category=db_problem.category,
            business_impact=db_problem.business_impact,
            impact_analysis=db_problem.impact_analysis,
            affected_services=json.loads(db_problem.affected_services) if db_problem.affected_services else [],
            root_cause=db_problem.root_cause,
            permanent_solution=db_problem.permanent_solution,
            assignee_id=db_problem.assignee_id,
            assignee={"id": db_problem.assignee_id, "display_name": "Assignee User", "email": "assignee@example.com"} if db_problem.assignee_id else None,
            rca_info=RCAInfo(
                phase=db_problem.rca_phase,
                started_at=db_problem.rca_started_at,
                completed_at=db_problem.rca_completed_at,
                details=json.loads(db_problem.rca_details) if db_problem.rca_details else None,
                findings=json.loads(db_problem.rca_findings) if db_problem.rca_findings else []
            ),
            related_incidents=[],
            known_errors=[],
            created_at=db_problem.created_at,
            updated_at=db_problem.updated_at
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="問題の作成中にエラーが発生しました"
        )


@router.get(
    "/",
    response_model=Dict[str, Any],
    summary="問題一覧取得",
    description="問題の一覧を取得します",
)
async def list_problems(
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(20, ge=1, le=100, description="1ページあたりの件数"),
    status_filter: Optional[List[str]] = Query(None, description="ステータスフィルター"),
    priority: Optional[List[str]] = Query(None, description="優先度フィルター"),
    category: Optional[List[str]] = Query(None, description="カテゴリフィルター"),
    business_impact: Optional[List[str]] = Query(None, description="ビジネス影響フィルター"),
    assignee_id: Optional[UUID] = Query(None, description="担当者IDフィルター"),
    search: Optional[str] = Query(None, description="検索キーワード"),
    sort_by: Optional[str] = Query("created_at", description="ソートフィールド"),
    sort_order: Optional[str] = Query("desc", description="ソート順序"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """問題一覧を取得する"""
    try:
        query = db.query(Problem).filter(
            Problem.tenant_id == get_user_tenant_id(current_user_id)
        )
        
        # フィルター適用
        if status_filter:
            query = query.filter(Problem.status.in_(status_filter))
        
        if priority:
            query = query.filter(Problem.priority.in_(priority))
            
        if category:
            query = query.filter(Problem.category.in_(category))
            
        if business_impact:
            query = query.filter(Problem.business_impact.in_(business_impact))
        
        if assignee_id:
            query = query.filter(Problem.assignee_id == assignee_id)
            
        # 検索機能
        if search:
            search_filter = or_(
                Problem.title.ilike(f"%{search}%"),
                Problem.description.ilike(f"%{search}%"),
                Problem.problem_number.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
            
        # ソート
        if sort_by and hasattr(Problem, sort_by):
            sort_column = getattr(Problem, sort_by)
            if sort_order.lower() == "asc":
                query = query.order_by(asc(sort_column))
            else:
                query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(desc(Problem.created_at))
        
        # 総件数
        total_count = query.count()
        
        # ページネーション
        offset = (page - 1) * per_page
        problems = query.offset(offset).limit(per_page).all()
        
        # レスポンス構築
        problem_list = []
        for problem in problems:
            problem_list.append(ProblemResponse(
                id=problem.id,
                problem_number=problem.problem_number,
                title=problem.title,
                description=problem.description,
                status=problem.status,
                priority=problem.priority,
                category=problem.category,
                business_impact=problem.business_impact,
                impact_analysis=problem.impact_analysis,
                affected_services=json.loads(problem.affected_services) if problem.affected_services else [],
                root_cause=problem.root_cause,
                permanent_solution=problem.permanent_solution,
                assignee_id=problem.assignee_id,
                assignee={"id": problem.assignee_id, "display_name": "Assignee User", "email": "assignee@example.com"} if problem.assignee_id else None,
                rca_info=RCAInfo(
                    phase=problem.rca_phase,
                    started_at=problem.rca_started_at,
                    completed_at=problem.rca_completed_at,
                    details=json.loads(problem.rca_details) if problem.rca_details else None,
                    findings=json.loads(problem.rca_findings) if problem.rca_findings else []
                ),
                related_incidents=[],
                known_errors=[],
                created_at=problem.created_at,
                updated_at=problem.updated_at
            ))
        
        # メタ情報
        total_pages = (total_count + per_page - 1) // per_page
        meta = {
            "current_page": page,
            "total_pages": total_pages,
            "total_count": total_count,
            "per_page": per_page
        }
        
        return {
            "data": problem_list,
            "meta": meta
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="問題一覧の取得中にエラーが発生しました"
        )


@router.get(
    "/{problem_id}",
    response_model=ProblemResponse,
    summary="問題詳細取得",
    description="指定された問題の詳細情報を取得します",
)
async def get_problem(
    problem_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> ProblemResponse:
    """問題の詳細を取得する"""
    problem = db.query(Problem).filter(
        Problem.id == problem_id,
        Problem.tenant_id == get_user_tenant_id(current_user_id)
    ).first()
    
    if not problem:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="指定された問題が見つかりません"
        )
    
    return ProblemResponse(
        id=problem.id,
        problem_number=problem.problem_number,
        title=problem.title,
        description=problem.description,
        status=problem.status,
        priority=problem.priority,
        category=problem.category,
        business_impact=problem.business_impact,
        impact_analysis=problem.impact_analysis,
        affected_services=json.loads(problem.affected_services) if problem.affected_services else [],
        root_cause=problem.root_cause,
        permanent_solution=problem.permanent_solution,
        assignee_id=problem.assignee_id,
        assignee={"id": problem.assignee_id, "display_name": "Assignee User", "email": "assignee@example.com"} if problem.assignee_id else None,
        rca_info=RCAInfo(
            phase=problem.rca_phase,
            started_at=problem.rca_started_at,
            completed_at=problem.rca_completed_at,
            details=json.loads(problem.rca_details) if problem.rca_details else None,
            findings=json.loads(problem.rca_findings) if problem.rca_findings else []
        ),
        related_incidents=[],
        known_errors=[],
        created_at=problem.created_at,
        updated_at=problem.updated_at
    )


@router.patch(
    "/{problem_id}",
    response_model=ProblemResponse,
    summary="問題更新",
    description="指定された問題の情報を更新します",
)
async def update_problem(
    problem_id: UUID,
    problem_data: ProblemUpdate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> ProblemResponse:
    """問題を更新する"""
    try:
        problem = db.query(Problem).filter(
            Problem.id == problem_id,
            Problem.tenant_id == get_user_tenant_id(current_user_id)
        ).first()
        
        if not problem:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="指定された問題が見つかりません"
            )
        
        # フィールドを更新
        update_data = problem_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if hasattr(problem, field):
                setattr(problem, field, value)
        
        db.commit()
        db.refresh(problem)
        
        return ProblemResponse(
            id=problem.id,
            problem_number=problem.problem_number,
            title=problem.title,
            description=problem.description,
            status=problem.status,
            priority=problem.priority,
            category=problem.category,
            business_impact=problem.business_impact,
            impact_analysis=problem.impact_analysis,
            affected_services=json.loads(problem.affected_services) if problem.affected_services else [],
            root_cause=problem.root_cause,
            permanent_solution=problem.permanent_solution,
            assignee_id=problem.assignee_id,
            assignee={"id": problem.assignee_id, "display_name": "Assignee User", "email": "assignee@example.com"} if problem.assignee_id else None,
            rca_info=RCAInfo(
                phase=problem.rca_phase,
                started_at=problem.rca_started_at,
                completed_at=problem.rca_completed_at,
                details=json.loads(problem.rca_details) if problem.rca_details else None,
                findings=json.loads(problem.rca_findings) if problem.rca_findings else []
            ),
            related_incidents=[],
            known_errors=[],
            created_at=problem.created_at,
            updated_at=problem.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="問題の更新中にエラーが発生しました"
        )


@router.put(
    "/{problem_id}/rca",
    response_model=SuccessResponse,
    summary="根本原因分析更新",
    description="指定された問題の根本原因分析を更新します",
)
async def update_rca(
    problem_id: UUID,
    rca_data: RCAUpdate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> SuccessResponse:
    """根本原因分析を更新する"""
    try:
        problem = db.query(Problem).filter(
            Problem.id == problem_id,
            Problem.tenant_id == get_user_tenant_id(current_user_id)
        ).first()
        
        if not problem:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="指定された問題が見つかりません"
            )
        
        # RCA情報を更新
        problem.rca_phase = rca_data.phase
        problem.root_cause = rca_data.root_cause
        problem.permanent_solution = rca_data.permanent_solution
        problem.rca_details = json.dumps(rca_data.analysis_details)
        
        # 既存の調査結果を更新
        if rca_data.findings:
            existing_findings = json.loads(problem.rca_findings) if problem.rca_findings else []
            existing_findings.extend(rca_data.findings)
            problem.rca_findings = json.dumps(existing_findings)
            
        # RCAフェーズによってタイムスタンプを更新
        if rca_data.phase == RCAPhase.DATA_COLLECTION and not problem.rca_started_at:
            problem.rca_started_at = datetime.utcnow()
        elif rca_data.phase == RCAPhase.COMPLETED:
            problem.rca_completed_at = datetime.utcnow()
            problem.status = ProblemStatus.SOLUTION_DEVELOPMENT
        
        db.commit()
        
        return SuccessResponse(
            message="根本原因分析が正常に更新されました",
            data={"problem_id": problem_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="根本原因分析の更新中にエラーが発生しました"
        )


@router.post(
    "/{problem_id}/known-errors",
    response_model=KnownErrorResponse,
    status_code=http_status.HTTP_201_CREATED,
    summary="既知のエラー作成",
    description="指定された問題に既知のエラーを追加します",
)
async def create_known_error(
    problem_id: UUID,
    known_error_data: KnownErrorCreate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> KnownErrorResponse:
    """既知のエラーを作成する"""
    try:
        # 問題の存在確認
        problem = db.query(Problem).filter(
            Problem.id == problem_id,
            Problem.tenant_id == get_user_tenant_id(current_user_id)
        ).first()
        
        if not problem:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="指定された問題が見つかりません"
            )
        
        # 既知のエラーを作成
        known_error = KnownError(
            problem_id=problem_id,
            title=known_error_data.title,
            symptoms=known_error_data.symptoms,
            root_cause=known_error_data.root_cause,
            workaround=known_error_data.workaround,
            solution=known_error_data.solution,
            category=known_error_data.category,
            tags=json.dumps(known_error_data.tags) if known_error_data.tags else None,
            search_keywords=known_error_data.search_keywords,
            is_published="Y" if known_error_data.is_published else "N",
            usage_count="0",
            created_by=current_user_id,
            updated_by=current_user_id
        )
        
        db.add(known_error)
        db.commit()
        db.refresh(known_error)
        
        return KnownErrorResponse(
            id=known_error.id,
            problem_id=known_error.problem_id,
            title=known_error.title,
            symptoms=known_error.symptoms,
            root_cause=known_error.root_cause,
            workaround=known_error.workaround,
            solution=known_error.solution,
            category=known_error.category,
            tags=json.loads(known_error.tags) if known_error.tags else [],
            search_keywords=known_error.search_keywords,
            is_published=known_error.is_published == "Y",
            usage_count=int(known_error.usage_count or 0),
            last_used_at=known_error.last_used_at,
            created_by=known_error.created_by,
            updated_by=known_error.updated_by,
            created_at=known_error.created_at,
            updated_at=known_error.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="既知のエラーの作成中にエラーが発生しました"
        )


# RCAワークフロー管理API
@router.post(
    "/{problem_id}/rca/start",
    response_model=Dict[str, Any],
    summary="RCA開始",
    description="指定された問題のRCAを開始します",
)
async def start_rca(
    problem_id: UUID,
    rca_request: RCAStartRequest,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """RCAを開始する"""
    try:
        problem = db.query(Problem).filter(
            Problem.id == problem_id,
            Problem.tenant_id == get_user_tenant_id(current_user_id)
        ).first()
        
        if not problem:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="指定された問題が見つかりません"
            )
        
        # RCA開始
        problem.rca_phase = RCAPhase.DATA_COLLECTION
        problem.rca_started_at = datetime.utcnow()
        problem.status = ProblemStatus.ROOT_CAUSE_ANALYSIS
        
        # RCA詳細情報を設定
        rca_details = {
            "analysis_type": rca_request.analysis_type,
            "team_members": [str(member) for member in rca_request.team_members] if rca_request.team_members else [],
            "initial_notes": rca_request.initial_notes,
            "started_by": str(current_user_id),
            "started_at": datetime.utcnow().isoformat()
        }
        problem.rca_details = json.dumps(rca_details)
        
        db.commit()
        db.refresh(problem)
        
        return {
            "message": "RCAが正常に開始されました",
            "data": {
                "problem_id": problem_id,
                "rca_phase": problem.rca_phase,
                "started_at": problem.rca_started_at
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="RCAの開始中にエラーが発生しました"
        )


@router.put(
    "/{problem_id}/rca/phase",
    response_model=Dict[str, Any],
    summary="RCAフェーズ更新",
    description="RCAの現在のフェーズを更新します",
)
async def update_rca_phase(
    problem_id: UUID,
    phase: RCAPhase,
    notes: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """RCAフェーズを更新する"""
    try:
        problem = db.query(Problem).filter(
            Problem.id == problem_id,
            Problem.tenant_id == get_user_tenant_id(current_user_id)
        ).first()
        
        if not problem:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="指定された問題が見つかりません"
            )
        
        # フェーズを更新
        old_phase = problem.rca_phase
        problem.rca_phase = phase
        
        # フェーズ変更のログを追加
        rca_details = json.loads(problem.rca_details) if problem.rca_details else {}
        if "phase_history" not in rca_details:
            rca_details["phase_history"] = []
            
        rca_details["phase_history"].append({
            "from_phase": old_phase.value if old_phase else None,
            "to_phase": phase.value,
            "changed_at": datetime.utcnow().isoformat(),
            "changed_by": str(current_user_id),
            "notes": notes
        })
        
        problem.rca_details = json.dumps(rca_details)
        
        # 完了時の処理
        if phase == RCAPhase.COMPLETED:
            problem.rca_completed_at = datetime.utcnow()
            problem.status = ProblemStatus.SOLUTION_DEVELOPMENT
        
        db.commit()
        
        return {
            "message": "RCAフェーズが正常に更新されました",
            "data": {
                "problem_id": problem_id,
                "old_phase": old_phase.value if old_phase else None,
                "new_phase": phase.value,
                "completed_at": problem.rca_completed_at
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="RCAフェーズの更新中にエラーが発生しました"
        )


@router.get(
    "/{problem_id}/rca",
    response_model=Dict[str, Any],
    summary="RCA進捗取得",
    description="RCAの進捗状況を取得します",
)
async def get_rca_progress(
    problem_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """RCA進捗を取得する"""
    problem = db.query(Problem).filter(
        Problem.id == problem_id,
        Problem.tenant_id == get_user_tenant_id(current_user_id)
    ).first()
    
    if not problem:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="指定された問題が見つかりません"
        )
    
    # RCA詳細を解析
    rca_details = json.loads(problem.rca_details) if problem.rca_details else {}
    rca_findings = json.loads(problem.rca_findings) if problem.rca_findings else []
    
    # 進捗計算
    phase_progress = {
        RCAPhase.NOT_STARTED.value: 0,
        RCAPhase.DATA_COLLECTION.value: 20,
        RCAPhase.ANALYSIS.value: 40,
        RCAPhase.ROOT_CAUSE_IDENTIFICATION.value: 60,
        RCAPhase.SOLUTION_PLANNING.value: 80,
        RCAPhase.COMPLETED.value: 100
    }
    
    current_progress = phase_progress.get(problem.rca_phase.value, 0)
    
    return {
        "problem_id": problem_id,
        "rca_info": {
            "phase": problem.rca_phase,
            "progress_percentage": current_progress,
            "started_at": problem.rca_started_at,
            "completed_at": problem.rca_completed_at,
            "details": rca_details,
            "findings": rca_findings,
            "findings_count": len(rca_findings)
        }
    }


@router.post(
    "/{problem_id}/rca/findings",
    response_model=Dict[str, Any],
    summary="RCA調査結果追加",
    description="RCAの調査結果を追加します",
)
async def add_rca_finding(
    problem_id: UUID,
    finding_data: RCAFindingCreate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """RCA調査結果を追加する"""
    try:
        problem = db.query(Problem).filter(
            Problem.id == problem_id,
            Problem.tenant_id == get_user_tenant_id(current_user_id)
        ).first()
        
        if not problem:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="指定された問題が見つかりません"
            )
        
        # 新しい調査結果を追加
        existing_findings = json.loads(problem.rca_findings) if problem.rca_findings else []
        
        new_finding = {
            "id": str(UUID.hex),
            "finding_type": finding_data.finding_type,
            "description": finding_data.description,
            "evidence": finding_data.evidence,
            "impact": finding_data.impact,
            "recommendation": finding_data.recommendation,
            "created_by": str(current_user_id),
            "created_at": datetime.utcnow().isoformat()
        }
        
        existing_findings.append(new_finding)
        problem.rca_findings = json.dumps(existing_findings)
        
        db.commit()
        
        return {
            "message": "RCA調査結果が正常に追加されました",
            "data": {
                "problem_id": problem_id,
                "finding": new_finding,
                "total_findings": len(existing_findings)
            }
        }
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="RCA調査結果の追加中にエラーが発生しました"
        )


# 統計・分析API
@router.get(
    "/statistics",
    response_model=ProblemStatistics,
    summary="問題管理統計",
    description="問題管理の統計情報を取得します",
)
async def get_problem_statistics(
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> ProblemStatistics:
    """問題管理統計を取得する"""
    try:
        tenant_id = get_user_tenant_id(current_user_id)
        
        # 基本統計
        total_problems = db.query(func.count(Problem.id)).filter(
            Problem.tenant_id == tenant_id
        ).scalar() or 0
        
        open_problems = db.query(func.count(Problem.id)).filter(
            and_(
                Problem.tenant_id == tenant_id,
                Problem.status.in_([
                    ProblemStatus.DRAFT,
                    ProblemStatus.UNDER_INVESTIGATION,
                    ProblemStatus.ROOT_CAUSE_ANALYSIS,
                    ProblemStatus.SOLUTION_DEVELOPMENT,
                    ProblemStatus.SOLUTION_TESTING
                ])
            )
        ).scalar() or 0
        
        # 今月解決した問題数
        current_month_start = datetime.utcnow().replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        resolved_this_month = db.query(func.count(Problem.id)).filter(
            and_(
                Problem.tenant_id == tenant_id,
                Problem.status == ProblemStatus.RESOLVED,
                Problem.updated_at >= current_month_start
            )
        ).scalar() or 0
        
        # ステータス別統計
        status_stats = db.query(
            Problem.status, func.count(Problem.id)
        ).filter(
            Problem.tenant_id == tenant_id
        ).group_by(Problem.status).all()
        
        by_status = {status.value: count for status, count in status_stats}
        
        # 優先度別統計
        priority_stats = db.query(
            Problem.priority, func.count(Problem.id)
        ).filter(
            Problem.tenant_id == tenant_id
        ).group_by(Problem.priority).all()
        
        by_priority = {priority: count for priority, count in priority_stats}
        
        # カテゴリ別統計
        category_stats = db.query(
            Problem.category, func.count(Problem.id)
        ).filter(
            Problem.tenant_id == tenant_id
        ).group_by(Problem.category).all()
        
        by_category = {category.value: count for category, count in category_stats}
        
        # ビジネス影響別統計
        impact_stats = db.query(
            Problem.business_impact, func.count(Problem.id)
        ).filter(
            Problem.tenant_id == tenant_id
        ).group_by(Problem.business_impact).all()
        
        by_business_impact = {impact.value: count for impact, count in impact_stats}
        
        # 平均解決時間（時間単位）
        avg_resolution_query = db.query(
            func.avg(
                func.extract('epoch', Problem.updated_at - Problem.created_at) / 3600
            )
        ).filter(
            and_(
                Problem.tenant_id == tenant_id,
                Problem.status == ProblemStatus.RESOLVED
            )
        ).scalar()
        
        avg_resolution_time = float(avg_resolution_query) if avg_resolution_query else None
        
        # RCA完了率
        rca_completed = db.query(func.count(Problem.id)).filter(
            and_(
                Problem.tenant_id == tenant_id,
                Problem.rca_phase == RCAPhase.COMPLETED
            )
        ).scalar() or 0
        
        rca_completion_rate = (rca_completed / total_problems * 100) if total_problems > 0 else 0.0
        
        return ProblemStatistics(
            total_problems=total_problems,
            by_status=by_status,
            by_priority=by_priority,
            by_category=by_category,
            by_business_impact=by_business_impact,
            avg_resolution_time=avg_resolution_time,
            open_problems=open_problems,
            resolved_this_month=resolved_this_month,
            rca_completion_rate=round(rca_completion_rate, 2)
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="統計情報の取得中にエラーが発生しました"
        )


@router.get(
    "/trends",
    response_model=ProblemTrends,
    summary="問題トレンド分析",
    description="問題のトレンド分析データを取得します",
)
async def get_problem_trends(
    period: str = Query("30d", description="期間（7d, 30d, 90d, 1y）"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> ProblemTrends:
    """問題トレンド分析を取得する"""
    try:
        tenant_id = get_user_tenant_id(current_user_id)
        
        # 期間設定
        period_days = {
            "7d": 7,
            "30d": 30,
            "90d": 90,
            "1y": 365
        }
        
        days = period_days.get(period, 30)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # 作成トレンド
        created_trends_query = db.query(
            func.date(Problem.created_at).label('date'),
            func.count(Problem.id).label('count')
        ).filter(
            and_(
                Problem.tenant_id == tenant_id,
                Problem.created_at >= start_date
            )
        ).group_by(func.date(Problem.created_at)).order_by(func.date(Problem.created_at)).all()
        
        created_trends = [
            TrendData(period=str(date), value=count, label="作成")
            for date, count in created_trends_query
        ]
        
        # 解決トレンド
        resolved_trends_query = db.query(
            func.date(Problem.updated_at).label('date'),
            func.count(Problem.id).label('count')
        ).filter(
            and_(
                Problem.tenant_id == tenant_id,
                Problem.status == ProblemStatus.RESOLVED,
                Problem.updated_at >= start_date
            )
        ).group_by(func.date(Problem.updated_at)).order_by(func.date(Problem.updated_at)).all()
        
        resolved_trends = [
            TrendData(period=str(date), value=count, label="解決")
            for date, count in resolved_trends_query
        ]
        
        # カテゴリトレンド
        category_trends_query = db.query(
            Problem.category,
            func.count(Problem.id).label('count')
        ).filter(
            and_(
                Problem.tenant_id == tenant_id,
                Problem.created_at >= start_date
            )
        ).group_by(Problem.category).order_by(func.count(Problem.id).desc()).all()
        
        category_trends = [
            TrendData(period=period, value=count, label=category.value)
            for category, count in category_trends_query
        ]
        
        # 影響度トレンド
        impact_trends_query = db.query(
            Problem.business_impact,
            func.count(Problem.id).label('count')
        ).filter(
            and_(
                Problem.tenant_id == tenant_id,
                Problem.created_at >= start_date
            )
        ).group_by(Problem.business_impact).order_by(func.count(Problem.id).desc()).all()
        
        impact_trends = [
            TrendData(period=period, value=count, label=impact.value)
            for impact, count in impact_trends_query
        ]
        
        # 解決時間トレンド（日単位の平均）
        resolution_time_trends_query = db.query(
            func.date(Problem.updated_at).label('date'),
            func.avg(
                func.extract('epoch', Problem.updated_at - Problem.created_at) / 3600
            ).label('avg_hours')
        ).filter(
            and_(
                Problem.tenant_id == tenant_id,
                Problem.status == ProblemStatus.RESOLVED,
                Problem.updated_at >= start_date
            )
        ).group_by(func.date(Problem.updated_at)).order_by(func.date(Problem.updated_at)).all()
        
        resolution_time_trends = [
            TrendData(period=str(date), value=int(avg_hours or 0), label="解決時間（時間）")
            for date, avg_hours in resolution_time_trends_query
        ]
        
        return ProblemTrends(
            created_trends=created_trends,
            resolved_trends=resolved_trends,
            category_trends=category_trends,
            impact_trends=impact_trends,
            resolution_time_trends=resolution_time_trends
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="トレンド分析の取得中にエラーが発生しました"
        )


@router.get(
    "/kpis",
    response_model=KPIMetrics,
    summary="KPIメトリクス",
    description="問題管理のKPIメトリクスを取得します",
)
async def get_problem_kpis(
    period: str = Query("30d", description="期間（7d, 30d, 90d, 1y）"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> KPIMetrics:
    """KPIメトリクスを取得する"""
    try:
        tenant_id = get_user_tenant_id(current_user_id)
        
        # 期間設定
        period_days = {
            "7d": 7,
            "30d": 30,
            "90d": 90,
            "1y": 365
        }
        
        days = period_days.get(period, 30)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # MTTR (Mean Time To Repair) - 時間単位
        mttr_query = db.query(
            func.avg(
                func.extract('epoch', Problem.updated_at - Problem.created_at) / 3600
            )
        ).filter(
            and_(
                Problem.tenant_id == tenant_id,
                Problem.status == ProblemStatus.RESOLVED,
                Problem.updated_at >= start_date
            )
        ).scalar()
        
        mttr = float(mttr_query) if mttr_query else None
        
        # MTBF (Mean Time Between Failures) - 概算値
        total_problems = db.query(func.count(Problem.id)).filter(
            and_(
                Problem.tenant_id == tenant_id,
                Problem.created_at >= start_date
            )
        ).scalar() or 0
        
        mtbf = (days * 24 / total_problems) if total_problems > 0 else None
        
        # 初回解決率（仮の計算）
        first_call_resolution = 75.0  # 実際の計算ロジックを実装
        
        # 問題再発率
        # 簡略化: 同じカテゴリで複数回発生している問題の割合
        recurring_problems = db.query(
            Problem.category,
            func.count(Problem.id).label('count')
        ).filter(
            and_(
                Problem.tenant_id == tenant_id,
                Problem.created_at >= start_date
            )
        ).group_by(Problem.category).having(func.count(Problem.id) > 1).all()
        
        total_unique_categories = db.query(
            func.count(func.distinct(Problem.category))
        ).filter(
            and_(
                Problem.tenant_id == tenant_id,
                Problem.created_at >= start_date
            )
        ).scalar() or 0
        
        problem_recurrence_rate = (len(recurring_problems) / total_unique_categories * 100) if total_unique_categories > 0 else 0.0
        
        # RCA効果度スコア
        rca_completed = db.query(func.count(Problem.id)).filter(
            and_(
                Problem.tenant_id == tenant_id,
                Problem.rca_phase == RCAPhase.COMPLETED,
                Problem.created_at >= start_date
            )
        ).scalar() or 0
        
        rca_problems = db.query(func.count(Problem.id)).filter(
            and_(
                Problem.tenant_id == tenant_id,
                Problem.rca_phase != RCAPhase.NOT_STARTED,
                Problem.created_at >= start_date
            )
        ).scalar() or 0
        
        rca_effectiveness_score = (rca_completed / rca_problems * 100) if rca_problems > 0 else 0.0
        
        # SLA遵守率（仮の値）
        sla_compliance_rate = 85.0  # 実際のSLA計算ロジックを実装
        
        return KPIMetrics(
            mttr=round(mttr, 2) if mttr else None,
            mtbf=round(mtbf, 2) if mtbf else None,
            first_call_resolution_rate=first_call_resolution,
            problem_recurrence_rate=round(problem_recurrence_rate, 2),
            rca_effectiveness_score=round(rca_effectiveness_score, 2),
            customer_satisfaction_score=None,  # 外部システムから取得
            sla_compliance_rate=sla_compliance_rate
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="KPIメトリクスの取得中にエラーが発生しました"
        )


# 一括操作API
@router.put(
    "/bulk-update",
    response_model=BulkOperationResult,
    summary="問題一括更新",
    description="複数の問題を一括で更新します",
)
async def bulk_update_problems(
    bulk_request: BulkUpdateRequest,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> BulkOperationResult:
    """問題を一括更新する"""
    try:
        tenant_id = get_user_tenant_id(current_user_id)
        success_count = 0
        failed_count = 0
        failed_items = []
        
        for problem_id in bulk_request.problem_ids:
            try:
                problem = db.query(Problem).filter(
                    and_(
                        Problem.id == problem_id,
                        Problem.tenant_id == tenant_id
                    )
                ).first()
                
                if not problem:
                    failed_count += 1
                    failed_items.append({
                        "id": str(problem_id),
                        "error": "問題が見つかりません"
                    })
                    continue
                
                # フィールドを更新
                update_data = bulk_request.updates.model_dump(exclude_unset=True)
                for field, value in update_data.items():
                    if field == "affected_services" and value is not None:
                        problem.affected_services = json.dumps(value)
                    elif hasattr(problem, field):
                        setattr(problem, field, value)
                
                success_count += 1
                
            except Exception as e:
                failed_count += 1
                failed_items.append({
                    "id": str(problem_id),
                    "error": str(e)
                })
        
        db.commit()
        
        return BulkOperationResult(
            success_count=success_count,
            failed_count=failed_count,
            failed_items=failed_items,
            message=f"{success_count}件の問題が正常に更新されました。{failed_count}件の更新に失敗しました。"
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="一括更新中にエラーが発生しました"
        )


@router.delete(
    "/bulk-delete",
    response_model=BulkOperationResult,
    summary="問題一括削除",
    description="複数の問題を一括で削除します",
)
async def bulk_delete_problems(
    bulk_request: BulkDeleteRequest,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> BulkOperationResult:
    """問題を一括削除する"""
    try:
        tenant_id = get_user_tenant_id(current_user_id)
        success_count = 0
        failed_count = 0
        failed_items = []
        
        for problem_id in bulk_request.problem_ids:
            try:
                problem = db.query(Problem).filter(
                    and_(
                        Problem.id == problem_id,
                        Problem.tenant_id == tenant_id
                    )
                ).first()
                
                if not problem:
                    failed_count += 1
                    failed_items.append({
                        "id": str(problem_id),
                        "error": "問題が見つかりません"
                    })
                    continue
                
                # 関連データの整合性チェック
                if problem.status in [ProblemStatus.UNDER_INVESTIGATION, ProblemStatus.ROOT_CAUSE_ANALYSIS]:
                    failed_count += 1
                    failed_items.append({
                        "id": str(problem_id),
                        "error": "調査中または分析中の問題は削除できません"
                    })
                    continue
                
                db.delete(problem)
                success_count += 1
                
            except Exception as e:
                failed_count += 1
                failed_items.append({
                    "id": str(problem_id),
                    "error": str(e)
                })
        
        db.commit()
        
        return BulkOperationResult(
            success_count=success_count,
            failed_count=failed_count,
            failed_items=failed_items,
            message=f"{success_count}件の問題が正常に削除されました。{failed_count}件の削除に失敗しました。理由: {bulk_request.reason}"
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="一括削除中にエラーが発生しました"
        )


@router.get(
    "/export",
    summary="問題データエクスポート",
    description="問題データをCSV形式でエクスポートします",
)
async def export_problems(
    format: str = Query("csv", description="エクスポート形式"),
    status_filter: Optional[List[str]] = Query(None, description="ステータスフィルター"),
    category: Optional[List[str]] = Query(None, description="カテゴリフィルター"),
    date_from: Optional[str] = Query(None, description="開始日（YYYY-MM-DD）"),
    date_to: Optional[str] = Query(None, description="終了日（YYYY-MM-DD）"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
):
    """問題データをエクスポートする"""
    try:
        from fastapi.responses import StreamingResponse
        import io
        import csv
        
        tenant_id = get_user_tenant_id(current_user_id)
        
        # クエリ構築
        query = db.query(Problem).filter(Problem.tenant_id == tenant_id)
        
        # フィルター適用
        if status_filter:
            query = query.filter(Problem.status.in_(status_filter))
        
        if category:
            category_enums = [ProblemCategory(cat) for cat in category if cat in [e.value for e in ProblemCategory]]
            if category_enums:
                query = query.filter(Problem.category.in_(category_enums))
        
        if date_from:
            try:
                from_date = datetime.strptime(date_from, "%Y-%m-%d")
                query = query.filter(Problem.created_at >= from_date)
            except ValueError:
                pass
        
        if date_to:
            try:
                to_date = datetime.strptime(date_to, "%Y-%m-%d")
                query = query.filter(Problem.created_at <= to_date)
            except ValueError:
                pass
        
        problems = query.order_by(Problem.created_at).all()
        
        # CSV生成
        if format.lower() == "csv":
            output = io.StringIO()
            writer = csv.writer(output)
            
            # ヘッダー
            writer.writerow([
                "問題番号", "タイトル", "ステータス", "優先度", "カテゴリ",
                "ビジネス影響", "担当者ID", "RCAフェーズ", "作成日", "更新日"
            ])
            
            # データ行
            for problem in problems:
                writer.writerow([
                    problem.problem_number,
                    problem.title,
                    problem.status.value,
                    problem.priority,
                    problem.category.value,
                    problem.business_impact.value,
                    str(problem.assignee_id) if problem.assignee_id else "",
                    problem.rca_phase.value,
                    problem.created_at.strftime("%Y-%m-%d %H:%M:%S"),
                    problem.updated_at.strftime("%Y-%m-%d %H:%M:%S")
                ])
            
            output.seek(0)
            
            response = StreamingResponse(
                io.BytesIO(output.getvalue().encode('utf-8-sig')),
                media_type="text/csv",
                headers={"Content-Disposition": f"attachment; filename=problems_export_{datetime.now().strftime('%Y%m%d_%H%M%S')}.csv"}
            )
            
            return response
        else:
            raise HTTPException(
                status_code=http_status.HTTP_400_BAD_REQUEST,
                detail="サポートされていないエクスポート形式です"
            )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="エクスポート中にエラーが発生しました"
        )