from sqlalchemy import Connection, text


def get_purchase(conn: Connection, listing_id: int, agent_company_id: int) -> dict | None:
    row = conn.execute(
        text(
            """
            SELECT id, listing_id, agent_company_id, amount, status, paid_at
            FROM listing_purchases
            WHERE listing_id = :listing_id AND agent_company_id = :agent_company_id
                  AND status = 'paid'
            """
        ),
        {"listing_id": listing_id, "agent_company_id": agent_company_id},
    ).mappings().first()
    return dict(row) if row else None


def create_purchase(conn: Connection, *, listing_id: int, agent_company_id: int, amount: int) -> dict:
    row = conn.execute(
        text(
            """
            INSERT INTO listing_purchases (listing_id, agent_company_id, amount, status, paid_at)
            VALUES (:listing_id, :agent_company_id, :amount, 'paid', now())
            RETURNING id, listing_id, agent_company_id, amount, status, paid_at
            """
        ),
        {"listing_id": listing_id, "agent_company_id": agent_company_id, "amount": amount},
    ).mappings().one()
    conn.commit()
    return dict(row)


def get_purchase_by_id(conn: Connection, purchase_id: int) -> dict | None:
    row = conn.execute(
        text(
            """
            SELECT id, listing_id, agent_company_id, amount, status, paid_at
            FROM listing_purchases WHERE id = :id
            """
        ),
        {"id": purchase_id},
    ).mappings().first()
    return dict(row) if row else None


def get_unlocked_listing_ids(conn: Connection, agent_company_id: int) -> set[int]:
    rows = conn.execute(
        text(
            """
            SELECT listing_id FROM listing_purchases
            WHERE agent_company_id = :agent_company_id AND status = 'paid'
            """
        ),
        {"agent_company_id": agent_company_id},
    ).all()
    return {r[0] for r in rows}


def list_purchases_by_listing(conn: Connection, listing_id: int) -> list[dict]:
    rows = conn.execute(
        text(
            """
            SELECT id, listing_id, agent_company_id, amount, status, paid_at
            FROM listing_purchases
            WHERE listing_id = :listing_id AND status = 'paid'
            ORDER BY paid_at
            """
        ),
        {"listing_id": listing_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def list_purchases_by_company(conn: Connection, agent_company_id: int) -> list[dict]:
    rows = conn.execute(
        text(
            """
            SELECT id, listing_id, agent_company_id, amount, status, paid_at
            FROM listing_purchases
            WHERE agent_company_id = :agent_company_id
            ORDER BY paid_at DESC
            """
        ),
        {"agent_company_id": agent_company_id},
    ).mappings().all()
    return [dict(r) for r in rows]
