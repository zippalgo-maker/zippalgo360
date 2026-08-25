from fastapi import HTTPException, status
from sqlalchemy import Connection

from app.modules.apartments import repository
from app.modules.apartments.schemas import (
    ApartmentComplexCreate,
    ApartmentComplexOut,
    ApartmentTypeCreate,
    ApartmentTypeOut,
)


def create_complex(conn: Connection, payload: ApartmentComplexCreate) -> ApartmentComplexOut:
    return ApartmentComplexOut(**repository.create_complex(conn, **payload.model_dump()))


def search_complexes(
    conn: Connection, keyword: str | None, sido: str | None, sigungu: str | None
) -> list[ApartmentComplexOut]:
    return [
        ApartmentComplexOut(**c)
        for c in repository.search_complexes(conn, keyword=keyword, sido=sido, sigungu=sigungu)
    ]


def create_type(conn: Connection, payload: ApartmentTypeCreate) -> ApartmentTypeOut:
    if repository.get_complex_by_id(conn, payload.complex_id) is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="단지를 찾을 수 없습니다.")
    return ApartmentTypeOut(**repository.create_type(conn, **payload.model_dump()))


def list_types_by_complex(conn: Connection, complex_id: int) -> list[ApartmentTypeOut]:
    return [ApartmentTypeOut(**t) for t in repository.list_types_by_complex(conn, complex_id)]
