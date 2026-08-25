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
- ~~이 설계는 아직 코드로 구현되지 않았음~~ → 집팔고360 쪽은 구현 완료(아래
  참고). 데스크탑 세션이 집테리어 쪽(exchange 엔드포인트 + 부트스트랩 JS)을
  구현하면 됨.

### 진행 중 — 집팔고360 쪽 구현 (커밋 `34e1d37`)
- **[완료]** `apps/api/app/modules/auth/sso.py` 신규 — 코드 발급/검증(메모리
  저장, TTL 기본 30초, 조회 즉시 폐기). 단일 프로세스 전제(스케일 시 Redis로
  교체 필요, 파일 상단 docstring에 명시해둠).
  `apps/api/app/config.py`에 `sso_shared_secret`,
  `sso_code_ttl_seconds` 추가(`.env.example`에도 반영, 기본값은 placeholder라
  **운영 `.env`에 반드시 실제 값으로 덮어써야 함** — 아래 배포 안내 참고).
- **[완료]** `POST /api/auth/sso/issue-code`(로그인 필요) /
  `POST /api/auth/sso/verify`(서버 간 통신, `Authorization: Bearer
  <SSO_SHARED_SECRET>` 필요, `secrets.compare_digest`로 타이밍 공격 방지)
  엔드포인트를 `apps/api/app/modules/auth/router.py`에 추가.
  응답/요청 스키마는 `apps/api/app/modules/users/schemas.py`에
  `SsoCodeOut`/`SsoVerifyIn`/`SsoVerifyOut`으로 추가.
- **[완료]** `apps/web/src/app/jipterior/page.tsx` — 로그인된 사용자는
  iframe을 그리기 전에 `issue-code`를 호출해서 받은 코드를
  `?sso=<code>`로 iframe src에 붙임. 코드 발급 실패 시(비로그인 포함)
  조용히 기본 URL로 폴백. "새 탭에서 열기" 링크는 코드 없는 기본 URL을
  그대로 사용(1회용 코드를 iframe이 먼저 소비했을 수 있어서 재사용 방지 겸
  단순화).
- 로컬 빌드 확인: `apps/web` `npm run build` 성공(`/jipterior` 정적 페이지
  정상 생성), `apps/api`는 관련 파일 3개 `ast.parse`로 문법 확인(이 세션엔
  Python 의존성 설치 환경이 없어 실제 서버 기동 테스트는 서버 배포 시
  `zipterior-api`처럼 `zippalgo360-api` 재시작 후 `/api/health`로 확인 필요).

### 서버 배포 시 필요한 조치 (아직 안 함 — 다음 서버 작업 때 같이)
1. `/srv/zippalgo360/apps/api/.env`에 `SSO_SHARED_SECRET=<openssl rand -hex
   32 등으로 생성한 실제 값>` 추가(현재 기본값 `change-this-in-production`은
   반드시 교체). 이 값은 **집테리어 쪽에도 그대로 공유해야** `verify` 호출이
   통과함 — 데스크탑 세션과 조율 필요.
2. `git pull` → `zippalgo360-api`/`zippalgo360-web` 재빌드·재시작.
3. `verify` 엔드포인트는 아직 집테리어 쪽에서 호출하지 않으므로(exchange
   엔드포인트 미구현), 이 배포만으로는 로그인 통합이 실제로 동작하지 않음 —
   `issue-code`가 정상 작동하는지만 우선 확인 가능
   (`curl -X POST https://zippalgo360.com/api/auth/sso/issue-code -H
   "Authorization: Bearer <로그인 토큰>"`).

### 완료 후
- **[완료]** 위 배포 실행됨. `SSO_SHARED_SECRET`을 `apps/api/.env`에 새로
  생성해 추가함(값은 서버에만 있음, 여기 기록 안 함 — 집테리어 쪽 구현 시
  같은 값을 공유해야 함, 데스크탑 세션과 조율 필요).
  `zippalgo360-api`/`zippalgo360-web` 재시작, 둘 다 `active` 확인.
  `POST /api/auth/sso/issue-code`를 인증 없이 호출 → 401 정상 확인(엔드포인트가
  실제로 떠서 인증을 요구하고 있음을 검증).
- **다음 단계는 이 세션 범위 밖** — 데스크탑 세션이 집테리어 쪽에
  `POST /api/auth/sso/exchange` 엔드포인트와 부트스트랩 JS의 `?sso=` 파라미터
  처리를 구현하고, 위에서 생성한 `SSO_SHARED_SECRET`을 집테리어 `.env`에
  넣어야 로그인 통합이 실제로 동작함. 그 전까지 `/jipterior`는 지금처럼
  정상 작동하되(폴백), 로그인은 여전히 집테리어 자체 로그인으로 이루어짐.

