from fastapi import Request
from fastapi.exceptions import RequestValidationError
from fastapi.responses import JSONResponse
from starlette.exceptions import HTTPException as StarletteHTTPException

from app.middleware import request_id_ctx
from app.schemas.error import ErrorDetail, ErrorResponse, HTTP_ERROR_CODES


async def http_exception_handler(request: Request, exc: StarletteHTTPException) -> JSONResponse:
    status_code = exc.status_code
    error_code = HTTP_ERROR_CODES.get(status_code, "UNKNOWN_ERROR")
    req_id = getattr(request.state, "request_id", None) or request_id_ctx.get("")

    detail_message = exc.detail if isinstance(exc.detail, str) else str(exc.detail)

    body = ErrorResponse(
        error_code=error_code,
        message=detail_message,
        request_id=req_id or None,
    )
    return JSONResponse(status_code=status_code, content=body.model_dump(exclude_none=True))


async def validation_exception_handler(request: Request, exc: RequestValidationError) -> JSONResponse:
    req_id = getattr(request.state, "request_id", None) or request_id_ctx.get("")

    details = []
    for err in exc.errors():
        field = " -> ".join(str(loc) for loc in err.get("loc", []))
        details.append(ErrorDetail(field=field, message=err.get("msg", "")))

    body = ErrorResponse(
        error_code="VALIDATION_ERROR",
        message="Request validation failed",
        details=details,
        request_id=req_id or None,
    )
    return JSONResponse(status_code=422, content=body.model_dump(exclude_none=True))


async def generic_exception_handler(request: Request, exc: Exception) -> JSONResponse:
    req_id = getattr(request.state, "request_id", None) or request_id_ctx.get("")

    body = ErrorResponse(
        error_code="INTERNAL_SERVER_ERROR",
        message="An unexpected error occurred",
        request_id=req_id or None,
    )
    return JSONResponse(status_code=500, content=body.model_dump(exclude_none=True))
