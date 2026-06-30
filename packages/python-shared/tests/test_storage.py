from __future__ import annotations

from typing import Any

from botocore.exceptions import ClientError

from openlintel_shared import storage
from openlintel_shared.config import Settings


class FakeS3Client:
    def __init__(self) -> None:
        self.created_buckets: list[dict[str, Any]] = []
        self.deleted_objects: list[dict[str, str]] = []
        self.uploads: list[dict[str, Any]] = []
        self.presigned: list[dict[str, Any]] = []

    def head_bucket(self, Bucket: str) -> None:  # noqa: N803
        raise ClientError({"Error": {"Code": "404"}}, "HeadBucket")

    def create_bucket(self, **kwargs: Any) -> None:
        self.created_buckets.append(kwargs)

    def delete_object(self, **kwargs: str) -> None:
        self.deleted_objects.append(kwargs)

    def upload_fileobj(self, **kwargs: Any) -> None:
        self.uploads.append(kwargs)

    def generate_presigned_url(self, **kwargs: Any) -> str:
        self.presigned.append(kwargs)
        return "https://signed.example/object"

    def get_paginator(self, name: str) -> Any:
        assert name == "list_objects_v2"

        class Paginator:
            def paginate(self, **kwargs: str) -> list[dict[str, Any]]:
                assert kwargs == {"Bucket": "openlintel-assets", "Prefix": "uploads/"}
                return [
                    {"Contents": [{"Key": "uploads/a.png"}]},
                    {"Contents": [{"Key": "uploads/b.png"}, {}]},
                ]

        return Paginator()


def test_get_client_uses_native_aws_s3_configuration(monkeypatch) -> None:
    captured: dict[str, Any] = {}

    def fake_client(service_name: str, **kwargs: Any) -> FakeS3Client:
        captured["service_name"] = service_name
        captured["kwargs"] = kwargs
        return FakeS3Client()

    monkeypatch.setattr(storage.boto3, "client", fake_client)
    storage.reset_client()

    settings = Settings(AWS_REGION="ap-south-1", AWS_S3_BUCKET="openlintel-assets")

    storage._get_client(settings)  # noqa: SLF001

    assert captured["service_name"] == "s3"
    assert captured["kwargs"] == {"region_name": "ap-south-1"}


def test_ensure_bucket_creates_regional_s3_bucket(monkeypatch) -> None:
    fake_client = FakeS3Client()
    monkeypatch.setattr(storage, "_get_client", lambda settings=None: fake_client)

    storage.ensure_bucket(
        "openlintel-assets",
        settings=Settings(AWS_REGION="ap-south-1", AWS_S3_BUCKET="openlintel-assets"),
    )

    assert fake_client.created_buckets == [
        {
            "Bucket": "openlintel-assets",
            "CreateBucketConfiguration": {"LocationConstraint": "ap-south-1"},
        },
    ]


def test_ensure_bucket_omits_location_constraint_for_us_east_1(monkeypatch) -> None:
    fake_client = FakeS3Client()
    monkeypatch.setattr(storage, "_get_client", lambda settings=None: fake_client)

    storage.ensure_bucket(
        "openlintel-assets",
        settings=Settings(AWS_REGION="us-east-1", AWS_S3_BUCKET="openlintel-assets"),
    )

    assert fake_client.created_buckets == [{"Bucket": "openlintel-assets"}]


def test_list_files_returns_s3_keys_from_paginated_results(monkeypatch) -> None:
    fake_client = FakeS3Client()
    monkeypatch.setattr(storage, "_get_client", lambda settings=None: fake_client)

    keys = storage.list_files(
        "openlintel-assets",
        prefix="uploads/",
        settings=Settings(AWS_REGION="ap-south-1", AWS_S3_BUCKET="openlintel-assets"),
    )

    assert keys == ["uploads/a.png", "uploads/b.png"]
