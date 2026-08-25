from fastapi import APIRouter, Depends
from sqlalchemy import Connection

from app.database import get_db
from app.deps import require_role
from app.modules.lifestyle import repository
from app.modules.lifestyle.schemas import InterestRegistrationCreate, InterestRegistrationOut

router = APIRouter(prefix="/lifestyle", tags=["lifestyle"])


@router.post("/interest", response_model=InterestRegistrationOut)
def register_interest(
    payload: InterestRegistrationCreate,
    conn: Connection = Depends(get_db),
) -> InterestRegistrationOut:
    registration = repository.create_registration(conn, user_id=None, **payload.model_dump())
    return InterestRegistrationOut(**registration)


@router.get("/interest", response_model=list[InterestRegistrationOut])
def list_interest_registrations(
    service_type: str | None = None,
    _: dict = Depends(require_role("admin")),
    conn: Connection = Depends(get_db),
) -> list[InterestRegistrationOut]:
    return [InterestRegistrationOut(**r) for r in repository.list_registrations(conn, service_type)]
