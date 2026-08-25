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

---

## 2026-08-25 — 집테리어 nav 링크 원복 (실제 zipterior.kr로 이동)

### 시작 전
- 사용자 요청: "집팔고360에서 집테리어를 누르면 원래 집테리어 페이지가 나오고 그
  안에서 기능을 이상없이 쓸수 있어야해" — task #12에서 `/map?mode=interior`
  (내부 지도, 단지별 마커+포트폴리오 개수만 표시)로 바꿨던 걸 되돌려야 함.
  그 내부 지도는 실제 포트폴리오 열람/업체 프로필/견적문의/로그인 등 zipterior.kr의
  기능을 대체하지 못하므로, 상단 네비게이션의 "집테리어"는 반드시 실제
  zipterior.kr로 이동해야 함.

### 진행 중
- **[완료]** `apps/web/src/lib/services.ts`의 `jipterior` 항목 `href`를
  `/map?mode=interior` → `https://zipterior.kr`로 원복. 로컬 빌드 성공 확인.
  git 커밋/푸시 완료 (`af34ebc`).
- `/map` 페이지 자체는 그대로 유지 — 집팔고 쪽에서 "지도에서 매물 보기"로
  접근하는 자체 지도(매물+인테리어 마커 토글)로는 여전히 유효한 기능.
- **[ ] 서버 재배포** — 로컬 소스만 수정했고, 이미 라이브인 zippalgo360.com에는
  아직 반영 안 됨. 사용자에게 서버에서 `git pull` → `npm run build` →
  `systemctl restart zippalgo360-web` 요청함. 결과 확인 대기 중.

### 완료 후
- 이 방식(외부 링크로 완전히 이동)은 서버 재배포도 하기 전에 사용자가 정정함 —
  아래 다음 섹션 참고. **이 커밋(`af34ebc`)은 그 다음 커밋(`9b7d4ea`)으로 대체됨.**

---

## 2026-08-25 — 집테리어를 집팔고360 헤더 아래 iframe으로 임베드

### 시작 전
- 사용자 정정: "이렇게 연결은 아니고 집팔고360 메인 메뉴는 그대로 두고 그 아래
  화면에 집테리어를 노출시키는거야" — 완전히 다른 사이트로 이동(외부 링크)하는
  게 아니라, 집팔고360의 헤더/메뉴는 유지한 채 그 아래 콘텐츠 영역에 실제
  zipterior.kr을 보여줘야 함.
- 구현 방법: iframe으로 zipterior.kr을 그대로 임베드.
- 사전 확인 필요 사항 2가지:
  1. zipterior.kr이 `X-Frame-Options`/CSP `frame-ancestors`로 프레임 삽입을
     막고 있는지 → 사용자가 `curl.exe -sI https://zipterior.kr`로 확인,
     두 헤더 모두 없음 확인됨 (현재는 막혀있지 않음).
  2. 로그인 등 쿠키 기반 기능이 iframe(제3자 컨텍스트) 안에서도 유지되는지 →
     브라우저에서 직접 확인해야 알 수 있음, 이 세션에서는 zipterior.kr에
     네트워크 접근이 안 돼서 직접 테스트 불가.

### 진행 중
- **[완료]** `apps/web/src/app/jipterior/page.tsx` 새로 만듦 — 헤더/푸터가
  유지되는 일반 페이지 레이아웃 안에서, 콘텐츠 영역 전체를 `<iframe
  src="https://zipterior.kr">`로 채움. 오른쪽 위에 "새 탭에서 열기" 탈출구
  링크 추가(iframe 안에서 문제 생기면 새 탭으로 우회 가능하도록).
- **[완료]** `apps/web/src/lib/services.ts`의 `jipterior` href를
  `https://zipterior.kr` → `/jipterior`(내부 라우트)로 변경.
- **[완료]** 로컬 빌드 성공, `/jipterior` 라우트가 정적 페이지로 생성됨,
  응답 HTML에 `src="https://zipterior.kr"` 정상 포함 확인 (curl).
  이 세션에서는 zipterior.kr 자체에 네트워크 접근이 안 돼서 iframe이 실제로
  콘텐츠를 렌더링하는지, 로그인이 iframe 안에서 되는지는 검증 못함 —
  **반드시 실제 브라우저에서 사용자가 확인 필요**.
  git 커밋/푸시 완료 (`9b7d4ea`).
- **[ ] 서버 재배포** — 아래 명령어 사용자에게 요청함, 결과 대기 중.

```bash
cd /srv/zippalgo360
git pull origin claude/jippalgo360-platform-6bvrfh
cd apps/web
npm run build
sudo systemctl restart zippalgo360-web
```

