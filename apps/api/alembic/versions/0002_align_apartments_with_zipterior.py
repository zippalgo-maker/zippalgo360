"""align apartment_complexes/apartment_types with zipterior schema

집팔고360이 아파트 단지/평형 마스터 데이터의 소유자가 되고, 집테리어는
이 API를 소비하는 구조로 전환하기 위해 컬럼 체계를 집테리어 실제
운영 스키마와 동일하게 맞춘다 (실 데이터 마이그레이션 대상).

Revision ID: 0002
Revises: 0001
Create Date: 2026-08-25

"""
from alembic import op

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE apartment_complexes RENAME COLUMN lat TO latitude;
        ALTER TABLE apartment_complexes RENAME COLUMN lng TO longitude;
        ALTER TABLE apartment_complexes
            ADD COLUMN updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            ADD COLUMN representative_image_path VARCHAR(500),
            ADD COLUMN representative_thumbnail_path VARCHAR(500);
        -- 세종특별자치시 등 시군구 구분이 없는 행정구역 실 데이터가 있어 nullable로 완화
        ALTER TABLE apartment_complexes ALTER COLUMN sigungu DROP NOT NULL;
        """
    )

    op.execute(
        """
        ALTER TABLE apartment_types RENAME COLUMN exclusive_area TO exclusive_area_m2;
        ALTER TABLE apartment_types RENAME COLUMN supply_area TO supply_area_m2;
        ALTER TABLE apartment_types RENAME COLUMN floor_plan_image_url TO floor_plan_path;
        ALTER TABLE apartment_types
            ADD COLUMN pyeong_label VARCHAR(20),
            ADD COLUMN has_basic_layout BOOLEAN,
            ADD COLUMN has_expanded_layout BOOLEAN,
            ADD COLUMN sort_order INTEGER NOT NULL DEFAULT 0,
            ADD COLUMN created_at TIMESTAMPTZ NOT NULL DEFAULT now();
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE apartment_types
            DROP COLUMN pyeong_label,
            DROP COLUMN has_basic_layout,
            DROP COLUMN has_expanded_layout,
            DROP COLUMN sort_order,
            DROP COLUMN created_at;
        ALTER TABLE apartment_types RENAME COLUMN exclusive_area_m2 TO exclusive_area;
        ALTER TABLE apartment_types RENAME COLUMN supply_area_m2 TO supply_area;
        ALTER TABLE apartment_types RENAME COLUMN floor_plan_path TO floor_plan_image_url;
        """
    )
    op.execute(
        """
        ALTER TABLE apartment_complexes
            DROP COLUMN updated_at,
            DROP COLUMN representative_image_path,
            DROP COLUMN representative_thumbnail_path;
        ALTER TABLE apartment_complexes RENAME COLUMN latitude TO lat;
        ALTER TABLE apartment_complexes RENAME COLUMN longitude TO lng;
        ALTER TABLE apartment_complexes ALTER COLUMN sigungu SET NOT NULL;
        """
    )
