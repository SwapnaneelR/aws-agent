import asyncio
import uuid

from strands import tool

from api.agent.context import session_id_var
from api.cdk_generator.s3_store import upload_log
from api.config import get_settings
from api.database import AsyncSessionLocal
from api.sandbox.manager import SandboxManager
from api.sandbox.sts import vend_sandbox_credentials


async def _get_arch_version(arch_version_id: str):
    from sqlalchemy import select
    from api.models.orm import ArchVersion
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(ArchVersion).where(ArchVersion.id == arch_version_id))
        return r.scalar_one_or_none()


async def _create_deployment(arch_version_id: str, sandbox_account_id: str) -> str:
    from api.models.orm import Deployment, DeploymentStatus
    async with AsyncSessionLocal() as db:
        d = Deployment(
            id=str(uuid.uuid4()),
            arch_version_id=arch_version_id,
            sandbox_account_id=sandbox_account_id,
            status=DeploymentStatus.running.value,
        )
        db.add(d)
        await db.commit()
        return d.id


async def _update_deployment(deployment_id: str, status: str, cfn_stack_id: str | None = None) -> None:
    from sqlalchemy import select
    from api.models.orm import Deployment
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(Deployment).where(Deployment.id == deployment_id))
        d = r.scalar_one_or_none()
        if d:
            d.status = status
            if cfn_stack_id:
                d.cfn_stack_id = cfn_stack_id
            await db.commit()


async def _get_deployment(deployment_id: str):
    from sqlalchemy import select
    from api.models.orm import Deployment
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(Deployment).where(Deployment.id == deployment_id))
        return r.scalar_one_or_none()


@tool
def deploy_to_sandbox(
    arch_version_id: str,
    sandbox_account_id: str,
    s3_key: str,
    stack_name: str,
) -> dict:
    """
    Deploy generated CDK code to an isolated sandbox AWS account.

    SECURITY: sandbox_account_id MUST be a valid isolated sub-account ID.
    Never pass the platform account ID here.
    Only call this AFTER run_security_scan returns scan_passed=true.

    Args:
        arch_version_id: Architecture version to deploy
        sandbox_account_id: AWS account ID of the isolated sandbox (12-digit)
        s3_key: S3 key of CDK artifacts (from generate_cdk_code)
        stack_name: CDK stack name (from generate_cdk_code)

    Returns:
        deployment_id, status, cfn_stack_id
    """
    settings = get_settings()

    # Block deploy to platform account — hard security constraint
    if sandbox_account_id == settings.aws_account_id:
        return {
            "error": "SECURITY VIOLATION: cannot deploy to platform account. Use an isolated sandbox account.",
            "deployment_id": None,
        }

    deployment_id = asyncio.run(_create_deployment(arch_version_id, sandbox_account_id))

    try:
        creds = vend_sandbox_credentials(
            sandbox_account_id=sandbox_account_id,
            session_name=f"fh-deploy-{deployment_id[:8]}",
        )

        mgr = SandboxManager()
        result = mgr.deploy(
            s3_artifact_key=s3_key,
            stack_name=stack_name,
            creds=creds,
            deployment_id=deployment_id,
        )

        final_status = result.get("status", "failed")
        cfn_stack_id = result.get("cfn_stack_id")
        asyncio.run(_update_deployment(deployment_id, final_status, cfn_stack_id))

        return {
            "deployment_id": deployment_id,
            "status": final_status,
            "cfn_stack_id": cfn_stack_id,
            "dry_run": result.get("dry_run", False),
            "log_tail": result.get("logs", [])[-10:],
        }

    except Exception as e:
        asyncio.run(_update_deployment(deployment_id, "failed"))
        upload_log(str(e), deployment_id)
        return {"deployment_id": deployment_id, "status": "failed", "error": str(e)}


@tool
def get_deployment_status(deployment_id: str) -> dict:
    """
    Check the current status of a deployment.

    Args:
        deployment_id: Deployment ID returned by deploy_to_sandbox

    Returns:
        status (pending/running/success/failed/destroyed), cfn_stack_id
    """
    deployment = asyncio.run(_get_deployment(deployment_id))
    if not deployment:
        return {"error": f"Deployment {deployment_id} not found"}
    return {
        "deployment_id": deployment_id,
        "status": deployment.status,
        "cfn_stack_id": deployment.cfn_stack_id,
        "sandbox_account_id": deployment.sandbox_account_id,
    }


@tool
def destroy_sandbox(
    deployment_id: str,
    s3_key: str,
    stack_name: str,
    sandbox_account_id: str,
) -> dict:
    """
    Destroy a deployed CDK stack in the sandbox account.

    Call this to clean up after testing or when the user requests teardown.
    This is always safe to call.

    Args:
        deployment_id: The deployment to destroy
        s3_key: S3 key of the CDK artifacts
        stack_name: CDK stack name
        sandbox_account_id: Sandbox AWS account ID

    Returns:
        status, logs
    """
    settings = get_settings()

    if sandbox_account_id == settings.aws_account_id:
        return {"error": "SECURITY: cannot destroy in platform account"}

    try:
        creds = vend_sandbox_credentials(
            sandbox_account_id=sandbox_account_id,
            session_name=f"fh-destroy-{deployment_id[:8]}",
        )
        mgr = SandboxManager()
        result = mgr.destroy(
            s3_artifact_key=s3_key,
            stack_name=stack_name,
            creds=creds,
            deployment_id=deployment_id,
        )
        asyncio.run(_update_deployment(deployment_id, "destroyed"))
        return {"deployment_id": deployment_id, "status": "destroyed", "logs": result.get("logs", [])}

    except Exception as e:
        return {"deployment_id": deployment_id, "status": "failed", "error": str(e)}
