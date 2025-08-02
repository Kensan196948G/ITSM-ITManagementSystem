"""既知エラー管理API"""

from typing import List, Optional, Dict, Any
from uuid import UUID
from datetime import datetime, timedelta
import json

from fastapi import APIRouter, Depends, HTTPException, Query, status as http_status
from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc, asc

from app.db.base import get_db
from app.models.problem import KnownError, ProblemCategory
from app.schemas.problem import (
    KnownErrorCreate, KnownErrorUpdate, KnownErrorResponse
)
from app.schemas.common import SuccessResponse

router = APIRouter()


def get_current_user_id() -> UUID:
    """現在のユーザーIDを取得する（仮実装）"""
    return UUID("12345678-1234-1234-1234-123456789012")


def get_user_tenant_id(user_id: UUID) -> UUID:
    """ユーザーのテナントIDを取得する（仮実装）"""
    return UUID("12345678-1234-1234-1234-123456789012")


@router.get(
    "/",
    response_model=Dict[str, Any],
    summary="既知エラー一覧取得",
    description="既知エラーの一覧を取得します",
)
async def list_known_errors(
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(20, ge=1, le=100, description="1ページあたりの件数"),
    category: Optional[List[str]] = Query(None, description="カテゴリフィルター"),
    is_published: Optional[bool] = Query(None, description="公開状態フィルター"),
    search: Optional[str] = Query(None, description="検索キーワード"),
    tags: Optional[List[str]] = Query(None, description="タグフィルター"),
    sort_by: Optional[str] = Query("created_at", description="ソートフィールド"),
    sort_order: Optional[str] = Query("desc", description="ソート順序"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """既知エラー一覧を取得する"""
    try:
        # 基本クエリ（テナント制限なし - 既知エラーは共有リソース）
        query = db.query(KnownError)
        
        # フィルター適用
        if category:
            category_enums = [ProblemCategory(cat) for cat in category if cat in [e.value for e in ProblemCategory]]
            if category_enums:
                query = query.filter(KnownError.category.in_(category_enums))
        
        if is_published is not None:
            pub_value = "Y" if is_published else "N"
            query = query.filter(KnownError.is_published == pub_value)
        
        # 検索機能
        if search:
            search_filter = or_(
                KnownError.title.ilike(f"%{search}%"),
                KnownError.symptoms.ilike(f"%{search}%"),
                KnownError.search_keywords.ilike(f"%{search}%"),
                KnownError.solution.ilike(f"%{search}%")
            )
            query = query.filter(search_filter)
        
        # タグフィルター
        if tags:
            for tag in tags:
                query = query.filter(KnownError.tags.ilike(f'%"{tag}"%'))
        
        # ソート
        if sort_by and hasattr(KnownError, sort_by):
            sort_column = getattr(KnownError, sort_by)
            if sort_order.lower() == "asc":
                query = query.order_by(asc(sort_column))
            else:
                query = query.order_by(desc(sort_column))
        else:
            query = query.order_by(desc(KnownError.created_at))
        
        # 総件数
        total_count = query.count()
        
        # ページネーション
        offset = (page - 1) * per_page
        known_errors = query.offset(offset).limit(per_page).all()
        
        # レスポンス構築
        known_error_list = []
        for ke in known_errors:
            known_error_list.append(KnownErrorResponse(
                id=ke.id,
                problem_id=ke.problem_id,
                title=ke.title,
                symptoms=ke.symptoms,
                root_cause=ke.root_cause,
                workaround=ke.workaround,
                solution=ke.solution,
                category=ke.category,
                tags=json.loads(ke.tags) if ke.tags else [],
                search_keywords=ke.search_keywords,
                is_published=ke.is_published == "Y",
                usage_count=int(ke.usage_count or 0),
                last_used_at=ke.last_used_at,
                created_by=ke.created_by,
                updated_by=ke.updated_by,
                created_at=ke.created_at,
                updated_at=ke.updated_at
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
            "data": known_error_list,
            "meta": meta
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="既知エラー一覧の取得中にエラーが発生しました"
        )


@router.get(
    "/{known_error_id}",
    response_model=KnownErrorResponse,
    summary="既知エラー詳細取得",
    description="指定された既知エラーの詳細情報を取得します",
)
async def get_known_error(
    known_error_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> KnownErrorResponse:
    """既知エラーの詳細を取得し、利用回数を更新する"""
    known_error = db.query(KnownError).filter(
        KnownError.id == known_error_id
    ).first()
    
    if not known_error:
        raise HTTPException(
            status_code=http_status.HTTP_404_NOT_FOUND,
            detail="指定された既知エラーが見つかりません"
        )
    
    # 利用回数を更新
    try:
        current_count = int(known_error.usage_count or 0)
        known_error.usage_count = str(current_count + 1)
        known_error.last_used_at = datetime.utcnow()
        db.commit()
    except Exception:
        # 利用回数の更新に失敗しても継続
        db.rollback()
    
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


@router.post(
    "/",
    response_model=KnownErrorResponse,
    status_code=http_status.HTTP_201_CREATED,
    summary="既知エラー作成",
    description="新しい既知エラーを作成します",
)
async def create_known_error(
    known_error_data: KnownErrorCreate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> KnownErrorResponse:
    """既知エラーを作成する"""
    try:
        # 既知エラーを作成
        known_error = KnownError(
            problem_id=None,  # 独立した既知エラー
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
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="既知エラーの作成中にエラーが発生しました"
        )


@router.put(
    "/{known_error_id}",
    response_model=KnownErrorResponse,
    summary="既知エラー更新",
    description="指定された既知エラーの情報を更新します",
)
async def update_known_error(
    known_error_id: UUID,
    known_error_data: KnownErrorUpdate,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> KnownErrorResponse:
    """既知エラーを更新する"""
    try:
        known_error = db.query(KnownError).filter(
            KnownError.id == known_error_id
        ).first()
        
        if not known_error:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="指定された既知エラーが見つかりません"
            )
        
        # フィールドを更新
        update_data = known_error_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            if field == "tags" and value is not None:
                known_error.tags = json.dumps(value)
            elif field == "is_published" and value is not None:
                known_error.is_published = "Y" if value else "N"
            elif hasattr(known_error, field):
                setattr(known_error, field, value)
        
        known_error.updated_by = current_user_id
        
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
            detail="既知エラーの更新中にエラーが発生しました"
        )


@router.delete(
    "/{known_error_id}",
    response_model=SuccessResponse,
    summary="既知エラー削除",
    description="指定された既知エラーを削除します",
)
async def delete_known_error(
    known_error_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> SuccessResponse:
    """既知エラーを削除する"""
    try:
        known_error = db.query(KnownError).filter(
            KnownError.id == known_error_id
        ).first()
        
        if not known_error:
            raise HTTPException(
                status_code=http_status.HTTP_404_NOT_FOUND,
                detail="指定された既知エラーが見つかりません"
            )
        
        db.delete(known_error)
        db.commit()
        
        return SuccessResponse(
            message="既知エラーが正常に削除されました",
            data={"known_error_id": known_error_id}
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="既知エラーの削除中にエラーが発生しました"
        )


@router.get(
    "/search/similar",
    response_model=List[KnownErrorResponse],
    summary="類似既知エラー検索",
    description="指定された症状や問題に類似する既知エラーを検索します",
)
async def search_similar_known_errors(
    symptoms: Optional[str] = Query(None, description="症状"),
    keywords: Optional[str] = Query(None, description="キーワード"),
    category: Optional[str] = Query(None, description="カテゴリ"),
    limit: int = Query(10, ge=1, le=50, description="結果件数制限"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> List[KnownErrorResponse]:
    """類似既知エラーを検索する"""
    try:
        query = db.query(KnownError).filter(KnownError.is_published == "Y")
        
        if category:
            try:
                category_enum = ProblemCategory(category)
                query = query.filter(KnownError.category == category_enum)
            except ValueError:
                pass  # 無効なカテゴリは無視
        
        # 類似性検索（簡略化）
        if symptoms or keywords:
            search_terms = []
            if symptoms:
                search_terms.extend(symptoms.lower().split())
            if keywords:
                search_terms.extend(keywords.lower().split())
            
            if search_terms:
                search_conditions = []
                for term in search_terms[:5]:  # 最大5つの用語まで
                    search_conditions.append(
                        or_(
                            KnownError.symptoms.ilike(f"%{term}%"),
                            KnownError.title.ilike(f"%{term}%"),
                            KnownError.search_keywords.ilike(f"%{term}%")
                        )
                    )
                
                if search_conditions:
                    query = query.filter(or_(*search_conditions))
        
        # 利用回数の多い順にソート
        known_errors = query.order_by(
            desc(func.cast(KnownError.usage_count, db.Integer))
        ).limit(limit).all()
        
        result = []
        for ke in known_errors:
            result.append(KnownErrorResponse(
                id=ke.id,
                problem_id=ke.problem_id,
                title=ke.title,
                symptoms=ke.symptoms,
                root_cause=ke.root_cause,
                workaround=ke.workaround,
                solution=ke.solution,
                category=ke.category,
                tags=json.loads(ke.tags) if ke.tags else [],
                search_keywords=ke.search_keywords,
                is_published=ke.is_published == "Y",
                usage_count=int(ke.usage_count or 0),
                last_used_at=ke.last_used_at,
                created_by=ke.created_by,
                updated_by=ke.updated_by,
                created_at=ke.created_at,
                updated_at=ke.updated_at
            ))
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="類似既知エラーの検索中にエラーが発生しました"
        )


@router.get(
    "/statistics/usage",
    response_model=Dict[str, Any],
    summary="既知エラー利用統計",
    description="既知エラーの利用統計を取得します",
)
async def get_known_error_usage_statistics(
    period: str = Query("30d", description="期間（7d, 30d, 90d, 1y）"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id)
) -> Dict[str, Any]:
    """既知エラー利用統計を取得する"""
    try:
        # 期間設定
        period_days = {
            "7d": 7,
            "30d": 30,
            "90d": 90,
            "1y": 365
        }
        
        days = period_days.get(period, 30)
        start_date = datetime.utcnow() - timedelta(days=days)
        
        # 基本統計
        total_known_errors = db.query(func.count(KnownError.id)).scalar() or 0
        published_known_errors = db.query(func.count(KnownError.id)).filter(
            KnownError.is_published == "Y"
        ).scalar() or 0
        
        # 最も利用された既知エラー（TOP 10）
        top_used = db.query(
            KnownError.id,
            KnownError.title,
            KnownError.usage_count,
            KnownError.category
        ).filter(
            KnownError.is_published == "Y"
        ).order_by(
            desc(func.cast(KnownError.usage_count, db.Integer))
        ).limit(10).all()
        
        top_used_list = [
            {
                "id": str(ke.id),
                "title": ke.title,
                "usage_count": int(ke.usage_count or 0),
                "category": ke.category.value
            }
            for ke in top_used
        ]
        
        # カテゴリ別統計
        category_stats = db.query(
            KnownError.category,
            func.count(KnownError.id).label('count'),
            func.sum(func.cast(KnownError.usage_count, db.Integer)).label('total_usage')
        ).filter(
            KnownError.is_published == "Y"
        ).group_by(KnownError.category).all()
        
        category_statistics = [
            {
                "category": cat.value,
                "known_error_count": count,
                "total_usage": int(total_usage or 0)
            }
            for cat, count, total_usage in category_stats
        ]
        
        # 最近作成された既知エラー
        recent_created = db.query(
            KnownError.id,
            KnownError.title,
            KnownError.created_at
        ).filter(
            and_(
                KnownError.is_published == "Y",
                KnownError.created_at >= start_date
            )
        ).order_by(desc(KnownError.created_at)).limit(5).all()
        
        recent_created_list = [
            {
                "id": str(ke.id),
                "title": ke.title,
                "created_at": ke.created_at.isoformat()
            }
            for ke in recent_created
        ]
        
        return {
            "summary": {
                "total_known_errors": total_known_errors,
                "published_known_errors": published_known_errors,
                "publication_rate": round((published_known_errors / total_known_errors * 100), 2) if total_known_errors > 0 else 0
            },
            "top_used": top_used_list,
            "category_statistics": category_statistics,
            "recent_created": recent_created_list,
            "period": period
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=http_status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="既知エラー利用統計の取得中にエラーが発生しました"
        )