---

## 2026-08-25 — 집팔고 지도 검색창 추가 (매물 마커/결제열람은 이미 구현되어 있었음)

### 시작 전
- 사용자 요청: "집팔고 개발해보자 — 집테리어 지도(통합검색 포함) 가져다
  쓸 수 있어? 매물을 마커로 표시하고 부동산 로그인 후 결제해서 매물정보
  확인하는 시스템."
- 확인 결과 대부분 **이미 구현되어 있었음**(다른 세션이 이전에 작업):
  - `/map` 페이지에 "매물보기"(`GET /listings/map/markers`)/"인테리어보기"
    토글 이미 존재.
  - 부동산 업체 로그인 → `GET /listings/browse/active`(`require_company_type
    ("real_estate")`) → `POST /payments/...`로 결제 → 결제 전엔 동/호수
    마스킹, 결제 후(`payments_repository.get_purchase` 확인)에만 노출 —
    `apps/api/app/modules/listings/service.py`의 `_can_view_unmasked`에
    정확히 구현되어 있음(실제 PG 연동 전이라 지금은 모의결제).
  - 단지 검색 API(`GET /apartments/complexes?keyword=`)도 이미 존재.
- **없던 것**: `/map` 페이지에 단지명으로 검색해서 지도를 이동시키는
  검색창(집테리어의 "통합검색"에 해당하는 UX)이 없었음 — 이번에 이것만 추가.

### 진행 중
- **[완료]** `apps/web/src/app/map/page.tsx`에 검색창 추가(좌상단, 기존
  매물보기/인테리어보기 토글은 우상단 그대로 유지). 입력 300ms 디바운스 후
  `GET /apartments/complexes?keyword=`로 검색, 드롭다운에 단지명/도로명주소
  표시, 클릭 시 카카오맵 `setCenter`/`setLevel(4)`로 해당 단지 위치로 이동.
  지도 이동은 기존 `idle` 이벤트 리스너가 그대로 받아서 매물/인테리어
  마커도 자동으로 새로고침됨(추가 코드 불필요).
- 로컬 `npm run build` 성공, `/map` 라우트 정상 생성 확인.

### 완료 후
(진행 중 — 서버 배포는 사용자 요청 시 진행. 배포되면 브라우저에서 검색 동작
실제 확인 필요.)

---

## 2026-08-25 — 지도를 다중 레이어 구조로 전환 + 업체 위치/인덱스 (집팔고360 플랫폼 통합 원칙 반영)

### 시작 전
- 사용자가 진행 전에 아키텍처 원칙을 명확히 함: 집팔고360 산하 서비스(집팔고/
  집사고/집테리어/집이사/집청소)는 **정보를 서로 유기적으로 공유**해야
  하고, 지도는 "매물보기 또는 인테리어보기 중 하나" 같은 모드 전환이 아니라
  **하나의 지도 위에 매물/포트폴리오/부동산업체/인테리어업체/청소업체
  마커가 동시에** 뜨는 구조여야 한다고 확인.
- 추가로 명시한 핵심 요구사항: **마커 로딩 속도가 DB 구조를 억지로 붙여서
  느려지면 안 됨.** 실제로 점검해보니 기존 마이그레이션(`0001`, `0002`) 전체에
  `CREATE INDEX`가 4개뿐이고(`listings.status`, `listings(complex_id,
  apartment_type_id)`, `purchase_requests.customer_id`,
  `apartment_types.complex_id`), 지도 bounding-box 조회에 실제로 쓰이는
  `apartment_complexes(latitude, longitude)`에는 인덱스가 없었음(지금 데이터
  5,668건이라 체감은 안 되지만, 순차 스캔 구조는 그대로 두면 안 된다고 판단).
  이번 작업에서 이것도 같이 고침.

### 진행 중
- **[완료] DB**: `apps/api/alembic/versions/0003_add_company_location_and_map_indexes.py`
  - `companies`에 `latitude`/`longitude`(DOUBLE PRECISION, nullable) 추가.
  - `idx_companies_type_location ON companies(company_type, latitude, longitude)
    WHERE latitude IS NOT NULL AND longitude IS NOT NULL` — 레이어별 조회가
    항상 `company_type` 등치 필터 + 좌표 범위 필터라 이 순서로 복합 인덱스,
    좌표 없는(미지오코딩) 행은 partial index로 애초에 제외.
  - `idx_apartment_complexes_location ON apartment_complexes(latitude, longitude)
    WHERE ...` — 기존에 없던 것 추가(매물 지도 마커/단지 지도 마커 조회의
    핵심 인덱스).
  - **서버에 아직 미적용** — 배포 시 `alembic upgrade head` 필요.
