from fastapi import HTTPException, status
from sqlalchemy import Connection

from app.modules.users import repository
from app.modules.users.schemas import UserOut, UserRole


def list_users(conn: Connection, *, role: str | None) -> list[UserOut]:
    return [UserOut(**u) for u in repository.list_users(conn, role=role)]


def set_user_active(conn: Connection, *, actor_id: int, user_id: int, is_active: bool) -> UserOut:
    if actor_id == user_id and not is_active:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="본인 계정은 비활성화할 수 없습니다.")

    user = repository.set_user_active(conn, user_id, is_active)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    return UserOut(**user)


def set_user_role(conn: Connection, *, actor_id: int, user_id: int, role: UserRole) -> UserOut:
    if actor_id == user_id:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="본인 역할은 변경할 수 없습니다.")

    user = repository.set_user_role(conn, user_id, role.value)
    if user is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="사용자를 찾을 수 없습니다.")
    return UserOut(**user)
