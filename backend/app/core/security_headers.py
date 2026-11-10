"""
Security Headers Middleware for AI Recruitment Hub.
Enforces industry standard OWASP security headers across all HTTP responses.
"""
from starlette.middleware.base import BaseHTTPMiddleware
from starlette.requests import Request
from starlette.responses import Response


class SecurityHeadersMiddleware(BaseHTTPMiddleware):
    """
    Applies strict security headers:
    - X-Content-Type-Options: nosniff (Prevents MIME sniffing attacks)
    - X-Frame-Options: DENY (Prevents Clickjacking)
    - X-XSS-Protection: 1; mode=block (Legacy XSS protection)
    - Strict-Transport-Security: max-age=31536000; includeSubDomains (Enforces HTTPS)
    - Referrer-Policy: strict-origin-when-cross-origin
    - Permissions-Policy: camera=(self), microphone=(self), geolocation=()
    """

    async def dispatch(self, request: Request, call_next):
        response: Response = await call_next(request)

        response.headers["X-Content-Type-Options"] = "nosniff"
        response.headers["X-Frame-Options"] = "DENY"
        response.headers["X-XSS-Protection"] = "1; mode=block"
        response.headers["Strict-Transport-Security"] = "max-age=31536000; includeSubDomains"
        response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
        response.headers["Permissions-Policy"] = "camera=(self), microphone=(self), geolocation=()"

        return response
