# 작업 기록

`CLAUDE.md`의 최우선 규칙에 따라 작성되는 작업 기록입니다. 특히 서버
(115.68.195.144) 배포/운영 작업은 시작 전 / 진행 중 / 완료 후 시점에 반드시
여기에 기록합니다. 새 세션은 이 파일을 먼저 읽고 서버 상태를 파악한 뒤 작업을
이어갑니다.

---

## 2026-08-25 — zippalgo360.com 프로덕션 배포 (115.68.195.144, 집테리어와 같은 서버)

### 시작 전
- 목표: `zippalgo360.com`을 집테리어(zipterior.kr)와 같은 서버(115.68.195.144)에,
  집테리어와 완전히 분리된 이름/디렉토리/서비스로 배포한다.
- 이 세션은 해당 서버에 SSH 직접 접속이 불가능하다. 사용자가 터미널에서 명령어를
  직접 실행하고 결과를 붙여넣는 방식으로 진행한다.
- 배포 대상: `apps/api`(FastAPI, uvicorn), `apps/web`(Next.js), nginx 리버스
  프록시, Let's Encrypt SSL.

### 진행 중
- **DNS**: Cafe24 도메인 관리 콘솔에서 처음에 "네임서버 호스트 관리" 메뉴로
  잘못 들어갔었음(이 메뉴는 A레코드용이 아니라 네임서버 글루레코드용 — 실제
  서비스에는 영향 없음, 그냥 미사용 상태로 남겨둠). 올바른 메뉴는
  **DNS관리 → 호스트IP(A레코드) 관리**였음.
  - [완료] `zippalgo360.com` → `115.68.195.144` (A레코드)
  - [완료] `www.zippalgo360.com` → `115.68.195.144` (A레코드)
  - 전파 대기 중 (등록 직후라 아직 전세계 전파 확인 안 됨 — SSL 발급 전에 재확인 필요)
- **서버 사전 조사 결과** (SSH로 사용자가 직접 확인):
  - 포트 8000: 집테리어 백엔드(uvicorn, systemd `zipterior-api.service`) — 유지, 건드리지 않음
  - 포트 80/443: nginx(집테리어 zipterior.kr 서빙 중, `sites-available/sites-enabled` 방식,
    기존 설정 파일명 `zipterior`) — 유지, zippalgo360용 새 서버블록만 추가 예정
  - 포트 5432: Postgres 네이티브 실행 중 (기존 DB: `zipterior_db`, owner `zipterior_app`)
  - Node.js: 설치 안 되어 있었음 → 설치 필요했음
  - `/srv/`: `zipterior`만 존재 → `/srv/zippalgo360` 새로 생성 필요
  - git 설치되어 있음 (`/usr/bin/git`)
- **[완료] Node.js 22.23.2 설치** (NodeSource `setup_22.x` 스크립트 + `apt install nodejs`)
  - `node -v` → v22.23.2, `npm -v` → 10.9.8
- **[완료] Postgres 계정/DB 생성**
  - `CREATE USER zippalgo_app WITH PASSWORD '<서버에만 존재, 여기 기록 안 함>';`
  - `CREATE DATABASE zippalgo360_db OWNER zippalgo_app;`
  - 확인됨: `\l`에 `zippalgo360_db | zippalgo_app` 정상 표시
- **[완료] 레포 클론**
  - `sudo mkdir -p /srv/zippalgo360 && sudo chown zipterior:zipterior /srv/zippalgo360`
  - `git clone https://github.com/zippalgo-maker/zippalgo360.git /srv/zippalgo360`
  - 확인됨: `/srv/zippalgo360/apps/{api,web}` 존재
