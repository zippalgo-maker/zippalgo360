from sqlalchemy import Connection, text


def create_sale_proof(conn: Connection, *, uploaded_by: int, **fields) -> dict:
    row = conn.execute(
        text(
            """
            INSERT INTO sale_proofs (listing_id, listing_purchase_id, uploaded_by, document_path, sale_price)
            VALUES (:listing_id, :listing_purchase_id, :uploaded_by, :document_path, :sale_price)
            RETURNING id, listing_id, listing_purchase_id, uploaded_by, document_path,
                      sale_price, status, created_at, verified_at
            """
        ),
        {"uploaded_by": uploaded_by, **fields},
    ).mappings().one()
    conn.commit()
    return dict(row)


def get_sale_proof(conn: Connection, sale_proof_id: int) -> dict | None:
    row = conn.execute(
        text(
            """
            SELECT id, listing_id, listing_purchase_id, uploaded_by, document_path,
                   sale_price, status, created_at, verified_at
            FROM sale_proofs WHERE id = :id
            """
        ),
        {"id": sale_proof_id},
    ).mappings().first()
    return dict(row) if row else None


def list_pending_sale_proofs(conn: Connection) -> list[dict]:
    rows = conn.execute(
        text(
            """
            SELECT id, listing_id, listing_purchase_id, uploaded_by, document_path,
                   sale_price, status, created_at, verified_at
            FROM sale_proofs WHERE status = 'submitted' ORDER BY created_at
            """
        )
    ).mappings().all()
    return [dict(r) for r in rows]


def update_sale_proof_status(conn: Connection, sale_proof_id: int, status_value: str) -> None:
    conn.execute(
        text(
            """
            UPDATE sale_proofs
            SET status = :status, verified_at = CASE WHEN CAST(:status AS VARCHAR) = 'verified' THEN now() ELSE verified_at END
            WHERE id = :id
            """
        ),
        {"status": status_value, "id": sale_proof_id},
    )
    conn.commit()


def create_payout(
    conn: Connection, *, listing_id: int, sale_proof_id: int, agent_company_id: int, seller_id: int, amount: int
) -> dict:
    row = conn.execute(
        text(
            """
            INSERT INTO double_benefit_payouts (listing_id, sale_proof_id, agent_company_id, seller_id, amount)
            VALUES (:listing_id, :sale_proof_id, :agent_company_id, :seller_id, :amount)
            RETURNING id, listing_id, sale_proof_id, agent_company_id, seller_id,
                      amount, status, paid_at, created_at
            """
        ),
        {
            "listing_id": listing_id,
            "sale_proof_id": sale_proof_id,
            "agent_company_id": agent_company_id,
            "seller_id": seller_id,
            "amount": amount,
        },
    ).mappings().one()
    conn.commit()
    return dict(row)


def get_payout_by_sale_proof(conn: Connection, sale_proof_id: int) -> dict | None:
    row = conn.execute(
        text(
            """
            SELECT id, listing_id, sale_proof_id, agent_company_id, seller_id,
                   amount, status, paid_at, created_at
            FROM double_benefit_payouts WHERE sale_proof_id = :sale_proof_id
            """
        ),
        {"sale_proof_id": sale_proof_id},
    ).mappings().first()
    return dict(row) if row else None


def list_payouts_by_seller(conn: Connection, seller_id: int) -> list[dict]:
    rows = conn.execute(
        text(
            """
            SELECT id, listing_id, sale_proof_id, agent_company_id, seller_id,
                   amount, status, paid_at, created_at
            FROM double_benefit_payouts WHERE seller_id = :seller_id ORDER BY created_at DESC
            """
        ),
        {"seller_id": seller_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def mark_payout_paid(conn: Connection, payout_id: int) -> None:
    conn.execute(
        text("UPDATE double_benefit_payouts SET status = 'paid', paid_at = now() WHERE id = :id"),
        {"id": payout_id},
    )
    conn.commit()
