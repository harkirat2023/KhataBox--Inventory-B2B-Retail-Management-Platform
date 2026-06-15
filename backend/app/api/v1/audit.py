from fastapi import APIRouter, Depends, Query
from pydantic import BaseModel
from datetime import datetime
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.core.database import get_db
from app.core.dependencies import get_current_user, require_role
from app.models.audit_log import AuditLog
from app.models.user import User


class AuditLogResponse(BaseModel):
    id: int
    action: str
    entity_type: str
    entity_id: int | None
    details: str | None
    created_at: datetime

    model_config = {"from_attributes": True}


router = APIRouter()


@router.get("/logs", response_model=list[AuditLogResponse])
async def list_audit_logs(
    entity_type: str | None = Query(None),
    limit: int = Query(50, le=500),
    offset: int = Query(0, ge=0),
    current_user: User = Depends(require_role("admin")),
    db: AsyncSession = Depends(get_db),
):
    query = (
        select(AuditLog)
        .where(AuditLog.user_id == current_user.id)
        .order_by(AuditLog.created_at.desc())
    )
    if entity_type:
        query = query.where(AuditLog.entity_type == entity_type)
    query = query.offset(offset).limit(limit)
    result = await db.execute(query)
    return [AuditLogResponse.model_validate(log) for log in result.scalars().all()]
