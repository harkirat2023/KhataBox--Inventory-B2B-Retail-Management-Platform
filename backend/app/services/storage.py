import io
from typing import BinaryIO

from app.config import settings

try:
    import boto3
    from botocore.config import Config

    _client = boto3.client(
        "s3",
        endpoint_url=settings.R2_ENDPOINT_URL or None,
        aws_access_key_id=settings.R2_ACCESS_KEY_ID or "",
        aws_secret_access_key=settings.R2_SECRET_ACCESS_KEY or "",
        config=Config(signature_version="s3v4"),
    )
    _bucket = settings.R2_BUCKET_NAME or "khatabox"
    _available = bool(settings.R2_ACCESS_KEY_ID)
except Exception:
    _client = None
    _bucket = ""
    _available = False


def is_available() -> bool:
    return _available


def upload(key: str, data: bytes, content_type: str = "application/octet-stream") -> bool:
    if not _available:
        return False
    try:
        _client.put_object(Bucket=_bucket, Key=key, Body=data, ContentType=content_type)
        return True
    except Exception:
        return False


def download(key: str) -> bytes | None:
    if not _available:
        return None
    try:
        obj = _client.get_object(Bucket=_bucket, Key=key)
        return obj["Body"].read()
    except Exception:
        return None


def delete_file(key: str) -> bool:
    if not _available:
        return False
    try:
        _client.delete_object(Bucket=_bucket, Key=key)
        return True
    except Exception:
        return False


def get_public_url(key: str) -> str:
    if not _available:
        return ""
    return f"{settings.R2_PUBLIC_URL}/{key}"
