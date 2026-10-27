import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import settings
from app.api import api_router
from app.schemas.scan import HealthResponse
from app.services.rag import rag_service

# Configure structured logging
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s: %(message)s"
)
logger = logging.getLogger("BrandSentinel.Main")


@asynccontextmanager
async def lifespan(app: FastAPI):
    """
    Application lifecycle management:
    Initializes Qdrant vector store and pre-warms seed brand guidelines.
    """
    logger.info("Starting BrandSentinel Enterprise Governance Engine...")
    try:
        # Pre-seed initial guidelines so hybrid RAG is immediately functional
        rag_service.initialize_bootstrap_rules()
        logger.info("Brand guidelines successfully initialized.")
    except Exception as e:
        logger.warning(f"Non-critical notice during startup bootstrapping: {e}")
    yield
    logger.info("Shutting down BrandSentinel services...")


app = FastAPI(
    title=settings.PROJECT_NAME,
    version="1.0.0",
    description="Enterprise AI Brand Governance and Dual-Engine Compliance Platform",
    docs_url="/docs",
    redoc_url="/redoc",
    lifespan=lifespan
)

# Configure Cross-Origin Resource Sharing (CORS)
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.CORS_ORIGINS,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API Routers under /api
app.include_router(api_router, prefix=settings.API_V1_STR)


@app.get("/health", response_model=HealthResponse, tags=["Health"])
def health_check():
    """Health and engine status check"""
    qdrant_healthy = False
    try:
        client = rag_service._get_qdrant_client()
        client.get_collections()
        qdrant_healthy = True
    except Exception:
        qdrant_healthy = False

    return HealthResponse(
        status="healthy",
        version="1.0.0",
        engine="Deterministic + Hybrid RAG (Dense MiniLM + BM25)",
        qdrant_connected=qdrant_healthy
    )


if __name__ == "__main__":
    import uvicorn
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
