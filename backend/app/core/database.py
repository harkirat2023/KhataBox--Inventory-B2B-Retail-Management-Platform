from urllib.parse import parse_qs, urlencode, urlparse, urlunparse

from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from app.config import settings


# Strip query params that asyncpg does not accept (sslmode, channel_binding)
_parsed = urlparse(settings.DATABASE_URL)
_qs = parse_qs(_parsed.query, keep_blank_values=True)
for _key in ("sslmode", "channel_binding"):
    _qs.pop(_key, None)
# asyncpg uses SSL by default — no need to add ssl=true
_clean_query = urlencode(_qs, doseq=True)
db_url = urlunparse(_parsed._replace(query=_clean_query))


engine = create_async_engine(db_url, echo=False)

async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)


class Base(DeclarativeBase):
    pass


async def get_db() -> AsyncSession:
    async with async_session() as session:
        try:
            yield session
        finally:
            await session.close()
