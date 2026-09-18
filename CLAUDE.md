# Four Horsemen — AWS Architecture Agent

> Natural language → AWS architecture → CDK code → deployed infrastructure → tested → iterated.

## What This Is

An agentic platform where users describe an application in plain English and an AI agent:
1. Designs the AWS architecture
2. Generates AWS CDK (TypeScript) code
3. Deploys to a sandboxed AWS environment
4. Runs infrastructure tests
5. Accepts feedback and iterates on the design

Multi-tenant. Each user/team gets an isolated AWS sub-account context. Everything is versioned — architecture snapshots, generated code, deployment results.

---

## Repository Layout

```
four-horsemen/
├── apps/
│   ├── web/                    # Next.js 14 frontend (App Router)
│   └── api/                    # FastAPI backend (Python 3.12)
├── packages/
│   ├── agent/                  # Claude agent core — tool definitions, loop logic
│   ├── cdk-generator/          # CDK TypeScript code generation engine
│   ├── sandbox/                # Docker-based deploy sandbox manager
│   └── shared/                 # Shared types, constants, Zod/Pydantic schemas
├── infra/                      # CDK stack for deploying THIS platform itself
├── docker/                     # Dockerfiles for sandbox containers
├── scripts/                    # Dev/CI helper scripts
├── docs/                       # Architecture decisions, runbooks
└── CLAUDE.md                   # ← you are here
```

---

## Tech Stack (Canonical — Do Not Drift From This)

### Frontend (`apps/web`)
| Layer | Choice | Notes |
|---|---|---|
| Framework | Next.js 14 (App Router) | SSR + API routes for BFF pattern |
| Language | TypeScript strict | `"strict": true` always on |
| Styling | Tailwind CSS v3 | No CSS modules, no styled-components |
| Components | shadcn/ui | Radix primitives, copy-into-repo pattern |
| Diagrams | React Flow + Mermaid.js | React Flow for interactive canvas; Mermaid for LLM-emitted diagrams |
| State | Zustand | Global UI state only; server state via React Query |
| Server state | TanStack Query v5 | All API calls go through query hooks |
| Streaming | EventSource (SSE) | Agent output streams token-by-token to UI |
| Auth | Clerk | Multi-tenant auth; org-level isolation |
| Forms | React Hook Form + Zod | Schema-first validation |

### Backend (`apps/api`)
| Layer | Choice | Notes |
|---|---|---|
| Framework | FastAPI 0.111+ | Async-first; Python 3.12 |
| Language | Python 3.12 | Use `uv` for package management, not pip/poetry |
| Agent framework | Strands SDK (Python) | AWS-native agent SDK; tool-decorated functions; no LangChain/LangGraph |
| Model provider | AWS Bedrock | Claude models via Bedrock; auth via IAM roles, no API keys |
| Task queue | Celery 5 + Redis | Deploy/test jobs are long-running; must be async |
| Database ORM | SQLAlchemy 2 async | Postgres only; no raw SQL except migrations |
| Migrations | Alembic | Always generate migration files; never `create_all()` in prod |
| Validation | Pydantic v2 | All request/response models are Pydantic |
| Streaming | FastAPI StreamingResponse | SSE endpoint at `/api/agent/stream/{session_id}` |

### Data Layer
| Store | Purpose |
|---|---|
| PostgreSQL 16 | Projects, sessions, architecture versions, users, orgs |
| Redis 7 | Celery broker, SSE pub/sub, short-lived session cache |
| S3 | Generated CDK code artifacts, deployment logs, architecture diagrams |
| DynamoDB | (optional future) High-frequency event log if Postgres shows write pressure |

### IaC / Code Generation (`packages/cdk-generator`, `packages/sandbox`)
| Tool | Purpose |
|---|---|
| AWS CDK v2 (TypeScript) | Primary IaC generation target |
| cdktf | Secondary target when user requests Terraform output |
| Docker | Sandbox containers that run `cdk deploy` / `cdk destroy` |
| AWS Organizations | Each project gets isolated AWS sub-account |
| Checkov | Security scan generated CDK before any deploy |
| cfn-nag | CloudFormation linting post-synth |
| `aws-cdk-lib/assertions` | Unit tests on generated CDK stacks |
| Terratest (Go) | Integration tests post-deploy |

### Platform Infra (`infra/`)
The platform itself is deployed via CDK stacks in `infra/`. It runs on AWS:
- ECS Fargate — API containers
- RDS Aurora Serverless v2 — Postgres
- ElastiCache Serverless — Redis
- ALB — ingress
- CloudFront + S3 — Next.js static assets
- ECR — Docker images for sandbox containers

