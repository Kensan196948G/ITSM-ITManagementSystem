"""API初期化"""

from fastapi import APIRouter

from .v1 import incidents_router, problems_router, changes_router

# メインAPIルーター
api_router = APIRouter()

# v1ルーターをマウント
api_router.include_router(incidents_router, prefix="/incidents", tags=["incidents"])
api_router.include_router(problems_router, prefix="/problems", tags=["problems"])
api_router.include_router(changes_router, prefix="/changes", tags=["changes"])

__all__ = ["api_router"]