import time
import jwt
import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient
from openlintel_shared.auth import AuthError, decode_jwt
from openlintel_shared.config import get_settings
from openlintel_shared.service_guard import ServiceAuthMiddleware

SECRET = 'test-service-secret-that-is-at-least-32-bytes'

def token(**overrides):
    claims = dict(sub='owner', iss='openlintel-web', aud='openlintel-services',
                  iat=int(time.time()), exp=int(time.time()) + 300)
    claims.update(overrides)
    return jwt.encode(claims, SECRET, algorithm='HS256')

def test_valid_service_token():
    assert decode_jwt(token(), SECRET)['sub'] == 'owner'

@pytest.mark.parametrize('claims', [dict(aud='openlintel-collaboration'),
    dict(iss='untrusted'), dict(exp=int(time.time()) - 1)])
def test_rejects_wrong_scope_or_expiry(claims):
    with pytest.raises(AuthError):
        decode_jwt(token(**claims), SECRET)

def test_cookie_and_unsigned_payload_are_not_service_credentials():
    with pytest.raises(AuthError):
        decode_jwt(jwt.encode({'sub': 'owner', 'exp': int(time.time()) + 300}, SECRET, algorithm='HS256'), SECRET)
    with pytest.raises(AuthError):
        decode_jwt(token(), 'different-secret-that-is-at-least-32-bytes')

def test_job_identity_must_match_token_before_any_database_access(monkeypatch):
    monkeypatch.setenv('JWT_SECRET', SECRET)
    get_settings.cache_clear()
    app = FastAPI()
    app.add_middleware(ServiceAuthMiddleware)
    @app.post('/api/v1/vision/job')
    async def job():
        pytest.fail('Unauthorized job reached handler')
    with TestClient(app) as client:
        assert client.post('/api/v1/vision/job', json={}).status_code == 401
        assert client.post('/api/v1/vision/job', headers={'Authorization': f'Bearer {token()}'},
                           json={'user_id': 'another-user', 'job_id': 'other-job'}).status_code == 403
    get_settings.cache_clear()
