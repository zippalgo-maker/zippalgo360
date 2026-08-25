from fastapi import HTTPException, status
from sqlalchemy import Connection

from app.modules.companies import repository
from app.modules.companies.geocoding import geocode_address
from app.modules.companies.schemas import CompanyCreate, CompanyMapMarker, CompanyOut


def register_company(conn: Connection, owner_user_id: int, payload: CompanyCreate) -> CompanyOut:
    if repository.get_company_by_owner(conn, owner_user_id) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 등록된 업체가 있습니다.")

    location = geocode_address(payload.address)
    latitude, longitude = location if location is not None else (None, None)

    company = repository.create_company(
        conn,
        owner_user_id=owner_user_id,
        company_type=payload.company_type.value,
        business_name=payload.business_name,
        business_registration_number=payload.business_registration_number,
        representative_name=payload.representative_name,
        address=payload.address,
        phone=payload.phone,
        latitude=latitude,
        longitude=longitude,
        service_regions=payload.service_regions,
    )
    return CompanyOut(**company)


def list_companies(conn: Connection, company_type: str | None = None) -> list[CompanyOut]:
    return [CompanyOut(**c) for c in repository.list_companies(conn, company_type=company_type)]


def list_map_markers(
    conn: Connection,
    *,
    company_type: str | None,
    north: float | None,
    south: float | None,
    east: float | None,
    west: float | None,
    limit: int,
) -> list[CompanyMapMarker]:
    markers = repository.list_map_markers(
        conn, company_type=company_type, north=north, south=south, east=east, west=west, limit=limit
    )
    return [CompanyMapMarker(**m) for m in markers]
