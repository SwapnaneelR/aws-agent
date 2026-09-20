from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from api.database import init_db
from api.routers.agent import router as agent_router
from api.routers.projects import router as projects_router
from api.routers.sessions import router as sessions_router


@asynccontextmanager
async def lifespan(app: FastAPI):
    await init_db()
    yield


app = FastAPI(title="Four Horsemen API", lifespan=lifespan)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(projects_router)
app.include_router(sessions_router)
app.include_router(agent_router)


@app.get("/health")
async def health() -> dict:
    return {"status": "ok"}
