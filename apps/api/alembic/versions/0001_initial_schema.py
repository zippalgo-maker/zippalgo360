"""initial schema

Revision ID: 0001
Revises:
Create Date: 2026-08-25

"""
from alembic import op

revision = "0001"
down_revision = None
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.execute(
        """
        CREATE TABLE users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL UNIQUE,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(100) NOT NULL,
            phone VARCHAR(30),
            role VARCHAR(20) NOT NULL DEFAULT 'customer'
                CHECK (role IN ('customer', 'company', 'admin')),
            kakao_id VARCHAR(100),
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )

    op.execute(
        """
        CREATE TABLE companies (
            id SERIAL PRIMARY KEY,
            owner_user_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            company_type VARCHAR(20) NOT NULL
                CHECK (company_type IN ('real_estate', 'interior', 'mover', 'cleaner')),
            business_name VARCHAR(200) NOT NULL,
            business_registration_number VARCHAR(50) NOT NULL,
            representative_name VARCHAR(100) NOT NULL,
            address VARCHAR(300) NOT NULL,
            phone VARCHAR(30) NOT NULL,
            is_verified BOOLEAN NOT NULL DEFAULT false,
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (owner_user_id)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE company_service_regions (
            id SERIAL PRIMARY KEY,
            company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            region VARCHAR(50) NOT NULL,
            UNIQUE (company_id, region)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE apartment_complexes (
            id SERIAL PRIMARY KEY,
            name VARCHAR(200) NOT NULL,
            sido VARCHAR(50) NOT NULL,
            sigungu VARCHAR(50) NOT NULL,
            eupmyeondong VARCHAR(50) NOT NULL,
            road_address VARCHAR(300) NOT NULL,
            jibun_address VARCHAR(300),
            lat DOUBLE PRECISION,
            lng DOUBLE PRECISION,
            completion_year INTEGER,
            household_count INTEGER,
            building_count INTEGER,
            parking_count INTEGER,
            heating_type VARCHAR(50),
            builder_name VARCHAR(100),
            complex_type VARCHAR(30),
            is_active BOOLEAN NOT NULL DEFAULT true,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )

    op.execute(
        """
        CREATE TABLE apartment_types (
            id SERIAL PRIMARY KEY,
            complex_id INTEGER NOT NULL REFERENCES apartment_complexes(id) ON DELETE CASCADE,
            type_name VARCHAR(50) NOT NULL,
            exclusive_area NUMERIC(6, 2) NOT NULL,
            supply_area NUMERIC(6, 2),
            room_count INTEGER,
            bathroom_count INTEGER,
            floor_plan_image_url VARCHAR(500),
            is_active BOOLEAN NOT NULL DEFAULT true
        );
        """
    )

    op.execute(
        """
        CREATE TABLE listings (
            id SERIAL PRIMARY KEY,
            seller_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            complex_id INTEGER NOT NULL REFERENCES apartment_complexes(id),
            apartment_type_id INTEGER NOT NULL REFERENCES apartment_types(id),
            dong VARCHAR(20),
            ho VARCHAR(20),
            asking_price BIGINT NOT NULL,
            description TEXT NOT NULL,
            move_in_date DATE,
            view_price INTEGER NOT NULL DEFAULT 30000,
            status VARCHAR(20) NOT NULL DEFAULT 'active'
                CHECK (status IN ('active', 'reserved', 'sold', 'cancelled')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )

    op.execute(
        """
        CREATE TABLE listing_images (
            id SERIAL PRIMARY KEY,
            listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
            file_path VARCHAR(500) NOT NULL,
            sort_order INTEGER NOT NULL DEFAULT 0
        );
        """
    )

    op.execute(
        """
        CREATE TABLE listing_purchases (
            id SERIAL PRIMARY KEY,
            listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
            agent_company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            amount INTEGER NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'paid'
                CHECK (status IN ('paid', 'refunded')),
            paid_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (listing_id, agent_company_id)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE sale_proofs (
            id SERIAL PRIMARY KEY,
            listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
            listing_purchase_id INTEGER NOT NULL REFERENCES listing_purchases(id),
            uploaded_by INTEGER NOT NULL REFERENCES users(id),
            document_path VARCHAR(500) NOT NULL,
            sale_price BIGINT NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'submitted'
                CHECK (status IN ('submitted', 'verified', 'rejected')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            verified_at TIMESTAMPTZ
        );
        """
    )

    op.execute(
        """
        CREATE TABLE double_benefit_payouts (
            id SERIAL PRIMARY KEY,
            listing_id INTEGER NOT NULL REFERENCES listings(id) ON DELETE CASCADE,
            sale_proof_id INTEGER NOT NULL UNIQUE REFERENCES sale_proofs(id),
            agent_company_id INTEGER NOT NULL REFERENCES companies(id),
            seller_id INTEGER NOT NULL REFERENCES users(id),
            amount INTEGER NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'pending'
                CHECK (status IN ('pending', 'paid', 'cancelled')),
            paid_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )

    op.execute(
        """
        CREATE TABLE purchase_requests (
            id SERIAL PRIMARY KEY,
            customer_id INTEGER NOT NULL REFERENCES users(id) ON DELETE CASCADE,
            title VARCHAR(200) NOT NULL,
            sido VARCHAR(50) NOT NULL,
            sigungu VARCHAR(50) NOT NULL,
            complex_id INTEGER REFERENCES apartment_complexes(id),
            apartment_type_id INTEGER REFERENCES apartment_types(id),
            desired_budget_min BIGINT,
            desired_budget_max BIGINT,
            desired_move_in_date DATE,
            room_count_min INTEGER,
            description TEXT NOT NULL,
            contact_method VARCHAR(20) NOT NULL DEFAULT 'phone',
            status VARCHAR(20) NOT NULL DEFAULT 'submitted'
                CHECK (status IN ('submitted', 'in_progress', 'matched', 'closed')),
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )

    op.execute(
        """
        CREATE TABLE purchase_request_agents (
            id SERIAL PRIMARY KEY,
            purchase_request_id INTEGER NOT NULL REFERENCES purchase_requests(id) ON DELETE CASCADE,
            agent_company_id INTEGER NOT NULL REFERENCES companies(id) ON DELETE CASCADE,
            assignment_order INTEGER NOT NULL,
            status VARCHAR(20) NOT NULL DEFAULT 'unread'
                CHECK (status IN ('unread', 'read', 'responded', 'declined', 'expired')),
            responded_at TIMESTAMPTZ,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
            UNIQUE (purchase_request_id, agent_company_id)
        );
        """
    )

    op.execute(
        """
        CREATE TABLE lifestyle_interest_registrations (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id),
            service_type VARCHAR(20) NOT NULL
                CHECK (service_type IN ('moving', 'cleaning')),
            name VARCHAR(100) NOT NULL,
            phone VARCHAR(30) NOT NULL,
            region VARCHAR(50) NOT NULL,
            desired_date DATE,
            memo TEXT,
            created_at TIMESTAMPTZ NOT NULL DEFAULT now()
        );
        """
    )

    op.execute("CREATE INDEX idx_listings_status ON listings(status);")
    op.execute("CREATE INDEX idx_listings_complex ON listings(complex_id, apartment_type_id);")
    op.execute("CREATE INDEX idx_purchase_requests_customer ON purchase_requests(customer_id);")
    op.execute("CREATE INDEX idx_apartment_types_complex ON apartment_types(complex_id);")


def downgrade() -> None:
    op.execute("DROP TABLE IF EXISTS lifestyle_interest_registrations;")
    op.execute("DROP TABLE IF EXISTS purchase_request_agents;")
    op.execute("DROP TABLE IF EXISTS purchase_requests;")
    op.execute("DROP TABLE IF EXISTS double_benefit_payouts;")
    op.execute("DROP TABLE IF EXISTS sale_proofs;")
    op.execute("DROP TABLE IF EXISTS listing_purchases;")
    op.execute("DROP TABLE IF EXISTS listing_images;")
    op.execute("DROP TABLE IF EXISTS listings;")
    op.execute("DROP TABLE IF EXISTS apartment_types;")
    op.execute("DROP TABLE IF EXISTS apartment_complexes;")
    op.execute("DROP TABLE IF EXISTS company_service_regions;")
    op.execute("DROP TABLE IF EXISTS companies;")
    op.execute("DROP TABLE IF EXISTS users;")
