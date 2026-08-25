from sqlalchemy import Connection, text


def create_listing(conn: Connection, *, seller_id: int, **fields) -> dict:
    row = conn.execute(
        text(
            """
            INSERT INTO listings (
                seller_id, complex_id, apartment_type_id, dong, ho,
                asking_price, description, move_in_date, view_price
            )
            VALUES (
                :seller_id, :complex_id, :apartment_type_id, :dong, :ho,
                :asking_price, :description, :move_in_date, :view_price
            )
            RETURNING id, seller_id, complex_id, apartment_type_id, dong, ho,
                      asking_price, description, move_in_date, view_price,
                      status, created_at, updated_at
            """
        ),
        {"seller_id": seller_id, **fields},
    ).mappings().one()
    conn.commit()
    return {**dict(row), "images": []}


def get_listing_by_id(conn: Connection, listing_id: int) -> dict | None:
    row = conn.execute(
        text(
            """
            SELECT id, seller_id, complex_id, apartment_type_id, dong, ho,
                   asking_price, description, move_in_date, view_price,
                   status, created_at, updated_at
            FROM listings WHERE id = :id
            """
        ),
        {"id": listing_id},
    ).mappings().first()
    if row is None:
        return None
    return {**dict(row), "images": list_images(conn, listing_id)}


def list_images(conn: Connection, listing_id: int) -> list[str]:
    rows = conn.execute(
        text(
            "SELECT file_path FROM listing_images WHERE listing_id = :listing_id ORDER BY sort_order"
        ),
        {"listing_id": listing_id},
    ).all()
    return [r[0] for r in rows]


def list_listings_by_seller(conn: Connection, seller_id: int) -> list[dict]:
    rows = conn.execute(
        text(
            """
            SELECT id, seller_id, complex_id, apartment_type_id, dong, ho,
                   asking_price, description, move_in_date, view_price,
                   status, created_at, updated_at
            FROM listings WHERE seller_id = :seller_id ORDER BY created_at DESC
            """
        ),
        {"seller_id": seller_id},
    ).mappings().all()
    return [{**dict(r), "images": list_images(conn, r["id"])} for r in rows]


def list_active_listings(conn: Connection, *, complex_id: int | None, apartment_type_id: int | None) -> list[dict]:
    query = """
        SELECT id, complex_id, apartment_type_id, asking_price, description,
               view_price, status, created_at
        FROM listings WHERE status = 'active'
    """
    params: dict = {}
    if complex_id:
        query += " AND complex_id = :complex_id"
        params["complex_id"] = complex_id
    if apartment_type_id:
        query += " AND apartment_type_id = :apartment_type_id"
        params["apartment_type_id"] = apartment_type_id
    query += " ORDER BY created_at DESC"

    rows = conn.execute(text(query), params).mappings().all()
    return [dict(r) for r in rows]


def update_status(conn: Connection, listing_id: int, status_value: str) -> None:
    conn.execute(
        text("UPDATE listings SET status = :status, updated_at = now() WHERE id = :id"),
        {"status": status_value, "id": listing_id},
    )
    conn.commit()


def add_image(conn: Connection, listing_id: int, file_path: str, sort_order: int) -> None:
    conn.execute(
        text(
            """
            INSERT INTO listing_images (listing_id, file_path, sort_order)
            VALUES (:listing_id, :file_path, :sort_order)
            """
        ),
        {"listing_id": listing_id, "file_path": file_path, "sort_order": sort_order},
    )
    conn.commit()