---

## Agent Design (`packages/agent`)

Built on **AWS Strands SDK** with **AWS Bedrock** as model provider. Tools are Python functions decorated with `@tool`. Strands handles the agentic loop (tool call → result → next step) internally — no manual loop code.

### Strands Pattern

```python
from strands import Agent, tool
from strands.models import BedrockModel

model = BedrockModel(
    model_id="us.anthropic.claude-sonnet-4-5-20251001-v2:0",  # default
    region_name="us-east-1",
)

@tool
def design_architecture(description: str) -> dict:
    """Outputs Mermaid diagram + JSON architecture spec from user description."""
    ...

@tool
def generate_cdk_code(arch_spec: dict) -> str:
    """Takes architecture spec, emits CDK TypeScript files to S3."""
    ...

# All tools registered at agent construction
agent = Agent(model=model, tools=[
    design_architecture,
    generate_cdk_code,
    run_security_scan,
    deploy_to_sandbox,
    get_deployment_status,
    run_infrastructure_tests,
    get_test_results,
    read_deployment_logs,
    destroy_sandbox,
    request_clarification,
])
```

### Agent Tools (Canonical List)

| Tool | Purpose |
|---|---|
| `design_architecture` | Outputs Mermaid diagram + JSON architecture spec |
| `generate_cdk_code` | arch spec → CDK TypeScript files |
| `run_security_scan` | Checkov + cfn-nag on generated code |
| `deploy_to_sandbox` | Triggers Celery job → Docker → `cdk deploy` |
| `get_deployment_status` | Polls Celery job result |
| `run_infrastructure_tests` | CDK assertions + Terratest suite |
| `get_test_results` | Reads test output from S3 |
| `read_deployment_logs` | Streams CloudFormation events from S3 |
| `destroy_sandbox` | Tears down stack; always available |
| `request_clarification` | Agent asks user a follow-up question |

### Agent Loop Contract

1. User message → `POST /api/agent/sessions/{session_id}/message`
2. API enqueues to Celery worker
3. Worker instantiates Strands `Agent` and calls `agent(user_message)`
4. Strands drives the loop; each tool execution publishes progress to Redis channel `session:{session_id}:stream`
5. Frontend SSE endpoint `/api/agent/stream/{session_id}` subscribes and forwards
6. Loop terminates when Strands returns final response (no pending tool calls), user interrupts, or error threshold hit

### Model Selection (Bedrock Model IDs)
- Default: `us.anthropic.claude-sonnet-4-5-20251001-v2:0` — fast, cost-efficient
- Complex design: `us.anthropic.claude-opus-4-8-20251101-v1:0` — user-toggled or auto-escalated on retry
- Never use Haiku — infrastructure design requires full reasoning

### Auth to Bedrock
No API keys. Bedrock access via IAM role attached to ECS task (prod) or local AWS profile (dev). IAM policy must allow `bedrock:InvokeModel` and `bedrock:InvokeModelWithResponseStream` on target model ARNs.

### Prompt Caching
Strands SDK supports Bedrock prompt caching. The architecture knowledge base (AWS service catalog, CDK patterns library) is passed as a cached system prompt block. Mandatory — deploy cycles are long and Bedrock costs add up.

---

## Database Schema (Conceptual)

```
orgs            → id, name, aws_account_id, clerk_org_id
users           → id, org_id, clerk_user_id, role
projects        → id, org_id, name, description, created_at
sessions        → id, project_id, user_id, status, model_used, created_at
messages        → id, session_id, role (user|assistant|tool), content, created_at
arch_versions   → id, session_id, version_num, mermaid_diagram, arch_spec_json, created_at
cdk_artifacts   → id, arch_version_id, s3_key, generated_at
deployments     → id, arch_version_id, sandbox_account_id, status, cfn_stack_id, created_at
test_runs       → id, deployment_id, status, results_s3_key, created_at
```

---

## Security Constraints (Non-Negotiable)

1. **Sandbox isolation** — `cdk deploy` NEVER runs in the platform's own AWS account. Always in isolated sub-accounts provisioned via AWS Organizations. If `sandbox_account_id` is null, deployment is blocked.
2. **No credential leakage** — AWS credentials for sandbox accounts are vended via AWS STS AssumeRole with short TTLs (15 min). Never stored in DB or S3.
3. **Generated code scan** — Checkov must pass before any deploy is triggered. Hard block, not a warning.
4. **Spend limits** — Each sandbox account has AWS Budgets alert at $50/month. Stacks idle >2h are auto-destroyed by a scheduled Lambda.
5. **User input sanitization** — All natural language input is passed to the LLM only; never interpolated into shell commands or IaC templates directly.
6. **No `eval()` / `exec()`** — Generated CDK code is written to files and executed by the sandbox container process, never `eval`-ed in the API process.

