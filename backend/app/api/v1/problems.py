"""問題管理API"""

from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query
from fastapi import status as http_status
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.models.problem import Problem, ProblemIncident, KnownError
from app.schemas.problem import (
    ProblemCreate, ProblemUpdate, ProblemResponse, 
    RCAUpdate, KnownErrorCreate, KnownErrorResponse
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
            impact_analysis=problem_data.impact_analysis,
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
            impact_analysis=db_problem.impact_analysis,
            root_cause=db_problem.root_cause,
            permanent_solution=db_problem.permanent_solution,
            assignee_id=db_problem.assignee_id,
            assignee={"id": db_problem.assignee_id, "display_name": "Assignee User", "email": "assignee@example.com"} if db_problem.assignee_id else None,
            rca_details=db_problem.rca_details,
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
    assignee_id: Optional[UUID] = Query(None, description="担当者IDフィルター"),
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
        
        if assignee_id:
            query = query.filter(Problem.assignee_id == assignee_id)
        
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
                impact_analysis=problem.impact_analysis,
                root_cause=problem.root_cause,
                permanent_solution=problem.permanent_solution,
                assignee_id=problem.assignee_id,
                assignee={"id": problem.assignee_id, "display_name": "Assignee User", "email": "assignee@example.com"} if problem.assignee_id else None,
                rca_details=problem.rca_details,
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
        impact_analysis=problem.impact_analysis,
        root_cause=problem.root_cause,
        permanent_solution=problem.permanent_solution,
        assignee_id=problem.assignee_id,
        assignee={"id": problem.assignee_id, "display_name": "Assignee User", "email": "assignee@example.com"} if problem.assignee_id else None,
        rca_details=problem.rca_details,
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
            impact_analysis=problem.impact_analysis,
            root_cause=problem.root_cause,
            permanent_solution=problem.permanent_solution,
            assignee_id=problem.assignee_id,
            assignee={"id": problem.assignee_id, "display_name": "Assignee User", "email": "assignee@example.com"} if problem.assignee_id else None,
            rca_details=problem.rca_details,
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
        problem.root_cause = rca_data.root_cause
        problem.permanent_solution = rca_data.permanent_solution
        problem.rca_details = rca_data.analysis_details
        
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
            is_published="Y" if known_error_data.is_published else "N",
            usage_count="0"
        )
        
        db.add(known_error)
        db.commit()
        db.refresh(known_error)
        
        return KnownErrorResponse(
            id=known_error.id,
            title=known_error.title,
            symptoms=known_error.symptoms,
            root_cause=known_error.root_cause,
            workaround=known_error.workaround,
            solution=known_error.solution,
            is_published=known_error.is_published == "Y",
            usage_count=int(known_error.usage_count or 0),
            created_at=known_error.created_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="既知のエラーの作成中にエラーが発生しました"
        )