"""Authenticate private APIs and bind job dispatch to database-owned resources."""
from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.responses import JSONResponse
from sqlalchemy import text
from openlintel_shared.auth import decode_jwt, AuthError
from openlintel_shared.config import get_settings
from openlintel_shared.db import get_session_factory

class ServiceAuthMiddleware(BaseHTTPMiddleware):
    async def dispatch(self, request: Request, call_next):
        if not request.url.path.startswith("/api/") or request.method == "OPTIONS":
            return await call_next(request)
        header = request.headers.get("authorization", "")
        try:
            if not header.startswith("Bearer "):
                raise AuthError("Bearer token required")
            claims = decode_jwt(header[7:], get_settings().JWT_SECRET)
        except AuthError:
            return JSONResponse({"error": "Unauthorized"}, status_code=401)
        # The web server creates each job first. Never trust the payload's user_id.
        if request.method == "POST" and request.url.path.rsplit("/", 1)[-1] in ("job", "digitize"):
            try:
                body = await request.json()
                if not isinstance(body, dict) or body.get("user_id") != claims["sub"]:
                    return JSONResponse({"error": "Forbidden"}, status_code=403)
                async with get_session_factory()() as db:
                    row = (await db.execute(text("SELECT * FROM jobs WHERE id=:id AND user_id=:uid"),
                        {"id": body.get("job_id"), "uid": claims["sub"]})).mappings().first()
                    if not row:
                        return JSONResponse({"error": "Job not found"}, status_code=404)
                    for key, column in (("project_id", "project_id"), ("design_variant_id", "design_variant_id")):
                        if body.get(key) and body[key] != row[column]:
                            return JSONResponse({"error": "Job resource mismatch"}, status_code=403)
                    room = body.get("room")
                    if isinstance(room, dict) and room.get("id") != row["room_id"]:
                        return JSONResponse({"error": "Job room mismatch"}, status_code=403)
                    if body.get("upload_id"):
                        upload = (await db.execute(text("SELECT storage_key FROM uploads WHERE id=:id AND user_id=:uid AND project_id=:pid"),
                            {"id": body["upload_id"], "uid": claims["sub"], "pid": row["project_id"]})).mappings().first()
                        if not upload or (body.get("storage_key") and body["storage_key"] != upload["storage_key"]):
                            return JSONResponse({"error": "Upload not found"}, status_code=403)
            except (ValueError, TypeError, KeyError):
                return JSONResponse({"error": "Invalid job request"}, status_code=400)
        return await call_next(request)
