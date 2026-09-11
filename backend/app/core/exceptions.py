"""
core/exceptions.py
──────────────────
Custom application exceptions and FastAPI exception handlers.
Centralizes all error responses in one place.
"""

from fastapi import FastAPI, Request
from fastapi.responses import JSONResponse


# ── Custom exception classes ──────────────────────────────────────

class AppException(Exception):
    """Base exception for all application-level errors."""
    def __init__(self, status_code: int, detail: str, error_code: str = "APP_ERROR"):
        self.status_code = status_code
        self.detail = detail
        self.error_code = error_code
        super().__init__(detail)


class AuthenticationError(AppException):
    def __init__(self, detail: str = "Authentication failed"):
        super().__init__(401, detail, "AUTHENTICATION_ERROR")


class AuthorizationError(AppException):
    def __init__(self, detail: str = "You do not have permission to perform this action"):
        super().__init__(403, detail, "AUTHORIZATION_ERROR")


class NotFoundError(AppException):
    def __init__(self, resource: str = "Resource"):
        super().__init__(404, f"{resource} not found", "NOT_FOUND")


class ConflictError(AppException):
    def __init__(self, detail: str = "Resource already exists"):
        super().__init__(409, detail, "CONFLICT")


class ValidationError(AppException):
    def __init__(self, detail: str = "Invalid input"):
        super().__init__(422, detail, "VALIDATION_ERROR")


class TenantSuspendedError(AppException):
    def __init__(self):
        super().__init__(403, "Your company account is suspended. Please contact support.", "TENANT_SUSPENDED")


class PlanLimitError(AppException):
    def __init__(self, resource: str = "resource"):
        super().__init__(402, f"Plan limit reached for {resource}. Please upgrade your plan.", "PLAN_LIMIT_EXCEEDED")


# ── Exception handlers ────────────────────────────────────────────

def _error_response(request: Request, exc: AppException) -> JSONResponse:
    origin = request.headers.get("origin", "*")
    headers = {
        "Access-Control-Allow-Origin": origin,
        "Access-Control-Allow-Credentials": "true",
        "Access-Control-Allow-Methods": "*",
        "Access-Control-Allow-Headers": "*",
    }
    return JSONResponse(
        status_code=exc.status_code,
        headers=headers,
        content={
            "success": False,
            "error_code": exc.error_code,
            "message": exc.detail,
            "path": str(request.url.path),
        },
    )


def register_exception_handlers(app: FastAPI) -> None:
    """Register all custom exception handlers on the FastAPI app."""

    @app.exception_handler(AppException)
    async def handle_app_exception(request: Request, exc: AppException) -> JSONResponse:
        return _error_response(request, exc)

    @app.exception_handler(404)
    async def handle_404(request: Request, exc: Exception) -> JSONResponse:
        origin = request.headers.get("origin", "*")
        headers = {
            "Access-Control-Allow-Origin": origin,
            "Access-Control-Allow-Credentials": "true",
            "Access-Control-Allow-Methods": "*",
            "Access-Control-Allow-Headers": "*",
        }
        return JSONResponse(
            status_code=404,
            headers=headers,
            content={"success": False, "error_code": "NOT_FOUND", "message": "Endpoint not found"},
        )
