"""add company geocoded location + map bounding-box indexes

지도에 부동산/인테리어/청소/이사 업체를 마커로 찍으려면 위경도가 필요한데
companies에는 주소(텍스트)만 있었다. 위경도 컬럼을 추가하고(가입 시 서버가
카카오 지오코딩으로 채움, 실패해도 가입은 막지 않음), 지도 bounding-box
조회가 순차 스캔이 되지 않도록 apartment_complexes/companies 양쪽에
(latitude, longitude) 인덱스를 추가한다.

Revision ID: 0003
Revises: 0002
Create Date: 2026-08-25

"""
from alembic import op

revision = "0003"
down_revision = "0002"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE companies
            ADD COLUMN latitude DOUBLE PRECISION,
            ADD COLUMN longitude DOUBLE PRECISION;
        """
    )

    # company_type 필터가 항상 같이 걸리므로(레이어별 조회) 맨 앞에 두고,
    # 좌표가 없는(지오코딩 실패/대기) 행은 애초에 지도 조회 대상이 아니라
    # partial index로 빼서 인덱스 크기도 줄인다.
    op.execute(
        """
        CREATE INDEX idx_companies_type_location
            ON companies (company_type, latitude, longitude)
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
        """
    )
    op.execute(
        """
        CREATE INDEX idx_apartment_complexes_location
            ON apartment_complexes (latitude, longitude)
            WHERE latitude IS NOT NULL AND longitude IS NOT NULL;
        """
    )


def downgrade() -> None:
    op.execute("DROP INDEX IF EXISTS idx_apartment_complexes_location;")
    op.execute("DROP INDEX IF EXISTS idx_companies_type_location;")
    op.execute(
        """
        ALTER TABLE companies
            DROP COLUMN latitude,
            DROP COLUMN longitude;
        """
    )
