from sqlalchemy import Connection, text


def create_registration(conn: Connection, *, user_id: int | None, **fields) -> dict:
    row = conn.execute(
        text(
            """
            INSERT INTO lifestyle_interest_registrations (
                user_id, service_type, name, phone, region, desired_date, memo, pyeong, home_style
            )
            VALUES (
                :user_id, :service_type, :name, :phone, :region, :desired_date, :memo, :pyeong, :home_style
            )
            RETURNING id, service_type, name, phone, region, desired_date, memo, pyeong, home_style, created_at
            """
        ),
        {"user_id": user_id, **fields},
    ).mappings().one()
    conn.commit()
    return dict(row)


def list_registrations(conn: Connection, service_type: str | None = None) -> list[dict]:
    query = """
        SELECT id, service_type, name, phone, region, desired_date, memo, pyeong, home_style, created_at
        FROM lifestyle_interest_registrations
    """
    params: dict = {}
    if service_type:
        query += " WHERE service_type = :service_type"
        params["service_type"] = service_type
    query += " ORDER BY created_at DESC"

    rows = conn.execute(text(query), params).mappings().all()
    return [dict(r) for r in rows]
