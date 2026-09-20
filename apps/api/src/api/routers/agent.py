import asyncio
import json
from collections.abc import AsyncGenerator

import redis.asyncio as aioredis
from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.config import get_settings
from api.database import get_db
from api.models.orm import AgentSession
from api.schemas.models import AgentTaskResponse, MessageIn
from api.workers.tasks import run_agent_task

router = APIRouter(prefix="/api/agent", tags=["agent"])


@router.post("/sessions/{session_id}/message", response_model=AgentTaskResponse)
async def send_message(
    session_id: str,
    body: MessageIn,
    db: AsyncSession = Depends(get_db),
) -> AgentTaskResponse:
    result = await db.execute(select(AgentSession).where(AgentSession.id == session_id))
    session = result.scalar_one_or_none()
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    if session.status == "running":
        raise HTTPException(status_code=409, detail="Session already has a running task")

    settings = get_settings()
    model_id = (
        settings.complex_model_id
        if body.use_complex_model and settings.enable_opus_escalation
        else (session.model_used or settings.default_model_id)
    )

    task = run_agent_task.delay(
        session_id=session_id,
        user_message=body.content,
        model_id=model_id,
        project_id=session.project_id,
    )

    return AgentTaskResponse(task_id=task.id, session_id=session_id)


@router.get("/stream/{session_id}")
async def stream_session(session_id: str) -> StreamingResponse:
    settings = get_settings()

    async def event_generator() -> AsyncGenerator[str, None]:
        r = aioredis.from_url(settings.redis_url, decode_responses=True)
        pubsub = r.pubsub()
        await pubsub.subscribe(f"session:{session_id}:stream")

        try:
            async for message in pubsub.listen():
                if message["type"] != "message":
                    continue

                data = message["data"]
                yield f"data: {data}\n\n"

                # Stop streaming on terminal events
                try:
                    parsed = json.loads(data)
                    if parsed.get("type") in ("done", "error"):
                        break
                except (json.JSONDecodeError, AttributeError):
                    pass
        finally:
            await pubsub.unsubscribe(f"session:{session_id}:stream")
            await r.aclose()

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={
            "Cache-Control": "no-cache",
            "X-Accel-Buffering": "no",
        },
    )
