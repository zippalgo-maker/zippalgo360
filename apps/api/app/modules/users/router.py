from fastapi import APIRouter, Depends
from sqlalchemy import Connection

from app.database import get_db
from app.deps import require_role
from app.modules.users import service
from app.modules.users.schemas import UserOut, UserRoleUpdate

router = APIRouter(prefix="/users", tags=["users"])


@router.get("", response_model=list[UserOut])
def list_users(
    role: str | None = None,
    _: dict = Depends(require_role("admin")),
    conn: Connection = Depends(get_db),
) -> list[UserOut]:
    return service.list_users(conn, role=role)


@router.post("/{user_id}/activate", response_model=UserOut)
def activate_user(
    user_id: int,
    admin: dict = Depends(require_role("admin")),
    conn: Connection = Depends(get_db),
) -> UserOut:
    return service.set_user_active(conn, actor_id=admin["id"], user_id=user_id, is_active=True)


@router.post("/{user_id}/deactivate", response_model=UserOut)
def deactivate_user(
    user_id: int,
    admin: dict = Depends(require_role("admin")),
    conn: Connection = Depends(get_db),
) -> UserOut:
    return service.set_user_active(conn, actor_id=admin["id"], user_id=user_id, is_active=False)


@router.post("/{user_id}/role", response_model=UserOut)
def change_user_role(
    user_id: int,
    payload: UserRoleUpdate,
    admin: dict = Depends(require_role("admin")),
    conn: Connection = Depends(get_db),
) -> UserOut:
    return service.set_user_role(conn, actor_id=admin["id"], user_id=user_id, role=payload.role)
