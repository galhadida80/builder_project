import asyncio

from sqlalchemy import select

from app.db.session import AsyncSessionLocal
from app.models import EquipmentTemplate


async def check():
    async with AsyncSessionLocal() as db:
        result = await db.execute(select(EquipmentTemplate))
        templates = result.scalars().all()
        count = len(templates)
        assert count == 11, f'Expected 11 templates, got {count}'
        print('OK')

if __name__ == "__main__":
    asyncio.run(check())
