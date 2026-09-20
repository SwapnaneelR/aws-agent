# Four Horsemen — Backend API (`apps/api`)

FastAPI + SQLAlchemy (async) + Celery + Strands Agent (AWS Bedrock) backend for the Four Horsemen platform.

## Prerequisites

- **Python 3.12**
- **uv** package manager (`pip install uv` or `brew install uv`)
- **Docker** (for Postgres 16 and Redis 7)

---

## 1. Start Infrastructure (PostgreSQL + Redis)

From the project root directory:

```bash
docker compose -f docker/docker-compose.yml up -d postgres redis
```

This starts:
- PostgreSQL 16 on port `5432` (`fourhorsemen` database, user `postgres`, password `password`)
- Redis 7 on port `6379` (for Celery queue and SSE streaming pub/sub)

---

## 2. Environment Configuration

Copy the example environment file in `apps/api`:

```bash
cd apps/api
cp .env.example .env
```

> **Tip for local testing**: Set `SANDBOX_DRY_RUN=true` in `.env`. This allows the agent to design topologies and synthesize CDK code without requiring live AWS sandbox accounts.

---

## 3. Start the FastAPI Server

From `apps/api`:

```bash
# Using uv:
uv run uvicorn api.main:app --app-dir src --reload --port 8000

# Or activating the existing virtualenv:
source .venv/bin/activate
uvicorn api.main:app --app-dir src --reload --port 8000
```

- API Docs: [http://localhost:8000/docs](http://localhost:8000/docs)
- Health check: [http://localhost:8000/health](http://localhost:8000/health)

---

## 4. Start the Celery Worker (Agent Tasks)

The Strands agent loop runs asynchronously in a Celery background worker:

```bash
cd apps/api
uv run celery -A api.workers.celery_app.celery_app worker --loglevel=info --concurrency=2

# Or using the activated virtualenv:
celery -A api.workers.celery_app.celery_app worker --loglevel=info --concurrency=2
```

---

## 5. Full Docker Compose (Optional Alternative)

If you prefer running the entire API stack inside Docker containers:

```bash
docker compose -f docker/docker-compose.yml up --build
```