- **[완료] 업체 위치 지오코딩**: `apps/api/app/modules/companies/geocoding.py`
  신규 — 카카오 Local REST API(주소 검색)로 `address` → 좌표 변환.
  `kakao_rest_api_key` 설정 추가(`.env.example`에 안내 포함, **JS 키와는
  다른 REST API 키** — 카카오 콘솔에서 별도 발급 필요, 서버에 아직 미설정).
  키가 없거나 지오코딩 실패해도 업체 가입 자체는 막지 않고 좌표만 비워둠
  (조용한 폴백 — 기존 `zipterior_client.py`의 실패 처리 패턴과 동일한 원칙).
  `companies.service.register_company`가 가입 시 자동으로 지오코딩 호출.
- **[완료] 업체 지도 마커 API**: `GET /companies/map/markers?company_type=&
  north=&south=&east=&west=&limit=` 추가. 업체당 추가 쿼리 없이 단일
  쿼리로만 반환(기존 `list_companies`가 업체마다 `get_service_regions`를
  또 조회하는 N+1 패턴이 있는데, 마커 API는 그 패턴을 반복하지 않도록
  최소 컬럼만 별도 쿼리로 작성 — `service_regions`는 마커에 필요 없음).
  `is_verified = true`인 업체만 노출(미검증 업체가 공개 지도에 뜨지 않게).
- **[완료] 프론트 `/map` 리팩터링**: 라디오 토글(매물 vs 인테리어) →
  **체크박스 다중 레이어**로 전면 교체.
  - 레이어: 매물(집팔고, 기존 유지) / 인테리어 시공사례(집테리어, 기존 유지) /
    부동산 업체(신규, 실제 데이터 있음) / 인테리어업체·이사업체·청소업체
    (신규 API는 준비됐지만 **체크박스 비활성 "준비중"**으로 처리 — 이유는
    아래 "확인 필요" 참고).
  - 켜진 레이어만 API 요청을 보냄(꺼진 레이어는 요청 자체가 안 나감) —
    로딩 속도를 위한 핵심 설계.
  - 지도 이동(`idle` 이벤트)마다 켜진 레이어들을 병렬로 새로고침. 요청
    도중 사용자가 레이어를 꺼버리는 경우를 대비해, 응답이 돌아온 시점에
    그 레이어가 여전히 켜져 있는지 다시 확인 후에만 렌더링(꺼진 레이어가
    뒤늦게 살아나는 레이스 컨디션 방지).
  - 부동산/인테리어/이사/청소업체 마커는 기존 매물/포트폴리오 마커(빨간
    핀)와 구분되도록 `CustomOverlay`로 색깔 있는 원형 점으로 표시(이미지
    에셋 없이 CSS만으로 구현) — 부동산은 파란색(`#427cff`, 집테리어 팔레트의
    `--blue`와 동일).
- 로컬 `npm run build`(apps/web), `ast.parse`(apps/api 관련 파일 전부) 확인.

### 확인 필요 — "인테리어업체" 레이어를 비활성으로 둔 이유
- API 자체는 `company_type=interior`로도 똑같이 동작하도록 만들었지만,
  `apps/web/src/app/onboarding/company/page.tsx`가 지금 `company_type:
  "real_estate"`로 **하드코딩**되어 있어서, 집팔고360 자체 가입 경로로는
  인테리어/이사/청소 업체가 아예 가입할 방법이 없음(부동산만 가능).
  그래서 이번엔 "부동산 업체" 레이어만 활성화하고 나머지 셋은 준비중으로
  표시함. 인테리어 업체 데이터는 애초에 집테리어 자체 DB(`zipterior_db`)에
  있으므로, 실제로 채우려면 (a) 온보딩 페이지에 업체 유형 선택 UI를
  추가하거나 (b) 집테리어 쪽 업체 위치를 API로 공유받는 방법 중 하나가
  필요 — 사용자 확인 후 다음 작업으로 진행.

### 서버 배포 시 필요한 조치 (아직 안 함)
1. `git pull` → `apps/api`에서 `alembic upgrade head` (마이그레이션 0003 적용).
2. `apps/api/.env`에 `KAKAO_REST_API_KEY=<카카오 콘솔에서 발급한 REST API 키>`
   추가 — 안 넣으면 지오코딩만 조용히 건너뛰고 나머지는 정상 작동(신규 가입
   업체가 지도에 안 뜰 뿐).
