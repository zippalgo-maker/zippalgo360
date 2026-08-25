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
    service_regions: list[str],
) -> dict:
    row = conn.execute(
        text(
            """
            INSERT INTO companies (
                owner_user_id, company_type, business_name,
                business_registration_number, representative_name, address, phone
            )
            VALUES (
                :owner_user_id, :company_type, :business_name,
                :business_registration_number, :representative_name, :address, :phone
            )
            RETURNING id, owner_user_id, company_type, business_name,
                      business_registration_number, representative_name,
                      address, phone, is_verified, is_active, created_at
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
                   address, phone, is_verified, is_active, created_at
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
                   address, phone, is_verified, is_active, created_at
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
               address, phone, is_verified, is_active, created_at
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
