"""API-key auth + lightweight per-IP rate limiting for sensitive endpoints."""
import hmac
import os
import threading
import time
from collections import deque

from fastapi import Header, HTTPException, Request

_RATE_WINDOW = 60.0
_hits: dict[str, deque] = {}
_lock = threading.Lock()


def require_api_key(x_autosoil_api_key: str | None = Header(default=None)) -> None:
    """Enforce X-Autosoil-Api-Key when AUTOSOIL_API_KEY is configured.

    If the env var is unset (local dev) the check is skipped, but any real
    deployment must set it — render.yaml already provisions it.
    """
    expected = os.getenv("AUTOSOIL_API_KEY")
    if not expected:
        return
    if not x_autosoil_api_key or not hmac.compare_digest(x_autosoil_api_key, expected):
        raise HTTPException(status_code=401, detail="Invalid or missing API key")


def rate_limit(request: Request) -> None:
    """Sliding-window per-IP limiter. RATE_LIMIT_PER_MIN<=0 disables it."""
    limit = int(os.getenv("RATE_LIMIT_PER_MIN", "30"))
    if limit <= 0:
        return
    ip = request.client.host if request.client else "unknown"
    now = time.time()
    with _lock:
        dq = _hits.setdefault(ip, deque())
        while dq and now - dq[0] > _RATE_WINDOW:
            dq.popleft()
        if len(dq) >= limit:
            raise HTTPException(status_code=429, detail="Rate limit exceeded; slow down.")
        dq.append(now)
