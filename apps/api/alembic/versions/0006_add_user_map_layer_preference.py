"""add user map layer preference

로그인 사용자가 지도(/map) 레이어 선택("매물"/"인테리어 시공사례"/업체
레이어 등)을 저장해두면 다음 로그인 때도 그대로 복원되도록, 콤마로 구분된
레이어 키 목록을 users 테이블에 저장한다. 비로그인 사용자는 프론트엔드에서
쿠키로만 저장하므로 이 컬럼과 무관하다.

Revision ID: 0006
Revises: 0005
Create Date: 2026-08-27

"""
from alembic import op

revision = "0006"
down_revision = "0005"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute("ALTER TABLE users ADD COLUMN map_layers VARCHAR(255);")


def downgrade() -> None:
    op.execute("ALTER TABLE users DROP COLUMN map_layers;")
