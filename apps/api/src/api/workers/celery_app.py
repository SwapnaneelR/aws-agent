from celery import Celery

from api.config import get_settings

_s = get_settings()

celery_app = Celery(
    "four_horsemen",
    broker=_s.redis_url,
    backend=_s.redis_url,
    include=["api.workers.tasks"],
)

celery_app.conf.update(
    task_serializer="json",
    accept_content=["json"],
    result_serializer="json",
    timezone="UTC",
    enable_utc=True,
    task_track_started=True,
    task_acks_late=True,
    worker_prefetch_multiplier=1,
)
