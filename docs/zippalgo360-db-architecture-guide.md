# 집팔고360 통합 플랫폼 DB 구조 설계서

작성 기준: 2026-08-27

## 1. DB 설계 목표

집팔고360은 하나의 회원/업체/결제 체계를 공유하면서 집팔고, 집사고, 집테리어, 집서비스를 제공한다.

원칙:
- 회원 ID는 전 서비스 공통
- 업체 ID는 전 서비스 공통
- 인증/권한/결제/주문은 Core 중심
- 서비스별 업무 데이터는 독립 영역 유지
- 이미지 바이너리는 DB에 저장하지 않음
- 기존 집테리어 DB는 무리하게 합치지 않고 점진적으로 연동 가능
- 서비스 분리 이전이 가능하도록 외래 참조 경계를 명확히 함

## 2. 권장 PostgreSQL 구성

초기 로컬 서버에서는 PostgreSQL 16 인스턴스 하나를 사용한다.

권장안 A:
- zippalgo360_core
- zippalgo
- zipbuy
- zipterior
- zipservice

또는 단일 DB + schema:
- core.*
- zippalgo.*
- zipbuy.*
- zipterior.*
- zipservice.*

기존 집테리어가 이미 독립 DB로 운영 중이면 초기 이전에서는 DB를 합치지 않고 그대로 유지하는 편이 안전하다.

## 3. Core 영역

### users
- id BIGSERIAL PK
- email VARCHAR UNIQUE
- phone VARCHAR
- password_hash VARCHAR
- name VARCHAR
- user_type VARCHAR
- status VARCHAR
- created_at TIMESTAMPTZ
- updated_at TIMESTAMPTZ
- last_login_at TIMESTAMPTZ

user_type 예:
- general
- company
- admin

### user_profiles
- user_id BIGINT PK/FK users.id
- nickname
- profile_image_url
- address
- marketing_agreed
- privacy_agreed
- terms_agreed
- updated_at

### companies
- id BIGSERIAL PK
- name
- business_number
- company_type
- phone
- email
- address
- logo_url
- status
- created_at
- updated_at

company_type 예:
- real_estate
- interior
- moving
- cleaning
- internet
- furniture
- appliance
- multi

### company_memberships
- id BIGSERIAL PK
- company_id FK
- user_id FK
- role
- status
- created_at

role:
- owner
- manager
- staff

### company_services
- company_id FK
- service_type
- enabled BOOLEAN
- status
- created_at
- updated_at

service_type:
- ZIPPALGO
- ZIPBUY
- ZIPTERIOR
- ZIPSERVICE

## 4. 인증/세션

### auth_sessions
- id UUID PK
- user_id FK
- refresh_token_hash
- ip_address
- user_agent
- expires_at
- created_at
- revoked_at

### oauth_accounts
- id
- user_id
- provider
- provider_user_id
- created_at

provider 예:
- kakao
- naver
- google
- apple

## 5. 주문/결제

### orders
- id BIGSERIAL PK
- user_id FK
- company_id nullable
- service_type
- service_reference_id
- order_type
- title
- amount
- discount_amount
- final_amount
- status
- created_at
- updated_at

### payments
- id BIGSERIAL PK
- order_id FK
- user_id FK
- provider
- transaction_id
- payment_method
- amount
- status
- paid_at
- cancelled_at
- raw_response JSONB
- created_at

### refunds
- id
- payment_id
- amount
- reason
- status
- processed_at
- created_at

### points
- id
- user_id
- type
- amount
- balance_after
- service_type
- reference_id
- expires_at
- created_at

### coupons
- id
- code
- name
- discount_type
- discount_value
- min_order_amount
- starts_at
- ends_at
- status

### user_coupons
- id
- coupon_id
- user_id
- used_order_id nullable
- issued_at
- used_at
- expires_at

## 6. 통합 사용이력

### activity_logs
- id BIGSERIAL PK
- user_id
- company_id nullable
- service_type
- action_type
- reference_type
- reference_id
- metadata JSONB
- created_at

예:
- ZIPPALGO / LISTING_CREATED
- ZIPPALGO / LISTING_UNLOCKED
- ZIPBUY / REQUEST_CREATED
- ZIPTERIOR / ESTIMATE_REQUESTED
- ZIPTERIOR / CHAT_STARTED
- ZIPSERVICE / QUOTE_REQUESTED
- ZIPSERVICE / PRODUCT_PURCHASED

