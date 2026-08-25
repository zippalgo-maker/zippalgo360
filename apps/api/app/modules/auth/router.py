import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import Connection

from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user
from app.modules.auth import service, sso
from app.modules.users.schemas import (
    SsoCodeOut,
    SsoVerifyIn,
    SsoVerifyOut,
    TokenOut,
    UserCreate,
    UserLogin,
    UserOut,
)

router = APIRouter(prefix="/auth", tags=["auth"])
settings = get_settings()


@router.post("/register", response_model=TokenOut)
def register(payload: UserCreate, conn: Connection = Depends(get_db)) -> TokenOut:
    return service.register(conn, payload)


@router.post("/login", response_model=TokenOut)
def login(payload: UserLogin, conn: Connection = Depends(get_db)) -> TokenOut:
    return service.login(conn, payload)


@router.get("/me", response_model=UserOut)
def me(user: dict = Depends(get_current_user)) -> UserOut:
    return UserOut(**user)


@router.post("/sso/issue-code", response_model=SsoCodeOut)
def issue_sso_code(user: dict = Depends(get_current_user)) -> SsoCodeOut:
    """하위 서비스(집테리어 등) iframe에 넘길 1회용 신원 코드를 발급한다."""
    code = sso.issue_code(user, settings.sso_code_ttl_seconds)
    return SsoCodeOut(code=code, expires_in=settings.sso_code_ttl_seconds)


@router.post("/sso/verify", response_model=SsoVerifyOut)
def verify_sso_code(
    payload: SsoVerifyIn,
    authorization: str | None = Header(default=None),
) -> SsoVerifyOut:
    """하위 서비스 백엔드가 서버 간 통신으로 코드를 검증한다(공유 시크릿 필요)."""
    expected = f"Bearer {settings.sso_shared_secret}"
    if authorization is None or not secrets.compare_digest(authorization, expected):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="인증되지 않은 요청입니다.")

    identity = sso.verify_and_consume(payload.code)
    if identity is None:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="유효하지 않거나 만료된 코드입니다.")

    return SsoVerifyOut(**identity)
