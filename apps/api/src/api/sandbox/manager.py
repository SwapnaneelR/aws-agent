import json
import os
import tempfile
from pathlib import Path

import docker
from docker.errors import ContainerError, ImageNotFound

from api.cdk_generator.s3_store import download_cdk_artifacts, upload_log
from api.config import get_settings
from api.sandbox.sts import SandboxCredentials


class SandboxManager:
    IMAGE = "four-horsemen-sandbox:latest"
    DRY_RUN_IMAGE = "node:20-slim"

    def __init__(self) -> None:
        self.client = docker.from_env()
        self.settings = get_settings()

    def deploy(
        self,
        s3_artifact_key: str,
        stack_name: str,
        creds: SandboxCredentials,
        deployment_id: str,
    ) -> dict:
        """Run cdk deploy inside a container. Returns {status, cfn_stack_id, logs}."""
        if self.settings.sandbox_dry_run:
            return self._dry_run_synth(s3_artifact_key, stack_name, deployment_id)

        with tempfile.TemporaryDirectory() as tmpdir:
            download_cdk_artifacts(s3_artifact_key, tmpdir)
            cdk_dir = os.path.join(tmpdir, "cdk")
            return self._run_container(
                cdk_dir=cdk_dir,
                command="deploy",
                stack_name=stack_name,
                creds=creds,
                deployment_id=deployment_id,
            )

    def destroy(
        self,
        s3_artifact_key: str,
        stack_name: str,
        creds: SandboxCredentials,
        deployment_id: str,
    ) -> dict:
        if self.settings.sandbox_dry_run:
            return {"status": "destroyed", "logs": ["dry-run: skipped destroy"]}

        with tempfile.TemporaryDirectory() as tmpdir:
            download_cdk_artifacts(s3_artifact_key, tmpdir)
            cdk_dir = os.path.join(tmpdir, "cdk")
            return self._run_container(
                cdk_dir=cdk_dir,
                command="destroy",
                stack_name=stack_name,
                creds=creds,
                deployment_id=deployment_id,
            )

    def _run_container(
        self,
        cdk_dir: str,
        command: str,
        stack_name: str,
        creds: SandboxCredentials,
        deployment_id: str,
    ) -> dict:
        env = {
            "AWS_ACCESS_KEY_ID": creds.access_key_id,
            "AWS_SECRET_ACCESS_KEY": creds.secret_access_key,
            "AWS_SESSION_TOKEN": creds.session_token,
            "AWS_DEFAULT_REGION": self.settings.aws_region,
            "CDK_DEFAULT_ACCOUNT": creds.account_id,
            "CDK_DEFAULT_REGION": self.settings.aws_region,
        }

        cdk_cmd = (
            f"npm ci --silent && npx cdk {command} {stack_name} --require-approval never"
            if command == "deploy"
            else f"npm ci --silent && npx cdk {command} {stack_name} --force"
        )

        try:
            container = self.client.containers.run(
                self.IMAGE,
                command=f"/bin/sh -c '{cdk_cmd}'",
                environment=env,
                volumes={cdk_dir: {"bind": "/app", "mode": "rw"}},
                working_dir="/app",
                remove=False,
                detach=False,
                stdout=True,
                stderr=True,
            )
            logs_bytes = container if isinstance(container, bytes) else b""
            log_text = logs_bytes.decode("utf-8", errors="replace")
        except ContainerError as e:
            log_text = e.stderr.decode("utf-8", errors="replace") if e.stderr else str(e)
            upload_log(log_text, deployment_id)
            return {"status": "failed", "logs": log_text.splitlines()[-50:]}

        upload_log(log_text, deployment_id)

        cfn_stack_id = None
        for line in log_text.splitlines():
            if "arn:aws:cloudformation" in line:
                cfn_stack_id = line.strip()
                break

        return {
            "status": "success",
            "cfn_stack_id": cfn_stack_id,
            "logs": log_text.splitlines()[-50:],
        }

    def _dry_run_synth(self, s3_artifact_key: str, stack_name: str, deployment_id: str) -> dict:
        with tempfile.TemporaryDirectory() as tmpdir:
            download_cdk_artifacts(s3_artifact_key, tmpdir)
            cdk_dir = os.path.join(tmpdir, "cdk")
            env = {"CDK_DEFAULT_REGION": self.settings.aws_region, "CDK_DEFAULT_ACCOUNT": "123456789012"}
            try:
                container = self.client.containers.run(
                    self.DRY_RUN_IMAGE,
                    command="/bin/sh -c 'npm ci --silent && npx cdk synth'",
                    environment=env,
                    volumes={cdk_dir: {"bind": "/app", "mode": "rw"}},
                    working_dir="/app",
                    remove=True,
                    detach=False,
                    stdout=True,
                    stderr=True,
                )
                log_text = container.decode("utf-8", errors="replace") if isinstance(container, bytes) else ""
            except ContainerError as e:
                log_text = e.stderr.decode("utf-8", errors="replace") if e.stderr else str(e)
                upload_log(log_text, deployment_id)
                return {"status": "failed", "logs": log_text.splitlines()[-50:]}

        upload_log(log_text, deployment_id)
        return {"status": "success", "cfn_stack_id": None, "logs": log_text.splitlines()[-20:], "dry_run": True}
