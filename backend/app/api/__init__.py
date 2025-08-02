"""API初期化"""

from fastapi import APIRouter

from .v1 import incidents_router, problems_router, changes_router, auth_router, dashboard_router, users_router, attachments_router  # , custom_fields_router

# メインAPIルーター
api_router = APIRouter()

# v1ルーターをマウント
api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(incidents_router, prefix="/incidents", tags=["incidents"])
api_router.include_router(problems_router, prefix="/problems", tags=["problems"])
api_router.include_router(changes_router, prefix="/changes", tags=["changes"])
api_router.include_router(attachments_router, prefix="/attachments", tags=["attachments"])
# api_router.include_router(custom_fields_router, prefix="/custom-fields", tags=["custom-fields"])

__all__ = ["api_router"]