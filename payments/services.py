import hashlib
import urllib.parse
from django.conf import settings


def generate_payfast_signature(data: dict) -> str:
    payload = ""

    for key in sorted(data.keys()):
        value = str(data[key]).strip()
        if value != "":
            payload += f"{key}={urllib.parse.quote_plus(value)}&"

    payload = payload.rstrip("&")

    if settings.PASSPHRASE:
        payload += f"&passphrase={urllib.parse.quote_plus(settings.PASSPHRASE)}"

    return hashlib.md5(payload.encode("utf-8")).hexdigest()
