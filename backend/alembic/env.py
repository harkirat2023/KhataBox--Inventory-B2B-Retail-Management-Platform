import asyncio
import os
import sys
from logging.config import fileConfig
from os.path import abspath, dirname
from dotenv import load_dotenv

# Dynamically add the backend folder to the Python path
sys.path.insert(0, dirname(dirname(abspath(__file__))))

# Load variables from your backend/.env file
load_dotenv()

from alembic import context
from sqlalchemy import pool
from sqlalchemy.engine import Connection
from sqlalchemy.ext.asyncio import async_engine_from_config

from app.core.database import Base
from app.models import *  # noqa: F401, F403

config = context.config
if config.config_file_name is not None:
    fileConfig(config.config_file_name)

target_metadata = Base.metadata


def run_migrations_offline() -> None:
    # Use DATABASE_URL from your .env file instead of alembic.ini
    url = os.getenv("DATABASE_URL")
    context.configure(url=url, target_metadata=target_metadata, literal_binds=True, dialect_opts={"paramstyle": "named"})
    with context.begin_transaction():
        context.run_migrations()


def do_run_migrations(connection: Connection) -> None:
    context.configure(connection=connection, target_metadata=target_metadata)
    with context.begin_transaction():
        context.run_migrations()


async def run_async_migrations() -> None:
    configuration = config.get_section(config.config_ini_section, {})
    
    # Overwrite the sqlalchemy.url dynamically using your .env value
    configuration["sqlalchemy.url"] = os.getenv("DATABASE_URL")
    
    connectable = async_engine_from_config(configuration, prefix="sqlalchemy.", poolclass=pool.NullPool)
    async with connectable.connect() as connection:
        await connection.run_sync(do_run_migrations)
    await connectable.dispose()


def run_migrations_online() -> None:
    """Attempt online migration, fall back to offline if no DB."""
    try:
        asyncio.run(run_async_migrations())
    except Exception as e:
        print(f"Could not connect to database ({e}). Running in offline mode.")
        run_migrations_offline()


if context.is_offline_mode():
    run_migrations_offline()
else:
    run_migrations_online()
