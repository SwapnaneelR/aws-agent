import asyncio
import re
import uuid

from strands import tool

from api.agent.context import project_id_var, session_id_var
from api.cdk_generator.generator import generate_cdk_app
from api.cdk_generator.s3_store import upload_cdk_artifacts
from api.database import AsyncSessionLocal


async def _get_arch_version(arch_version_id: str):
    from sqlalchemy import select

    from api.models.orm import ArchVersion

    async with AsyncSessionLocal() as db:
        result = await db.execute(select(ArchVersion).where(ArchVersion.id == arch_version_id))
        return result.scalar_one_or_none()


async def _store_cdk_artifact(arch_version_id: str, s3_key: str) -> str:
    from api.models.orm import CdkArtifact

    async with AsyncSessionLocal() as db:
        artifact = CdkArtifact(
            id=str(uuid.uuid4()),
            arch_version_id=arch_version_id,
            s3_key=s3_key,
        )
        db.add(artifact)
        await db.commit()
        return artifact.id


@tool
def generate_cdk_code(arch_version_id: str) -> dict:
    """
    Generate AWS CDK TypeScript code from an architecture version.

    Reads the architecture spec stored by design_architecture, generates
    a complete CDK TypeScript app, uploads artifacts to S3.

    Args:
        arch_version_id: The arch_version_id returned by design_architecture

    Returns:
        s3_key where CDK artifacts are stored, stack_name, file_list
    """
    arch_version = asyncio.run(_get_arch_version(arch_version_id))
    if not arch_version:
        return {"error": f"arch_version {arch_version_id} not found"}

    arch_spec = arch_version.arch_spec_json or {}
    session_id = session_id_var.get()
    project_id = project_id_var.get() or "default"

    project_slug = re.sub(r"[^a-zA-Z0-9]", "-", project_id)[:20] or "App"

    output = generate_cdk_app(
        arch_spec=arch_spec,
        project_id=project_id,
        session_id=session_id,
        project_slug=project_slug,
    )

    s3_key = upload_cdk_artifacts(output.output_dir, session_id, arch_version_id)
    asyncio.run(_store_cdk_artifact(arch_version_id, s3_key))

    return {
        "s3_key": s3_key,
        "stack_name": output.stack_name,
        "files_generated": output.files,
        "arch_version_id": arch_version_id,
        "output_dir": output.output_dir,
    }
