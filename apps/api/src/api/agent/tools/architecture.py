import asyncio
import uuid
from datetime import datetime
from typing import Any

from strands import tool

from api.agent.context import session_id_var
from api.database import AsyncSessionLocal


def _generate_mermaid(services: list[dict], connections: list[dict]) -> str:
    lines = ["graph TD"]
    for svc in services:
        var = svc["name"].replace("-", "_")
        label = f"{svc['name']}\\n{svc.get('type', '').upper()}"
        lines.append(f"    {var}[\"{label}\"]")
    for conn in connections:
        src = conn["from"].replace("-", "_")
        dst = conn["to"].replace("-", "_")
        edge_label = conn.get("type", "")
        lines.append(f"    {src} -->|{edge_label}| {dst}" if edge_label else f"    {src} --> {dst}")
    return "\n".join(lines)


async def _store_arch_version(session_id: str, arch_spec: dict) -> str:
    from sqlalchemy import func, select

    from api.models.orm import ArchVersion

    async with AsyncSessionLocal() as db:
        count_result = await db.execute(
            select(func.count(ArchVersion.id)).where(ArchVersion.session_id == session_id)
        )
        version_num = (count_result.scalar() or 0) + 1

        av = ArchVersion(
            id=str(uuid.uuid4()),
            session_id=session_id,
            version_num=version_num,
            mermaid_diagram=arch_spec["mermaid_diagram"],
            arch_spec_json=arch_spec,
        )
        db.add(av)
        await db.commit()
        await db.refresh(av)
        return av.id


@tool
def design_architecture(
    description: str,
    services: list[dict[str, Any]],
    connections: list[dict[str, Any]],
) -> dict:
    """
    Create a structured architecture specification and Mermaid diagram.

    Call this after you have analyzed the user's requirements and identified
    all needed AWS services.

    Args:
        description: One-paragraph summary of what this architecture does
        services: List of {name: str, type: str, config: dict} — AWS services
                  Valid types: lambda, dynamodb, s3, api-gateway-http, api-gateway-rest,
                  sqs, sns, rds-aurora, elasticache-redis, cloudfront, vpc, ecs-fargate
        connections: List of {from: str, to: str, type: str} — data flows between services
                     type examples: "read", "write", "read-write", "invoke", "publish", "subscribe"

    Returns:
        arch_version_id (use this in generate_cdk_code), mermaid_diagram, arch_spec
    """
    mermaid = _generate_mermaid(services, connections)
    arch_spec: dict[str, Any] = {
        "description": description,
        "services": services,
        "connections": connections,
        "mermaid_diagram": mermaid,
        "created_at": datetime.utcnow().isoformat(),
    }

    session_id = session_id_var.get()
    arch_version_id = None

    if session_id:
        arch_version_id = asyncio.run(_store_arch_version(session_id, arch_spec))

    return {
        "arch_version_id": arch_version_id,
        "mermaid_diagram": mermaid,
        "arch_spec": arch_spec,
        "service_count": len(services),
        "connection_count": len(connections),
    }
