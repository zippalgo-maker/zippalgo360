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
    MapMarkerListOut,
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


@router.get("/complexes/{complex_id}", response_model=ApartmentComplexOut)
def get_complex(complex_id: int, conn: Connection = Depends(get_db)) -> ApartmentComplexOut:
    return service.get_complex(conn, complex_id)


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


@router.get("/types/{type_id}", response_model=ApartmentTypeOut)
def get_type(type_id: int, conn: Connection = Depends(get_db)) -> ApartmentTypeOut:
    return service.get_type(conn, type_id)


@router.get("/map/markers", response_model=MapMarkerListOut)
def list_map_markers(
    north: float | None = None,
    south: float | None = None,
    east: float | None = None,
    west: float | None = None,
    sido: str | None = None,
    sigungu: str | None = None,
    limit: int = 1000,
    conn: Connection = Depends(get_db),
) -> MapMarkerListOut:
    return service.list_map_markers(
        conn, north=north, south=south, east=east, west=west, sido=sido, sigungu=sigungu, limit=min(limit, 10000)
    )
