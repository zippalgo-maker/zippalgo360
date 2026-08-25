from fastapi import APIRouter, Depends
from sqlalchemy import Connection

from app.database import get_db
from app.deps import require_role
from app.modules.apartments import service
from app.modules.apartments.schemas import (
    ApartmentComplexCreate,
    ApartmentComplexOut,
    ApartmentTypeCreate,
    ApartmentTypeOut,
)

router = APIRouter(prefix="/apartments", tags=["apartments"])


@router.get("/complexes", response_model=list[ApartmentComplexOut])
def search_complexes(
    keyword: str | None = None,
    sido: str | None = None,
    sigungu: str | None = None,
    conn: Connection = Depends(get_db),
) -> list[ApartmentComplexOut]:
    return service.search_complexes(conn, keyword, sido, sigungu)


@router.post("/complexes", response_model=ApartmentComplexOut)
def create_complex(
    payload: ApartmentComplexCreate,
    _: dict = Depends(require_role("admin")),
    conn: Connection = Depends(get_db),
) -> ApartmentComplexOut:
    return service.create_complex(conn, payload)


@router.get("/complexes/{complex_id}/types", response_model=list[ApartmentTypeOut])
def list_types(complex_id: int, conn: Connection = Depends(get_db)) -> list[ApartmentTypeOut]:
    return service.list_types_by_complex(conn, complex_id)


@router.post("/types", response_model=ApartmentTypeOut)
def create_type(
    payload: ApartmentTypeCreate,
    _: dict = Depends(require_role("admin")),
    conn: Connection = Depends(get_db),
) -> ApartmentTypeOut:
    return service.create_type(conn, payload)
