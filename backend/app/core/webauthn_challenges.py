import time
from typing import Optional

CHALLENGE_TTL = 300

# WARNING: In-memory store — not shared across workers. Use Redis for multi-worker deployments.
challenges: dict[str, tuple[bytes, float]] = {}


def store_challenge(key: str, challenge: bytes) -> None:
    cleanup_expired()
    challenges[key] = (challenge, time.time())


def get_challenge(key: str) -> Optional[bytes]:
    entry = challenges.pop(key, None)
    if entry is None:
        return None
    challenge, created = entry
    if time.time() - created > CHALLENGE_TTL:
        return None
    return challenge


def cleanup_expired() -> None:
    now = time.time()
    expired = [k for k, (_, t) in challenges.items() if now - t > CHALLENGE_TTL]
    for k in expired:
        challenges.pop(k, None)
