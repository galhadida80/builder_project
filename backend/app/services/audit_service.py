from uuid import UUID
from decimal import Decimal
from sqlalchemy.ext.asyncio import AsyncSession
from app.models.audit import AuditLog, AuditAction
from app.models.user import User


async def create_audit_log(
    db: AsyncSession,
    user: User | None,
    entity_type: str,
    entity_id: UUID,
    action: AuditAction,
    project_id: UUID | None = None,
    old_values: dict | None = None,
    new_values: dict | None = None,
    ip_address: str | None = None,
    user_agent: str | None = None
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


def get_model_dict(model, exclude: set | None = None) -> dict:
    exclude = exclude or set()
    result = {}
    for column in model.__table__.columns:
        if column.name not in exclude:
            value = getattr(model, column.name)
            if hasattr(value, 'isoformat'):
                value = value.isoformat()
            elif isinstance(value, UUID):
                value = str(value)
            elif isinstance(value, Decimal):
                value = float(value)
            result[column.name] = value
    return result
