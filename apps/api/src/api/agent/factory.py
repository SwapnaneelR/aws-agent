from typing import Callable

from strands import Agent
from strands.models import BedrockModel

from api.agent.prompts import SYSTEM_PROMPT
from api.agent.tools.architecture import design_architecture
from api.agent.tools.cdk_gen import generate_cdk_code
from api.agent.tools.clarification import request_clarification
from api.agent.tools.deployment import deploy_to_sandbox, destroy_sandbox, get_deployment_status
from api.agent.tools.logs import read_deployment_logs
from api.agent.tools.security import run_security_scan
from api.agent.tools.testing import get_test_results, run_infrastructure_tests
from api.config import get_settings

_ALL_TOOLS = [
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
]


def create_agent(
    model_id: str | None = None,
    callback_handler: Callable | None = None,
) -> Agent:
    settings = get_settings()
    resolved_model_id = model_id or settings.default_model_id

    model = BedrockModel(
        model_id=resolved_model_id,
        region_name=settings.aws_region,
    )

    kwargs: dict = {
        "model": model,
        "tools": _ALL_TOOLS,
        "system_prompt": SYSTEM_PROMPT,
    }

    if callback_handler is not None:
        kwargs["callback_handler"] = callback_handler

    return Agent(**kwargs)
