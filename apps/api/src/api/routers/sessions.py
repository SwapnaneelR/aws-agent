import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.config import get_settings
from api.database import get_db
from api.models.orm import AgentSession, ArchVersion, Message, Project
from api.schemas.models import ArchVersionOut, MessageOut, SessionCreate, SessionOut

router = APIRouter(prefix="/api/sessions", tags=["sessions"])


@router.get("/project/{project_id}", response_model=list[SessionOut])
async def list_project_sessions(project_id: str, db: AsyncSession = Depends(get_db)) -> list[SessionOut]:
    result = await db.execute(
        select(AgentSession)
        .where(AgentSession.project_id == project_id)
        .order_by(AgentSession.created_at.desc())
    )
    return [SessionOut.model_validate(s) for s in result.scalars().all()]


@router.post("/", response_model=SessionOut, status_code=201)
async def create_session(body: SessionCreate, db: AsyncSession = Depends(get_db)) -> SessionOut:
    project_result = await db.execute(select(Project).where(Project.id == body.project_id))
    if not project_result.scalar_one_or_none():
        raise HTTPException(status_code=404, detail="Project not found")

    settings = get_settings()
    session = AgentSession(
        id=str(uuid.uuid4()),
        project_id=body.project_id,
        model_used=body.model_id or settings.default_model_id,
    )
    db.add(session)
    await db.commit()
    await db.refresh(session)
    return SessionOut.model_validate(session)


@router.get("/{session_id}", response_model=SessionOut)
async def get_session(session_id: str, db: AsyncSession = Depends(get_db)) -> SessionOut:
    result = await db.execute(select(AgentSession).where(AgentSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    return SessionOut.model_validate(session)


@router.get("/{session_id}/messages", response_model=list[MessageOut])
async def list_messages(session_id: str, db: AsyncSession = Depends(get_db)) -> list[MessageOut]:
    result = await db.execute(
        select(Message).where(Message.session_id == session_id).order_by(Message.created_at)
    )
    return [MessageOut.model_validate(m) for m in result.scalars().all()]


@router.get("/{session_id}/arch-versions", response_model=list[ArchVersionOut])
async def list_arch_versions(session_id: str, db: AsyncSession = Depends(get_db)) -> list[ArchVersionOut]:
    result = await db.execute(
        select(ArchVersion).where(ArchVersion.session_id == session_id).order_by(ArchVersion.version_num)
    )
    return [ArchVersionOut.model_validate(av) for av in result.scalars().all()]
