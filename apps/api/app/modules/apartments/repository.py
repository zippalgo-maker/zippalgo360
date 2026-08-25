from sqlalchemy import Connection, text

COMPLEX_COLUMNS = """
    id, name, sido, sigungu, eupmyeondong, road_address, jibun_address,
    latitude, longitude, completion_year, household_count, building_count,
    parking_count, heating_type, builder_name, complex_type,
    representative_image_path, representative_thumbnail_path
"""

TYPE_COLUMNS = """
    id, complex_id, type_name, exclusive_area_m2, supply_area_m2, pyeong_label,
    room_count, bathroom_count, floor_plan_path, has_basic_layout,
    has_expanded_layout, sort_order
"""


def _with_type_count(row: dict, count: int) -> dict:
    return {**row, "apartment_type_count": count}


def create_complex(conn: Connection, **fields) -> dict:
    row = conn.execute(
        text(
            f"""
            INSERT INTO apartment_complexes (
                name, sido, sigungu, eupmyeondong, road_address, jibun_address,
                latitude, longitude, completion_year, household_count, building_count,
                parking_count, heating_type, builder_name, complex_type
            )
            VALUES (
                :name, :sido, :sigungu, :eupmyeondong, :road_address, :jibun_address,
                :latitude, :longitude, :completion_year, :household_count, :building_count,
                :parking_count, :heating_type, :builder_name, :complex_type
            )
            RETURNING {COMPLEX_COLUMNS}
            """
        ),
        fields,
    ).mappings().one()
    conn.commit()
    return _with_type_count(dict(row), 0)


def search_complexes(conn: Connection, *, keyword: str | None, sido: str | None, sigungu: str | None) -> list[dict]:
    query = f"""
        SELECT {COMPLEX_COLUMNS},
               (SELECT COUNT(*) FROM apartment_types t WHERE t.complex_id = c.id) AS apartment_type_count
        FROM apartment_complexes c
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
            f"""
            SELECT {COMPLEX_COLUMNS},
                   (SELECT COUNT(*) FROM apartment_types t WHERE t.complex_id = apartment_complexes.id)
                       AS apartment_type_count
            FROM apartment_complexes WHERE id = :id
            """
        ),
        {"id": complex_id},
    ).mappings().first()
    return dict(row) if row else None


def create_type(conn: Connection, **fields) -> dict:
    row = conn.execute(
        text(
            f"""
            INSERT INTO apartment_types (
                complex_id, type_name, exclusive_area_m2, supply_area_m2, pyeong_label,
                room_count, bathroom_count
            )
            VALUES (
                :complex_id, :type_name, :exclusive_area_m2, :supply_area_m2, :pyeong_label,
                :room_count, :bathroom_count
            )
            RETURNING {TYPE_COLUMNS}
            """
        ),
        fields,
    ).mappings().one()
    conn.commit()
    return dict(row)


def list_types_by_complex(conn: Connection, complex_id: int) -> list[dict]:
    rows = conn.execute(
        text(
            f"""
            SELECT {TYPE_COLUMNS}
            FROM apartment_types
            WHERE complex_id = :complex_id
            ORDER BY sort_order, exclusive_area_m2
            """
        ),
        {"complex_id": complex_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def get_type_by_id(conn: Connection, type_id: int) -> dict | None:
    row = conn.execute(
        text(f"SELECT {TYPE_COLUMNS} FROM apartment_types WHERE id = :id"),
        {"id": type_id},
    ).mappings().first()
    return dict(row) if row else None


def list_map_markers(
    conn: Connection,
    *,
    north: float | None,
    south: float | None,
    east: float | None,
    west: float | None,
    sido: str | None,
    sigungu: str | None,
    limit: int,
) -> list[dict]:
    query = """
        SELECT c.id, c.name, c.latitude, c.longitude, c.sido, c.sigungu,
               (SELECT COUNT(*) FROM apartment_types t WHERE t.complex_id = c.id) AS apartment_type_count
        FROM apartment_complexes c
        WHERE c.is_active = true AND c.latitude IS NOT NULL AND c.longitude IS NOT NULL
    """
    params: dict = {}
    if north is not None:
        query += " AND c.latitude <= :north"
        params["north"] = north
    if south is not None:
        query += " AND c.latitude >= :south"
        params["south"] = south
    if east is not None:
        query += " AND c.longitude <= :east"
        params["east"] = east
    if west is not None:
        query += " AND c.longitude >= :west"
        params["west"] = west
    if sido:
        query += " AND c.sido = :sido"
        params["sido"] = sido
    if sigungu:
        query += " AND c.sigungu = :sigungu"
        params["sigungu"] = sigungu
    query += " LIMIT :limit"
    params["limit"] = limit

    rows = conn.execute(text(query), params).mappings().all()
    return [dict(r) for r in rows]


def count_complexes(conn: Connection) -> int:
    return conn.execute(text("SELECT COUNT(*) FROM apartment_complexes WHERE is_active = true")).scalar_one()