3. `zippalgo360-api`/`zippalgo360-web` 재빌드·재시작.
4. 기존에 이미 가입된 업체(있다면)는 이번 마이그레이션으로 좌표가 채워지지
   않음(가입 시점에만 지오코딩) — 필요하면 나중에 일괄 지오코딩 스크립트
   별도 작성.

### 완료 후
(진행 중 — 서버 배포는 사용자 요청 시 진행.)

---

## 2026-08-25 — 인테리어 업체 마커: 집테리어 API 연동 방식 확정 + 아키텍처 원칙 정리

### 시작 전
- 사용자 확인: "인테리어 업체 정보는 집테리어 쪽에 이미 데이터가 있으니
  (b) 집테리어 API로 받아오는 방식으로 간다." 자체 companies 테이블에
  인테리어 업체를 새로 가입시키는 방식(a)은 폐기.
- 추가로 "앞으로도 각 서비스 데이터를 API로 주고받는 방식이면 괜찮은가"
  라는 아키텍처 질문에 답변 정리:
  - **1회성/상세 조회**(매물 상세페이지의 포트폴리오 보여주기 같은 것)는
    지금처럼 실시간 API 프록시로 충분하고 적절함.
  - **지도처럼 반복 조회되는 마커류**는 매 pan/zoom마다 여러 서비스에
    동시에 살아있는 API 호출을 날리는 구조로 계속 확장하면 안 됨 — 한
    서비스가 느려지거나 죽으면 지도 전체가 느려지는 구조가 되고, 이번에
    고친 DB 인덱스 문제와 같은 종류의 함정이 네트워크 레벨에서 반복됨.
  - 결론: 지금 규모에선 기존 `zipterior_client.py` 프록시 패턴(짧은
    타임아웃 + 실패 시 `available=false`로 조용히 폴백)을 그대로
    확장하되, 트래픽이 늘면 "각 서비스가 위치 데이터를 우리 쪽에 주기적으로
    동기화(webhook/배치)해서 우리가 인덱스 걸어놓고 서빙"하는 캐시 구조로
    전환하는 걸 다음 단계로 남겨둠(지금 당장 만들 정도는 아니라고 판단).

### 진행 중
- **[완료]** `apps/api/app/modules/integrations/zipterior_client.py`에
  `get_interior_companies()` 추가 — 기존 `get_interior_map_markers()`가 쓰는
  `GET {ZIPTERIOR_API_BASE_URL}/api/v1/public/map/markers` 엔드포인트를
  `marker_type=company`로 호출하도록 만듦.
  **⚠️ 이건 확인된 계약이 아니라 가정임** — 기존 엔드포인트가
  `marker_type=complex&has_portfolio=true`로 단지 마커를 주는 걸 보고
  "아마 `marker_type=company`도 같은 엔드포인트에서 확장 가능하지 않을까"
  하고 대칭적으로 설계한 것. **데스크탑 세션 확인/구현 필요**:
  - 요청: `GET /api/v1/public/map/markers?marker_type=company&north=&south=
    &east=&west=&limit=`
  - 기대 응답 형태: `{"items": [{"id": int, "name": str, "latitude": float,
    "longitude": float, "phone": str|null}], "total": int}` — 업체
    `is_verified`/`is_active` 필터링은 집테리어 쪽에서 이미 하고 있을
    것으로 가정(공개 API이므로).
  - 이 형태가 아니거나 다른 파라미터명이면 여기(`get_interior_companies`)와
    `docs/WORK_LOG.md`를 맞춰서 조정하면 됨. 계약이 안 맞아도 그냥
    `available=false`로 빈 목록만 돌아오고 지도 자체는 안 깨짐.
- **[완료]** `GET /api/integrations/zipterior/company-markers` 신규 엔드포인트
  (`apps/api/app/modules/integrations/router.py`).
- **[완료]** `/map` 페이지의 "인테리어 업체" 레이어를 비활성 → **활성화**.
  집팔고360 자체 `/companies/map/markers?company_type=interior`(항상
  비어있을 구조)가 아니라 위 집테리어 프록시로 라우팅하도록 전환.
  마커는 `company_real_estate`와 마찬가지로 색깔 있는 원형 점(CustomOverlay),
  집테리어 팔레트의 딥그린(`#21463b`) 사용.
- 로컬 `npm run build` 성공, `ast.parse`로 백엔드 파일 문법 확인.

