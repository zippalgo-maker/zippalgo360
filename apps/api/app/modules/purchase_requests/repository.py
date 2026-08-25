from sqlalchemy import Connection, text


def create_purchase_request(conn: Connection, *, customer_id: int, **fields) -> dict:
    row = conn.execute(
        text(
            """
            INSERT INTO purchase_requests (
                customer_id, title, sido, sigungu, complex_id, apartment_type_id,
                desired_budget_min, desired_budget_max, desired_move_in_date,
                room_count_min, description, contact_method
            )
            VALUES (
                :customer_id, :title, :sido, :sigungu, :complex_id, :apartment_type_id,
                :desired_budget_min, :desired_budget_max, :desired_move_in_date,
                :room_count_min, :description, :contact_method
            )
            RETURNING id, customer_id, title, sido, sigungu, complex_id, apartment_type_id,
                      desired_budget_min, desired_budget_max, desired_move_in_date,
                      room_count_min, description, contact_method, status, created_at
            """
        ),
        {"customer_id": customer_id, **fields},
    ).mappings().one()
    conn.commit()
    return dict(row)


def get_purchase_request(conn: Connection, request_id: int) -> dict | None:
    row = conn.execute(
        text(
            """
            SELECT id, customer_id, title, sido, sigungu, complex_id, apartment_type_id,
                   desired_budget_min, desired_budget_max, desired_move_in_date,
                   room_count_min, description, contact_method, status, created_at
            FROM purchase_requests WHERE id = :id
            """
        ),
        {"id": request_id},
    ).mappings().first()
    return dict(row) if row else None


def list_by_customer(conn: Connection, customer_id: int) -> list[dict]:
    rows = conn.execute(
        text(
            """
            SELECT id, customer_id, title, sido, sigungu, complex_id, apartment_type_id,
                   desired_budget_min, desired_budget_max, desired_move_in_date,
                   room_count_min, description, contact_method, status, created_at
            FROM purchase_requests WHERE customer_id = :customer_id ORDER BY created_at DESC
            """
        ),
        {"customer_id": customer_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def find_agent_companies_by_region(conn: Connection, sido: str, sigungu: str) -> list[int]:
    rows = conn.execute(
        text(
            """
            SELECT DISTINCT c.id
            FROM companies c
            JOIN company_service_regions r ON r.company_id = c.id
            WHERE c.company_type = 'real_estate' AND c.is_active = true
                  AND (r.region = :sido OR r.region = :sigungu)
            ORDER BY c.id
            """
        ),
        {"sido": sido, "sigungu": sigungu},
    ).all()
    return [r[0] for r in rows]


def assign_agents(conn: Connection, purchase_request_id: int, agent_company_ids: list[int]) -> None:
    for order, company_id in enumerate(agent_company_ids, start=1):
        conn.execute(
            text(
                """
                INSERT INTO purchase_request_agents (purchase_request_id, agent_company_id, assignment_order)
                VALUES (:purchase_request_id, :agent_company_id, :assignment_order)
                ON CONFLICT (purchase_request_id, agent_company_id)
                DO UPDATE SET assignment_order = EXCLUDED.assignment_order
                """
            ),
            {
                "purchase_request_id": purchase_request_id,
                "agent_company_id": company_id,
                "assignment_order": order,
            },
        )
    conn.commit()


def list_assignments_by_request(conn: Connection, purchase_request_id: int) -> list[dict]:
    rows = conn.execute(
        text(
            """
            SELECT id, purchase_request_id, agent_company_id, assignment_order,
                   status, responded_at, created_at
            FROM purchase_request_agents
            WHERE purchase_request_id = :purchase_request_id
            ORDER BY assignment_order
            """
        ),
        {"purchase_request_id": purchase_request_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def list_assignments_by_company(conn: Connection, agent_company_id: int) -> list[dict]:
    rows = conn.execute(
        text(
            """
            SELECT id, purchase_request_id, agent_company_id, assignment_order,
                   status, responded_at, created_at
            FROM purchase_request_agents
            WHERE agent_company_id = :agent_company_id
            ORDER BY created_at DESC
            """
        ),
        {"agent_company_id": agent_company_id},
    ).mappings().all()
    return [dict(r) for r in rows]


def get_assignment(conn: Connection, assignment_id: int) -> dict | None:
    row = conn.execute(
        text(
            """
            SELECT id, purchase_request_id, agent_company_id, assignment_order,
                   status, responded_at, created_at
            FROM purchase_request_agents WHERE id = :id
            """
        ),
        {"id": assignment_id},
    ).mappings().first()
    return dict(row) if row else None


def update_assignment_status(conn: Connection, assignment_id: int, status_value: str) -> None:
    conn.execute(
        text(
            """
            UPDATE purchase_request_agents
            SET status = :status,
                responded_at = CASE WHEN CAST(:status AS VARCHAR) IN ('responded', 'declined') THEN now() ELSE responded_at END
            WHERE id = :id
            """
        ),
        {"status": status_value, "id": assignment_id},
    )
    conn.commit()


def update_request_status(conn: Connection, request_id: int, status_value: str) -> None:
    conn.execute(
        text("UPDATE purchase_requests SET status = :status WHERE id = :id"),
        {"status": status_value, "id": request_id},
    )
    conn.commit()
