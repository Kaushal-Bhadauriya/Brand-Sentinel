from fastapi import APIRouter
from app.api.ingest import router as ingest_router
from app.api.scan import router as scan_router
from app.api.rules import router as rules_router

api_router = APIRouter()
api_router.include_router(scan_router)
api_router.include_router(ingest_router)
api_router.include_router(rules_router)

__all__ = ["api_router"]
