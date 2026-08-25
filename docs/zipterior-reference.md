# 집테리어(zipterior.kr) 레퍼런스 조사 결과

> 집팔고360 산하 서비스 중 하나인 "집테리어"는 데스크탑 클로드 코드에서 별도로 개발 중.
> 이 문서는 향후 집팔고360(메인/집팔고/집사고)과의 **회원 연동, 데이터 모델 공유, 디자인 톤 통일**을 위해
> 집테리어 내부를 조사한 결과를 정리한 것. (조사일: 2026-08-25)

## 1. 기술 스택

- **Backend**: Python FastAPI, 모듈형 구조 (`app/modules/{auth,users,companies,apartments,portfolios,estimates,...}`)
  - ORM 없이 SQLAlchemy Core + raw SQL(`text()`) 방식
  - `models.py`는 전부 빈 스캐폴딩 파일(0바이트) — 실제 스키마는 `repository.py`에 SQL로 직접 작성됨
  - Alembic으로 마이그레이션 관리
- **Frontend**: 바닐라 HTML/CSS/JS — React/Next.js/Vite/Tailwind 없음
  - `style.css` / `portal.css` / `mobile.css` + `app.js` 구조
- **DB**: PostgreSQL (`zipterior_db`)
- **배포**: 자체 서버 (nginx + systemd) — Vercel 아님

**시사점**: 집팔고360이 Next.js/Vercel 계열로 갈 경우 스택이 완전히 다르므로,
모노레포 통합보다는 **REST API 연동**이 현실적인 통합 방식.

## 2. 회원/인증 구조

- `users` 테이블 + `role` (`customer` / `company` / `super_admin`) — 단일 테이블에서 role로 유형 구분
- 업체는 `companies` (owner_user_id → users FK) + 확장 테이블:
  - `company_members`
  - `company_memberships`
  - `company_onboarding`
  - `company_service_regions`
- 로그인: 이메일/비밀번호(JWT) + 카카오 소셜로그인(라이브 확인됨). 네이버/구글은 미발급.

**시사점**: 집팔고360과 통합 시 "role 매핑 + company 확장 테이블 별도 유지" 구조가 적합해 보임.
집팔고360 통합회원의 role에 `customer`/`company`(공인중개사·인테리어업체 등)/`admin` 개념을 맞추면 매핑 용이.

## 3. 핵심 도메인 데이터 모델

- **`apartment_complexes`** (단지): name, sido/sigungu/eupmyeondong, road_address/jibun_address,
  lat/lng, completion_year, household_count, building_count, parking_count,
  heating_type, builder_name, complex_type, is_active
- **`apartment_types`** (평형·타입 마스터 테이블, 별도 존재):
  - `apartment_type_id`로 단지·포트폴리오·견적문의 전체에서 FK로 참조됨
  - "같은 평형·같은 타입 매칭" 기능이 정확히 이 마스터 테이블 기반
  - **매물 데이터와 개념적으로 거의 동일한 구조** → 집팔고/집사고와 공통 모델 공유 여지 큼
- **`portfolios`**: company_id, complex_id, apartment_type_id, title/summary/description,
  construction_scope, budget_min/max, construction_days/date, status

**시사점**: 집팔고360의 매물(단지/평형/타입) 마스터 데이터를 `apartment_complexes` + `apartment_types`와
동일하거나 호환되는 스키마로 설계하면, 향후 "내 집과 같은 집이 인테리어 된 사례 보기" 같은
크로스 서비스 매칭 기능을 API 연동만으로 구현 가능.

## 4. 업체 포트폴리오·견적문의 플로우

- **`estimate_requests`**: customer_id, portfolio_id, complex_id, apartment_type_id, title, description,
  desired_budget_min/max, desired_start_date, contact_method, allow_recommendations, status(`submitted`부터 시작)
- **`estimate_request_companies`**: estimate_request_id, company_id, assignment_order,
  status(`unread`/`declined`/`expired`...) — 견적문의 1건이 여러 업체에 **순서대로 배정**되는 구조,
  upsert(`ON CONFLICT`)로 재배정 처리
- **`estimate_request_images`**: 첨부 이미지 (file_path, thumbnail_path)

**패턴 요약**: "1건의 요청 → N개 업체에 배정 → 개별 응답 상태 추적"하는 **견적 매칭 패턴**.
집팔고의 "매물 결제 열람"과는 결이 다르지만, 집사고의 "구매 의뢰 → 회원 공인중개사에게 공유" 플로우와
구조적으로 유사 — `estimate_requests` / `estimate_request_companies` 패턴을 집사고 설계 시 참고 가능.

## 5. 디자인 시스템

`css/style.css :root` 기준 컬러 토큰:

```css
--red: #bb1730        --red-dark: #951125    --red-soft: #fff2f4
--green: #21463b       --green-2: #2f5c4e     --green-3: #447466   --green-soft: #edf5f2
--blue: #427cff
--ink: #202421          --muted: #777e79       --line: #e6e9e7      --soft: #f5f6f5
--panel-width: 430px
--shadow: 0 14px 38px rgba(18,45,37,.16)
```

- **폰트**: `Pretendard, "Noto Sans KR", -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **톤**: 딥그린(`#21463b`) 메인 컬러 + 레드(`#bb1730`) 포인트 컬러 조합

**시사점**: 집팔고360 전체 톤을 맞추려면 이 그린/레드 팔레트와 Pretendard 폰트를 기준점으로 삼는 것을 권장.

## 6. 집팔고360 통합 시 고려사항 (결론)

| 항목 | 방향 |
|---|---|
| 서비스 간 연동 방식 | REST API 연동 (스택이 다르므로 모노레포 통합은 비권장) |
| 회원 시스템 | 통합회원 테이블 + role 구분, 업체는 확장 테이블(company_*) 패턴 재사용 |
| 매물/단지 데이터 모델 | `apartment_complexes` + `apartment_types` 구조를 집팔고360 매물 마스터와 호환되게 설계 |
| 견적/의뢰 매칭 패턴 | "요청 1건 → N개 업체/중개사 배정 → 개별 상태 추적" 패턴을 집사고 설계에 참고 |
| 디자인 톤 | 딥그린 `#21463b` + 레드 `#bb1730` 포인트, Pretendard 폰트 |
