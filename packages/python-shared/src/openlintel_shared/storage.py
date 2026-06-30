"""
Amazon S3 object storage wrapper.

Provides a thin, sync abstraction over ``boto3``. Public functions are
synchronous because boto3 does not support ``asyncio`` natively; call them
directly in sync paths or through ``asyncio.to_thread`` from async code.
"""

from __future__ import annotations

import io
from typing import TYPE_CHECKING

import boto3
from botocore.exceptions import ClientError

from openlintel_shared.config import Settings, get_settings

if TYPE_CHECKING:
    from mypy_boto3_s3.client import S3Client


_client_cache: S3Client | None = None


def _get_client(settings: Settings | None = None) -> S3Client:
    """Return a cached boto3 S3 client using the AWS SDK credential chain."""
    global _client_cache  # noqa: PLW0603
    if _client_cache is not None:
        return _client_cache

    if settings is None:
        settings = get_settings()

    _client_cache = boto3.client(
        "s3",
        region_name=settings.AWS_REGION,
    )  # type: ignore[assignment]
    return _client_cache  # type: ignore[return-value]


def reset_client() -> None:
    """Drop the cached client (useful in tests)."""
    global _client_cache  # noqa: PLW0603
    _client_cache = None


def _bucket_missing(exc: ClientError) -> bool:
    error_code = str(exc.response.get("Error", {}).get("Code", ""))
    status_code = exc.response.get("ResponseMetadata", {}).get("HTTPStatusCode")
    return error_code in {"404", "NoSuchBucket", "NotFound"} or status_code == 404


def _create_bucket_kwargs(bucket: str, region: str) -> dict[str, object]:
    kwargs: dict[str, object] = {"Bucket": bucket}
    if region != "us-east-1":
        kwargs["CreateBucketConfiguration"] = {"LocationConstraint": region}
    return kwargs


# ── Public API ────────────────────────────────────────────────────────────────


def ensure_bucket(bucket: str, *, settings: Settings | None = None) -> None:
    """Create the S3 bucket if it does not already exist."""
    if settings is None:
        settings = get_settings()

    client = _get_client(settings)
    try:
        client.head_bucket(Bucket=bucket)
    except ClientError as exc:
        if _bucket_missing(exc):
            client.create_bucket(**_create_bucket_kwargs(bucket, settings.AWS_REGION))
        else:
            raise


def upload_file(
    bucket: str,
    key: str,
    data: bytes | io.IOBase,
    content_type: str = "application/octet-stream",
    *,
    settings: Settings | None = None,
) -> None:
    """Upload a file to the specified S3 bucket."""
    client = _get_client(settings)
    if isinstance(data, bytes):
        data = io.BytesIO(data)
    client.upload_fileobj(
        Fileobj=data,  # type: ignore[arg-type]
        Bucket=bucket,
        Key=key,
        ExtraArgs={"ContentType": content_type},
    )


def download_file(
    bucket: str,
    key: str,
    *,
    settings: Settings | None = None,
) -> bytes:
    """Download a file from S3 and return its contents as bytes."""
    client = _get_client(settings)
    buf = io.BytesIO()
    client.download_fileobj(Bucket=bucket, Key=key, Fileobj=buf)
    buf.seek(0)
    return buf.read()


def delete_file(
    bucket: str,
    key: str,
    *,
    settings: Settings | None = None,
) -> None:
    """Delete an object from an S3 bucket."""
    client = _get_client(settings)
    client.delete_object(Bucket=bucket, Key=key)


def list_files(
    bucket: str,
    prefix: str = "",
    *,
    settings: Settings | None = None,
) -> list[str]:
    """List object keys in an S3 bucket under an optional prefix."""
    client = _get_client(settings)
    paginator = client.get_paginator("list_objects_v2")
    keys: list[str] = []

    for page in paginator.paginate(Bucket=bucket, Prefix=prefix):
        for obj in page.get("Contents", []):
            key = obj.get("Key")
            if key:
                keys.append(key)

    return keys


def generate_presigned_url(
    bucket: str,
    key: str,
    expires: int = 3600,
    *,
    settings: Settings | None = None,
) -> str:
    """Generate a presigned GET URL for an S3 object."""
    client = _get_client(settings)
    url: str = client.generate_presigned_url(
        ClientMethod="get_object",
        Params={"Bucket": bucket, "Key": key},
        ExpiresIn=expires,
    )
    return url
