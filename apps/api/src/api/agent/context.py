from contextvars import ContextVar

# Set at Celery task start; read by all agent tools
session_id_var: ContextVar[str] = ContextVar("session_id", default="")
project_id_var: ContextVar[str] = ContextVar("project_id", default="")
