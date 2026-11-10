"""
High-Performance In-Memory Sliding-Window Rate Limiter.
Protects sensitive authentication and API endpoints against brute force and abuse.
"""
import asyncio
import time
from collections import defaultdict
from typing import Dict, List
from fastapi import HTTPException, Request, status


class SlidingWindowRateLimiter:
    """Thread-safe in-memory sliding window rate limiter."""

    def __init__(self, max_requests: int = 60, window_seconds: int = 60):
        self.max_requests = max_requests
        self.window_seconds = window_seconds
        self.requests: Dict[str, List[float]] = defaultdict(list)
        self._lock = asyncio.Lock()

    def _get_client_ip(self, request: Request) -> str:
        # Check standard reverse proxy headers first
        forwarded = request.headers.get("X-Forwarded-For")
        if forwarded:
            return forwarded.split(",")[0].strip()
        real_ip = request.headers.get("X-Real-IP")
        if real_ip:
            return real_ip.strip()
        return request.client.host if request.client else "unknown"

    async def check(self, request: Request):
        """Verify client request rate. Raises HTTP 429 if threshold exceeded."""
        client_ip = self._get_client_ip(request)
        now = time.time()
        cutoff = now - self.window_seconds

        async with self._lock:
            # Purge timestamps outside the current sliding window
            timestamps = [ts for ts in self.requests[client_ip] if ts > cutoff]

            if len(timestamps) >= self.max_requests:
                earliest = timestamps[0]
                retry_after = max(1, int(self.window_seconds - (now - earliest)))
                raise HTTPException(
                    status_code=status.HTTP_429_TOO_MANY_REQUESTS,
                    detail=f"Rate limit exceeded. Maximum {self.max_requests} requests per minute allowed.",
                    headers={"Retry-After": str(retry_after)},
                )

            timestamps.append(now)
            self.requests[client_ip] = timestamps


# Default global rate limiter instances
auth_rate_limiter = SlidingWindowRateLimiter(max_requests=30, window_seconds=60)
api_rate_limiter = SlidingWindowRateLimiter(max_requests=120, window_seconds=60)
