"""API初期化"""

from fastapi import APIRouter

from .v1 import (
    incidents_router,
    problems_router,
    known_errors_router,
    changes_router,
    auth_router,
    dashboard_router,
    users_router,
    attachments_router,
)  # , custom_fields_router
# from .v1.error_monitor import router as error_monitor_router
from .v1.repair_monitor import router as repair_monitor_router
from .v1.cicd_automation import router as cicd_router
# from .v1.error_monitoring import router as error_monitoring_router
# from .v1.error_repair_api import router as error_repair_router

# メインAPIルーター
api_router = APIRouter()

# v1ルーターをマウント
api_router.include_router(auth_router, prefix="/auth", tags=["authentication"])
api_router.include_router(users_router, prefix="/users", tags=["users"])
api_router.include_router(dashboard_router, prefix="/dashboard", tags=["dashboard"])
api_router.include_router(incidents_router, prefix="/incidents", tags=["incidents"])
api_router.include_router(problems_router, prefix="/problems", tags=["problems"])
api_router.include_router(
    known_errors_router, prefix="/known-errors", tags=["known-errors"]
)
api_router.include_router(changes_router, prefix="/changes", tags=["changes"])
api_router.include_router(
    attachments_router, prefix="/attachments", tags=["attachments"]
)
# api_router.include_router(
#     error_monitor_router, prefix="/monitoring", tags=["monitoring"]
# )
api_router.include_router(
    repair_monitor_router, prefix="/api/v1", tags=["repair-monitor"]
)
api_router.include_router(cicd_router, prefix="/api", tags=["ci-cd-automation"])
# api_router.include_router(error_monitoring_router, tags=["error-monitoring-system"])
# api_router.include_router(error_repair_router, tags=["error-repair-system"])
# api_router.include_router(custom_fields_router, prefix="/custom-fields", tags=["custom-fields"])

__all__ = ["api_router"]
