# Run Four Horsemen Locally

## Prerequisites
- Python 3.12, `uv` installed
- Node.js 20+, `npm` installed
- AWS CLI configured (`aws configure`) with platform account credentials
- RDS accessible (check VPC/security group allows your IP, or use SSM tunnel)

## 1 — Fix .env first
Open `.env` and set real values for:
- `DATABASE_URL` — replace `YourNewPasswordHere123!` with actual RDS master password
- `S3_ARTIFACTS_BUCKET` — set bucket name (already set to `fourhorsemen-artifacts-665519496517`)

---

## 2 — Install dependencies

```bash
# API
cd apps/api
uv sync

# Frontend
cd apps/web
npm install
```

---

## 3 — Run API (Terminal 1)

```bash
cd apps/api
uv run fastapi dev src/api/main.py --port 8000
```

API available at: http://localhost:8000
Swagger docs at: http://localhost:8000/docs

---

## 4 — Run Celery Worker (Terminal 2)

```bash
cd apps/api
uv run celery -A api.workers.celery_app.celery_app worker --loglevel=info --concurrency=2
```

Required for agent tasks to execute. Must be running alongside the API.

---

## 5 — Run Frontend (Terminal 3)

```bash
cd apps/web
npm run dev
```

Frontend at: http://localhost:3000 (or 3001 if 3000 is in use)

---

## Quick Start (all in one — PowerShell, 3 tabs)

```powershell
# Tab 1 — API
cd "apps/api"; uv run fastapi dev src/api/main.py --port 8000

# Tab 2 — Worker
cd "apps/api"; uv run celery -A api.workers.celery_app.celery_app worker --loglevel=info --concurrency=2

# Tab 3 — Frontend
cd "apps/web"; npm run dev
```

---

## Verify everything is up

```bash
curl http://localhost:8000/health
# expected: {"status":"ok"}
```

---

## Notes
- `SANDBOX_DRY_RUN=true` in `.env` — agent generates + synths CDK but skips real deploy
- Set `SANDBOX_DRY_RUN=false` only when sandbox AWS account + role are configured
- RDS is in ap-south-1 VPC — if connection fails locally, either open security group to your IP or use AWS SSM port forwarding
- ElastiCache Serverless uses TLS (`rediss://`) — no password needed, just the endpoint