### 완료 후
- **[완료] 서버 배포** — `alembic upgrade head`(마이그레이션 0003 적용),
  `zippalgo360-api`/`zippalgo360-web` 재빌드·재시작 완료.
  `GET /api/companies/map/markers`, `GET /api/integrations/zipterior/
  company-markers` 둘 다 200 확인.
- **⚠️ 데스크탑 세션 확인 필요 — 결과가 애매함**: 서버에서 bbox 없이
  `curl https://zippalgo360.com/api/integrations/zipterior/company-markers`
  호출 결과:
  ```json
  {"items":[],"total":0,"available":true}
  ```
  `available:true`(요청 자체는 성공)인데 `items`가 비어있음. 이게
  (a) `marker_type=company`를 실제 지원하는데 지금 조건(검증됨+좌표 있음)에
  맞는 업체가 아직 없어서인지, (b) `marker_type=company`라는 값을 그냥
  인식 못 해서 무해하게 빈 결과를 돌려주고 있는 것뿐인지(즉 실제로는
  구현 안 됨) 이 세션에서는 구분 불가 — 집테리어 소스를 볼 수 없음.
  **데스크탑 세션이 확인**: `app/modules/*/router.py` 어딘가의
  `/api/v1/public/map/markers` 핸들러가 `marker_type` 파라미터로
  `company`(또는 다른 값)를 실제로 분기 처리하는지, 그렇다면 응답 스키마가
  위에서 가정한 형태(`id`, `name`, `latitude`, `longitude`, `phone`)와
  맞는지 확인 후 필요하면 구현/조정. 안 맞으면 이쪽(`zipterior_client.
  get_interior_companies`, `docs/WORK_LOG.md`)도 같이 맞춰야 함.
- 그 전까지 "인테리어 업체" 레이어는 켜면 0건으로 표시될 뿐 지도 자체는
  정상 작동함(에러 없음, 사용자 확인: 최종 curl 결과 정상).

---

## 2026-08-25 — 카카오 REST 키 적용, 부동산 마커 버그 수정, 클러스터링 도입

### 시작 전
- 카카오 REST API 키를 사용자가 발급받아 서버 `.env`에 적용, 카카오 Local API로
  직접 유효성 확인(주소 검색 curl 테스트 성공) — 완료.
- 사용자가 테스트로 부동산 업체를 가입시켰는데 지도에 마커가 안 뜨는 문제와,
  인테리어 시공사례가 실제로는 5,000건 이상인데 지도에 500건만 뜨는 문제
  두 가지를 보고함.

### 진행 중
- **[완료] 버그 수정 — 부동산 업체 마커 안 뜨던 원인**: `companies/repository.
  list_map_markers`에 넣었던 `is_verified = true` 필터가 원인. 이 코드베이스엔
  업체를 승인(`is_verified`를 true로 바꾸는) 관리자 기능이 아예 없어서, 그
  필터가 있으면 어떤 업체도 영원히 지도에 뜰 수 없었음(제가 만든 버그).
  기존 `list_companies`(업체 목록 API)와 동일하게 `is_active = true`만
  필터하도록 되돌림. 업체 승인 플로우가 나중에 생기면 그때 다시 검토.
- **[완료] "500개 제한 풀어라" 요청 — 제한만 풀지 않고 클러스터링을 같이 넣음**:
  단순히 limit을 키우기만 하면 5,000개 넘는 마커를 클러스터링 없이 그대로
  그려서 브라우저가 느려짐(사용자가 이 세션 내내 강조한 "로딩 속도" 요구에
  정면으로 위배). 대신:
  - `apps/web/src/lib/kakao-maps.ts`: SDK 로드 시 `&libraries=clusterer` 추가.
  - `apps/web/src/app/map/page.tsx`: 매물/인테리어 시공사례 레이어(마커 수가
    많은 두 레이어)에 `kakao.maps.MarkerClusterer` 적용(`minLevel: 6`,
    `averageCenter: true`) — 줌아웃 시 숫자 뭉치로, 줌인하면 개별 마커로.
    마커 생성 시 `map`을 직접 주지 않고 클러스터러가 부착을 관리하도록 변경.
  - 프론트 fetch limit을 500 → `MARKER_FETCH_LIMIT = 5000`으로 상향(상수화).
  - 백엔드 각 지도 마커 엔드포인트(listings/apartments/companies/
    integrations 4곳)의 상한을 `min(limit, 3000)`/`le=3000` →
    `10000`으로 상향 — DB 인덱스가 이미 있어서(직전 작업) 이 정도 상한은
    문제 없다고 판단.
  - 업체 마커(부동산/인테리어) 레이어는 `CustomOverlay` 점이라 카카오
    클러스터러 대상이 아님 — 지금 개수(0~수십 건)로는 문제 없어서 그대로
    둠. 나중에 업체 수가 많아지면 그때 Marker+커스텀 이미지로 바꿔서
    클러스터링 대상에 포함시키면 됨.
