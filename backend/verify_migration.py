#!/usr/bin/env python3
"""Verify migration was applied."""
import os
os.environ['DATABASE_URL_SYNC'] = 'postgresql://postgres:postgres@localhost:5432/builder_db'
os.environ['DATABASE_URL'] = 'postgresql+asyncpg://postgres:postgres@localhost:5432/builder_db'
os.environ['DEBUG'] = 'true'

from alembic.config import Config
from alembic import command

cfg = Config('alembic.ini')
print("Current migration revision:")
command.current(cfg, verbose=True)
