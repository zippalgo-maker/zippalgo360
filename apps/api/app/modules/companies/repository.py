from sqlalchemy import Connection, text


def create_company(
    conn: Connection,
    *,
    owner_user_id: int,
    company_type: str,
    business_name: str,
    business_registration_number: str,
    representative_name: str,
    address: str,
    phone: str,
    latitude: float | None,
    longitude: float | None,
    service_regions: list[str],
) -> dict:
    row = conn.execute(
        text(
            """
            INSERT INTO companies (
                owner_user_id, company_type, business_name,
                business_registration_number, representative_name, address, phone,
                latitude, longitude
            )
            VALUES (
                :owner_user_id, :company_type, :business_name,
                :business_registration_number, :representative_name, :address, :phone,
                :latitude, :longitude
            )
            RETURNING id, owner_user_id, company_type, business_name,
                      business_registration_number, representative_name,
                      address, phone, latitude, longitude, is_verified, is_active, created_at
            """
        ),
        {
            "owner_user_id": owner_user_id,
            "company_type": company_type,
            "business_name": business_name,
            "business_registration_number": business_registration_number,
            "representative_name": representative_name,
            "address": address,
            "phone": phone,
            "latitude": latitude,
            "longitude": longitude,
        },
    ).mappings().one()

    for region in service_regions:
        conn.execute(
            text(
                """
                INSERT INTO company_service_regions (company_id, region)
                VALUES (:company_id, :region)
                """
            ),
            {"company_id": row["id"], "region": region},
        )

    conn.commit()
    return {**dict(row), "service_regions": service_regions}


def get_company_by_owner(conn: Connection, owner_user_id: int) -> dict | None:
    row = conn.execute(
        text(
            """
            SELECT id, owner_user_id, company_type, business_name,
                   business_registration_number, representative_name,
                   address, phone, latitude, longitude, is_verified, is_active, created_at
            FROM companies
            WHERE owner_user_id = :owner_user_id
            """
        ),
        {"owner_user_id": owner_user_id},
    ).mappings().first()
    if row is None:
        return None
    return {**dict(row), "service_regions": get_service_regions(conn, row["id"])}


def get_company_by_id(conn: Connection, company_id: int) -> dict | None:
    row = conn.execute(
        text(
            """
            SELECT id, owner_user_id, company_type, business_name,
                   business_registration_number, representative_name,
                   address, phone, latitude, longitude, is_verified, is_active, created_at
            FROM companies
            WHERE id = :id
            """
        ),
        {"id": company_id},
    ).mappings().first()
    if row is None:
        return None
    return {**dict(row), "service_regions": get_service_regions(conn, row["id"])}


def get_service_regions(conn: Connection, company_id: int) -> list[str]:
    rows = conn.execute(
        text("SELECT region FROM company_service_regions WHERE company_id = :company_id"),
        {"company_id": company_id},
    ).all()
    return [r[0] for r in rows]


def list_companies(conn: Connection, *, company_type: str | None = None) -> list[dict]:
    query = """
        SELECT id, owner_user_id, company_type, business_name,
               business_registration_number, representative_name,
               address, phone, latitude, longitude, is_verified, is_active, created_at
        FROM companies
        WHERE is_active = true
    """
    params: dict = {}
    if company_type:
        query += " AND company_type = :company_type"
        params["company_type"] = company_type
    query += " ORDER BY created_at DESC"

    rows = conn.execute(text(query), params).mappings().all()
    return [{**dict(r), "service_regions": get_service_regions(conn, r["id"])} for r in rows]


def list_companies_admin(conn: Connection, *, is_verified: bool | None = None) -> list[dict]:
    query = """
        SELECT c.id, c.owner_user_id, c.company_type, c.business_name,
               c.business_registration_number, c.representative_name,
               c.address, c.phone, c.latitude, c.longitude, c.is_verified, c.is_active, c.created_at,
               u.email AS owner_email, u.name AS owner_name
        FROM companies c
        JOIN users u ON u.id = c.owner_user_id
    """
    params: dict = {}
    if is_verified is not None:
        query += " WHERE c.is_verified = :is_verified"
        params["is_verified"] = is_verified
    query += " ORDER BY c.created_at DESC"

    rows = conn.execute(text(query), params).mappings().all()
    return [{**dict(r), "service_regions": get_service_regions(conn, r["id"])} for r in rows]


def set_company_verified(conn: Connection, company_id: int, is_verified: bool) -> dict | None:
    row = conn.execute(
        text(
            """
            UPDATE companies
            SET is_verified = :is_verified, updated_at = now()
            WHERE id = :id
            RETURNING id, owner_user_id, company_type, business_name,
                      business_registration_number, representative_name,
                      address, phone, latitude, longitude, is_verified, is_active, created_at
            """
        ),
        {"id": company_id, "is_verified": is_verified},
    ).mappings().first()
    conn.commit()
    if row is None:
        return None
    return {**dict(row), "service_regions": get_service_regions(conn, row["id"])}


def set_company_active(conn: Connection, company_id: int, is_active: bool) -> dict | None:
    row = conn.execute(
        text(
            """
            UPDATE companies
            SET is_active = :is_active, updated_at = now()
            WHERE id = :id
            RETURNING id, owner_user_id, company_type, business_name,
                      business_registration_number, representative_name,
                      address, phone, latitude, longitude, is_verified, is_active, created_at
            """
        ),
        {"id": company_id, "is_active": is_active},
    ).mappings().first()
    conn.commit()
    if row is None:
        return None
    return {**dict(row), "service_regions": get_service_regions(conn, row["id"])}


def list_map_markers(
    conn: Connection,
    *,
    company_type: str | None,
    north: float | None,
    south: float | None,
    east: float | None,
    west: float | None,
    limit: int,
) -> list[dict]:
    """지도 마커용 최소 컬럼만 단일 쿼리로 반환한다(업체당 추가 조회 없음).

    `list_companies`와 동일하게 is_active만 필터한다 — is_verified로도
    거르려 했으나, 이 코드베이스엔 아직 업체를 승인(is_verified=true로
    전환)하는 관리자 기능이 없어서 그 필터를 넣으면 어떤 업체도 영원히
    지도에 뜰 수 없었다. 승인 플로우가 생기면 그때 다시 필터를 추가한다.
    """
    query = """
        SELECT id, company_type, business_name, latitude, longitude
        FROM companies
        WHERE is_active = true
          AND latitude IS NOT NULL AND longitude IS NOT NULL
    """
    params: dict = {}
    if company_type:
        query += " AND company_type = :company_type"
        params["company_type"] = company_type
    if north is not None:
        query += " AND latitude <= :north"
        params["north"] = north
    if south is not None:
        query += " AND latitude >= :south"
        params["south"] = south
    if east is not None:
        query += " AND longitude <= :east"
        params["east"] = east
    if west is not None:
        query += " AND longitude >= :west"
        params["west"] = west
    query += " LIMIT :limit"
    params["limit"] = limit

    rows = conn.execute(text(query), params).mappings().all()
    return [dict(r) for r in rows]