- 로컬 `npm run build`(apps/web) 성공, `ast.parse`(apps/api 관련 파일) 확인.

### 완료 후
- **[완료] 서버 배포** — `alembic` 불필요(코드만 변경), `zippalgo360-api`/
  `zippalgo360-web` 재빌드·재시작. 부동산 마커 확인됨(사용자 확인).
- **사용자 피드백**: (1) 지도 확대/축소 반복하면 버벅거림, (2) 인테리어
  시공사례가 "불러올 수 없음"도 아니고 그냥 "0"으로 표시됨. 이어서 다음
  섹션에서 원인 조치.

---

## 2026-08-25 — 지도 확대/축소 버벅임 완화, 레이어 로딩 실패를 조용히 삼키지 않게 수정

### 시작 전
- 원인 추정: `idle` 이벤트마다(빠르게 연속 확대/축소하면 짧은 간격으로 여러 번
  발생) 레이어별로 서버에서 다시 fetch하고 마커(수천 개까지 가능) 전체를
  새로 만드는 구조라, 겹쳐서 계속 쌓이면 버벅거릴 수 있음.
- "인테리어 시공사례 0" 문제는 확실한 원인을 특정 못함 — 이 세션에서 사용자
  브라우저를 직접 볼 수 없음. 다만 코드를 보니 `loadInteriorMarkers`
  내부에서 예외가 나면(집테리어 쪽 5xx/422, 혹은 다른 런타임 에러) 그
  Promise가 조용히 reject되고 어디서도 잡히지 않아서, `available` 체크
  코드(끝까지 못 감)는 물론 "불러올 수 없음" 표시조차 안 뜨고 그냥 초기값인
  0으로 남아있을 수 있음 — 실패와 진짜 0건을 구분 못 하게 되어 있던 게
  버그. 이번에 같이 고침.

### 진행 중
- **[완료]** `apps/web/src/app/map/page.tsx`:
  - `idle` 이벤트에 250ms 디바운스 추가 — 빠른 연속 확대/축소 시 이벤트가
    여러 번 발생해도 실제 fetch+렌더링은 한 번만 일어나게 함.
  - 레이어별 in-flight 가드(`pendingLayersRef`) 추가 — 같은 레이어에 대한
    이전 요청이 아직 진행 중이면 새 요청을 또 쏘지 않음(요청이 겹쳐서
    쌓이는 것 방지, 버벅임의 핵심 원인으로 추정).
  - `loadLayer(layer)`에 `.catch()` 추가 — 어떤 이유로든(API가
    available:false를 준 경우 말고 요청/렌더링 도중 예외가 난 경우까지)
    실패하면 `console.error`로 로그를 남기고 `unavailableLayers`에 추가해서
    화면에 "불러올 수 없음"으로 표시되게 함. 예전엔 이런 경우 아무 표시 없이
    그냥 "0"으로만 보여서 실제 0건인지 오류인지 구분이 안 됐음.
- 로컬 `npm run build` 성공.

### 확인 필요
- 이번 수정으로 "인테리어 시공사례"가 계속 0으로 뜨는지, 아니면 "불러올 수
  없음"으로 바뀌는지 봐야 진짜 원인을 좁힐 수 있음. "불러올 수 없음"으로
  바뀌면 브라우저 개발자 도구 콘솔에 `[map] interiorPortfolio 레이어 로딩
  실패`로 시작하는 에러 로그가 찍히니 그 내용을 확인하면 정확한 원인(예:
  집테리어 쪽 API가 limit=5000을 거부하는지 등)을 알 수 있음.

### 완료 후
- **[완료] 서버 배포 및 확인** — 버벅임은 나아졌고, 오류 표시도 정상 작동함:
  "인테리어 시공사례"와 "인테리어 업체"(둘 다 집테리어로 프록시되는 레이어)가
  "불러올 수 없음"으로 정확히 표시됨. 반면 우리 DB로 바로 가는 "매물"(0건,
  진짜 빈 결과)과 "부동산 업체"(1건, 정상)는 문제 없음.
