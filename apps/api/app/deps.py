from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from sqlalchemy import Connection

from app.database import get_db
from app.modules.auth.security import decode_access_token
from app.modules.companies.repository import get_company_by_owner
from app.modules.users.repository import get_user_by_id

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    conn: Connection = Depends(get_db),
) -> dict:
    if credentials is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="로그인이 필요합니다.")

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="유효하지 않은 토큰입니다.")

    user = get_user_by_id(conn, int(payload["sub"]))
    if user is None:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="사용자를 찾을 수 없습니다.")

    return user


def get_optional_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
    conn: Connection = Depends(get_db),
) -> dict | None:
    if credentials is None:
        return None

    payload = decode_access_token(credentials.credentials)
    if payload is None:
        return None

    return get_user_by_id(conn, int(payload["sub"]))


def require_role(*roles: str):
    def _check(user: dict = Depends(get_current_user)) -> dict:
        if user["role"] not in roles:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="권한이 없습니다.")
        return user

    return _check


def get_current_company(
    user: dict = Depends(require_role("company")),
    conn: Connection = Depends(get_db),
) -> dict:
    company = get_company_by_owner(conn, user["id"])
    if company is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="등록된 업체 정보가 없습니다.")
    return company


def require_company_type(company_type: str):
    def _check(user: dict = Depends(require_role("company")), conn: Connection = Depends(get_db)) -> dict:
        company = get_company_by_owner(conn, user["id"])
        if company is None:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="등록된 업체 정보가 없습니다.")
        if company["company_type"] != company_type:
            raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="해당 서비스에 등록된 업체가 아닙니다.")
        return company

    return _check
