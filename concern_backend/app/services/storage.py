import os
import uuid
from google.cloud import storage

ALLOWED = {"image/jpeg": "jpg", "image/png": "png", "image/webp": "webp"}
MAX_BYTES = 5 * 1024 * 1024  # 5 MB

_client = None


def upload_photo(data: bytes, content_type: str) -> str:
    global _client
    if _client is None:
        _client = storage.Client()
    bucket_name = os.getenv("GCS_BUCKET")
    name = f"concerns/{uuid.uuid4()}.{ALLOWED[content_type]}"
    _client.bucket(bucket_name).blob(name).upload_from_string(data, content_type=content_type)
    return f"https://storage.googleapis.com/{bucket_name}/{name}"