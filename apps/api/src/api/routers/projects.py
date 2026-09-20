import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from api.database import get_db
from api.models.orm import Org, Project
from api.schemas.models import ProjectCreate, ProjectOut

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.post("/", response_model=ProjectOut, status_code=201)
async def create_project(body: ProjectCreate, db: AsyncSession = Depends(get_db)) -> ProjectOut:
    org_result = await db.execute(select(Org).where(Org.id == body.org_id))
    org = org_result.scalar_one_or_none()
    if not org:
        if body.org_id == "org_default_horsemen":
            org = Org(id="org_default_horsemen", name="Default Organization")
            db.add(org)
            await db.commit()
        else:
            raise HTTPException(status_code=404, detail="Org not found")

    project = Project(
        id=str(uuid.uuid4()),
        org_id=body.org_id,
        name=body.name,
        description=body.description,
    )
    db.add(project)
    await db.commit()
    await db.refresh(project)
    return ProjectOut.model_validate(project)


@router.get("/{project_id}", response_model=ProjectOut)
async def get_project(project_id: str, db: AsyncSession = Depends(get_db)) -> ProjectOut:
    result = await db.execute(select(Project).where(Project.id == project_id))
    project = result.scalar_one_or_none()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")
    return ProjectOut.model_validate(project)


@router.get("/org/{org_id}", response_model=list[ProjectOut])
async def list_org_projects(org_id: str, db: AsyncSession = Depends(get_db)) -> list[ProjectOut]:
    result = await db.execute(select(Project).where(Project.org_id == org_id))
    return [ProjectOut.model_validate(p) for p in result.scalars().all()]
