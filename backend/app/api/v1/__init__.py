"""APIルーター初期化"""

from .auth import router as auth_router
from .incidents import router as incidents_router
from .problems import router as problems_router
from .changes import router as changes_router
from .dashboard import router as dashboard_router
from .users import router as users_router
from .attachments import router as attachments_router
from .custom_fields import router as custom_fields_router

__all__ = ["auth_router", "incidents_router", "problems_router", "changes_router", "dashboard_router", "users_router", "attachments_router", "custom_fields_router"]