import json
import os
import subprocess
import tempfile

from strands import tool

from api.cdk_generator.s3_store import download_cdk_artifacts
from api.config import get_settings


def _run_checkov(cdk_dir: str) -> dict:
    try:
        result = subprocess.run(
            ["checkov", "-d", cdk_dir, "--framework", "cloudformation", "-o", "json", "--quiet"],
            capture_output=True,
            text=True,
            timeout=120,
        )
        output = json.loads(result.stdout) if result.stdout.strip() else {}
        passed = output.get("summary", {}).get("passed", 0)
        failed = output.get("summary", {}).get("failed", 0)
        findings = [
            {
                "check_id": r.get("check_id"),
                "check": r.get("check_type"),
                "resource": r.get("resource"),
                "file": r.get("file_path"),
            }
            for r in output.get("results", {}).get("failed_checks", [])
        ]
        return {"passed": passed, "failed": failed, "findings": findings, "tool": "checkov"}
    except FileNotFoundError:
        return {"passed": 0, "failed": 0, "findings": [], "tool": "checkov", "note": "checkov not installed — skipped"}
    except subprocess.TimeoutExpired:
        return {"error": "checkov timed out", "tool": "checkov"}


def _run_cfn_nag(cdk_dir: str) -> dict:
    try:
        # First synth to get CloudFormation templates
        synth_result = subprocess.run(
            ["npx", "cdk", "synth", "--quiet"],
            capture_output=True,
            text=True,
            cwd=cdk_dir,
            timeout=120,
        )
        cdk_out = os.path.join(cdk_dir, "cdk.out")
        if not os.path.isdir(cdk_out):
            return {"note": "no cdk.out — cfn-nag skipped", "tool": "cfn-nag"}

        result = subprocess.run(
            ["cfn_nag_scan", "--input-path", cdk_out],
            capture_output=True,
            text=True,
            timeout=60,
        )
        failures = [l for l in result.stdout.splitlines() if "FAIL" in l]
        warnings = [l for l in result.stdout.splitlines() if "WARN" in l]
        return {
            "failures": failures,
            "warnings": warnings,
            "failed": len(failures),
            "tool": "cfn-nag",
        }
    except FileNotFoundError:
        return {"failures": [], "warnings": [], "failed": 0, "tool": "cfn-nag", "note": "cfn_nag not installed — skipped"}
    except subprocess.TimeoutExpired:
        return {"error": "cfn-nag timed out", "tool": "cfn-nag"}


@tool
def run_security_scan(s3_key: str) -> dict:
    """
    Run Checkov and cfn-nag security scans on generated CDK code.

    This MUST be called before deploy_to_sandbox. Deployment is blocked if this fails.

    Args:
        s3_key: The S3 key returned by generate_cdk_code

    Returns:
        scan_passed (bool), checkov_result, cfn_nag_result, total_failures
    """
    settings = get_settings()

    with tempfile.TemporaryDirectory() as tmpdir:
        download_cdk_artifacts(s3_key, tmpdir)
        cdk_dir = os.path.join(tmpdir, "cdk")

        if settings.sandbox_dry_run:
            return {
                "scan_passed": True,
                "checkov_result": {"note": "dry-run — scan skipped"},
                "cfn_nag_result": {"note": "dry-run — scan skipped"},
                "total_failures": 0,
            }

        checkov_result = _run_checkov(cdk_dir)
        cfn_nag_result = _run_cfn_nag(cdk_dir)

    checkov_failures = checkov_result.get("failed", 0)
    cfn_nag_failures = cfn_nag_result.get("failed", 0)
    total_failures = checkov_failures + cfn_nag_failures
    scan_passed = total_failures == 0

    return {
        "scan_passed": scan_passed,
        "checkov_result": checkov_result,
        "cfn_nag_result": cfn_nag_result,
        "total_failures": total_failures,
        "message": "Scan passed — safe to deploy." if scan_passed else f"Scan FAILED: {total_failures} issues found. Fix before deploying.",
    }
