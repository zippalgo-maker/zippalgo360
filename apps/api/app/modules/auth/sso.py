"""JIT SSO 코드 발급/검증.

집팔고360에 로그인된 사용자가 하위 서비스(집테리어 등)를 iframe으로 열 때,
장기 유효 JWT를 그대로 URL에 노출하는 대신 1회용·단기 만료 코드로 신원을
넘긴다. 하위 서비스는 이 코드를 서버 간 통신(POST /auth/sso/verify)으로
검증해서 이메일/이름/역할을 받고, 자기 쪽 계정을 찾거나 새로 만든다.

코드는 프로세스 메모리에만 저장된다 — API를 여러 워커/인스턴스로 스케일하게
되면 Redis 등 프로세스 간 공유 저장소로 옮겨야 한다(현재는 uvicorn 단일
프로세스로 운영 중이라 문제 없음, docs/WORK_LOG.md 참고).
"""

import secrets
import time

_codes: dict[str, tuple[dict, float]] = {}


def _prune_expired(now: float) -> None:
    expired = [code for code, (_, expires_at) in _codes.items() if expires_at <= now]
    for code in expired:
        _codes.pop(code, None)


def issue_code(user: dict, ttl_seconds: int) -> str:
    now = time.monotonic()
    _prune_expired(now)

    code = secrets.token_urlsafe(24)
    identity = {
        "user_id": user["id"],
        "email": user["email"],
        "name": user["name"],
        "role": user["role"],
    }
    _codes[code] = (identity, now + ttl_seconds)
    return code


def verify_and_consume(code: str) -> dict | None:
    entry = _codes.pop(code, None)
    if entry is None:
        return None

    identity, expires_at = entry
    if time.monotonic() > expires_at:
        return None

    return identity
