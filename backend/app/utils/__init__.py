from datetime import datetime, timezone


def utcnow() -> datetime:
    """Return current UTC time as naive datetime for DB columns without timezone."""
    return datetime.now(timezone.utc).replace(tzinfo=None)
