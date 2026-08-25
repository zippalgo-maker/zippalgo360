from sqlalchemy import Connection, text


def create_complex(conn: Connection, **fields) -> dict:
    row = conn.execute(
        text(
            """
            INSERT INTO apartment_complexes (
                name, sido, sigungu, eupmyeondong, road_address,
                completion_year, household_count, builder_name
            )
            VALUES (
                :name, :sido, :sigungu, :eupmyeondong, :road_address,
                :completion_year, :household_count, :builder_name
            )
            RETURNING id, name, sido, sigungu, eupmyeondong, road_address,
                      completion_year, household_count, builder_name
            """
        ),
        fields,
    ).mappings().one()
    conn.commit()
    return dict(row)


def search_complexes(conn: Connection, *, keyword: str | None, sido: str | None, sigungu: str | None) -> list[dict]:
    query = """
        SELECT id, name, sido, sigungu, eupmyeondong, road_address,
               completion_year, household_count, builder_name
        FROM apartment_complexes
        WHERE is_active = true
    """
    params: dict = {}
    if keyword:
        query += " AND name ILIKE :keyword"
        params["keyword"] = f"%{keyword}%"
    if sido:
        query += " AND sido = :sido"
        params["sido"] = sido
    if sigungu:
        query += " AND sigungu = :sigungu"
        params["sigungu"] = sigungu
    query += " ORDER BY name LIMIT 50"

    rows = conn.execute(text(query), params).mappings().all()
    return [dict(r) for r in rows]


def get_complex_by_id(conn: Connection, complex_id: int) -> dict | None:
    row = conn.execute(
        text(
            """
            SELECT id, name, sido, sigungu, eupmyeondong, road_address,
                   completion_year, household_count, builder_name
            FROM apartment_complexes WHERE id = :id
            """
        ),
        {"id": complex_id},
    ).mappings().first()
    return dict(row) if row else None


def create_type(conn: Connection, **fields) -> dict:
    row = conn.execute(
        text(
            """
            INSERT INTO apartment_types (
                complex_id, type_name, exclusive_area, supply_area, room_count, bathroom_count
            )
            VALUES (
                :complex_id, :type_name, :exclusive_area, :supply_area, :room_count, :bathroom_count
            )
            RETURNING id, complex_id, type_name, exclusive_area, supply_area, room_count, bathroom_count
            """
        ),
        fields,
    ).mappings().one()
    conn.commit()
    return dict(row)


def list_types_by_complex(conn: Connection, complex_id: int) -> list[dict]:
    rows = conn.execute(
        text(
            """
            SELECT id, complex_id, type_name, exclusive_area, supply_area, room_count, bathroom_count
            FROM apartment_types
            WHERE complex_id = :complex_id AND is_active = true
            ORDER BY exclusive_area
            """
        ),
        {"complex_id": complex_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def get_type_by_id(conn: Connection, type_id: int) -> dict | None:
    row = conn.execute(
        text(
            """
            SELECT id, complex_id, type_name, exclusive_area, supply_area, room_count, bathroom_count
            FROM apartment_types WHERE id = :id
            """
        ),
        {"id": type_id},
    ).mappings().first()
    return dict(row) if row else None
