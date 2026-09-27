import importlib.util
import io
import json
from pathlib import Path
import unittest
import urllib.error
from unittest.mock import Mock


spec = importlib.util.spec_from_file_location(
    "coolify_inspect", Path(__file__).parents[1] / "coolify-inspect.py"
)
module = importlib.util.module_from_spec(spec)
spec.loader.exec_module(module)


class InspectionTests(unittest.TestCase):
    environment = {
        "COOLIFY_WEBHOOK_URL": "https://example.invalid/api/v1/deploy?uuid=resource123&force=true",
        "COOLIFY_API_TOKEN": "private-test-token",
    }

    def test_uses_only_get_and_omits_private_response_fields(self):
        data = {
            "uuid": "resource123", "git_repository": "https://github.com/allgpt-co/openlintel",
            "git_branch": "main", "build_pack": "dockercompose",
            "docker_compose_location": "/docker-compose.production.yml", "base_directory": "/",
            "http_basic_auth_password": "private-response-secret", "docker_compose_raw": "secret",
        }
        response = Mock(status=200)
        response.read.return_value = json.dumps(data).encode()
        response.__enter__ = Mock(return_value=response)
        response.__exit__ = Mock(return_value=False)
        client = Mock()
        client.open.return_value = response
        result = module.inspect(self.environment, client)
        request = client.open.call_args.args[0]
        self.assertEqual(request.get_method(), "GET")
        self.assertEqual(request.full_url, "https://example.invalid/api/v1/applications/resource123")
        self.assertEqual(result["status"], "inspected")
        self.assertTrue(all(result["configuration"].values()))
        self.assertFalse(result["releaseReadinessVerified"])
        self.assertNotIn("private-", json.dumps(result))
        self.assertNotIn("resource123", json.dumps(result))

    def test_rejection_body_and_token_are_not_returned(self):
        client = Mock()
        client.open.side_effect = urllib.error.HTTPError(
            "https://example.invalid", 403, "private-error-secret", {}, io.BytesIO(b"private-body")
        )
        result = module.inspect(self.environment, client)
        self.assertEqual(result["httpStatus"], 403)
        self.assertEqual(result["status"], "blocked")
        self.assertNotIn("private-", json.dumps(result))

    def test_invalid_targets_do_not_send_credentials(self):
        for url in (
            "http://example.invalid/api/v1/deploy?uuid=resource123",
            "https://user:pass@example.invalid/api/v1/deploy?uuid=resource123",
            "https://example.invalid/api/v1/deploy?uuid=resource123&uuid=another123",
            "https://example.invalid/api/v1/deploy?uuid=../../envs",
            "https://example.invalid/another-path?uuid=resource123",
        ):
            with self.subTest(url=url):
                client = Mock()
                result = module.inspect({**self.environment, "COOLIFY_WEBHOOK_URL": url}, client)
                self.assertEqual(result["status"], "blocked")
                client.open.assert_not_called()

    def test_redirects_are_never_followed(self):
        self.assertIsNone(module.NoRedirect().redirect_request(None, None, 302, "", {}, "https://other.invalid"))

    def test_wrong_resource_cannot_be_reported_as_inspected(self):
        with self.assertRaises(ValueError):
            module.summarize_application({"uuid": "another123"}, "resource123")

    def test_missing_credentials_make_no_request(self):
        client = Mock()
        self.assertEqual(module.inspect({}, client)["status"], "blocked")
        client.open.assert_not_called()


if __name__ == "__main__":
    unittest.main()