### 완료 후
(진행 중 — 서버 재배포 후 브라우저에서 `/jipterior`가 실제로 집테리어를
보여주는지, 특히 로그인 등 쿠키 필요한 기능이 iframe 안에서 정상 동작하는지
확인되면 기록. 만약 로그인이 iframe 안에서 안 되면 → zipterior 백엔드의 세션
쿠키를 `SameSite=None; Secure`로 바꿔야 함 — 이건 데스크탑 세션과 조율 필요.)

---

## 2026-08-25 — interior.zippalgo360.com 서브도메인 생성 (iframe 제3자 쿠키 문제 해결)

### 시작 전
- 다른 세션(웹) 진행 중 이 브랜치와 별도로, 사용자가 "집테리어를 zippalgo360.com
  안에 부분 기능처럼 붙이고 싶다"는 요청을 새 세션에서 시작함. 이 세션은
  처음엔 위 iframe 임베드 작업(`9b7d4ea`, `c68d1c7`)의 존재를 모른 채 별도로
  서브패스(`/interior`)·서브도메인 방식을 검토함.
- 서브패스(`zippalgo360.com/interior`)는 집테리어 프론트가 `/api/`, `/login`
  등 절대경로를 하드코딩하고 있고 집팔고360도 `/api/`를 쓰고 있어 경로 충돌
  발생 — 집테리어 소스 수정 없이는 불가능하다고 판단, 서브도메인 방식으로
  전환.
- 서버(115.68.195.144) SSH 직접 접속 가능(사용자가 zipterior 계정 SSH 붙여줌 —
  이 세션에서 SSH 아웃바운드가 막혀 있어 사용자가 명령어를 직접 실행하고
  결과를 붙여넣는 방식으로 진행).

### 진행 중
- **[완료] nginx** — `/etc/nginx/sites-available/interior.zippalgo360.com`
  신규 생성 (기존 `zipterior`/`zippalgo360` 파일은 미수정). 기존 `zipterior`
  server 블록의 location들을 그대로 복사 — `root /var/www/zipterior`,
  `/api/` 및 `/api/v1/chat/ws` → `127.0.0.1:8000`(집테리어 백엔드, 기존과 동일),
  clean-URL alias들도 동일하게 유지. `server_name`만
  `interior.zippalgo360.com`으로 교체. `nginx -t` 통과 후 reload.
- **[완료] SSL** — DNS A레코드(`interior` → `115.68.195.144`)가 이미 전파된
  상태에서 `certbot --nginx -d interior.zippalgo360.com` 성공. 만료일
  2026-11-23, 자동 갱신 등록됨.
- **[완료] CORS** — `/srv/zipterior/backend/app/main.py`의 `CORSMiddleware
  allow_origins`에 `https://interior.zippalgo360.com` 추가(기존
  `zipterior.kr`/`www.zipterior.kr` 항목은 유지, 추가만 함). 수정 전 파일은
  `main.py.bak_before_interior_subdomain`으로 백업. `zipterior-api` 재시작,
  `/api/health` 200 확인.
  - 참고: 프론트/API가 항상 same-origin으로 서빙되는 구조라 이 값이 페이지
    내 일반 `/api/...` 호출에 실제로 영향을 주진 않지만, 향후 크로스 서비스
    연동을 대비해 안전하게 추가해둠.
- **[완료] 최종 확인** — `interior.zippalgo360.com`(200),
  `zipterior.kr`(200, 영향 없음), `zippalgo360.com`(200, 영향 없음) 모두
  curl로 확인.
- 이 시점에 사용자로부터 이 브랜치(`claude/jippalgo360-platform-6bvrfh`)가
  실제 배포 브랜치이고, 이미 iframe 임베드(`9b7d4ea`)가 구현되어 있다는 걸
  알게 됨. 이 세션이 만들려던 `/interior` 서브패스 방식은 폐기하고, 대신
  **이미 만든 `interior.zippalgo360.com` 서브도메인을 iframe 임베드의
  src로 사용**하는 방향으로 전환 — 위 iframe 작업이 미해결로 남긴 "제3자
  쿠키" 리스크를 정확히 해결하는 조합.
- **[완료]** `apps/web/src/app/jipterior/page.tsx`의
  `ZIPTERIOR_URL`을 `https://zipterior.kr` → `https://interior.zippalgo360.com`으로
  변경. `interior.zippalgo360.com`은 `zipterior.kr`과 완전히 동일한 서버/DB/
  백엔드를 서빙하는 서브도메인이며, `zippalgo360.com`과 eTLD+1이 같아 iframe
  안에서도 same-site로 취급됨 — `zipterior.kr`을 그대로 쓸 때 우려했던 제3자
  쿠키 문제(로그인 세션 유지 실패 가능성)를 구조적으로 피할 수 있음.

