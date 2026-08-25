from fastapi import HTTPException, status
from sqlalchemy import Connection

from app.modules.companies import repository
from app.modules.companies.schemas import CompanyCreate, CompanyOut


def register_company(conn: Connection, owner_user_id: int, payload: CompanyCreate) -> CompanyOut:
    if repository.get_company_by_owner(conn, owner_user_id) is not None:
        raise HTTPException(status_code=status.HTTP_409_CONFLICT, detail="이미 등록된 업체가 있습니다.")

    company = repository.create_company(
        conn,
        owner_user_id=owner_user_id,
        company_type=payload.company_type.value,
        business_name=payload.business_name,
        business_registration_number=payload.business_registration_number,
        representative_name=payload.representative_name,
        address=payload.address,
        phone=payload.phone,
        service_regions=payload.service_regions,
    )
    return CompanyOut(**company)


def list_companies(conn: Connection, company_type: str | None = None) -> list[CompanyOut]:
    return [CompanyOut(**c) for c in repository.list_companies(conn, company_type=company_type)]
