import uuid
from datetime import datetime
from enum import Enum

from sqlalchemy import JSON, DateTime, ForeignKey, Integer, String, Text, func
from sqlalchemy.orm import Mapped, mapped_column, relationship

from api.database import Base


def _uuid() -> str:
    return str(uuid.uuid4())


class UserRole(str, Enum):
    admin = "admin"
    member = "member"


class SessionStatus(str, Enum):
    idle = "idle"
    running = "running"
    error = "error"
    complete = "complete"


class DeploymentStatus(str, Enum):
    pending = "pending"
    running = "running"
    success = "success"
    failed = "failed"
    destroyed = "destroyed"


class MessageRole(str, Enum):
    user = "user"
    assistant = "assistant"
    tool = "tool"


class Org(Base):
    __tablename__ = "orgs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    aws_account_id: Mapped[str | None] = mapped_column(String(12))
    clerk_org_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    users: Mapped[list["User"]] = relationship("User", back_populates="org")
    projects: Mapped[list["Project"]] = relationship("Project", back_populates="org")


class User(Base):
    __tablename__ = "users"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("orgs.id"), nullable=False)
    clerk_user_id: Mapped[str | None] = mapped_column(String(255), unique=True)
    role: Mapped[str] = mapped_column(String(50), default=UserRole.member.value)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    org: Mapped["Org"] = relationship("Org", back_populates="users")
    projects_created: Mapped[list["Project"]] = relationship("Project", back_populates="creator")
    sessions: Mapped[list["AgentSession"]] = relationship("AgentSession", back_populates="user")


class Project(Base):
    __tablename__ = "projects"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    org_id: Mapped[str] = mapped_column(ForeignKey("orgs.id"), nullable=False)
    created_by: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    name: Mapped[str] = mapped_column(String(255), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    org: Mapped["Org"] = relationship("Org", back_populates="projects")
    creator: Mapped["User | None"] = relationship("User", back_populates="projects_created")
    sessions: Mapped[list["AgentSession"]] = relationship("AgentSession", back_populates="project")


class AgentSession(Base):
    __tablename__ = "sessions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    project_id: Mapped[str] = mapped_column(ForeignKey("projects.id"), nullable=False)
    user_id: Mapped[str | None] = mapped_column(ForeignKey("users.id"))
    status: Mapped[str] = mapped_column(String(50), default=SessionStatus.idle.value)
    model_used: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    project: Mapped["Project"] = relationship("Project", back_populates="sessions")
    user: Mapped["User | None"] = relationship("User", back_populates="sessions")
    messages: Mapped[list["Message"]] = relationship("Message", back_populates="session", order_by="Message.created_at")
    arch_versions: Mapped[list["ArchVersion"]] = relationship("ArchVersion", back_populates="session")


class Message(Base):
    __tablename__ = "messages"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    role: Mapped[str] = mapped_column(String(50), nullable=False)
    content: Mapped[str] = mapped_column(Text, nullable=False)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session: Mapped["AgentSession"] = relationship("AgentSession", back_populates="messages")


class ArchVersion(Base):
    __tablename__ = "arch_versions"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    session_id: Mapped[str] = mapped_column(ForeignKey("sessions.id"), nullable=False)
    version_num: Mapped[int] = mapped_column(Integer, nullable=False, default=1)
    mermaid_diagram: Mapped[str | None] = mapped_column(Text)
    arch_spec_json: Mapped[dict | None] = mapped_column(JSON)
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    session: Mapped["AgentSession"] = relationship("AgentSession", back_populates="arch_versions")
    cdk_artifacts: Mapped[list["CdkArtifact"]] = relationship("CdkArtifact", back_populates="arch_version")
    deployments: Mapped[list["Deployment"]] = relationship("Deployment", back_populates="arch_version")


class CdkArtifact(Base):
    __tablename__ = "cdk_artifacts"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    arch_version_id: Mapped[str] = mapped_column(ForeignKey("arch_versions.id"), nullable=False)
    s3_key: Mapped[str] = mapped_column(String(1024), nullable=False)
    generated_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    arch_version: Mapped["ArchVersion"] = relationship("ArchVersion", back_populates="cdk_artifacts")


class Deployment(Base):
    __tablename__ = "deployments"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    arch_version_id: Mapped[str] = mapped_column(ForeignKey("arch_versions.id"), nullable=False)
    sandbox_account_id: Mapped[str | None] = mapped_column(String(12))
    status: Mapped[str] = mapped_column(String(50), default=DeploymentStatus.pending.value)
    cfn_stack_id: Mapped[str | None] = mapped_column(String(1024))
    celery_task_id: Mapped[str | None] = mapped_column(String(255))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    arch_version: Mapped["ArchVersion"] = relationship("ArchVersion", back_populates="deployments")
    test_runs: Mapped[list["TestRun"]] = relationship("TestRun", back_populates="deployment")


class TestRun(Base):
    __tablename__ = "test_runs"

    id: Mapped[str] = mapped_column(String, primary_key=True, default=_uuid)
    deployment_id: Mapped[str] = mapped_column(ForeignKey("deployments.id"), nullable=False)
    status: Mapped[str] = mapped_column(String(50), default="pending")
    results_s3_key: Mapped[str | None] = mapped_column(String(1024))
    created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now())

    deployment: Mapped["Deployment"] = relationship("Deployment", back_populates="test_runs")
