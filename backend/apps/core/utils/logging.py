"""Sanitize URL and browser context metadata before it reaches log records."""

from typing import cast
from urllib.parse import urlsplit, urlunsplit

_OMITTED_FIELDS = {"config", "request", "headers", "body"}
_URL_FIELDS = {"url", "href", "previous", "referer", "referrer", "action"}


def sanitize_log_url(value: str) -> str:
    """Keep a web URL's origin and path without credentials, query or fragment."""
    try:
        parts = urlsplit(value)
        if parts.scheme not in {"", "http", "https"}:
            return ""
        if parts.netloc:
            if not parts.hostname:
                return ""
            # Accessing port validates malformed authorities before retaining them.
            _ = parts.port
            authority = parts.netloc.rsplit("@", 1)[-1]
        elif parts.scheme or not value.startswith("/") or value.startswith("//"):
            return ""
        else:
            authority = ""
        return urlunsplit((parts.scheme, authority, parts.path, "", ""))
    except ValueError:
        # Malformed browser input must not fall back to its credential-bearing text.
        return ""


def sanitize_frontend_context(value: object) -> object:
    """Copy browser diagnostics without request bodies or credential-bearing URLs."""
    if isinstance(value, list):
        # Context arrives through the JSON API, whose arrays contain JSON values.
        return [sanitize_frontend_context(item) for item in cast(list[object], value)]
    if not isinstance(value, dict):
        return value
    # JSON object keys are strings; the API schema validates the outer dictionaries.
    context = cast(dict[str, object], value)
    sanitized: dict[str, object] = {}
    for key, item in context.items():
        name = key.lower()
        # Transport config can contain serialized credentials that field filtering misses.
        # The frontend's truncation wrapper also places opaque serialized text in data.
        if name in _OMITTED_FIELDS or (name == "data" and isinstance(item, str)):
            continue
        if name in _URL_FIELDS:
            sanitized[key] = sanitize_log_url(item) if isinstance(item, str) else ""
        else:
            sanitized[key] = sanitize_frontend_context(item)
    return sanitized