내정보 화면은 이 테이블만으로 모든 데이터를 만들지 않고, 서비스별 원본 데이터를 조회하되 공통 활동 이력/요약용으로 사용한다.

## 7. 집팔고 영역

### zippalgo.listings
- id
- owner_user_id
- complex_id/address fields
- property_type
- title
- description
- price
- status
- created_at
- updated_at

### zippalgo.listing_images
- id
- listing_id
- file_path
- public_url
- sort_order
- width
- height
- size_bytes
- created_at

### zippalgo.listing_private_info
- listing_id
- owner_name
- owner_phone
- exact_address
- private_notes
- updated_at

민감한 매물 정보는 공개 listings와 분리하는 것을 권장.

### zippalgo.listing_unlocks
- id
- listing_id
- company_id
- user_id
- order_id
- amount
- unlocked_at
- expires_at nullable

업체가 결제 후 매물정보를 확인한 기록.

### zippalgo.broker_matches
- id
- listing_id
- company_id
- status
- created_at

## 8. 집사고 영역

### zipbuy.buy_requests
- id
- user_id
- region
- property_type
- min_price
- max_price
- min_area
- max_area
- desired_conditions JSONB
- message
- status
- created_at
- updated_at

### zipbuy.request_targets
- id
- buy_request_id
- company_id
- delivery_status
- delivered_at
- viewed_at
- responded_at

### zipbuy.company_responses
- id
- buy_request_id
- company_id
- message
- proposed_listing_id nullable
- status
- created_at

업체 배포/조회/응답 이력을 반드시 별도 기록한다.

## 9. 집테리어 영역

기존 집테리어 DB 구조를 최대한 유지한다.

핵심 엔티티:
- apartment_complexes
- apartment_types
- companies
- portfolios
- portfolio_images
- portfolio_spaces/categories
- reviews
- likes
- comments
- estimate_requests
- chats
- chat_rooms
- chat_messages

집팔고360 Core와 연결할 때:
- 기존 집테리어 company_id와 core.companies.id 매핑
- 기존 집테리어 user와 core.users.id 매핑 또는 Core user_id 컬럼 추가
- 독립 ID를 억지로 즉시 통합하지 말고 mapping table 사용 가능

### core_service_company_map
- id
- service_type
- core_company_id
- external_company_id
- created_at

### core_service_user_map
- id
- service_type
- core_user_id
- external_user_id
- created_at

점진적 통합 시 안전하다.

### zipterior.estimate_requests
- id
- user_id
- company_id
- portfolio_id nullable
- message
- status
- created_at
- updated_at

### zipterior.chat_rooms
- id
- user_id
- company_id
- status
- created_at

### zipterior.chat_messages
- id
- room_id
- sender_user_id
- message_type
- body
- attachment_url
- read_at
- created_at

## 10. 집서비스 영역

### zipservice.service_categories
- id
- parent_id nullable
- name
- slug
- type
- enabled
- sort_order

예:
- moving
- cleaning
- internet
- appliance
- furniture

### zipservice.quote_requests
- id
- user_id
- category_id
- region
- desired_date
- details JSONB
- status
- created_at
- updated_at

### zipservice.quote_targets
- id
- quote_request_id
- company_id
- delivery_status
- delivered_at
- viewed_at
- responded_at

### zipservice.quotes
- id
- quote_request_id
- company_id
- amount
- message
- status
- created_at

## 11. 쇼핑 영역

### zipservice.products
- id
- seller_company_id
- category_id
- name
- description
- price
- sale_price
- stock
- status
- created_at
- updated_at

### zipservice.product_images
- id
- product_id
- file_path
- public_url
- sort_order

### zipservice.cart_items
- id
- user_id
- product_id
- quantity
- created_at

실제 구매는 Core orders/payments와 연결한다.

### zipservice.order_items
- id
- order_id
- product_id
- seller_company_id
- quantity
- unit_price
- total_price
- status

## 12. 알림

### notifications
- id
- user_id
- service_type
- type
- title
- body
- reference_id
- read_at
- created_at

### notification_deliveries
- id
- notification_id
- channel
- status
- sent_at
- error_message

channel:
- web
- push
- sms
- email
- kakao

## 13. 파일/미디어 메타데이터

