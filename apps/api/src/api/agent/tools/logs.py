import asyncio

from strands import tool

from api.cdk_generator.s3_store import fetch_log
from api.database import AsyncSessionLocal


async def _get_deployment(deployment_id: str):
    from sqlalchemy import select
    from api.models.orm import Deployment
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(Deployment).where(Deployment.id == deployment_id))
        return r.scalar_one_or_none()


@tool
def read_deployment_logs(deployment_id: str, tail: int = 100) -> dict:
    """
    Read CloudFormation deployment logs for a given deployment.

    Args:
        deployment_id: The deployment ID to read logs for
        tail: Number of log lines to return from the end (default 100)

    Returns:
        log_lines list, deployment_id, status
    """
    deployment = asyncio.run(_get_deployment(deployment_id))
    if not deployment:
        return {"error": f"Deployment {deployment_id} not found"}

    lines = fetch_log(deployment_id, tail=tail)

    return {
        "deployment_id": deployment_id,
        "status": deployment.status,
        "log_lines": lines,
        "line_count": len(lines),
    }
