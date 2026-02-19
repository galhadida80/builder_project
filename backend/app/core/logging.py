import json
import logging
import sys
import time
from datetime import datetime, timezone

from fastapi import Request
from starlette.middleware.base import BaseHTTPMiddleware


class GCPJsonFormatter(logging.Formatter):

    LEVEL_TO_SEVERITY = {
        logging.DEBUG: "DEBUG",
        logging.INFO: "INFO",
        logging.WARNING: "WARNING",
        logging.ERROR: "ERROR",
        logging.CRITICAL: "CRITICAL",
    }

    def format(self, record: logging.LogRecord) -> str:
        log_entry = {
            "severity": self.LEVEL_TO_SEVERITY.get(record.levelno, "DEFAULT"),
            "message": record.getMessage(),
            "time": datetime.fromtimestamp(record.created, tz=timezone.utc).isoformat(),
            "logger": record.name,
        }

        if record.exc_info and record.exc_info[0] is not None:
            log_entry["stack_trace"] = self.formatException(record.exc_info)

        extra_keys = set(record.__dict__) - {
            "name", "msg", "args", "created", "relativeCreated", "exc_info",
            "exc_text", "stack_info", "lineno", "funcName", "pathname",
            "filename", "module", "thread", "threadName", "process",
            "processName", "levelname", "levelno", "msecs", "message",
            "taskName",
        }
        for key in extra_keys:
            log_entry[key] = record.__dict__[key]

        return json.dumps(log_entry, default=str, ensure_ascii=False)


class RequestLoggingMiddleware(BaseHTTPMiddleware):

    SKIP_PATHS = {"/health", "/api/v1/docs", "/api/v1/openapi.json", "/favicon.ico"}

    async def dispatch(self, request: Request, call_next):
        if request.url.path in self.SKIP_PATHS:
            return await call_next(request)

        start = time.monotonic()
        response = await call_next(request)
        duration_ms = round((time.monotonic() - start) * 1000)

        status = response.status_code
        logger = logging.getLogger("api.request")

        level = logging.INFO
        if status >= 500:
            level = logging.ERROR
        elif status >= 400:
            level = logging.WARNING

        logger.log(
            level,
            "%s %s %d %dms",
            request.method,
            request.url.path,
            status,
            duration_ms,
            extra={
                "httpRequest": {
                    "requestMethod": request.method,
                    "requestUrl": str(request.url),
                    "status": status,
                    "latency": f"{duration_ms / 1000:.3f}s",
                    "remoteIp": request.client.host if request.client else None,
                    "userAgent": request.headers.get("user-agent", ""),
                },
            },
        )

        return response


def setup_logging(environment: str = "development"):
    root = logging.getLogger()
    root.handlers.clear()

    handler = logging.StreamHandler(sys.stdout)

    if environment == "production":
        handler.setFormatter(GCPJsonFormatter())
        root.setLevel(logging.INFO)
    else:
        handler.setFormatter(
            logging.Formatter("%(asctime)s %(levelname)-8s [%(name)s] %(message)s")
        )
        root.setLevel(logging.DEBUG)

    root.addHandler(handler)

    logging.getLogger("uvicorn.access").setLevel(logging.WARNING)
    logging.getLogger("sqlalchemy.engine").setLevel(logging.WARNING)