### 완료 후
- **[완료] 서버 재배포** — `git pull` → `npm run build` →
  `systemctl restart zippalgo360-web` 사용자가 실행, 성공 확인.
  `https://zippalgo360.com/jipterior` → 200, 응답 HTML에
  `src="https://interior.zippalgo360.com"` 정상 반영 확인 (curl).
- 로그인이 iframe 안에서 실제로 유지되는지는 여전히 **브라우저 실접속 확인
  필요** — same-site로 바뀌어서 문제가 줄었을 가능성이 높지만, 완전히
  검증된 건 아님(curl로는 쿠키/로그인 동작까지 확인 불가). 문제가 남아있다면
  다음 후보는 `zipterior-api`의 세션 쿠키에 `Domain=.zippalgo360.com`을
  명시하는 것(단, 이건 zipterior.kr 자체 접속 시의 쿠키 동작에도 영향을
  주므로 데스크탑 세션과 조율 필요).
- 브라우저 실접속 결과: iframe 자체는 정상 로드되지만 **카카오맵이 안 뜸**
  (지도/마커 모두 안 보임). 원인: 집테리어와 집팔고360이 같은 카카오 앱
  JS 키를 공유하는데, 그 앱의 Web 플랫폼 허용 도메인 목록에
  `interior.zippalgo360.com`이 등록되어 있지 않았음(SDK가 미등록 도메인의
  요청을 차단). 사용자가 카카오 개발자 콘솔에서 해당 앱의 JavaScript SDK
  도메인 목록에 `https://interior.zippalgo360.com`을 추가함 — 이 시점에
  아래 네이밍 규칙 변경 결정도 함께 이루어져 사용 도메인 자체가 바뀜(다음
  섹션 참고).

---

## 2026-08-25 — 서브도메인을 `<서비스>.zippalgo360.com` 규칙으로 통일 (zipterior.zippalgo360.com)

### 시작 전
- 사용자 결정: 임시로 만든 `interior.zippalgo360.com` 대신, 앞으로 이 서버에
  붙일 모든 하위 서비스를 `<서비스명>.zippalgo360.com` 규칙으로 통일하기로 함.
  - 집테리어 → `zipterior.zippalgo360.com` (이번 작업)
  - 집팔고(별도 앱으로 분리될 경우) → `zippalgo.zippalgo360.com` (예정, 이번
    작업 범위 아님)
- 사용자가 카카오 개발자 콘솔에 `https://zipterior.zippalgo360.com`,
  `https://zippalgo.zippalgo360.com`을 미리 등록해둠(`https://interior.zippalgo360.com`도
  남겨둠, 당장 삭제하지 않음).

### 진행 중
- **[완료]** `apps/web/src/app/jipterior/page.tsx`의 `ZIPTERIOR_URL`을
  `https://interior.zippalgo360.com` → `https://zipterior.zippalgo360.com`으로 변경.
- 서버 작업(`zipterior.zippalgo360.com` nginx 서버블록 + SSL + CORS 추가,
  `interior.zippalgo360.com`은 당장 유지)은 이 커밋 이후 진행 — 아래 참고.
  `interior.zippalgo360.com`은 유지되지만 더 이상 코드에서 참조되지 않음(정리는
  나중에, 급하지 않음).

### 완료 후
- **[완료] nginx** — `/etc/nginx/sites-available/zipterior.zippalgo360.com`
  신규 생성(`interior.zippalgo360.com` 설정을 그대로 복제, `server_name`만
  교체). `nginx -t` 통과, reload 완료.
- **[완료] SSL** — `certbot --nginx -d zipterior.zippalgo360.com` 성공,
  만료일 2026-11-23, 자동 갱신 등록됨.
- **[완료] CORS** — `zipterior-api`의 `allow_origins`에
  `https://zipterior.zippalgo360.com` 추가(기존 항목 유지, 백업
  `main.py.bak_before_zipterior_subdomain`). 재시작 후 `/api/health` 200.
- **[완료] 카카오 JS SDK 도메인** — 사용자가 카카오 개발자 콘솔에서 직접
  `https://zipterior.zippalgo360.com`, `https://zippalgo.zippalgo360.com`(예정용),
  `https://interior.zippalgo360.com` 등록. (배경: iframe 안에서 지도가 안 뜨는
  문제가 있었는데, 원인이 카카오 JS SDK의 도메인 허용 목록에 새 서브도메인이
  없어서였음 — 등록으로 해결)
