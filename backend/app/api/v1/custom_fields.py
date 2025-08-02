"""カスタムフィールド管理API"""

from typing import List, Optional, Dict, Any
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.db.base import get_db
from app.services.custom_field_service import CustomFieldService
from app.schemas.common import SuccessResponse, APIError
from app.api.v1.auth import get_current_user_id, require_permission
from app.core.cache import cache_manager
from app.core.performance import measure_time, compress_response

router = APIRouter()


@router.get(
    "/definitions",
    response_model=List[Dict[str, Any]],
    summary="カスタムフィールド定義一覧取得",
    description="利用可能なカスタムフィールド定義一覧を取得します",
    responses={
        200: {"description": "カスタムフィールド定義一覧を正常に取得しました"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
@measure_time("list_custom_field_definitions")
async def list_custom_field_definitions(
    entity_type: Optional[str] = Query(
        None, description="エンティティタイプ（incident, user, problem等）"
    ),
    category: Optional[str] = Query(None, description="カテゴリフィルター"),
    is_active: bool = Query(True, description="アクティブなフィールドのみ取得"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> List[Dict[str, Any]]:
    """カスタムフィールド定義一覧を取得する"""

    # キャッシュキーを生成
    cache_key = f"custom_field_definitions:{entity_type}:{category}:{is_active}"

    # キャッシュから取得を試行
    cached_result = cache_manager.get(cache_key)
    if cached_result is not None:
        return cached_result

    service = CustomFieldService(db)
    result = service.list_field_definitions(
        entity_type=entity_type,
        category=category,
        is_active=is_active,
        current_user_id=current_user_id,
    )

    # キャッシュに保存（10分間）
    cache_manager.set(cache_key, result, expire=600)

    return result


@router.post(
    "/definitions",
    response_model=Dict[str, Any],
    status_code=status.HTTP_201_CREATED,
    summary="カスタムフィールド定義作成",
    description="新しいカスタムフィールド定義を作成します",
    responses={
        201: {"description": "カスタムフィールド定義が正常に作成されました"},
        400: {"model": APIError, "description": "リクエストデータが不正です"},
        403: {
            "model": APIError,
            "description": "カスタムフィールド作成権限がありません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def create_custom_field_definition(
    field_definition: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("custom_fields", "create")),
) -> Dict[str, Any]:
    """カスタムフィールド定義を作成する"""
    service = CustomFieldService(db)
    result = service.create_field_definition(
        field_definition=field_definition, current_user_id=current_user_id
    )

    # カスタムフィールド定義キャッシュを無効化
    cache_manager.delete_pattern("custom_field_definitions:*")

    return result


@router.get(
    "/definitions/{field_id}",
    response_model=Dict[str, Any],
    summary="カスタムフィールド定義詳細取得",
    description="指定されたカスタムフィールド定義の詳細を取得します",
    responses={
        200: {"description": "カスタムフィールド定義詳細を正常に取得しました"},
        404: {
            "model": APIError,
            "description": "指定されたカスタムフィールド定義が見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def get_custom_field_definition(
    field_id: UUID,
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> Dict[str, Any]:
    """カスタムフィールド定義の詳細を取得する"""
    service = CustomFieldService(db)
    return service.get_field_definition(field_id, current_user_id)


@router.put(
    "/definitions/{field_id}",
    response_model=Dict[str, Any],
    summary="カスタムフィールド定義更新",
    description="指定されたカスタムフィールド定義を更新します",
    responses={
        200: {"description": "カスタムフィールド定義が正常に更新されました"},
        400: {"model": APIError, "description": "リクエストデータが不正です"},
        404: {
            "model": APIError,
            "description": "指定されたカスタムフィールド定義が見つかりません",
        },
        403: {
            "model": APIError,
            "description": "カスタムフィールド更新権限がありません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def update_custom_field_definition(
    field_id: UUID,
    field_definition: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("custom_fields", "update")),
) -> Dict[str, Any]:
    """カスタムフィールド定義を更新する"""
    service = CustomFieldService(db)
    result = service.update_field_definition(
        field_id=field_id,
        field_definition=field_definition,
        current_user_id=current_user_id,
    )

    # カスタムフィールド定義キャッシュを無効化
    cache_manager.delete_pattern("custom_field_definitions:*")

    return result


@router.delete(
    "/definitions/{field_id}",
    response_model=SuccessResponse,
    summary="カスタムフィールド定義削除",
    description="指定されたカスタムフィールド定義を削除します",
    responses={
        200: {"description": "カスタムフィールド定義が正常に削除されました"},
        404: {
            "model": APIError,
            "description": "指定されたカスタムフィールド定義が見つかりません",
        },
        403: {
            "model": APIError,
            "description": "カスタムフィールド削除権限がありません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def delete_custom_field_definition(
    field_id: UUID,
    force_delete: bool = Query(False, description="強制削除（使用中でも削除）"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
    _: None = Depends(require_permission("custom_fields", "delete")),
) -> SuccessResponse:
    """カスタムフィールド定義を削除する"""
    service = CustomFieldService(db)
    service.delete_field_definition(
        field_id=field_id, force_delete=force_delete, current_user_id=current_user_id
    )

    # カスタムフィールド定義キャッシュを無効化
    cache_manager.delete_pattern("custom_field_definitions:*")

    return SuccessResponse(
        message="カスタムフィールド定義が正常に削除されました",
        data={"field_id": field_id},
    )


@router.get(
    "/values/{entity_type}/{entity_id}",
    response_model=Dict[str, Any],
    summary="エンティティのカスタムフィールド値取得",
    description="指定されたエンティティのカスタムフィールド値を取得します",
    responses={
        200: {"description": "カスタムフィールド値を正常に取得しました"},
        404: {
            "model": APIError,
            "description": "指定されたエンティティが見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def get_custom_field_values(
    entity_type: str,
    entity_id: UUID,
    include_definitions: bool = Query(True, description="フィールド定義も含むか"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> Dict[str, Any]:
    """エンティティのカスタムフィールド値を取得する"""
    service = CustomFieldService(db)
    return service.get_entity_custom_fields(
        entity_type=entity_type,
        entity_id=entity_id,
        include_definitions=include_definitions,
        current_user_id=current_user_id,
    )


@router.put(
    "/values/{entity_type}/{entity_id}",
    response_model=Dict[str, Any],
    summary="エンティティのカスタムフィールド値更新",
    description="指定されたエンティティのカスタムフィールド値を更新します",
    responses={
        200: {"description": "カスタムフィールド値が正常に更新されました"},
        400: {"model": APIError, "description": "リクエストデータが不正です"},
        404: {
            "model": APIError,
            "description": "指定されたエンティティが見つかりません",
        },
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def update_custom_field_values(
    entity_type: str,
    entity_id: UUID,
    field_values: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> Dict[str, Any]:
    """エンティティのカスタムフィールド値を更新する"""
    service = CustomFieldService(db)
    return service.update_entity_custom_fields(
        entity_type=entity_type,
        entity_id=entity_id,
        field_values=field_values,
        current_user_id=current_user_id,
    )


@router.get(
    "/validation/{entity_type}",
    response_model=Dict[str, Any],
    summary="カスタムフィールドバリデーション",
    description="指定されたエンティティタイプのカスタムフィールド値をバリデーションします",
    responses={
        200: {"description": "バリデーション結果を正常に取得しました"},
        400: {"model": APIError, "description": "リクエストデータが不正です"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def validate_custom_field_values(
    entity_type: str,
    field_values: Dict[str, Any],
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> Dict[str, Any]:
    """カスタムフィールド値をバリデーションする"""
    service = CustomFieldService(db)
    return service.validate_field_values(
        entity_type=entity_type,
        field_values=field_values,
        current_user_id=current_user_id,
    )


@router.get(
    "/search",
    response_model=Dict[str, Any],
    summary="カスタムフィールド値による検索",
    description="カスタムフィールド値を使用してエンティティを検索します",
    responses={
        200: {"description": "検索結果を正常に取得しました"},
        400: {"model": APIError, "description": "リクエストデータが不正です"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
@compress_response(min_size=1500)
async def search_by_custom_fields(
    entity_type: str = Query(..., description="検索対象エンティティタイプ"),
    search_criteria: Dict[str, Any] = Query(..., description="検索条件"),
    page: int = Query(1, ge=1, description="ページ番号"),
    per_page: int = Query(20, ge=1, le=100, description="1ページあたりの件数"),
    sort_by: Optional[str] = Query(None, description="ソート対象フィールド"),
    sort_order: str = Query("asc", pattern="^(asc|desc)$", description="ソート順"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> Dict[str, Any]:
    """カスタムフィールド値による検索を実行する"""
    service = CustomFieldService(db)
    return service.search_by_custom_fields(
        entity_type=entity_type,
        search_criteria=search_criteria,
        current_user_id=current_user_id,
        page=page,
        per_page=per_page,
        sort_by=sort_by,
        sort_order=sort_order,
    )


@router.get(
    "/statistics/{entity_type}",
    response_model=Dict[str, Any],
    summary="カスタムフィールド統計情報取得",
    description="指定されたエンティティタイプのカスタムフィールド統計を取得します",
    responses={
        200: {"description": "統計情報を正常に取得しました"},
        500: {"model": APIError, "description": "サーバーエラーが発生しました"},
    },
)
async def get_custom_field_statistics(
    entity_type: str,
    field_names: Optional[List[str]] = Query(None, description="統計対象フィールド名"),
    date_from: Optional[str] = Query(None, description="集計開始日"),
    date_to: Optional[str] = Query(None, description="集計終了日"),
    db: Session = Depends(get_db),
    current_user_id: UUID = Depends(get_current_user_id),
) -> Dict[str, Any]:
    """カスタムフィールドの統計情報を取得する"""
    service = CustomFieldService(db)
    return service.get_field_statistics(
        entity_type=entity_type,
        field_names=field_names,
        date_from=date_from,
        date_to=date_to,
        current_user_id=current_user_id,
    )
