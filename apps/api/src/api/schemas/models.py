from datetime import datetime
from typing import Any

from pydantic import BaseModel


class OrgCreate(BaseModel):
    name: str
    clerk_org_id: str | None = None


class OrgOut(BaseModel):
    id: str
    name: str
    aws_account_id: str | None
    clerk_org_id: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class ProjectCreate(BaseModel):
    name: str
    description: str | None = None
    org_id: str


class ProjectOut(BaseModel):
    id: str
    org_id: str
    name: str
    description: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class SessionCreate(BaseModel):
    project_id: str
    model_id: str | None = None


class SessionOut(BaseModel):
    id: str
    project_id: str
    user_id: str | None
    status: str
    model_used: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class MessageIn(BaseModel):
    content: str
    use_complex_model: bool = False


class MessageOut(BaseModel):
    id: str
    session_id: str
    role: str
    content: str
    created_at: datetime
    model_config = {"from_attributes": True}


class ArchVersionOut(BaseModel):
    id: str
    session_id: str
    version_num: int
    mermaid_diagram: str | None
    arch_spec_json: dict[str, Any] | None
    created_at: datetime
    model_config = {"from_attributes": True}


class DeploymentOut(BaseModel):
    id: str
    arch_version_id: str
    sandbox_account_id: str | None
    status: str
    cfn_stack_id: str | None
    created_at: datetime
    model_config = {"from_attributes": True}


class AgentTaskResponse(BaseModel):
    task_id: str
    session_id: str
    status: str = "queued"
