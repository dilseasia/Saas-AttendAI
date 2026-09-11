"""
main.py
───────
FastAPI application entry point.
- Registers all routers
- Sets up lifespan (DB pool init/close)
- Configures CORS, logging, exception handlers
"""

import logging
from contextlib import asynccontextmanager
from typing import AsyncIterator

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.core.config import get_settings
from app.core.database import init_pool, close_pool
from app.core.exceptions import register_exception_handlers
from app.routers import attendance, auth, billing, company, dashboard, face, leaves, tenants

# ── Logging setup ─────────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s | %(levelname)-8s | %(name)s | %(message)s",
    datefmt="%Y-%m-%d %H:%M:%S",
)
logger = logging.getLogger(__name__)
settings = get_settings()


# ── Lifespan (startup / shutdown) ─────────────────────────────────
@asynccontextmanager
async def lifespan(app: FastAPI) -> AsyncIterator[None]:
    """Manage application lifecycle resources."""
    logger.info("🚀 Starting %s v%s", settings.APP_NAME, settings.APP_VERSION)
    await init_pool()
    yield
    logger.info("🛑 Shutting down...")
    await close_pool()


# ── App factory ───────────────────────────────────────────────────
def create_app() -> FastAPI:
    app = FastAPI(
        title=settings.APP_NAME,
        version=settings.APP_VERSION,
        description=(
            "SaaS multi-tenant face attendance system API. "
            "Manages tenants, employees, attendance, leaves, and billing."
        ),
        docs_url="/api/docs",
        redoc_url="/api/redoc",
        openapi_url="/api/openapi.json",
        lifespan=lifespan,
    )

    # ── Universal Dynamic CORS (Supports all local/network IPs & ports) ──
    app.add_middleware(
        CORSMiddleware,
        allow_origins=["*"],
        allow_credentials=False,
        allow_methods=["*"],
        allow_headers=["*"],
        expose_headers=["*"],
    )

    @app.middleware("http")
    async def add_dynamic_cors_header(request, call_next):
        if request.method == "OPTIONS":
            from fastapi.responses import Response
            origin = request.headers.get("origin", "*")
            return Response(
                status_code=200,
                headers={
                    "Access-Control-Allow-Origin": origin,
                    "Access-Control-Allow-Methods": "*",
                    "Access-Control-Allow-Headers": "*",
                    "Access-Control-Allow-Credentials": "true",
                },
            )
        response = await call_next(request)
        origin = request.headers.get("origin")
        if origin:
            response.headers["Access-Control-Allow-Origin"] = origin
            response.headers["Access-Control-Allow-Credentials"] = "true"
        return response

    # ── Exception handlers ────────────────────────────────────────
    register_exception_handlers(app)

    # ── Routers ───────────────────────────────────────────────────
    API_PREFIX = "/api/v1"
    app.include_router(auth.router, prefix=API_PREFIX)
    app.include_router(tenants.router, prefix=API_PREFIX)
    app.include_router(company.router, prefix=API_PREFIX)
    app.include_router(face.router, prefix=API_PREFIX)
    app.include_router(attendance.router, prefix=API_PREFIX)
    app.include_router(leaves.leaves_router, prefix=API_PREFIX)
    app.include_router(leaves.requests_router, prefix=API_PREFIX)
    app.include_router(billing.router, prefix=API_PREFIX)
    app.include_router(dashboard.router, prefix=API_PREFIX)

    # ── Health check ──────────────────────────────────────────────
    @app.get("/health", tags=["System"], include_in_schema=False)
    async def health_check():
        return {"status": "ok", "version": settings.APP_VERSION}

    @app.get("/", tags=["System"], include_in_schema=False)
    async def root():
        return {
            "name": settings.APP_NAME,
            "version": settings.APP_VERSION,
            "docs": "/api/docs",
        }

    return app


app = create_app()
