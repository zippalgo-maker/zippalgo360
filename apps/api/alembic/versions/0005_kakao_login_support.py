"""support kakao-only accounts for social login

카카오 간편로그인으로 가입한 계정은 비밀번호가 없으므로 password_hash를
NULL 허용으로 바꾸고, kakao_id 중복 가입을 막기 위한 부분 유니크 인덱스를
추가한다(카카오 미연동 계정은 kakao_id가 NULL이라 인덱스에서 제외됨).

Revision ID: 0005
Revises: 0004
Create Date: 2026-08-27

"""
from alembic import op

revision = "0005"
down_revision = "0004"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE users
            ALTER COLUMN password_hash DROP NOT NULL;
        CREATE UNIQUE INDEX users_kakao_id_key
            ON users (kakao_id)
            WHERE kakao_id IS NOT NULL;
        """
    )


def downgrade() -> None:
    op.execute(
        """
        DROP INDEX users_kakao_id_key;
        ALTER TABLE users
            ALTER COLUMN password_hash SET NOT NULL;
        """
    )
