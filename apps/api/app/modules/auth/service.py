from fastapi import HTTPException, status
from sqlalchemy import Connection

from app.modules.auth.security import create_access_token, hash_password, verify_password
from app.modules.users.repository import create_user, get_user_by_email
from app.modules.users.schemas import TokenOut, UserCreate, UserLogin, UserOut


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
    if user is None or not verify_password(payload.password, user["password_hash"]):
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="이메일 또는 비밀번호가 올바르지 않습니다.")

    token = create_access_token(subject=str(user["id"]), role=user["role"])
    return TokenOut(access_token=token, user=UserOut(**user))
