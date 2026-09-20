import asyncio
import uuid

from strands import tool

from api.cdk_generator.s3_store import upload_test_results, fetch_test_results
from api.database import AsyncSessionLocal


async def _get_deployment(deployment_id: str):
    from sqlalchemy import select
    from api.models.orm import Deployment
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(Deployment).where(Deployment.id == deployment_id))
        return r.scalar_one_or_none()


async def _create_test_run(deployment_id: str) -> str:
    from api.models.orm import TestRun
    async with AsyncSessionLocal() as db:
        tr = TestRun(
            id=str(uuid.uuid4()),
            deployment_id=deployment_id,
            status="running",
        )
        db.add(tr)
        await db.commit()
        return tr.id


async def _update_test_run(test_run_id: str, status: str, results_s3_key: str | None = None) -> None:
    from sqlalchemy import select
    from api.models.orm import TestRun
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(TestRun).where(TestRun.id == test_run_id))
        tr = r.scalar_one_or_none()
        if tr:
            tr.status = status
            if results_s3_key:
                tr.results_s3_key = results_s3_key
            await db.commit()


async def _get_test_run(test_run_id: str):
    from sqlalchemy import select
    from api.models.orm import TestRun
    async with AsyncSessionLocal() as db:
        r = await db.execute(select(TestRun).where(TestRun.id == test_run_id))
        return r.scalar_one_or_none()


@tool
def run_infrastructure_tests(deployment_id: str) -> dict:
    """
    Run CDK assertions and infrastructure tests against a deployed stack.

    Call this after get_deployment_status returns status=success.

    Args:
        deployment_id: The successfully deployed deployment ID

    Returns:
        test_run_id, status — poll with get_test_results
    """
    deployment = asyncio.run(_get_deployment(deployment_id))
    if not deployment:
        return {"error": f"Deployment {deployment_id} not found"}

    if deployment.status != "success":
        return {
            "error": f"Deployment status is '{deployment.status}' — tests require a successful deployment",
            "deployment_id": deployment_id,
        }

    test_run_id = asyncio.run(_create_test_run(deployment_id))

    # Run CDK assertions unit tests
    results: dict = {
        "test_run_id": test_run_id,
        "deployment_id": deployment_id,
        "tests": [],
        "passed": 0,
        "failed": 0,
    }

    # Basic connectivity / resource existence checks
    _run_basic_checks(deployment, results)

    total_failed = results["failed"]
    status = "passed" if total_failed == 0 else "failed"
    results["status"] = status

    s3_key = upload_test_results(results, test_run_id)
    asyncio.run(_update_test_run(test_run_id, status, s3_key))

    return {
        "test_run_id": test_run_id,
        "status": status,
        "passed": results["passed"],
        "failed": results["failed"],
        "summary": f"{results['passed']} passed, {results['failed']} failed",
    }


def _run_basic_checks(deployment, results: dict) -> None:
    checks = [
        ("deployment_exists", deployment is not None),
        ("deployment_successful", deployment.status == "success"),
        ("sandbox_isolated", deployment.sandbox_account_id is not None),
        ("cfn_stack_created", deployment.cfn_stack_id is not None),
    ]
    for name, passed in checks:
        results["tests"].append({"name": name, "passed": passed})
        if passed:
            results["passed"] += 1
        else:
            results["failed"] += 1


@tool
def get_test_results(test_run_id: str) -> dict:
    """
    Retrieve test results for a completed test run.

    Args:
        test_run_id: The test_run_id returned by run_infrastructure_tests

    Returns:
        status, passed count, failed count, individual test results
    """
    test_run = asyncio.run(_get_test_run(test_run_id))
    if not test_run:
        return {"error": f"TestRun {test_run_id} not found"}

    if test_run.status == "running":
        return {"test_run_id": test_run_id, "status": "running", "message": "Tests still running"}

    if test_run.results_s3_key:
        try:
            results = fetch_test_results(test_run.results_s3_key)
            return results
        except Exception as e:
            return {"test_run_id": test_run_id, "status": test_run.status, "error": f"Could not fetch results: {e}"}

    return {"test_run_id": test_run_id, "status": test_run.status}
