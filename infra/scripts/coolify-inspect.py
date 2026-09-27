"""Inspect only the existing Coolify target; never log provider response bodies.

API contract: https://coolify.io/docs/api/endpoints/applications/get-application-by-uuid
This does not deploy, inspect environment variables, or establish release readiness.
"""

import datetime
import json
import os
from pathlib import Path
import re
import urllib.error
import urllib.parse
import urllib.request


class NoRedirect(urllib.request.HTTPRedirectHandler):
    def redirect_request(self, req, fp, code, msg, headers, newurl):
        return None


def target_from_webhook(value):
    url = urllib.parse.urlsplit(value)
    query = urllib.parse.parse_qs(url.query)
    ids = query.get("uuid", [])
    if (
        url.scheme != "https"
        or not url.hostname
        or url.username
        or url.password
        or url.fragment
        or url.path != "/api/v1/deploy"
        or len(ids) != 1
        or not re.fullmatch(r"[A-Za-z0-9_-]{8,64}", ids[0])
    ):
        raise ValueError("invalid_configured_target")
    return f"https://{url.netloc}/api/v1", ids[0]


def summarize_application(data, expected_id):
    if not isinstance(data, dict) or data.get("uuid") != expected_id:
        raise ValueError("unexpected_application_response")
    # Explicit booleans only. Other fields can contain credentials and private data.
    return {
        "targetIdentityMatched": True,
        "expectedRepository": data.get("git_repository") in (
            "https://github.com/allgpt-co/openlintel",
            "https://github.com/allgpt-co/openlintel.git",
            "git@github.com:allgpt-co/openlintel.git",
        ),
        "mainBranch": data.get("git_branch") == "main",
        "composeBuildPack": data.get("build_pack") == "dockercompose",
        "productionComposeFile": data.get("docker_compose_location") in (
            "docker-compose.production.yml", "/docker-compose.production.yml"
        ),
        "repositoryRoot": data.get("base_directory") in ("", "/", "."),
    }


def inspect(environ, opener=None):
    report = {
        "checkedAt": datetime.datetime.now(datetime.timezone.utc).isoformat(),
        "status": "blocked",
        "readOnly": True,
        "deploymentAttempted": False,
        "releaseReadinessVerified": False,
    }
    token = environ.get("COOLIFY_API_TOKEN", "")
    webhook = environ.get("COOLIFY_WEBHOOK_URL", "")
    if not token or not webhook:
        report["reason"] = "missing_repository_configuration"
        return report
    try:
        base, resource = target_from_webhook(webhook)
        request = urllib.request.Request(
            f"{base}/applications/{resource}",
            headers={"Authorization": f"Bearer {token}", "Accept": "application/json"},
            method="GET",
        )
        client = opener or urllib.request.build_opener(NoRedirect())
        with client.open(request, timeout=30) as response:
            report["httpStatus"] = response.status
            raw = response.read(2 * 1024 * 1024 + 1)
        if len(raw) > 2 * 1024 * 1024:
            report["reason"] = "response_too_large"
            return report
        report["configuration"] = summarize_application(json.loads(raw), resource)
        report["status"] = "inspected"
    except urllib.error.HTTPError as error:
        report["httpStatus"] = error.code
        report["reason"] = "api_request_rejected"
    except (urllib.error.URLError, TimeoutError, OSError):
        report["reason"] = "connection_failed"
    except (ValueError, TypeError):
        report["reason"] = "invalid_configuration_or_response"
    return report


if __name__ == "__main__":
    result = inspect(os.environ)
    path = Path("output/seo/coolify-inspection.json")
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(result, indent=2) + "\n")
    print(json.dumps(result, indent=2))
    raise SystemExit(0 if result["status"] == "inspected" else 1)
