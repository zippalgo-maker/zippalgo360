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


def get_map_layers(conn: Connection, user_id: int) -> str | None:
    return conn.execute(
        text("SELECT map_layers FROM users WHERE id = :id"),
        {"id": user_id},
    ).scalar_one_or_none()


def set_map_layers(conn: Connection, user_id: int, map_layers: str) -> None:
    conn.execute(
        text("UPDATE users SET map_layers = :map_layers WHERE id = :id"),
        {"map_layers": map_layers, "id": user_id},
    )
    conn.commit()
