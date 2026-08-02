from .auth import router as auth_router
from .tracking import router as tracking_router
from .burnout import router as burnout_router
from .wellness import router as wellness_router
from .recommendations import router as recommendations_router

__all__ = [
    "auth_router",
    "tracking_router",
    "burnout_router",
    "wellness_router",
    "recommendations_router",
]