- **[완료] 앱 재배포** — `git pull` → `npm run build` →
  `systemctl restart zippalgo360-web`. 빌드 성공, `/jipterior` 200, 응답 HTML에
  `src="https://zipterior.zippalgo360.com"` 반영 확인. `zipterior.kr`,
  `zippalgo360.com` 기존 사이트 모두 200 유지(영향 없음).
- **남은 것**: 브라우저 실접속으로 iframe 안에서 카카오맵이 실제로 뜨는지,
  로그인이 유지되는지 최종 확인 필요.
- 사용자 실접속 확인: 지도/마커 정상, **로그인도 정상 동작**(카카오 JS SDK
  도메인 등록으로 해결됨).

---

## 2026-08-25 — 로그인 통합 설계 제안 (집팔고360을 신원 기준으로, 데스크탑 세션 검토 필요)

### 배경
- 사용자 요청: "로그인을 집테리어 로그인으로 하지 말고 집팔고360 로그인으로
  하자 — 나중에 집팔고/집사고 등도 다 같은 아이디로 쓸 거니까." 즉
  **집팔고360 통합회원을 신원의 기준(SSO 발급자)으로 삼고**, 지금 iframe으로
  붙인 집테리어도 그 로그인을 신뢰하게 만들어달라는 것.
- 검토 결과, 로그인 로직만 복사해오는 걸로는 안 됨:
  - 집테리어의 `portfolios`/`estimate_requests`/`company_*` 등 거의 모든
    테이블이 zipterior 자체 `users.id`를 FK로 물고 있어서, "누가 로그인했는가"를
    집테리어 쪽 데이터와 연결할 방법이 있어야 기존 기능(포트폴리오, 견적문의,
    업체 대시보드 등)이 안 깨짐.
  - 집테리어 백엔드는 **이 세션이 아니라 데스크탑에서 별도로 개발 중인
    코드베이스** — 로그인/세션 같은 보안 핵심 로직을 이 세션에서 SSH로
    직접 프로덕션에 패치하는 건 위험 부담이 커서, 설계만 여기 남기고
    실제 구현은 데스크탑 세션에서 진행하기로 사용자와 합의함.
- 참고: `docs/zipterior-reference.md`의 기존 결론과도 방향이 일치함 —
  "통합회원 테이블 + role 구분, 업체는 확장 테이블(company_*) 패턴 재사용".

### 제안 아키텍처 — JIT(Just-In-Time) 프로비저닝 방식 SSO

집팔고360이 신원의 기준(issuer), 집테리어는 그 신원을 신뢰해서 자기 계정을
찾거나 새로 만드는(JIT) **consumer** 역할. 집테리어의 기존 `users`/
`company_*` 스키마와 로직은 그대로 유지 — 로그인 **진입점만** 바뀜.

**왜 JWT를 URL에 그대로 노출하지 않는가**: iframe의 `src`를 바꾸는 방식으로만
부모→자식 프레임에 데이터를 전달할 수 있는데(서로 다른 origin이라
`postMessage` 외엔 직접 DOM 접근 불가, 그런데 지금 집테리어 프론트는
바닐라 JS라 postMessage 리스너를 새로 심어야 하는 건 URL 파라미터 방식과
비용이 비슷함), 로그인 토큰(장기 유효 JWT)을 그대로 URL 쿼리에 실으면
브라우저 히스토리·리퍼러 헤더·서버 access 로그에 남는 문제가 있음. 그래서
**1회용·단기 만료 코드로 한 단계 감싸는 방식(OAuth authorization code와
유사)**을 제안.

**흐름**:
1. 사용자가 `zippalgo360.com`에 이미 로그인되어 있고, "집테리어" 메뉴를 클릭.
2. `/jipterior` 페이지가 iframe을 그리기 **전에**, 집팔고360 프론트가 자기
   백엔드(`apps/api`)의 새 엔드포인트를 호출:
   `POST /api/auth/sso/issue-code` (현재 로그인된 사용자의 access token으로
   인증) → 응답으로 **1회용 opaque code**(랜덤 문자열, 예: 30초 TTL, 서버
   메모리 또는 Redis/DB에 `code → {user_id, email, name, role}` 매핑 저장,
   한 번 조회되면 즉시 폐기)를 받음.
