"""
core/database.py
────────────────
Async database connection pool using asyncpg.
Provides a FastAPI dependency that yields a pooled connection per request.
"""

import asyncpg
import logging
from typing import AsyncGenerator

from app.core.config import get_settings

logger = logging.getLogger(__name__)
settings = get_settings()

# Module-level pool — initialized once on startup
_pool: asyncpg.Pool | None = None


async def init_pool() -> None:
    """Called once at application startup to warm up the pool."""
    global _pool
    _pool = await asyncpg.create_pool(
        dsn=settings.DATABASE_URL,
        min_size=settings.DB_POOL_MIN_SIZE,
        max_size=settings.DB_POOL_MAX_SIZE,
        command_timeout=settings.DB_COMMAND_TIMEOUT,
        max_inactive_connection_lifetime=60.0,   # recycle idle connections
        # Automatically decode UUIDs and JSON
        init=_init_connection,
    )
    logger.info("✅ Database pool created (min=%d, max=%d)", settings.DB_POOL_MIN_SIZE, settings.DB_POOL_MAX_SIZE)


async def close_pool() -> None:
    """Called on application shutdown."""
    global _pool
    if _pool:
        await _pool.close()
        _pool = None
        logger.info("Database pool closed.")


async def _init_connection(conn: asyncpg.Connection) -> None:
    """Per-connection codec setup — register UUID + JSONB codecs."""
    await conn.set_type_codec(
        "uuid",
        encoder=str,
        decoder=str,
        schema="pg_catalog",
        format="text",
    )
    await conn.set_type_codec(
        "jsonb",
        encoder=lambda v: v,
        decoder=lambda v: v,
        schema="pg_catalog",
        format="text",
    )


async def get_db() -> AsyncGenerator[asyncpg.Connection, None]:
    """
    FastAPI dependency — yields a single pooled connection per request.
    Automatically returns the connection to the pool when the request ends.

    Usage:
        @router.get("/example")
        async def handler(db: asyncpg.Connection = Depends(get_db)):
            ...
    """
    if _pool is None:
        raise RuntimeError("Database pool is not initialized. Call init_pool() first.")

    async with _pool.acquire() as conn:
        yield conn
