from __future__ import annotations

from uuid import UUID
from decimal import Decimal
from typing import Optional
from sqlalchemy import inspect as sa_inspect
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog, AuditAction
from app.models.user import User


async def create_audit_log(
    db: AsyncSession,
    user: Optional[User],
    entity_type: str,
    entity_id: UUID,
    action: AuditAction,
    project_id: Optional[UUID] = None,
    old_values: Optional[dict] = None,
    new_values: Optional[dict] = None,
    ip_address: Optional[str] = None,
    user_agent: Optional[str] = None
) -> AuditLog:
    audit_log = AuditLog(
        project_id=project_id,
        user_id=user.id if user else None,
        entity_type=entity_type,
        entity_id=entity_id,
        action=action.value,
        old_values=old_values,
        new_values=new_values,
        ip_address=ip_address,
        user_agent=user_agent
    )
    db.add(audit_log)
    return audit_log


def get_model_dict(model, exclude: Optional[set] = None) -> dict:
    exclude = exclude or set()
    result = {}
    mapper = sa_inspect(type(model))
    for attr in mapper.column_attrs:
        col_name = attr.columns[0].name
        if col_name not in exclude:
            value = getattr(model, attr.key)
            if hasattr(value, 'isoformat'):
                value = value.isoformat()
            elif isinstance(value, UUID):
                value = str(value)
            elif isinstance(value, Decimal):
                value = float(value)
            result[col_name] = value
    return result
