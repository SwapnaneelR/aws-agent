import asyncio
import json
import uuid

import redis

from api.agent.context import project_id_var, session_id_var
from api.agent.factory import create_agent
from api.config import get_settings
from api.database import make_async_session
from api.workers.celery_app import celery_app


async def _store_message(session_id: str, role: str, content: str) -> None:
    from api.models.orm import Message

    async with make_async_session() as db:
        msg = Message(
            id=str(uuid.uuid4()),
            session_id=session_id,
            role=role,
            content=content,
        )
        db.add(msg)
        await db.commit()


async def _set_session_status(
    session_id: str, status: str, model_id: str | None = None
) -> None:
    from sqlalchemy import select

    from api.models.orm import AgentSession

    async with make_async_session() as db:
        r = await db.execute(select(AgentSession).where(AgentSession.id == session_id))
        session = r.scalar_one_or_none()
        if session:
            session.status = status
            if model_id:
                session.model_used = model_id
            await db.commit()


async def _run_task_async(
    task_id: str,
    session_id: str,
    user_message: str,
    model_id: str,
    project_id: str,
    publish,
) -> dict:
    """Full async body of the Celery task — runs inside a single asyncio.run()."""
    # Set context vars so tools can read session/project IDs.
    session_id_var.set(session_id)
    project_id_var.set(project_id)

    await _store_message(session_id, "user", user_message)
    await _set_session_status(session_id, "running", model_id)

    try:
        agent = create_agent(model_id=model_id, callback_handler=publish)
        response = agent(user_message)
        response_text = str(response)

        await _store_message(session_id, "assistant", response_text)
        await _set_session_status(session_id, "idle")
        return response_text

    except Exception:
        await _set_session_status(session_id, "error")
        raise


@celery_app.task(bind=True, name="api.workers.tasks.run_agent_task", max_retries=0)
def run_agent_task(
    self,
    session_id: str,
    user_message: str,
    model_id: str,
    project_id: str,
) -> dict:
    """Drive the Strands agent loop for one user message turn."""
    settings = get_settings()

    r = redis.from_url(settings.redis_url)

    def publish(event_type: str, data: dict) -> None:
        r.publish(
            f"session:{session_id}:stream",
            json.dumps({"type": event_type, "task_id": self.request.id, **data}),
        )

    # Strands streaming callback
    def on_event(**kwargs) -> None:
        if "data" in kwargs:
            publish("token", {"data": kwargs["data"]})
        elif "current_tool_use" in kwargs:
            tool_info = kwargs.get("current_tool_use", {})
            tool_name = tool_info.get("name", "") if isinstance(tool_info, dict) else ""
            if tool_name:
                publish("tool_use", {"tool": tool_name})

    try:
        # A single asyncio.run() creates exactly one event loop. All async DB
        # calls inside use make_async_session(), which spins up a fresh engine
        # bound to *this* loop — avoiding the "Future attached to a different
        # loop" error that occurs when a module-level engine's pool is reused
        # across multiple asyncio.run() calls (each of which creates a new loop).
        response_text = asyncio.run(
            _run_task_async(
                task_id=self.request.id,
                session_id=session_id,
                user_message=user_message,
                model_id=model_id,
                project_id=project_id,
                publish=on_event,
            )
        )
        publish("done", {"response": response_text})
        return {"status": "success", "session_id": session_id}

    except Exception as exc:
        publish("error", {"message": str(exc)})
        raise

    finally:
        r.close()
