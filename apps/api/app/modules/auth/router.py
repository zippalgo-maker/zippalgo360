import secrets

from fastapi import APIRouter, Depends, Header, HTTPException, status
from sqlalchemy import Connection

from app.config import get_settings
from app.database import get_db
from app.deps import get_current_user
from app.modules.auth import service, sso
from app.modules.users import repository as users_repository
from app.modules.users.schemas import (
    MapLayerPreferenceIn,
    MapLayerPreferenceOut,
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


@router.get("/me/map-layers", response_model=MapLayerPreferenceOut)
def get_map_layers(
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
) -> MapLayerPreferenceOut:
    """로그인 사용자가 마지막으로 저장한 /map 레이어 선택을 돌려준다.

    저장한 적이 없으면 빈 목록 — 프론트가 이 경우 자기 기본값(또는 쿠키)을
    쓴다.
    """
    stored = users_repository.get_map_layers(conn, user["id"])
    layers = [layer for layer in (stored or "").split(",") if layer]
    return MapLayerPreferenceOut(layers=layers)


@router.put("/me/map-layers", response_model=MapLayerPreferenceOut)
def set_map_layers(
    payload: MapLayerPreferenceIn,
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
) -> MapLayerPreferenceOut:
    """/map의 "설정 저장하기"가 호출하는 저장 엔드포인트.

    어떤 레이어 키가 유효한지(매물/시공사례 중복선택 금지, 최소 1개 필수
    등)는 프론트엔드가 이미 검증한 뒤 보낸다고 가정한다 — 이 값은 그저
    "지도 레이어 이름 목록"일 뿐이라, 앞으로 프론트에 레이어가 추가/변경돼도
    백엔드를 다시 배포할 필요가 없도록 일부러 느슨하게(그대로 저장) 둔다.
    """
    users_repository.set_map_layers(conn, user["id"], ",".join(payload.layers))
    return MapLayerPreferenceOut(layers=payload.layers)


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
