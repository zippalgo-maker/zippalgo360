from fastapi import APIRouter, Depends
from sqlalchemy import Connection

from app.database import get_db
from app.deps import get_current_user
from app.modules.companies import service
from app.modules.companies.schemas import CompanyCreate, CompanyMapMarker, CompanyOut

router = APIRouter(prefix="/companies", tags=["companies"])


@router.post("", response_model=CompanyOut)
def register_company(
    payload: CompanyCreate,
    user: dict = Depends(get_current_user),
    conn: Connection = Depends(get_db),
) -> CompanyOut:
    return service.register_company(conn, user["id"], payload)


@router.get("", response_model=list[CompanyOut])
def list_companies(
    company_type: str | None = None,
    conn: Connection = Depends(get_db),
) -> list[CompanyOut]:
    return service.list_companies(conn, company_type=company_type)


@router.get("/map/markers", response_model=list[CompanyMapMarker])
def list_map_markers(
    company_type: str | None = None,
    north: float | None = None,
    south: float | None = None,
    east: float | None = None,
    west: float | None = None,
    limit: int = 1000,
    conn: Connection = Depends(get_db),
) -> list[CompanyMapMarker]:
    return service.list_map_markers(
        conn, company_type=company_type, north=north, south=south, east=east, west=west, limit=min(limit, 10000)
    )