3. iframe `src`를 `https://zipterior.zippalgo360.com/?sso=<code>`로 설정.
4. **[집테리어 쪽 신규 작업]** 집테리어 프론트(`app.js`)가 부팅 시
   `location.search`에서 `sso` 파라미터를 확인 → 있으면 자기 백엔드에
   `POST /api/auth/sso/exchange { code }` 호출.
5. **[집테리어 쪽 신규 작업]** 집테리어 백엔드가 서버-투-서버로 집팔고360
   백엔드에 그 code를 검증 요청
   (`POST https://zippalgo360.com/api/auth/sso/verify { code }` — 내부망이라면
   `127.0.0.1:8001`로 직접 호출도 가능, 같은 서버라 네트워크 홉 최소화 가능).
   code가 유효하면 `{email, name, role}`을 받고 즉시 그 code는 폐기.
6. 집테리어 백엔드: 받은 `email`로 자기 `users` 테이블 조회 →
   - 있으면 그 계정으로 세션/JWT 발급
   - 없으면 새 `users` row 생성(이메일 기준, `role` 매핑: 집팔고360
     `customer`→집테리어 `customer`, 집팔고360 `company`→집테리어 `company`.
     단 집테리어의 `company`는 `companies`/`company_onboarding` 등 확장
     정보가 필요하므로, 신규 생성된 company row는 "온보딩 미완료" 상태로
     만들고 집테리어 쪽에서 별도 온보딩 유도 — 이 부분 세부 정책은
     데스크탑 세션에서 결정)
   - 발급한 세션 쿠키(집테리어 것)를 응답에 설정.
7. 집테리어 프론트: 교환 성공 후 `history.replaceState`로 URL에서 `sso`
   파라미터 제거(주소창에 코드가 남지 않게), 정상 화면 렌더.
8. 실패(코드 만료/이미 사용됨 등) 시에는 조용히 무시하고 집테리어의 기존
   로그인 화면으로 폴백 — iframe 자체가 깨지면 안 됨.

### 필요한 변경 (책임 분담)
- **집팔고360(`apps/api`, 이 저장소 — 이 세션 또는 platform 세션이 구현 가능)**
  - `POST /api/auth/sso/issue-code` (로그인 필요) — 코드 발급
  - `POST /api/auth/sso/verify` (서버-투-서버 전용, 집테리어 백엔드
    IP/도메인 또는 공유 시크릿으로 제한) — 코드 검증 및 즉시 폐기
  - `apps/web/src/app/jipterior/page.tsx`에서 iframe src 조립 전에
    `issue-code` 호출하도록 수정 (로그인 안 된 사용자는 지금처럼 그냥
    `https://zipterior.zippalgo360.com` 바로 사용 — 로그인 강제 아님)
- **집테리어(데스크탑 세션 담당 — 조율 필요)**
  - `POST /api/auth/sso/exchange` 신규 엔드포인트
  - 부트스트랩 JS에서 `?sso=` 파라미터 감지 → exchange 호출 → 세션 쿠키 반영
  - 이메일 매칭/신규 생성 정책, company 역할 온보딩 처리 정책 확정
- **공유 필요**: 두 백엔드 간 신뢰 수립 방법 — 가장 간단한 건 두 서비스
  `.env`에 같은 값의 `SSO_SHARED_SECRET`을 넣고 `verify` 요청에
  `Authorization: Bearer <shared secret>` 헤더로 검증(같은 서버 내부 호출이라
  네트워크 노출 자체는 적지만, 그래도 검증 없이 아무 서비스나 `verify`를
  호출 못하게 막아야 함).

### 아직 결정 안 된 것 (데스크탑 세션과 논의 필요)
- 집테리어에 `zipterior.kr`로 직접 들어와서 자체 회원가입하는 기존 사용자는
  어떻게 되나 — 이 SSO 흐름은 **iframe 경로**에서만 동작하고, `zipterior.kr`
  직접 방문 시의 자체 로그인/회원가입은 그대로 유지하는 게 자연스러워 보임
  (완전 폐지는 아님, 진입 경로가 하나 더 생기는 것).
- 이메일이 겹치지만 실제로는 다른 사람인 극단적 케이스(이론상 가능성 낮음) —
  이메일 인증을 두 서비스 다 거친다는 전제로 위험은 낮다고 판단했으나 최종
  확인 필요.
- 집테리어 `company`(인테리어 업체) 신규 가입 온보딩 플로우를 SSO 경로에서
  어디까지 자동화할지.
- 이 설계는 아직 **코드로 구현되지 않았음** — 데스크탑 세션이 이 문서를 읽고
  구현을 진행하거나, 이 방향에 이견이 있으면 여기에 대안을 기록해주면 됨.