- **원인 확정**: 실패하는 두 레이어의 공통점이 "집테리어로 프록시됨" +
  "이번에 `limit`을 500/1000 → 5000으로 올림"뿐이라, 집테리어 쪽 API가
  큰 limit을 거부하거나(422) 그쪽 DB도 인덱스가 없어서 5초 타임아웃에
  걸리는 것으로 추정(우리가 겪었던 것과 같은 종류의 문제일 가능성 높음).
  **[완료]** 두 레이어의 프론트 fetch limit만 500으로 되돌림
  (`ZIPTERIOR_MARKER_FETCH_LIMIT = 500`, 우리 DB로 가는
  `MARKER_FETCH_LIMIT = 5000`과 분리). 로컬 빌드 확인, 서버 배포는 다음
  요청 시.
- **데스크탑 세션 확인 필요**: 집테리어의 `/api/v1/public/map/markers`가
  `limit` 파라미터를 몇까지 허용하는지, 그 이상 요청 시 422로 거부하는지
  타임아웃 나는지 확인 필요. 후자(성능 문제)라면 그쪽도 위경도 컬럼에
  인덱스가 있는지 확인해볼 만함 — 우리 쪽도 정확히 같은 문제였음
  (`apartment_complexes(latitude, longitude)` 인덱스 누락, 이 로그 위쪽
  "지도를 다중 레이어 구조로 전환" 섹션 참고).

---

## 2026-08-25 — 집테리어 marker limit 422 원인 확정 (인덱스 문제 아님, le=3000 검증)

### 진행 중
- 사용자가 "500으로 또 제한 걸렸다"고 지적 — 임시로 낮춘 500이 아니라 진짜
  원인을 찾기로 함. 집테리어가 이 세션과 같은 서버에 있어서 소스코드와
  DB를 직접(읽기 전용, sudo) 확인할 수 있었음.
- **[확인 완료] 원인**: 인덱스/성능 문제가 전혀 아니었음.
  - `apartment_complexes`: `idx_complex_coordinates btree (latitude,
    longitude)` 이미 있음.
  - `companies`: `latitude numeric(10,7)`, `longitude numeric(10,7)`
    컬럼 있고 `idx_companies_map btree (latitude, longitude) WHERE
    is_visible_on_map = true` 인덱스도 있음. `marker_type=company` 쿼리
    (`/srv/zipterior/backend/app/modules/public_map/repository.py`의
    `list_markers`)도 실제로 완전히 구현되어 있음 — `status='active'
    AND is_visible_on_map=TRUE AND deleted_at IS NULL` 조건, bbox 필터,
    멤버십 우선순위 정렬까지 갖춘 정상 기능. **이전에 "가정, 미확인
    계약"이라고 남겼던 부분은 이제 확정 — 실제로 지원됨.**
  - **진짜 원인**: `limit` 쿼리 파라미터가 FastAPI에서 `le=3000`으로
    검증되고 있어서, 5000을 보내면 그냥 422로 거부됨(집테리어에 직접
    `curl -sv`로 호출해서 확인, 응답:
    `Input should be less than or equal to 3000`).
- **[완료]** `ZIPTERIOR_MARKER_FETCH_LIMIT`를 500 -> 3000(집테리어의
  실제 상한)으로 상향. `apps/api/app/modules/integrations/router.py`의
  두 엔드포인트(`map-markers`, `company-markers`) `limit` 검증도
  `le=10000` -> `le=3000`으로 맞춤(우리 쪽에서 더 큰 값을 받아봐야
  집테리어가 어차피 거부하므로 의미 없음). 우리 DB로 직접 가는
  `MARKER_FETCH_LIMIT = 5000`은 그대로 유지(우리 인덱스는 충분히
  감당 가능하다고 판단).
- 로컬 빌드 확인(`npm run build`, `ast.parse`).

### 완료 후
- **사용자 피드백**: 3000까지는 뜨지만 여전히 버벅거림. 반면 집테리어
  자체 지도는 5000개 넘어도 안 버벅임 — 다음 섹션에서 원인/해결.

---

## 2026-08-25 — 집테리어의 서버 사이드 클러스터링(viewport) 엔드포인트로 전환

### 시작 전
- "집테리어는 5000개 넘어도 안 버벅이는데 우리는 3000개로 버벅인다"는
  지적에 따라, 우리 방식(원본 마커를 최대 3000개까지 그대로 브라우저에
  보내서 카카오 공식 `MarkerClusterer`로 클라이언트에서 뭉치기)과 집테리어
  방식을 직접 코드로 비교.
