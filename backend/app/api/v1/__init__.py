"""APIルーター初期化"""

from .incidents import router as incidents_router
from .problems import router as problems_router
from .changes import router as changes_router

__all__ = ["incidents_router", "problems_router", "changes_router"]