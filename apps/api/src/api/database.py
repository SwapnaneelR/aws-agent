from collections.abc import AsyncGenerator
from contextlib import asynccontextmanager

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from api.config import get_settings


class Base(DeclarativeBase):
    pass


# Module-level engine / session factory — used by the FastAPI app, which runs
# on a single long-lived event loop.
engine = create_async_engine(get_settings().database_url, echo=False, pool_pre_ping=True)
AsyncSessionLocal: async_sessionmaker[AsyncSession] = async_sessionmaker(
    engine, expire_on_commit=False, class_=AsyncSession
)


@asynccontextmanager
async def make_async_session() -> AsyncGenerator[AsyncSession, None]:
    """Create a *fresh* engine + session bound to the **current** event loop.

    Use this inside Celery tasks (or any context where ``asyncio.run()`` creates
    a new loop) instead of ``AsyncSessionLocal``.  The module-level ``engine``
    holds a connection pool whose asyncpg sockets are attached to the loop that
    was alive at import time; reusing it from a different loop causes
    "Future attached to a different loop" errors.
    """
    settings = get_settings()
    fresh_engine = create_async_engine(
        settings.database_url,
        echo=False,
        pool_pre_ping=True,
        # Keep the pool tiny — Celery tasks are short-lived and we discard the
        # engine after each asyncio.run() call anyway.
        pool_size=1,
        max_overflow=0,
    )
    session_factory: async_sessionmaker[AsyncSession] = async_sessionmaker(
        fresh_engine, expire_on_commit=False, class_=AsyncSession
    )
    try:
        async with session_factory() as session:
            yield session
    finally:
        await fresh_engine.dispose()


async def get_db() -> AsyncGenerator[AsyncSession, None]:
    async with AsyncSessionLocal() as session:
        yield session


async def init_db() -> None:
    from sqlalchemy import select
    from api.models.orm import Org

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    async with AsyncSessionLocal() as session:
        result = await session.execute(
            select(Org).where(Org.id == "org_default_horsemen")
        )
        if not result.scalar_one_or_none():
            default_org = Org(
                id="org_default_horsemen",
                name="Default Organization",
            )
            session.add(default_org)
            await session.commit()
