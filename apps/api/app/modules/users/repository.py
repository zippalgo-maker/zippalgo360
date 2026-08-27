from sqlalchemy import Connection, text


def create_user(
    conn: Connection,
    *,
    email: str,
    password_hash: str,
    name: str,
    phone: str | None,
    role: str,
) -> dict:
    row = conn.execute(
        text(
            """
            INSERT INTO users (email, password_hash, name, phone, role)
            VALUES (:email, :password_hash, :name, :phone, :role)
            RETURNING id, email, name, phone, role, is_active, created_at
            """
        ),
        {
            "email": email,
            "password_hash": password_hash,
            "name": name,
            "phone": phone,
            "role": role,
        },
    ).mappings().one()
    conn.commit()
    return dict(row)


def get_user_by_email(conn: Connection, email: str) -> dict | None:
    row = conn.execute(
        text(
            """
            SELECT id, email, password_hash, name, phone, role, is_active, created_at
            FROM users
            WHERE email = :email
            """
        ),
        {"email": email},
    ).mappings().first()
    return dict(row) if row else None


def get_user_by_kakao_id(conn: Connection, kakao_id: str) -> dict | None:
    row = conn.execute(
        text(
            """
            SELECT id, email, name, phone, role, is_active, created_at
            FROM users
            WHERE kakao_id = :kakao_id
            """
        ),
        {"kakao_id": kakao_id},
    ).mappings().first()
    return dict(row) if row else None


def link_kakao_id(conn: Connection, *, user_id: int, kakao_id: str) -> dict:
    row = conn.execute(
        text(
            """
            UPDATE users
            SET kakao_id = :kakao_id
            WHERE id = :user_id
            RETURNING id, email, name, phone, role, is_active, created_at
            """
        ),
        {"user_id": user_id, "kakao_id": kakao_id},
    ).mappings().one()
    conn.commit()
    return dict(row)


def create_kakao_user(conn: Connection, *, kakao_id: str, email: str, name: str) -> dict:
    row = conn.execute(
        text(
            """
            INSERT INTO users (email, password_hash, name, kakao_id, role)
            VALUES (:email, NULL, :name, :kakao_id, 'customer')
            RETURNING id, email, name, phone, role, is_active, created_at
            """
        ),
        {"email": email, "name": name, "kakao_id": kakao_id},
    ).mappings().one()
    conn.commit()
    return dict(row)


def get_user_by_id(conn: Connection, user_id: int) -> dict | None:
    row = conn.execute(
        text(
            """
            SELECT id, email, name, phone, role, is_active, created_at
            FROM users
            WHERE id = :id
            """
        ),
        {"id": user_id},
    ).mappings().first()
    return dict(row) if row else None
