"""APIルーター初期化"""

from .auth import router as auth_router
from .incidents import router as incidents_router
from .problems import router as problems_router
from .changes import router as changes_router

__all__ = ["auth_router", "incidents_router", "problems_router", "changes_router"]