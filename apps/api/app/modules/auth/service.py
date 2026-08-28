from fastapi import HTTPException, status
from sqlalchemy import Connection

from app.modules.auth import kakao
from app.modules.auth.security import create_access_token, hash_password, verify_password
from app.modules.users.repository import (
    create_kakao_user,
    create_user,
    get_user_by_email,
    get_user_by_kakao_id,
    link_kakao_id,
)
from app.modules.users.schemas import KakaoLoginIn, TokenOut, UserCreate, UserLogin, UserOut


def register(conn: Connection, payload: UserCreate) -> TokenOut:
    if get_user_by_email(conn, payload.email) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 가입된 이메일입니다.")

    user = create_user(
        conn,
        email=payload.email,
        password_hash=hash_password(payload.password),
        name=payload.name,
        phone=payload.phone,
        role=payload.role.value,
    )
    token = create_access_token(subject=str(user["id"]), role=user["role"])
    return TokenOut(access_token=token, user=UserOut(**user))


def login(conn: Connection, payload: UserLogin) -> TokenOut:
    user = get_user_by_email(conn, payload.email)
    if (
        user is None
        or user["password_hash"] is None
        or not verify_password(payload.password, user["password_hash"])
    ):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    token = create_access_token(subject=str(user["id"]), role=user["role"])
    return TokenOut(access_token=token, user=UserOut(**user))


def kakao_login(conn: Connection, payload: KakaoLoginIn) -> TokenOut:
    profile = kakao.fetch_kakao_profile(payload.code, payload.redirect_uri)

    user = get_user_by_kakao_id(conn, profile.kakao_id)
    if user is None:
        existing_by_email = get_user_by_email(conn, profile.email)
        if existing_by_email is not None:
            # 이미 이메일로 가입된 계정과 카카오 계정 이메일이 같으면 새 계정을
            # 만들지 않고 기존 계정에 카카오 로그인을 연결한다(같은 사람 취급).
            user = link_kakao_id(conn, user_id=existing_by_email["id"], kakao_id=profile.kakao_id)
        else:
            user = create_kakao_user(conn, kakao_id=profile.kakao_id, email=profile.email, name=profile.nickname)

    token = create_access_token(subject=str(user["id"]), role=user["role"])
    return TokenOut(access_token=token, user=UserOut(**user))
