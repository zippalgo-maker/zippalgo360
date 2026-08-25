# 집팔고360 (zippalgo360)

부동산 거래에서 주거 생활까지 연결하는 **Home Lifecycle Platform**.

## 서비스 구성

| 서비스 | 설명 | 상태 |
|---|---|---|
| **집팔고** | 매도인이 매물을 등록하면 회원 공인중개사가 건당 결제로 매물정보를 열람/중개. 매매 완료 증빙 시 결제금이 매물 등록 고객에게 지급되는 **더블베네핏** 구조 | 이번 저장소에서 개발 |
| **집사고** | 매수 희망자가 원하는 조건을 의뢰하면 회원 공인중개사에게 순차 공유되어 매칭을 돕는 시스템 | 이번 저장소에서 개발 |
| **집테리어** | 인테리어 업체 포트폴리오 열람, 같은 단지·같은 평형 시공사례 확인 후 견적문의 | 별도 저장소(데스크탑)에서 개발 중, API로 연동 예정 — [docs/zipterior-reference.md](docs/zipterior-reference.md) 참고 |
| **집이사** | 이사 서비스 매칭 | 준비 중 (자리표시) |
| **집청소** | 청소 서비스 매칭 | 준비 중 (자리표시) |

모든 하위 서비스는 **집팔고360 통합회원**을 기반으로 운영됩니다.

## 프로젝트 구조

```
apps/
  web/   Next.js (TypeScript, Tailwind) — 메인페이지, 집팔고, 집사고 프론트엔드
  api/   FastAPI (SQLAlchemy Core + raw SQL, Alembic) — 백엔드 API
docs/    기획/레퍼런스 문서
docker-compose.yml   로컬 개발용 PostgreSQL
```

집테리어(FastAPI + PostgreSQL, 바닐라 프론트)와 스택을 맞춰 백엔드는 FastAPI로 구성했으며,
향후 REST API 기반 서비스 간 연동(회원/매물/단지 데이터 공유)을 염두에 두고 설계합니다.

## 로컬 개발 시작하기

### 1. DB 실행
```bash
docker compose up -d
```

### 2. 백엔드 (apps/api)
```bash
cd apps/api
python -m venv .venv && source .venv/bin/activate
pip install -r requirements.txt
cp .env.example .env
alembic upgrade head

# 단지/평형 마스터 데이터 로드 (집테리어 실 운영 DB에서 가져온 데이터, 5,668개 단지)
psql "$DATABASE_URL" -f seeds/zipterior_apartments_seed.sql

uvicorn app.main:app --reload --port 8000
```

### 3. 프론트엔드 (apps/web)
```bash
cd apps/web
npm install
cp .env.example .env.local
npm run dev
```

## 디자인 톤

집테리어와 통일감을 위해 동일 팔레트를 기준으로 삼습니다.

- 메인 컬러: 딥그린 `#21463b`
- 포인트 컬러: 레드 `#bb1730`
- 폰트: Pretendard, Noto Sans KR

자세한 내용은 `apps/web/tailwind.config.ts` 및 [docs/zipterior-reference.md](docs/zipterior-reference.md) 참고.
