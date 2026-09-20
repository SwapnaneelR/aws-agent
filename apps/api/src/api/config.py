from functools import lru_cache

from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=".env", env_file_encoding="utf-8", extra="ignore")

    database_url: str = "postgresql+asyncpg://postgres:password@localhost:5432/fourhorsemen"
    redis_url: str = "redis://localhost:6379/0"

    aws_region: str = "ap-south-1"
    aws_account_id: str = ""
    sandbox_role_arn: str = ""
    aws_org_management_role_arn: str = ""

    default_model_id: str = "us.anthropic.claude-sonnet-4-5-20251001-v2:0"
    complex_model_id: str = "us.anthropic.claude-opus-4-8-20251101-v1:0"

    s3_artifacts_bucket: str = "four-horsemen-artifacts"
    clerk_secret_key: str = ""

    enable_opus_escalation: bool = True
    max_deploy_retries: int = 3
    sandbox_dry_run: bool = False


@lru_cache
def get_settings() -> Settings:
    return Settings()
