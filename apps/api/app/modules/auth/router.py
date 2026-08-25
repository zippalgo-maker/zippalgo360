from fastapi import APIRouter, Depends
from sqlalchemy import Connection

from app.database import get_db
from app.deps import get_current_user
from app.modules.auth import service
from app.modules.users.schemas import TokenOut, UserCreate, UserLogin, UserOut

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=TokenOut)
def register(payload: UserCreate, conn: Connection = Depends(get_db)) -> TokenOut:
    return service.register(conn, payload)


@router.post("/login", response_model=TokenOut)
def login(payload: UserLogin, conn: Connection = Depends(get_db)) -> TokenOut:
    return service.login(conn, payload)


@router.get("/me", response_model=UserOut)
def me(user: dict = Depends(get_current_user)) -> UserOut:
    return UserOut(**user)