---

## Environment Variables

### API (`apps/api/.env`)
```
# Database
DATABASE_URL=postgresql+asyncpg://user:pass@localhost:5432/fourhorsemen
REDIS_URL=redis://localhost:6379/0

# AWS (platform account — NOT sandbox)
# No API keys — auth via IAM role (ECS task role in prod, local profile in dev)
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=
SANDBOX_ROLE_ARN=arn:aws:iam::SANDBOX_ACCOUNT::role/FourHorsemenSandboxRole
AWS_ORG_MANAGEMENT_ROLE_ARN=

# Bedrock model IDs
DEFAULT_MODEL_ID=us.anthropic.claude-sonnet-4-5-20251001-v2:0
COMPLEX_MODEL_ID=us.anthropic.claude-opus-4-8-20251101-v1:0

# Storage
S3_ARTIFACTS_BUCKET=

# Auth
CLERK_SECRET_KEY=

# Feature flags
ENABLE_OPUS_ESCALATION=true
MAX_DEPLOY_RETRIES=3
```

### Web (`apps/web/.env.local`)
```
NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY=
CLERK_SECRET_KEY=
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## Local Dev Setup

### Prerequisites
- Docker Desktop
- Node.js 20+ (`nvm` or `fnm` recommended)
- Python 3.12 (`pyenv` recommended)
- `uv` (`pip install uv`)
- AWS CLI v2 (configured with platform account credentials)

### Start Everything
```bash
# From repo root
docker compose up -d          # starts Postgres + Redis
cd apps/api && uv run fastapi dev   # API on :8000
cd apps/web && npm run dev         # Next.js on :3000
```

### Run Agent Locally (Without AWS Deploy)
Set `SANDBOX_DRY_RUN=true` in `.env`. Agent will generate CDK code and run `cdk synth` but skip actual deploy.

---

## Key Conventions

### Python (API + Agent)
- Type hints on all functions, no `Any` unless unavoidable
- Async all the way down — no `requests`, use `httpx`
- Pydantic models for all data shapes crossing module boundaries
- No global mutable state — dependency injection via FastAPI `Depends`
- Tests: pytest + pytest-asyncio; mock AWS with `moto`

### TypeScript (Frontend + CDK Generator)
- `strict: true` always
- No `any` — use `unknown` then narrow
- Zod schemas mirror Pydantic models (kept in sync manually — see `packages/shared`)
- React components: function components only, no class components
- No barrel files (`index.ts` re-exports) — import from exact paths

### Git
- Branch: `feature/<ticket>-<slug>`, `fix/<slug>`, `chore/<slug>`
- PRs require passing CI (lint + typecheck + unit tests)
- No direct commits to `main`
- Commit messages: Conventional Commits (`feat:`, `fix:`, `chore:`, `docs:`)

### Generated CDK Code Style
- Each architecture generates a self-contained CDK app in `cdk-output/<session_id>/`
- Stack naming: `FH<ProjectSlug><StackName>Stack`
- All constructs tagged with `project_id`, `session_id`, `generated_by: four-horsemen`
- Removal policy: `DESTROY` in sandbox; `RETAIN` never used in generated code

---

## What This Project Is NOT

- Not a general-purpose Terraform generator (CDK-first; Terraform is secondary)
- Not a visual drag-and-drop architecture tool (natural language → agent → diagram, not drag-and-drop → code)
- Not a multi-cloud tool (AWS only, by design)
- Not a CI/CD pipeline builder (we deploy, but we don't manage application code pipelines)

---

## Decision Log

| Date | Decision | Rationale |
|---|---|---|
| 2026-09-18 | CDK TypeScript over Terraform as primary | Easier programmatic generation; AWS-native; L2/L3 constructs reduce boilerplate |
| 2026-09-18 | Strands SDK over LangGraph/direct SDK | AWS-native, `@tool` decorator pattern is clean, Bedrock integration built-in |
| 2026-09-18 | AWS Bedrock over Anthropic API direct | IAM-based auth (no API keys to rotate), same-region latency, AWS cost consolidation |
| 2026-09-18 | Per-project AWS sub-accounts via Orgs | Hard isolation; blast radius of runaway deploy is bounded to one account |
| 2026-09-18 | FastAPI over Node.js for API | Python ecosystem better for AWS tooling (boto3, moto, Checkov all Python-native) |
| 2026-09-18 | uv over poetry/pip | Faster installs, lockfile support, single tool for venv + deps |
