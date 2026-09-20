import json

import redis

from api.agent.context import session_id_var
from api.config import get_settings
from strands import tool


@tool
def request_clarification(question: str, options: list[str] | None = None) -> dict:
    """
    Ask the user a clarifying question when requirements are ambiguous.

    Call this BEFORE design_architecture if critical information is missing.
    The question will be streamed to the user's session.

    Args:
        question: The clarifying question to ask
        options: Optional suggested answer choices to present to the user

    Returns:
        Confirmation the question was sent
    """
    settings = get_settings()
    session_id = session_id_var.get()

    event = {
        "type": "clarification_request",
        "question": question,
        "options": options or [],
    }

    if session_id:
        r = redis.from_url(settings.redis_url)
        try:
            r.publish(f"session:{session_id}:stream", json.dumps(event))
        finally:
            r.close()

    return {
        "status": "sent",
        "question": question,
        "note": "Question sent to user. The user's next message will contain their answer.",
    }
