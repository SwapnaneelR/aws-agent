from dataclasses import dataclass

import boto3

from api.config import get_settings


@dataclass
class SandboxCredentials:
    access_key_id: str
    secret_access_key: str
    session_token: str
    account_id: str


def vend_sandbox_credentials(sandbox_account_id: str, session_name: str) -> SandboxCredentials:
    """Assume the sandbox role in the target account. Returns short-lived credentials (15 min TTL)."""
    settings = get_settings()

    if not settings.sandbox_role_arn:
        raise ValueError("SANDBOX_ROLE_ARN not configured")

    role_arn = settings.sandbox_role_arn.replace("SANDBOX_ACCOUNT", sandbox_account_id)

    sts = boto3.client("sts", region_name=settings.aws_region)
    response = sts.assume_role(
        RoleArn=role_arn,
        RoleSessionName=session_name[:64],
        DurationSeconds=900,  # 15 min — short TTL per security constraint
    )

    creds = response["Credentials"]
    return SandboxCredentials(
        access_key_id=creds["AccessKeyId"],
        secret_access_key=creds["SecretAccessKey"],
        session_token=creds["SessionToken"],
        account_id=sandbox_account_id,
    )


def get_platform_account_id() -> str:
    sts = boto3.client("sts")
    return sts.get_caller_identity()["Account"]