- **[완료] 백엔드 설정**
  - `python3 -m venv venv && pip install -r requirements.txt`
  - `.env` 작성 (`DATABASE_URL`은 `zippalgo_app` 계정, `CORS_ORIGINS`는
    `https://zippalgo360.com,https://www.zippalgo360.com`,
    `ZIPTERIOR_API_BASE_URL=https://zipterior.kr`)
  - DB 비밀번호는 사용자가 직접 정함(숫자 6자리, 서버 `.env`에만 존재 — 여기 기록 안 함).
    이 계정/DB는 집테리어의 `zipterior_app`/`zipterior_db`와 완전히 별개.
  - `alembic upgrade head` 성공
  - `seeds/zipterior_apartments_seed.sql` 로드 성공 → `apartment_complexes` 5,668건,
    `apartment_types` 25,530건 확인됨 (로컬 개발 DB와 개수 일치)
  - `zippalgo360-api.service` 등록, 포트 8001로 기동 (8000은 집테리어가 사용 중이라 회피).
    `active (running)` 확인, `/api/apartments/complexes?keyword=역삼` curl 테스트 200 확인
- **[완료] 프론트엔드 설정**
  - `npm install` (Node 22.23.2 기준)
  - `.env.production.local`: `NEXT_PUBLIC_API_URL=https://zippalgo360.com/api`,
    `NEXT_PUBLIC_KAKAO_MAP_JS_KEY=502640f182ae8cf758ab171c38a3e4e7`
  - `npm run build` 성공
  - `zippalgo360-web.service` 등록, `npm run start -- --port 3000`으로 기동.
    `active (running)` 확인, curl 로컬 200 확인
- **[완료] nginx**
  - `/etc/nginx/sites-available/zippalgo360` 새 서버블록 추가
    (`server_name zippalgo360.com www.zippalgo360.com`, `/api/` → 127.0.0.1:8001,
    `/` → 127.0.0.1:3000), `sites-enabled`에 심볼릭 링크, `nginx -t` 통과, reload 완료.
    집테리어 설정 파일(`/etc/nginx/sites-available/zipterior`)은 전혀 수정하지 않음.
- **[완료] SSL** — DNS 전파 확인(`dig +short zippalgo360.com` → `115.68.195.144`) 후
  `sudo certbot --nginx -d zippalgo360.com -d www.zippalgo360.com` 성공.
  인증서 만료일 2026-11-23, certbot이 자동 갱신 등록됨.
- **[완료] 카카오 개발자 콘솔** — 집테리어와 같은 카카오 앱(앱 설정 → 앱 →
  플랫폼 키 → JavaScript 키 → Default JS Key)의 Web 플랫폼 도메인에
  `https://zippalgo360.com`, `https://www.zippalgo360.com` 추가 완료.
  (주의: 도중에 "앱 → 일반" 페이지의 "앱 대표 도메인" 필드를 잘못 열어서
  zipterior.kr → zippalgo360.com으로 덮어쓸 뻔했으나 저장 전에 취소함 — 이건
  Web 플랫폼 도메인 목록과 무관한, 앱 전체에 하나만 있는 다른 설정이라 건드리면
  안 됨.)

### 완료 후
- `https://zippalgo360.com` — 200 확인 (curl)
- `https://zippalgo360.com/api/apartments/complexes?keyword=역삼` — 200, 정상 응답 확인 (curl)
- 브라우저 실접속 확인 완료 (사용자 확인: "zippalgo360.com 접속 하니까 잘 되네")
- **서버 최종 상태 요약**
  - `/srv/zippalgo360` — git 클론, `apps/api`(venv 포함) + `apps/web`(빌드 완료)
  - Postgres: `zippalgo_app` 계정 / `zippalgo360_db` (집테리어와 분리)
  - systemd: `zippalgo360-api.service`(127.0.0.1:8001), `zippalgo360-web.service`(127.0.0.1:3000) — 둘 다 `enabled`라 재부팅해도 자동 기동
  - nginx: `/etc/nginx/sites-available/zippalgo360` (zipterior 설정과 분리), SSL 적용됨
  - 집테리어 쪽 설정/서비스/DB는 이번 작업 중 전혀 수정하지 않음
- **남은 일 없음** — zippalgo360.com 프로덕션 배포 완료 (2026-08-25)
