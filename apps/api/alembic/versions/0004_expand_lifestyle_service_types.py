"""expand lifestyle interest registration into combined 집서비스

집이사/집청소를 하나의 "집서비스" 카테고리로 통합하면서 이사, 이사청소,
생활청소, 가전, 가구, 인터넷·TV·정수기까지 서비스 범위를 넓힌다.
가전/가구는 평형·집 스타일 기반 AI 추천 기능을 염두에 두고 있어 해당
컨텍스트 데이터를 미리 수집할 수 있도록 컬럼을 추가한다.

Revision ID: 0004
Revises: 0003
Create Date: 2026-08-26

"""
from alembic import op

revision = "0004"
down_revision = "0003"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        ALTER TABLE lifestyle_interest_registrations
            DROP CONSTRAINT lifestyle_interest_registrations_service_type_check;
        ALTER TABLE lifestyle_interest_registrations
            ADD CONSTRAINT lifestyle_interest_registrations_service_type_check
            CHECK (service_type IN (
                'moving', 'move_out_cleaning', 'living_cleaning',
                'appliance', 'furniture', 'subscription'
            ));
        ALTER TABLE lifestyle_interest_registrations
            ADD COLUMN pyeong INTEGER,
            ADD COLUMN home_style VARCHAR(50);
        """
    )


def downgrade() -> None:
    op.execute(
        """
        ALTER TABLE lifestyle_interest_registrations
            DROP COLUMN pyeong,
            DROP COLUMN home_style;
        ALTER TABLE lifestyle_interest_registrations
            DROP CONSTRAINT lifestyle_interest_registrations_service_type_check;
        ALTER TABLE lifestyle_interest_registrations
            ADD CONSTRAINT lifestyle_interest_registrations_service_type_check
            CHECK (service_type IN ('moving', 'cleaning'));
        """
    )