- **[확인 완료]** 집테리어는 `/api/v1/public/map/markers`(원본) 말고
  **`/api/v1/public/map/viewport`**라는 별도 엔드포인트를 씀 — 줌 레벨에
  맞는 격자 크기(`cluster_cell_degrees`)로 **서버에서 미리 SQL GROUP BY**
  해서, 화면에 그릴 클러스터/마커 소수만 내려줌. 실측:
  `zoom=8`(넓은 화면) 요청 시 원본 1,261건이 **클러스터 4개**로 줄어서
  응답(`source_marker_count: 1261, total_items: 4`). 프론트(`map-provider.js`)
  클라이언트 클러스터링도 카카오 공식 라이브러리가 아니라 격자 버킷팅만
  하는 가벼운 자체 구현.
- 이게 "5000개 넘어도 안 버벅이는" 진짜 이유 — 브라우저가 다루는 마커 수
  자체가 원본이 아니라 클러스터 개수(보통 수십 개 이내)라서.

### 진행 중
- **[완료] 백엔드**: `apps/api/app/modules/integrations/`에
  `ZipteriorViewportItem`/`ZipteriorViewportOut` 스키마,
  `zipterior_client.get_interior_viewport()`,
  `GET /integrations/zipterior/viewport` 엔드포인트 추가 — 집테리어의
  `/api/v1/public/map/viewport`를 그대로 프록시(`marker_type`, `zoom`,
  bbox, `has_portfolio`, `source_limit` 전달). 응답에 `source_marker_count`
  (원본 총합, 카운트 배지용)도 포함.
- **[완료] 프론트**: `apps/web/src/app/map/page.tsx`
  - `interiorPortfolio`/`company_interior` 레이어를 이 새 엔드포인트로
    전환. 카카오 `MarkerClusterer`를 이 두 레이어에서 뗌(서버가 이미
    뭉쳐서 줘서 필요 없음) — `CLUSTERED_LAYERS`엔 이제 `listings`만 남음
    (우리 매물 데이터는 아직 서버 클러스터링이 없어서 클라이언트
    클러스터러 유지).
  - 공용 렌더 함수(`renderViewportItems`) 추가 — 클러스터 항목은 숫자
    뱃지가 있는 원(크기가 개수에 따라 살짝 커짐), 개별 항목은 기존처럼
    작은 점. 클러스터 클릭 시 그 위치로 확대(레벨 2단계 축소).
  - 레이어 카운트 배지는 이제 `source_marker_count`(원본 총합)를 보여줌 —
    화면에 그려지는 클러스터/마커 개수(`items.length`, 보통 수십 개)가
    아니라 실제 데이터 규모를 보여주는 게 맞다고 판단.
  - `ZIPTERIOR_MARKER_FETCH_LIMIT` -> `ZIPTERIOR_SOURCE_LIMIT`(3000)로
    이름 변경 — 이제 "화면에 그릴 개수"가 아니라 "서버가 클러스터링 전에
    모을 원본 개수 상한"이라는 의미가 달라져서 이름도 맞춤.
  - 더 이상 안 쓰는 `/integrations/zipterior/map-markers`,
    `/integrations/zipterior/company-markers` 호출은 프론트에서 제거
    (백엔드 엔드포인트 자체는 남겨둠, 필요하면 다른 곳에서 쓸 수 있음).
- 로컬 `npm run build`, `ast.parse` 확인.

### 남은 것 (참고용, 지금 당장 할 필요는 없음)
- `listings`(매물) 레이어는 아직 우리 쪽에 이런 서버 클러스터링이 없음.
  지금은 실제 등록된 매물이 적어서 클라이언트 클러스터러로 충분하지만,
  나중에 매물이 많아지면 `apps/api/app/modules/listings`에도 집테리어의
  `cluster_grid_summary`/`viewport`와 같은 방식(줌 레벨→격자 크기 매핑,
  SQL GROUP BY로 집계)을 만드는 걸 고려할 만함.

### 완료 후
- **[완료] 서버 배포 및 확인** — 사용자 확인: 확대/축소 딜레이 없이 부드러움.
  다만 카운트 배지가 3000에 묶여있다는 지적 — `source_limit=3000`으로
  보내고 있었기 때문. 클러스터링이 서버에서 일어나므로 이 값을 올려도
  브라우저 성능엔 영향이 없고, 집테리어 라우터의 실제 상한이 `le=5000`인
  걸 이미 확인해뒀어서 **[완료]** `ZIPTERIOR_SOURCE_LIMIT`를 3000 → 5000
  으로 상향. 로컬 빌드 확인, 서버 배포는 다음 요청 시.
