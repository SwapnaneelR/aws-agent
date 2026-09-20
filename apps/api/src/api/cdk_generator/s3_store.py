import json
import os
import tarfile
import tempfile

import boto3

from api.config import get_settings


def upload_cdk_artifacts(local_dir: str, session_id: str, arch_version_id: str) -> str:
    settings = get_settings()
    s3_key = f"artifacts/{session_id}/{arch_version_id}/cdk.tar.gz"

    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        with tarfile.open(tmp_path, "w:gz") as tar:
            tar.add(local_dir, arcname="cdk")
        s3 = boto3.client("s3", region_name=settings.aws_region)
        s3.upload_file(tmp_path, settings.s3_artifacts_bucket, s3_key)
    finally:
        os.unlink(tmp_path)

    return s3_key


def download_cdk_artifacts(s3_key: str, target_dir: str) -> None:
    settings = get_settings()
    s3 = boto3.client("s3", region_name=settings.aws_region)

    with tempfile.NamedTemporaryFile(suffix=".tar.gz", delete=False) as tmp:
        tmp_path = tmp.name

    try:
        s3.download_file(settings.s3_artifacts_bucket, s3_key, tmp_path)
        with tarfile.open(tmp_path, "r:gz") as tar:
            tar.extractall(target_dir)
    finally:
        os.unlink(tmp_path)


def upload_log(content: str, deployment_id: str) -> str:
    settings = get_settings()
    s3_key = f"deployments/{deployment_id}/logs.txt"
    s3 = boto3.client("s3", region_name=settings.aws_region)
    s3.put_object(
        Bucket=settings.s3_artifacts_bucket,
        Key=s3_key,
        Body=content.encode(),
        ContentType="text/plain",
    )
    return s3_key


def upload_test_results(results: dict, test_run_id: str) -> str:
    settings = get_settings()
    s3_key = f"test-runs/{test_run_id}/results.json"
    s3 = boto3.client("s3", region_name=settings.aws_region)
    s3.put_object(
        Bucket=settings.s3_artifacts_bucket,
        Key=s3_key,
        Body=json.dumps(results).encode(),
        ContentType="application/json",
    )
    return s3_key


def fetch_log(deployment_id: str, tail: int = 100) -> list[str]:
    settings = get_settings()
    s3_key = f"deployments/{deployment_id}/logs.txt"
    s3 = boto3.client("s3", region_name=settings.aws_region)
    try:
        resp = s3.get_object(Bucket=settings.s3_artifacts_bucket, Key=s3_key)
        content = resp["Body"].read().decode()
        return content.splitlines()[-tail:]
    except s3.exceptions.NoSuchKey:
        return []


def fetch_test_results(results_s3_key: str) -> dict:
    settings = get_settings()
    s3 = boto3.client("s3", region_name=settings.aws_region)
    resp = s3.get_object(Bucket=settings.s3_artifacts_bucket, Key=results_s3_key)
    return json.loads(resp["Body"].read())