이미지 파일 자체는 파일시스템에 저장한다.

### media_files
- id BIGSERIAL PK
- service_type
- owner_type
- owner_id
- file_path
- public_url
- mime_type
- width
- height
- size_bytes
- checksum
- created_at
- deleted_at

파일 경로 예:
- /data/media/zippalgo/...
- /data/media/zipterior/...
- /data/media/zipservice/...

## 14. 감사/보안

### audit_logs
- id
- actor_user_id
- action
- target_type
- target_id
- ip_address
- metadata JSONB
- created_at

특히:
- 결제
- 환불
- 업체 권한 변경
- 매물 비공개정보 열람
- 관리자 변경
은 audit log를 남긴다.

## 15. 인덱스 기본 원칙

반드시 인덱스 검토:
- users.email
- users.phone
- companies.business_number
- orders.user_id, status, created_at
- payments.order_id
- activity_logs.user_id, service_type, created_at
- listings.owner_user_id, status
- listing_unlocks.company_id, listing_id
- buy_requests.user_id, status
- request_targets.company_id, delivery_status
- portfolios.company_id, complex_id, status
- estimate_requests.user_id/company_id/status
- chat_messages.room_id, created_at
- quote_requests.user_id/status
- quote_targets.company_id/status
- notifications.user_id/read_at

대용량 이미지 테이블은 owner_id + sort_order 인덱스 필요.

## 16. ID/삭제 정책

- 핵심 테이블은 BIGINT 권장
- 외부 노출용 public_id(UUID/slug)를 별도 둘 수 있음
- 결제/주문/열람기록은 물리 삭제 금지 권장
- 일반 업무 데이터는 deleted_at soft delete 사용 가능

## 17. 트랜잭션 경계

중앙 결제 시:
1. order 생성
2. PG 결제
3. payment 성공 기록
4. 서비스 권한/구매상태 반영
5. activity_log 기록

중간 실패 시 재처리 가능하도록 idempotency key를 사용한다.

## 18. 현재 기존 DB와의 적용 원칙

이 문서는 목표 구조다.

로컬 이전 시 기존 DB를 즉시 이 설계로 재구축하지 않는다.

1단계:
- 클라우드 DB를 그대로 dump/restore
- 서비스 정상 구동 우선

2단계:
- Core 회원/결제 통합
- mapping table 도입
- 신규 기능은 목표 구조 기준 개발

3단계:
- 중복 데이터 정리
- 필요 시 schema/DB 통합

서버 이전과 대규모 DB 리팩터링을 동시에 수행하지 않는다.

## 19. 필수 확인 항목

이전 전 확인:
- 현재 PostgreSQL DB 목록
- 각 DB 용량
- role/user 목록
- 기존 집테리어 users/companies 구조
- 집팔고360 users/companies 구조
- 현재 결제 테이블
- 집테리어 API가 참조하는 DB
- 이미지 메타데이터가 저장된 테이블
- FK/sequence/extension
- pgcrypto/uuid-ossp/PostGIS 등 extension 사용 여부
- timezone
- backup/restore 테스트

이 문서는 DB 개편 및 신규 개발의 기준 설계서로 사용하며,
실제 이전 단계에서는 기존 DB를 우선 그대로 복원한 뒤 점진적으로 목표 구조에 맞춘다.


## 20. 2026-08-27 운영/백업 최종 지침

- 로컬 운영 DB는 SSD 250GB에 둔다.
- 이미지/미디어는 DB에 저장하지 않고 1TB HDD의 /data/media 계열에 저장한다.
- 4TB HDD는 /backup 전용으로 사용한다.
- DB는 단순 파일 복사가 아니라 PostgreSQL 정식 백업(pg_dump)을 기본으로 한다.
- 중요 스키마 변경/마이그레이션 전에는 별도 pre-change dump를 생성한다.
- 코드/설정 롤백과 DB 롤백을 분리한다. 코드 오류 때문에 최신 회원/결제/견적 DB를 과거로 되돌리지 않는다.
- 서비스 이전 시 기존 DB를 우선 그대로 dump/restore하고, 통합 Core 구조 개편은 서비스 정상화 이후 단계적으로 진행한다.
- 결제/회원 데이터가 증가하면 WAL 아카이빙/PITR을 추가해 시점 복구 능력을 강화한다.
