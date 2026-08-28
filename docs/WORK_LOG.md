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

---

## 2026-08-26 — 🚨 서버 디스크 100% 꽉 참, Postgres 연결 끊김 (긴급, 진행 중)

### 시작 전
- 사용자가 "지도 마커 또 안 나온다"고 보고. 진단해보니 우리 코드 문제가
  아니라 **서버 자체가 위험한 상태**:
  - `df -h /` → `/dev/vda2  100G  100G  20K  100%` — 디스크 완전히 꽉 참.
  - `free -h` → 메모리 3.8Gi 중 3.0Gi 사용(여유 153Mi), **스왑도 3.8Gi
    중 거의 다 참(여유 52Ki)**.
  - `zippalgo360-api` 로그: `psycopg.OperationalError: connection failed:
    ... server closed the connection unexpectedly` — Postgres가 디스크가
    꽉 차서 WAL을 못 쓰고 연결을 끊은 것으로 추정.
  - 매물/부동산 업체 마커(우리 DB 직접 조회)는 그래서 500, 집테리어
    프록시(viewport)는 DB를 안 타서 200은 뜨지만 그 시점엔 `available:
    false`로 응답(서버 전체가 자원 압박 상태라 집테리어 응답도 불안정
    했을 가능성).
  - `postgresql.service` 자체는 `active (exited)`로 떠 있지만, 이건
    Debian/Ubuntu에서 메타 유닛이라 실제 클러스터 프로세스(`postgresql@
    <version>-main.service`) 상태는 별도 확인 필요 — 아직 확인 못함.
- **원인 파악 전이라 아직 아무것도 삭제하지 않음** — `/srv/zipterior/
  backups`, `/srv/zipterior/releases`, `/tmp`에 과거 조사 때 본 버전별
  백업 tarball이 많이 쌓여 있었던 게 유력한 원인 후보(집테리어 쪽 자산이라
  함부로 지우면 안 됨, 확인 후 사용자 승인받고 처리).

### 진행 중
- **[확인 완료] 디스크 구조**: `vda`(100G, `vda2` 파티션이 `/` 전체를 이미 다
  씀 — 확장 여유 없음) + **`vdb`(100G, 완전히 미사용/미포맷)** 두 개의
  가상 디스크가 있음(`lsblk`로 확인). `vdb`를 활용하기로 결정 — LVM으로
  진짜 하나의 200G로 합치는 건 이미 운영 중인 루트 파티션(일반 파티션,
  LVM 아님)이라 지금 상황에서 하기엔 위험도가 너무 높아 보류, 대신 두
  디스크를 나눠 쓰는 방식으로 진행.
- **[확인 완료] 공간을 다 먹은 원인**: `/var/www/zipterior/uploads` 폴더가
  **75G**(디스크의 3/4) — 집테리어 포트폴리오 업로드 이미지. 이건 실제
  사업 데이터라 삭제 대상이 아님. `/srv/zipterior/backups`(5.5G),
  `/tmp`의 옛날 릴리스 tarball들(총 100MB 안팎)은 있지만 이미지에 비하면
  미미함 — 지우는 걸로는 해결 안 되고, 저장 공간을 늘리는 게 맞는 방향.
- **[진행 중] 해결 계획**: `vdb`를 ext4로 포맷·마운트하고,
  `/var/www/zipterior/uploads`를 그쪽으로 이동 후 원래 경로에
  bind mount(앱/nginx 코드 변경 전혀 불필요, 경로는 그대로 유지).
  2단계로 나눠서 진행:
  - 1단계(무중단): vdb 포맷/마운트/fstab 등록 + `rsync`로 1차 복사(원본
    보존, 75G라 시간 걸림).
  - 2단계(집테리어 API 짧게 정지, ~1분): 마지막 델타만 재동기화 →
    원본 폴더를 `uploads.bak_pre_migration_<날짜>`로 이름만 바꿔 보존
    (삭제 아님) → 새 디스크 내용을 원래 경로에 bind mount → fstab 등록 →
    집테리어 API 재시작 → Postgres/우리 API·웹 재시작.
  - 원본 백업(`uploads.bak_pre_migration_*`)은 며칠 안정성 확인 후
    사용자 판단하에 삭제 — 이 세션에서 먼저 지우지 않음.
- 1단계 스크립트 사용자에게 전달함, 실행 결과 대기 중.

### 실행 중 계획 정정 — "며칠 보관 후 삭제"는 불가능했음
- 1단계(`vdb` 포맷/마운트)부터 막힘: `mkdir /mnt/vdb_data`조차
  "No space left on device" — `/`(vda2) 여유 공간이 20K 수준이라 새
  디렉토리 하나 만들 공간도 없었음. `/tmp`의 오래된 릴리스 tarball
  (~150MB, `/srv/zipterior/releases`에 버전별로 이미 보관된 것들의
  임시 복사본으로 판단, 사용자 확인 후 삭제)을 지워서 43M 확보 후 진행.
- **원래 계획("원본을 이름만 바꿔서 며칠 보관")은 의미가 없다는 걸 실행
  중 깨달음** — 같은 디스크(vda) 안에서 `mv`로 이름만 바꾸는 건 용량을
  전혀 안 비움(데이터가 물리적으로 그대로 vda에 남아있음). 지금 위기의
  본질이 "vda 공간 부족"이라, 실제로 vda에서 지워야만 해결됨. 계획을
  수정: 복사본 검증(파일 개수·용량 일치, 샘플 이미지 실제 HTTP 200
  서빙 확인) 후 **원본을 실제로 삭제**하는 것으로 진행(대신 검증을
  충분히 거친 뒤에만 삭제하도록 안전장치를 강화함).
- 사용자가 밤새 자동등록(포트폴리오 일괄등록) 작업이 있었다며 정리부터
  하려 했으나, 확인 결과 디스크 문제로 이미 그 작업 자체가 멈춰있는
  상태였음(worker가 DB 연결 실패로 폴링마다 에러, 실행 중인 프로세스도
  없음) — 그래서 마이그레이션을 먼저 진행해도 안전하다고 판단.

### 진행 중 (실행 완료)
- **[완료] 1단계**: `vdb` ext4 포맷 → `/mnt/vdb_data` 마운트(`/etc/fstab`
  등록) → `rsync`로 `/var/www/zipterior/uploads/`(75G, 1,234,771개 파일)
  전량 복사, 원본 무변경 확인.
- **[완료] 2단계**: `zipterior-api` 정지 → 델타 재동기화 → 원본을
  `uploads.old_pending_delete`로 개명 → `/var/www/zipterior/uploads`를
  새로 만들고 `/mnt/vdb_data/zipterior-uploads`를 bind mount(`/etc/fstab`
  등록) → `zipterior-api` 재시작.
- **[완료] 검증**: 새 경로와 원본의 파일 개수(1,234,771 = 1,234,771)·
  용량(75G = 75G) 완전 일치 확인. 샘플 이미지 1개를 실제 URL로 curl —
  `HTTP 200`, 정상 크기(1.4MB) 확인.
- **[완료] 원본 삭제** — 검증 통과 후 `uploads.old_pending_delete`(vda
  위 실제 75G) 삭제 → **`df -h /` : 100% → 25%(76G 여유)** 로 확보됨.
- **[완료] 서비스 정상화**: `postgresql` 재시작 → recovery 정상 완료,
  `SELECT 1` 성공. `zippalgo360-api`/`zippalgo360-web`/`zipterior-api`
  전부 재시작, 전부 `active` + 헬스체크 200. `zippalgo360.com`,
  `zippalgo360.com/api/listings/map/markers`,
  `zippalgo360.com/api/companies/map/markers`,
  `zipterior.zippalgo360.com` 전부 200 최종 확인.

### 완료 후 — 서버 최종 상태 요약
- 디스크: `vda`(100G, `/`) 25% 사용(76G 여유). `vdb`(100G)는 ext4로
  포맷되어 `/mnt/vdb_data`에 마운트됨, 재부팅해도 유지(`/etc/fstab`
  등록됨).
- `/var/www/zipterior/uploads`는 이제 `/mnt/vdb_data/zipterior-uploads`로
  bind mount된 상태(코드/nginx 설정 변경 없이 경로는 그대로 유지, 물리적
  위치만 다른 디스크). 이것도 `/etc/fstab`에 등록되어 재부팅 후에도 유지됨.
- 앞으로 새로 업로드되는 포트폴리오 이미지는 자동으로 `vdb`(19G 남음,
  이 작업 시점 기준)에 쌓임 — vda는 더 이상 이미지로 안 채워짐.
- **후속 조치 필요(이 세션 범위 아님, 데스크탑 세션과 조율)**: 지금은
  이미지가 vdb 하나에만 있음(원본 vda 복사본은 검증 후 삭제함) — RAID나
  스냅샷 같은 이중화가 없다는 뜻이라, vdb 자체 장애 시 이미지 유실
  위험이 있음. 정기 백업(예: 외부 스토리지로 주기적 동기화)을 데스크탑
  세션과 상의해서 마련하는 걸 권장.
- `/tmp`의 오래된 릴리스 tarball(~150MB)도 이번에 삭제됨(사용자 확인
  후 진행) — `/srv/zipterior/releases`의 버전별 보관본과는 별개로, 그냥
  임시 작업 복사본이었던 것으로 보임.

---

## 2026-08-26 — "인테리어 시공사례" 카운트 배지가 잘못된 숫자를 보여주던 버그 수정

### 시작 전
- 사용자 지적: 우리 지도는 "인테리어 시공사례" 3920, 집테리어 자체 지도는
  같은 항목이 8000+로 다름 — 숫자가 맞아야 하는데 안 맞음.

### 진행 중
- **[원인 확인]** 버그가 아니라 **잘못된 지표를 보여주고 있었음**.
  `interiorPortfolio` 레이어 배지에 `data.source_marker_count`(뷰포트 안
  **단지 개수**)를 쓰고 있었는데, 레이어 이름은 "인테리어 **시공사례**"
  (포트폴리오 개수). 한 단지에 여러 업체가 각각 시공사례를 등록할 수
  있어서 시공사례 수가 항상 단지 수보다 많음 — 실제로 이전에 받아본
  샘플 응답에서 한 클러스터가 "단지 548개 / 시공사례 1146건"으로 거의
  정확히 2배였고, 3920 × 2 ≈ 8000으로 배수도 맞음.
- **[완료]** `apps/web/src/app/map/page.tsx`의 `loadInteriorMarkers`에서
  배지 숫자를 `data.source_marker_count` 대신
  `data.items.reduce((sum, item) => sum + item.portfolio_count, 0)`
  (뷰포트 안 시공사례 합계)로 변경. `company_interior`("인테리어
  업체" 배지)는 라벨이 업체 개수라 `source_marker_count` 그대로 맞음 —
  변경 안 함.
- 로컬 빌드 확인.

### 완료 후
- **[완료]** 서버 배포 및 사용자 확인 — "8124개 이제 맞게 나오네". 집테리어
  자체 지도의 8000+와 일치하는 수준으로 정상화됨.

---

## 2026-08-26 — 로그인 통합(SSO) 1단계: 집테리어 측 `/sso/exchange` 엔드포인트 구현

### 시작 전
- 사용자 지시: 백업은 제일 마지막, 1) 집테리어 쪽 SSO exchange 엔드포인트,
  2) 인테리어 업체 마커 데이터 검증 순으로 진행. 1번은 "지금 이 세션에서
  SSH로 직접 구현"으로 진행하기로 결정(데스크탑 세션에 넘기지 않음).
- 설계는 이미 이 문서 앞부분 "로그인 통합 설계 제안" 섹션에 기록되어
  있음 — 1회용 opaque 코드를 iframe URL 쿼리로 넘기고, 서버 간
  `SSO_SHARED_SECRET`(양쪽 `.env`에 동일 값, `openssl rand -hex 32`로
  생성, 값 자체는 이 로그에도 절대 기록 안 함)으로 서버 대 서버 검증하는
  방식.
- 집팔고360 쪽(이 저장소)은 이미 구현되어 있었음: `POST
  /auth/sso/issue-code`(로그인 사용자용, 1회용 코드 발급), `POST
  /auth/sso/verify`(서버 간, `Authorization: Bearer <SSO_SHARED_SECRET>`).
  이번 작업은 집테리어(`/srv/zipterior/backend`, 이 세션이 git으로
  추적하지 않는 별도 코드베이스) 쪽에서 그 코드를 받아 실제 로그인
  세션(access/refresh token)으로 교환해주는 `/sso/exchange`를 만드는
  것.

### 진행 중
- 집테리어 auth 모듈(`router.py`/`service.py`/`repository.py`/
  `schemas.py`) 및 `core/config.py`/`core/security.py`를 SSH로 읽어
  기존 로그인 플로우(토큰 발급 방식, DB 세션 처리, 비밀번호 해시 등)를
  먼저 파악. httpx/requests가 설치되어 있지 않아(기존 `naver_complex_client.py`
  등도 stdlib `urllib`만 사용) 같은 관례를 따르기로 함.
- **[완료]** 아래 5개 파일을 `.bak_<timestamp>` 백업 후 anchor 기반
  Python 문자열 치환(`content.replace(old, new, 1)` + `assert count==1`)
  방식으로 패치/생성. 전부 `py_compile` 통과 확인:
  - `app/core/config.py` — `sso_shared_secret: str | None = None`,
    `zippalgo360_api_base_url: str = "https://zippalgo360.com"` 필드 추가.
  - `app/modules/auth/sso_bridge.py` (신규) — `verify_code_with_zippalgo360(code)`,
    stdlib `urllib.request`로 집팔고360의 `/api/auth/sso/verify`를
    5초 타임아웃으로 호출, 실패 시 예외 없이 `None` 반환(fail-soft).
  - `app/modules/auth/schemas.py` — `SsoExchangeRequest(code: str)` 추가.
  - `app/modules/auth/service.py` — `sso_exchange(session, code, ip_address,
    user_agent)` 추가. v1 범위: 집팔고360 **customer 역할만** 자동 연동
    (company 계정은 사업자등록번호 등 온보딩 정책이 따로 필요해 범위
    밖 — 그냥 폴백). 이메일 기준으로 기존 계정 조회, 없으면 랜덤 비밀번호로
    신규 생성 후 기존 로그인과 동일하게 access/refresh 토큰 발급,
    `record_login_attempt`에 `metadata={"source":"zippalgo360_sso"}`로
    출처 기록. `AuthService.sso_exchange = staticmethod(sso_exchange)`로
    등록.
  - `app/modules/auth/router.py` — `POST /sso/exchange`(전체 경로
    `/api/v1/auth/sso/exchange`) 추가, 실패 시 `400 {"detail":"SSO
    로그인을 처리할 수 없습니다."}`, 성공 시 기존 로그인과 동일한
    `TokenResponse` 반환.
- **[완료]** `.env`에 `SSO_SHARED_SECRET`(집팔고360 쪽과 동일 값 복사)과
  `ZIPPALGO360_API_BASE_URL=https://zippalgo360.com` 추가.
- **[완료]** `zipterior-api` systemd 재시작 → `active`, 헬스체크
  200. 잘못된 코드로 `/sso/exchange` 호출 시 `400`(예상대로), 기존
  `/auth/login`은 잘못된 자격증명에 그대로 `401`(기존 로그인 영향
  없음 확인).
- **[완료] 시크릿 일치 검증**: 첫 복사 스크립트 출력이 꼬여서 나와
  실제로 복사됐는지 불확실했음 → 값 자체는 출력하지 않고 양쪽 `.env`의
  `SSO_SHARED_SECRET` 값을 각각 `sha256sum`, 길이(64자)로 비교하는
  스크립트를 별도로 실행 — **해시/길이 완전 일치 확인**(`307ed1c91ac1...`,
  64자). 두 서버가 같은 비밀키를 쓰고 있음이 확정됨.

### 진행 중 (프론트엔드 연동)
- 집테리어 프론트는 SPA 프레임워크 없이 정적 HTML + `js/api-client.js`의
  전역 `window.ZipteriorAPI`(로그인/토큰 저장 공용 모듈) 구조. 이미
  `ZipteriorAPI.save(data)`가 `{access_token, refresh_token, expires_in,
  user}` 형식을 그대로 localStorage에 저장하는 공용 함수로 존재했고
  (SNS 로그인 콜백 `oauth-callback.html`이 동일 패턴을 이미 사용 중),
  우리 `/sso/exchange` 응답 형식과 정확히 일치해서 새 저장 로직을 따로
  만들 필요 없이 그대로 재사용함.
- 집팔고360 쪽 `apps/web/src/app/jipterior/page.tsx`가 iframe src를
  `https://zipterior.zippalgo360.com/?sso=<code>`(루트 경로)로 설정하는
  것을 재확인 → 패치 대상은 그 루트를 서빙하는 `/var/www/zipterior/index.html`.
- **[완료]** `index.html`을 `.bak_20260826_094446_before_sso_frontend`로
  백업 후, `js/api-client.js` 로드 직후(다른 스크립트들이 초기화되기
  전)에 인라인 스크립트를 삽입(anchor 기반 Python 치환, 1회 매치 확인):
  `?sso=` 파라미터가 있으면 즉시 `history.replaceState`로 URL에서
  제거 → `ZipteriorAPI.request('/auth/sso/exchange', ...)` 호출 →
  성공하면 `ZipteriorAPI.save(data)`로 토큰 저장 후 `location.reload()`
  (데스크톱/모바일 스크립트 모두가 이미 로그인된 상태로 일관되게
  다시 그려지도록 전체 새로고침 방식 선택 — app.js는 auth-changed
  이벤트를 안 듣고 mobile-app.js만 들어서, 부분 갱신 대신 리로드가
  더 안전하다고 판단함). 코드가 없거나 실패하면 아무 것도 안 하고
  조용히 넘어감(집테리어 자체 로그인 화면/흐름 전혀 영향 없음).
- **[완료] 검증**: `curl https://zipterior.zippalgo360.com/`에 삽입한
  스크립트가 실제로 포함되어 서빙됨 확인. `?sso=fake-test-code`로
  접속해도 페이지는 정상 `HTTP 200`(가짜 코드라 exchange만 조용히
  실패하고 페이지 자체는 깨지지 않음 확인).

### 남은 작업 (다음 세션 이어서 진행)
- **[완료] 실사용 브라우저 end-to-end 테스트** — 사용자가 직접
  `zippalgo360.com` 로그인 후 `/zipterior`(옛 `/jipterior`, 라우트명은
  이후 별도 세션에서 zip으로 통일됨) 메뉴 진입 → "로그인 잘 되네"로
  확인. **SSO 통합(사용자 지시 "1번") 전체 완료.**
- 다음: 사용자 지시대로 "2번"(인테리어 업체 마커 데이터 검증) 착수 →
  아래 섹션 참고. 그 다음은 마지막으로 백업/이중화.

---

## 2026-08-26 — "2번" 인테리어 업체(company_interior) 마커 검증: 근본 원인 확인, 조치는 보류

### 시작 전
- 사용자 지시 "2번": 지도의 `company_interior`("인테리어 업체") 레이어가
  실제로 정확한 데이터를 보여주는지 검증. 뷰포트 엔드포인트
  (`/integrations/zipterior/viewport?marker_type=company`) 전환 이후
  재확인이 안 된 상태였음.

### 진행 중 — 원인 진단 (SSH로 zipterior 서버 직접 확인)
- zipterior의 `/api/v1/public/map/viewport?marker_type=company`를
  서울 전역 bbox로 직접 호출 → `{"items":[],"source_marker_count":0}`
  (같은 조건 `marker_type=complex`는 정상적으로 데이터 나옴 — 즉
  company 분기만 문제).
- `app/modules/public_map/repository.py`의 `list_markers()` company
  분기 소스를 직접 읽어 원인 특정. **우리 프록시 코드/쿼리 문제가
  아니라 zipterior DB의 데이터 상태 문제**:
  - `companies` 테이블: 활성(status='active', deleted_at IS NULL)
    1,693건 중 **위도/경도가 채워진 행 0건** (주소 텍스트(`address`)는
    912건에 있음에도 지오코딩이 안 되어 있음).
  - `is_visible_on_map` 컬럼: DB 기본값은 `TRUE`인데, 활성 업체
    1,693건 중 **`TRUE`인 행 0건**. 이 컬럼은 쿼리에서 회사 마커를
    내려줄 때 하드 조건(`WHERE ... c.is_visible_on_map=TRUE ...`)이라
    위경도가 있어도 이 값이 false면 어차피 안 나옴.
  - 이 컬럼은 zipterior 코드 전반(관리자 개요, bulk_import,
    포트폴리오 좋아요/즐겨찾기/댓글/신고 리포지토리)에서 두루 게이트로
    쓰이는 진짜 살아있는 컬럼 — 죽은 코드 아님.
  - **zipterior 자체 프론트(`js/app.js:961`)도
    `fetchMarkers('company', true)`를 호출** — 즉 업체 마커는
    zipterior 자기 지도에서도 켜져 있어야 하는 라이브 기능. 지금 상태면
    zipterior 자체 지도에서도 업체 마커가 하나도 안 뜨고 있을 가능성이
    높음(집팔고360만의 문제가 아닐 수 있음 — zipterior 쪽 확인 필요).
- `company_memberships` 테이블도 0건이라 `map_priority`/프리미엄 로직도
  전부 기본값(0)으로만 동작 중.

### 판단 — 이번 세션에서 직접 고치지 않음
- `is_visible_on_map`이 전부 false인 게 **의도된 정책**(예: 업체
  사무실 위치를 지도에 개별 노출하지 않기로 한 비즈니스 결정,
  마이그레이션 중 임시 상태 등)인지 **실수/버그**인지 이 세션에서는
  판단할 근거가 없음. zipterior 프로덕션 DB에 `UPDATE
  companies SET is_visible_on_map=true ...`나 대량 지오코딩 스크립트를
  임의로 돌리는 건 리스크가 크고 이 저장소(집팔고360) 범위를 벗어남 —
  실행하지 않음.
- 사용자에게 3가지 선택지(① zipterior 쪽에 먼저 의도적인지 확인 후
  보류 ② 데이터 정리될 때까지 지도에서 `company_interior` 레이어를
  임시로 숨김 ③ 바로 SQL로 일괄 true 변경)를 물었으나 **"대기, 다음
  지시 기다려라"로 응답** — 착수 보류, 다음 세션은 이 판단을 다시
  묻지 않고 여기서부터 이어가면 됨.

### 완료 후 (1차: 원인 진단)
- 코드 변경 없음(진단만 수행). `interiorPortfolio`(집테리어 시공사례,
  `marker_type=complex&has_portfolio=true`)는 이번 조사와 무관하게
  이전과 동일하게 정상 동작 중 — 문제는 `company_interior`(업체 마커)
  레이어 한정.
- 사용자 확인: `is_visible_on_map` 전부 false인 건 **의도된 정책**
  (집테리어 자체 지도에서도 지금 업체를 노출 안 시키고 있음). "집테리어
  쪽에서 노출시키면 집팔고360에도 자연스럽게 뜨도록 해야 한다"는 요구사항
  확인 — 우리 프록시 구조(zipterior의 실시간 viewport를 그대로 반영)는
  이미 그렇게 되어 있어서 **우리 쪽 코드는 추가로 손댈 게 없음**. 남은
  일은 전부 집테리어 쪽 데이터/설정: (1) 위경도 지오코딩 (2)
  `is_visible_on_map` 노출 결정. 사용자가 순서를 "1번(지오코딩)부터
  지금 바로 진행"으로 확정, 노출 스위치는 별도로 판단하기로 함.

### 진행 — 1번: 업체 주소 지오코딩 (완료)
- zipterior 서버에 카카오 REST API 키(`KAKAO_REST_KEY`)가 `.env`에
  아예 없어서(`kakao_rest_key: str | None = None` 기본값 그대로) 기존
  `kakao_search_client.py`/`kakao_complex_client.py`(통합검색 보강,
  관리자 자동매칭용으로 이미 있던 기능)도 실제로는 계속 조용히
  비활성 상태였다는 것도 같이 확인함. 사용자 확인 후 **집팔고360의
  기존 `KAKAO_REST_API_KEY` 값을 재사용**하기로 하고 zipterior `.env`에
  `KAKAO_REST_KEY`로 복사(값은 로그에 남기지 않음, 이미 우리 쪽에서
  1건 지오코딩 성공으로 키가 유효함을 확인 후 복사).
- **[완료] 백업**: 지오코딩 전 활성 업체 전체(1,693건, id/name/address/
  latitude/longitude)를 `/srv/zipterior/backend/db_backups/
  companies_geocode_backup_20260826_105055.csv`로 스냅샷 저장.
- **[완료] 지오코딩 실행**: 주소는 있는데 위경도가 없는 활성 업체
  912건 대상, 카카오 주소검색 API(실패 시 키워드검색 API로 폴백) 호출 →
  **911건 성공, 매칭 실패 1건, 오류 0건**. 결과를 먼저 `UPDATE`문
  파일로만 생성(DB 미반영) → 좌표가 한국 영토 범위(위도 33~39.5,
  경도 124~132) 안에 있는지 전수 검증(전부 정상) → 샘플 10건 이름/
  주소/좌표 육안 대조(정상, 예: "경기도 화성시 기배로 75" →
  `37.22/126.98`) → 이상 없어서 **DB에 실제 적용**.
- **[완료] 적용 후 확인**: `SELECT count(latitude) FROM companies
  WHERE status='active'` → `1693`건 중 `911`건으로 증가(기존 0건에서).
  앱 코드는 안 건드렸으니 재시작 불필요.
- 이 시점까지는 **`is_visible_on_map`이 여전히 전부 false**라서
  화면(집테리어 자체 지도든 집팔고360 지도든)에는 아직 아무 변화 없음
  — 지오코딩은 노출과 무관한 "준비 작업"으로 의도한 대로 안전하게 끝남.

### 남은 작업
- **[완료 — 아래 "2번" 마무리 섹션에서 처리]** `is_visible_on_map`을
  언제/어떻게 켤지는 사용자가 "일괄로 켜줘"로 확정 → 911건 일괄 노출
  완료. 자세한 내용은 이 문서의 "2번" 마무리 섹션 참고.

---

## 2026-08-26 — "집팔고" 라우트 영문 표기 `jipalgo` → `zippalgo` 통일

### 시작 전
- 사용자 지시: "집팔고"의 영문 표현은 앞으로 `zippalgo`로 통일. 기존
  `apps/web/src/app/jipalgo` 라우트는 한글 발음 로마자화(`jipalgo`)를 쓰고
  있었는데, `services.ts`의 아이콘 경로는 이미 `/icons/zippalgo.png`로
  불일치가 있었음 — 이번 요청으로 라우트 쪽을 `zippalgo`에 맞춰 통일.

### 진행 중
- **[완료]** `apps/web/src/app/jipalgo` 디렉터리를 `apps/web/src/app/zippalgo`로
  `git mv`.
- **[완료]** 하위 6개 페이지(`page.tsx`, `new/`, `mine/`, `browse/`,
  `payouts/`, `listings/[id]/`)와 `lib/services.ts`(slug/href),
  `app/mypage/page.tsx`, `app/map/page.tsx`, `app/partners/page.tsx`,
  `components/home/Hero.tsx`에서 `/jipalgo` 링크·라우트 참조를 전부
  `/zippalgo`로 수정. `JipalgoPage` 컴포넌트 함수명도 `ZippalgoPage`로 변경.
- **[완료]** 저장소 전체에서 `jipalgo`(대소문자 무관) 검색 결과 0건 확인.
- **[완료]** `.next` 캐시 삭제 후 `next build` 재실행 — 컴파일/타입체크
  통과, 라우트 목록에 `/zippalgo`, `/zippalgo/browse`,
  `/zippalgo/listings/[id]`, `/zippalgo/mine`, `/zippalgo/new`,
  `/zippalgo/payouts` 정상 생성 확인.
- **[완료]** 이 규칙을 다음 세션도 지키도록 `CLAUDE.md`에 "네이밍 규칙"
  섹션 추가 — "집팔고"만 `zippalgo`로 한정, 다른 서브서비스(집사고=jipsago,
  집테리어=zipterior/jipterior, 집이사=jipisa, 집청소=jipcheongso) 표기는
  유지.

### 완료 후
- **[완료] 서버 배포**: `/srv/zippalgo360`에서 `git pull` →
  `apps/web`에서 `npm run build` → `sudo systemctl restart
  zippalgo360-web`. 빌드 성공, 라우트 목록에 `/zippalgo` 계열 정상 출력.
  배포 후 확인: `https://zippalgo360.com/jipalgo` → `404`(정상, 옛 라우트
  제거됨), `https://zippalgo360.com/zippalgo` → `200`(정상). 사용자가
  실제 메뉴 클릭으로도 재확인 예정.
- 사용자가 "집" 로마자화를 zip으로 통일하는 규칙을 재확인 후 "다
  바꿔야지 바꿀때"로 나머지 4개 라우트도 전부 바꾸라고 지시함.

---

## 2026-08-26 — 나머지 서브서비스 라우트도 `jip*` → `zip*` 전면 통일

### 시작 전
- 사용자 지시: `zippalgo`만 바꾸지 말고 `jipsago`, `jipterior`, `jipisa`,
  `jipcheongso`도 전부 같은 규칙(zip으로 로마자화)으로 통일.

### 진행 중
- **[완료]** `git mv`로 라우트 폴더 4개 이동: `jipsago`→`zipsago`,
  `jipterior`→`zipterior`, `jipisa`→`zipisa`, `jipcheongso`→`zipcheongso`.
- **[완료]** anchor 기반 Python 치환으로 관련 파일 전부 수정:
  `lib/services.ts`(slug/href 8곳), `app/partners/page.tsx`,
  `app/mypage/page.tsx`, `app/zippalgo/listings/[id]/page.tsx`,
  `app/zipsago/{page,new,mine}/page.tsx`(내부 상호 링크 포함),
  컴포넌트 함수명(`JipsagoPage`→`ZipsagoPage`, `JipisaPage`→`ZipisaPage`,
  `JipcheongsoPage`→`ZipcheongsoPage`, `JipteriorEmbedPage`→
  `ZipteriorEmbedPage`).
- **[완료]** 저장소 전체에서 `jipalgo|jipsago|jipterior|jipisa|jipcheongso`
  검색 → `docs/WORK_LOG.md`, `CLAUDE.md`(과거 기록/네이밍 규칙 설명문)
  외에는 0건 확인.
- 주의: `zipterior` 라우트(`app/zipterior/page.tsx`, 옛 `jipterior`)는
  이 세션에서 구현한 SSO iframe 임베드 페이지 그 자체 — 경로만 바뀌었고
  로직은 그대로임(SSO 코드 발급 → iframe src에 `?sso=` 붙이는 로직은
  이 문서 위쪽 SSO 섹션 참고). 서버(`/srv/zipterior`)에 떠 있는 **외부**
  집테리어 백엔드/도메인(`zipterior.zippalgo360.com` 등)은 이 저장소가
  관리하는 게 아니라 별도 코드베이스라 이번 변경과 무관 — 애초에 이미
  `zip` 표기를 쓰고 있어서 그대로 규칙과 일치함.
- **[완료]** `CLAUDE.md` 네이밍 규칙 섹션을 "집팔고만 zippalgo"에서
  "집으로 시작하는 모든 서브서비스는 zip으로 로마자화"로 갱신.
- **[완료]** `.next` 캐시 삭제 후 `next build` 재실행 — 컴파일/타입체크
  통과, 라우트 목록에 `/zippalgo`, `/zipsago`, `/zipterior`, `/zipisa`,
  `/zipcheongso` 및 하위 라우트 전부 정상 생성 확인.

### 완료 후
- **[완료] 서버 배포**: `git pull` → `npm run build` → `systemctl
  restart zippalgo360-web` 사용자가 실행, 빌드 성공(라우트 목록에
  `/zipsago`, `/zipterior`, `/zipisa`, `/zipcheongso` 전부 출력).
  배포 후 확인: 옛 라우트(`/jipsago`, `/jipterior`, `/jipisa`,
  `/jipcheongso`) 전부 `404`, 새 라우트(`/zipsago`, `/zipterior`,
  `/zipisa`, `/zipcheongso`) 전부 `200` — 정상. 이걸로 "집" 계열
  서브서비스 5개(zippalgo, zipsago, zipterior, zipisa, zipcheongso)
  전부 `zip` 로마자화 규칙으로 라이브까지 통일 완료.

---

## 2026-08-26 — "2번" 마무리: 매칭 실패 원인 확인, 관리자 "좌표없음" 배지 추가, 업체 지도 노출 일괄 켜기 + zippalgo360-api 다운타임 발견/복구

### 시작 전
- 사용자 확인: `is_visible_on_map` 전부 false인 게 zipterior의 의도된
  정책(현재 업체 미노출)이었고, "집테리어 쪽에서 노출시키면 집팔고360
  지도에도 자연스럽게 뜨도록 해야 한다"는 요구사항 재확인. 지오코딩은
  이미 완료된 상태(911/912건 성공).
- 사용자 지시 2가지: (1) 매칭 실패 1건이 무엇인지 찾고, 관리자 화면에
  "지도 미노출" 표시가 있는지 확인 후 없으면 추가할 것 (2) 지오코딩된
  업체 노출을 **일괄로** 켤 것.

### 진행 중
- **[완료] 매칭 실패 원인 확인**: 실패 업체는 id=1450 "선퍼니처(부평점)",
  주소 "인천광역시 부평구 산청로25번길 4 (산곡동)". 이 주소를 카카오
  주소검색/키워드검색 API에 원문·괄호제거 등 여러 형태로 재호출해봐도
  전부 0건 — 카카오 자체 DB에 이 도로명이 없는 것으로 보임(주소 오기재
  가능성). 코드/로직 문제 아님, 개별 주소 데이터 이슈로 확인.
- **[완료] 관리자 화면 좌표 표시 유무 확인**: 업체 목록(`admin-api.js`
  `renderCompanies`, `admin-dashboard.html`의 `companyManageView`)에는
  좌표/지도노출 관련 표시가 전혀 없었음(지역·연락처·등급·시공사례·상태만
  표시). API 응답(`AdminCompanyItem`)에도 좌표 필드 자체가 없었음
  (상세보기 모달 응답인 `AdminCompanyDetailResponse`에만 존재).
  **부수 발견**: `companyMapSettingView`("업체보기 설정" — 등급별
  지도 노출 온오프 화면, HTML상 프리미엄1/프리미엄2/일반 체크박스와
  "설정 저장" 버튼이 이미 있음)이 **완전히 미완성 상태**임을 확인 —
  `admin-api.js` 전체에서 `saveCompanyMapSetting`/`companyMapSetting`/
  `company-map-tier` 문자열이 단 한 곳도 없어서, 저장 버튼에 연결된
  JS 핸들러 자체가 없음(눌러도 아무 일도 안 일어남). 재사용할 기존
  로직이 없다는 뜻이라 새로 구현하기로 함.
- **[완료] "좌표없음" 배지 추가** — 3개 파일 수정(`.bak_<timestamp>`
  백업 후 anchor 기반 치환, `py_compile` 통과, `zipterior-api` 재시작
  확인):
  - `app/modules/admin/overview_schemas.py` — `AdminCompanyItem`에
    `has_map_coordinates: bool = True` 추가.
  - `app/modules/admin/overview_repository.py` — `list_companies` SQL에
    `(c.latitude IS NOT NULL AND c.longitude IS NOT NULL) AS
    has_map_coordinates` 컬럼 추가.
  - `js/admin-api.js` `renderCompanies` — 지역 칸 아래에
    `has_map_coordinates===false`일 때만 "좌표없음" 경고 배지 표시
    (툴팁: "주소를 좌표로 변환하지 못해 지도에 노출되지 않습니다").
  - 앞으로 지오코딩 실패 업체(예: id=1450)는 관리자가 업체 목록만 봐도
    바로 찾을 수 있음.
- **[완료] 업체 지도 노출 일괄 켜기**: 변경 전 스냅샷을
  `/srv/zipterior/backend/db_backups/
  companies_visibility_backup_20260826_120214.csv`로 백업 후,
  `UPDATE companies SET is_visible_on_map=true WHERE status='active'
  AND deleted_at IS NULL AND latitude IS NOT NULL AND longitude IS NOT
  NULL AND is_visible_on_map=false` 실행 → **911건 적용**(지오코딩된
  업체 전부). `is_visible_on_map`이 여전히 false인 나머지 782건은
  애초에 좌표가 없는 업체(주소 자체가 없거나 위 1450번 케이스)라 의도한
  대로 제외됨.
- **[완료] 실제 노출 확인**: zipterior 자체 `/api/v1/public/map/viewport
  ?marker_type=company`(서울 전역)에서 클러스터 48개/123개 업체 등 실제
  데이터가 나오기 시작함을 확인.

### 부수 발견 및 즉시 대응 — zippalgo360-api 2시간 다운타임
- 집팔고360 쪽에서도 반영되는지 확인하려고
  `https://zippalgo360.com/api/integrations/zipterior/viewport`를
  호출했더니 **502 Bad Gateway**. `systemctl status zippalgo360-api`
  확인 결과, **11:44:47에 정상 종료(SIGTERM, graceful shutdown) 후
  그대로 꺼져 있었음** — 크래시가 아니라 뭔가(다른 세션의 작업 등
  원인 미상, 이 세션에서 zippalgo360-api를 건드린 적 없음)에 의해
  멈춘 뒤 재시작이 안 된 상태로 약 **2시간** 방치되어 있었던 것.
  발견 즉시 `sudo systemctl start zippalgo360-api` 실행 → `active`,
  헬스체크 `200`으로 즉시 복구.
- **[완료] 최종 검증**: 복구 후 `https://zippalgo360.com/api/
  integrations/zipterior/viewport?marker_type=company&...`가 정상
  응답하며 실제 업체 클러스터 데이터를 반환함을 확인 — **집팔고360
  지도의 `company_interior` 레이어가 코드 수정 없이 zipterior의 변경을
  그대로 반영**한다는 애초 설계가 실증됨.
- **[후속 조치 필요, 이 세션 범위 아님]** zippalgo360-api가 왜 멈췄는지
  원인 조사가 안 된 채로 남아 있음. 다른 세션(데스크탑 등)이 배포/재시작
  작업을 하다 마무리를 안 했을 가능성이 있어 보이므로, 다음 세션 시작
  시 다른 세션과 조율 필요. 또한 이런 다운타임을 빨리 알아챌 수 있는
  모니터링/알림이 전혀 없다는 것도 확인됨 — 우연히 이번 검증 과정에서
  502를 마주쳐서 발견한 것.

### 완료 후 — "인테리어 업체 마커 검증"(사용자 지시 "2번") 전체 완료
- 원인 진단 → 지오코딩(911/912) → 관리자 배지 추가 → 노출 일괄 켜기 →
  집테리어/집팔고360 양쪽 실데이터 노출 확인까지 전부 완료.
- 매칭 실패 1건(id=1450)은 관리자가 업체 목록에서 "좌표없음" 배지로
  바로 찾아 주소를 직접 수정하면 됨(이 세션에서 임의로 주소를 추측해
  고치지는 않음).
- 사용자 지시 순서상 마지막 항목인 **백업/이중화**만 남음(사용자가
  "이중화는 맨 마지막에" 재확인, 오늘은 여기서 마무리).

---

## 2026-08-26 — 메인 헤더 상단 메뉴에 "지도" 추가

### 시작 전
- 사용자 지시: 집팔고360 메인화면 상단 메뉴 첫 번째에 "지도" 추가,
  클릭 시 `zippalgo360.com/map`으로 연결.

### 진행 중
- `apps/web/src/components/layout/Header.tsx` 확인 — 데스크톱/모바일
  네비게이션 둘 다 `SERVICES` 배열(홈 화면 서비스 카드에도 재사용됨)을
  매핑해서 렌더링 중. "지도"를 `SERVICES`에 넣으면 홈 화면 서비스
  카드로도 노출되어 버려서, 대신 `SERVICES.map()` **바로 앞**에 `/map`
  링크를 데스크톱 nav·모바일 nav 양쪽에 직접 추가(맨 처음 항목이 되도록).
- **[완료]** 로컬 `next build` 성공, 라우트 목록에 `/map` 정상 포함
  확인.

### 완료 후
- **[완료] 서버 배포**: `git pull` → `npm run build` → `systemctl
  restart zippalgo360-web` 사용자가 실행, 빌드 성공. 배포 후 확인:
  `https://zippalgo360.com/map` → `200`, 메인 페이지 HTML에 "지도"
  텍스트 포함 확인 — 정상 반영됨.

---

## 2026-08-26 — map "인테리어 시공사례" 레이어를 집테리어 지도와 동일하게 구현

### 시작 전
- 사용자 지시: map에서 "인테리어 시공사례" 선택 시 마커 디자인, 마커
  클릭 시 뜨는 부챗살 마커, 마커 클릭 시 단지 기본정보+포트폴리오
  상세정보 노출까지 집테리어 자체 지도화면과 "100% 동일하게" 구현.
- 조사 결과 이 기능이 방별 사진 갤러리, 라이트박스, 즉석 채팅상담,
  즐겨찾기, 분석 트래킹까지 엮인 큰 시스템임을 확인 → 사용자에게 범위
  확인 후 **핵심만(마커+부챗살+단지정보+포트폴리오 상세)** 구현하기로
  확정, 라이트박스/채팅/즐겨찾기/분석 트래킹은 제외.

### 진행 중 — 집테리어 소스 조사 (SSH로 읽기 전용, 코드는 안 건드림)
- `/var/www/zipterior/js/map-provider.js`(카카오맵 래퍼), `js/app.js`
  (마커/부채꼴/패널 로직 실제 구현, ~1300줄 중 핵심 구간 발췌),
  `css/style.css`(마커/부채꼴 색상·치수)를 읽어 정확한 구현 방식 파악:
  - 마커: `.count-marker`(반투명 초록 원, "시공 N", 44×44,
    `rgba(33,70,59,.62)` 배경 + `rgba(23,59,49,.96)` 1px 테두리) —
    클러스터/개별 마커 둘 다 같은 스타일.
  - 부챗살(fan) 마커: `point()`/`arcPath()` 알고리즘으로 평형 타입별
    SVG 쐐기(wedge)를 그림(색상 배열 10개 하드코딩), 중앙에 "시공 N건"
    원형 사인, 상단에 단지명 말풍선 + 닫기(×) 버튼.
  - `mapApiComplex`/`mapApiType`/`mapApiPortfolio`(js/app.js 44~53행):
    집테리어 `/api/v1/public/complexes/{id}`, `/api/v1/portfolios?
    complex_id=`, `/api/v1/portfolios/{id}` 응답을 화면에 쓰는 형태로
    변환하는 로직 — 이걸 그대로 Python으로 옮겨서 우리 백엔드와
    집테리어 프론트가 같은 필드를 같은 방식으로 해석하게 맞춤.
  - 다행히 `apps/web/src/app/globals.css`의 브랜드 색상(`--color-
    brand-green:#21463b`, `--color-brand-red:#bb1730`)이 집테리어의
    `--green`/`--red`와 이미 완전히 동일 — 디자인 통일이 수월했음.

### 진행 중 — 구현
- **[완료] 백엔드**(`apps/api/app/modules/integrations/`): 기존
  zipterior 프록시(schemas.py/zipterior_client.py/router.py)에 3개
  엔드포인트 추가:
  - `GET /integrations/zipterior/complexes/{complex_id}` — 단지
    기본정보(주소/입주시기/세대수/동수/주차대수/난방/시공사/평형
    타입별 목록/이미지).
  - `GET /integrations/zipterior/complex-portfolios?complex_id=` —
    단지의 시공사례 카드 목록(최대 100건, offset 지원).
  - `GET /integrations/zipterior/portfolios/{portfolio_id}` —
    포트폴리오 상세(히어로 이미지, 사진 목록, 업체정보, 예산/기간
    등). `ast.parse`로 문법 확인.
- **[완료] 프론트엔드**(`apps/web`):
  - `src/lib/interior-marker.ts`(신규) — `buildCountMarkerHtml`,
    `buildFanMarkerHtml`(집테리어 point/arcPath/selectedIcon을 TS로
    그대로 이식).
  - `src/app/globals.css` — `.zpi-*` 접두사로 마커/부챗살 CSS 추가
    (집테리어 값 그대로, 전역 클래스 충돌 방지).
  - `src/components/map/InteriorComplexPanel.tsx`(신규) — 단지 상세
    슬라이드 패널(히어로 이미지, 기본정보 그리드, 평형 타입 탭,
    필터된 포트폴리오 카드 그리드, 최신순 정렬).
  - `src/components/map/InteriorPortfolioPanel.tsx`(신규) — 포트폴리오
    상세 패널(히어로+사진 그리드+업체정보+연락처).
  - `src/app/map/page.tsx` — `interiorPortfolio` 레이어 전용 렌더러
    (`renderInteriorComplexMarkers`) 추가: 개별 마커 클릭 시 다른
    레이어처럼 인포윈도우 대신, 그 마커 자체가 부챗살로 바뀌고
    (`openInteriorComplex`) 옆에 단지 패널이 열림 — 집테리어의
    `selectComplex` 흐름과 동일. 부챗살 조각 클릭(`bindFanInteractions`)
    → 평형 필터, 닫기 버튼 → 원래 배지로 복원(`collapseInteriorMarker`/
    `closeInteriorPanels`). 클러스터 마커는 성능 요구사항(이 문서 앞부분
    "속도 저하 없어야 한다" 원칙)에 따라 기존처럼 확대 방식 유지(집테리어
    는 클러스터 클릭 시 목록 표시 — 우리는 서버 사전 클러스터링 구조라
    클릭 시점엔 개별 단지 데이터가 없어서 확대가 더 적합한 절충안으로
    판단, 마커 디자인 자체는 동일하게 맞춤).
  - `src/lib/types.ts` — 새 백엔드 스키마에 대응하는 TS 타입 추가.
- **[완료] 검증**: `next build` 성공(타입체크 통과), `npx eslint`로
  새로 작성한 코드가 기존 코드베이스 관례(예: `activeLayersRef` 패턴,
  effect 안 setState 패턴)에서 벗어난 새로운 린트 오류를 만들지 않는지
  확인(React Compiler 계열 린트 규칙이 이 저장소에 이미 광범위하게
  깔려 있었지만 빌드를 막지는 않는 경고 수준이라는 것도 함께 확인함).

### 완료 후
- 로컬 빌드/린트만 확인됨 — 서버 배포(API는 `zippalgo360-api` 재시작
  필요 없음, 새 엔드포인트만 추가한 것이라 무중단 반영 안 됨 — **주의:
  `apps/api`는 실제로는 재시작해야 새 라우터가 반영됨**, `apps/web`은
  `npm run build` 후 `zippalgo360-web` 재시작 필요) 및 실브라우저
  end-to-end 테스트(부챗살 클릭, 단지정보, 포트폴리오 상세까지)는
  다음 단계로 남김.
- **[완료] 배포 및 스모크 테스트**: 사용자가 `git pull` → 백엔드
  `ast.parse` + `zippalgo360-api` 재시작 → 프론트 `npm run build` +
  `zippalgo360-web` 재시작까지 실행, 전부 성공. 실제 단지 id(4716,
  한화갤러리아포레)로 새 엔드포인트 2개를 스모크 테스트 — 둘 다
  `HTTP 200`, 데이터 정상 반환 확인.
- **[버그 발견 및 수정]** 스모크 테스트 응답에서 평형 타입의 `area`
  필드가 `"70A"`처럼 문자가 섞여 나오는 버그 발견 — 원인은
  `_pyeong_label()`이 집테리어 원본 JS(`pyeongLabelFromType()`)와
  달리 `pyeong_label` 문자열에서 **숫자만 정규식으로 추출하는 과정을
  빠뜨리고** 통째로 썼기 때문. `re.search(r"\d+(?:\.\d+)?", ...)`로
  숫자만 뽑도록 수정(`zipterior_client.py`). `ast.parse` 통과 확인,
  커밋·푸시 완료.
- **[완료] 수정본 배포 및 재검증**: `git pull` → `zippalgo360-api`
  재시작(`active`, health 200) → 같은 단지(4716)로 재조회 —
  `"area": "70"`으로 숫자만 정상 출력 확인(`type`은 "231A"/"232B" 등
  원본 `type_name` 그대로인데, 이건 area 접두어로 시작하지 않는 경우
  `type_name`을 그대로 쓰는 집테리어 원본 로직 그대로라 버그 아님).
  **map "인테리어 시공사례" 레이어 구현 작업 완료** — 남은 건 사용자가
  브라우저로 직접 마커 클릭 → 부챗살 → 단지정보 → 포트폴리오 상세까지
  실제 화면에서 확인하는 것.

---

## 2026-08-26 — 인테리어 마커 겹침 버그: zoom 단위 불일치 수정 + 시작 위치 정렬

### 시작 전
- 사용자가 실제 화면 스크린샷 첨부 — 지도가 한반도 전체가 보일 정도로
  축소된 상태로 시작하고, 클러스터 마커들이 서로 크게 겹쳐 보임.
  "지도 시작축적, 축척별 마커 갯수 합쳐지고 표현되는 기준을 집테리어
  지도와 동일하게 적용" 요청.

### 진행 중 — 근본 원인 확인 (SSH로 zipterior 서버 소스 재확인)
- `/api/v1/public/map/viewport`를 실제로 구동하는
  `app/modules/public_map/service.py`의
  `PublicMapService.cluster_cell_degrees(zoom)`를 읽어 정확한 격자
  크기 규칙을 확인:
  ```
  zoom<=7  -> 0.500도(가장 넓음)
  zoom<=9  -> 0.200도
  zoom<=11 -> 0.080도
  zoom<=13 -> 0.030도
  zoom<=15 -> 0.012도
  zoom>15  -> None(클러스터링 해제, 개별 마커)
  ```
  이 규칙은 **"숫자가 클수록 더 확대된" leaflet 스타일 줌**을 전제로
  함(집테리어 자체 지도의 `js/map-provider.js`
  `fromKakaoLevel=level=>clamp(18-level,4,18)`와 동일한 방향) —
  카카오 레벨은 반대로 **숫자가 작을수록 확대**되는 체계.
- **[원인 확정]** 우리 `map/page.tsx`는 `zoom=${map.getLevel()}`로
  카카오 레벨을 변환 없이 그대로 서버에 넘기고 있었음. 그래서 지도를
  축소할수록(카카오 레벨 숫자가 커질수록) 서버는 오히려 "더 확대된
  화면"으로 착각해 격자를 필요 이상으로 좁게 잡거나, 반대로 확대된
  화면에서 격자를 너무 넓게 잡는 등 방향이 완전히 뒤집혀 있었음 —
  이게 스크린샷의 거대한 겹친 클러스터의 진짜 원인.
- 시작 위치/축척도 확인: 집테리어 자체 지도(`js/app.js`)는
  `map.setView([37.5445,127.0559], 11)`(leaflet 스타일 줌 11 =
  카카오 레벨 `18-11=7`, 성수JC 부근)로 시작하는데, 우리는
  `SEOUL_CENTER(37.5665,126.978)` + 레벨 8로 시작해서 더 넓은 범위가
  한번에 보이고 있었음.

### 진행 중 — 수정
- **[완료]** `apps/web/src/app/map/page.tsx`:
  - `toZipteriorZoom(kakaoLevel)` 함수 추가 — `18 - kakaoLevel`(4~18로
    clamp)로 변환해 집테리어 서버가 기대하는 방향과 맞춤.
    `loadInteriorMarkers`/`loadInteriorCompanyMarkers` 둘 다
    `zoom=${map.getLevel()}` → `zoom=${toZipteriorZoom(map.getLevel())}`
    로 수정.
  - `SEOUL_CENTER`(37.5665,126.978)+레벨 8 → `MAP_START_CENTER`
    (37.5445,127.0559, 성수JC)+`MAP_START_LEVEL`(7)로 변경해 집테리어
    시작 화면과 동일하게 맞춤(지도 전체의 기본 시작 위치라 다른
    레이어에도 공통 적용됨).
- **[완료]** 로컬 `next build` 성공(타입체크 통과).

### 완료 후
- 로컬 빌드만 확인됨 — 서버 배포(`npm run build` + `zippalgo360-web`
  재시작, API는 안 건드렸으니 재시작 불필요) 및 실브라우저로 마커
  겹침이 실제로 해소됐는지 확인은 다음 단계.

---

## 2026-08-26 — 집이사/집청소를 "집서비스"로 통합 (다른 세션과의 브랜치 충돌 발견 및 복구)

### 시작 전
- 사용자 지시: 상단 서비스 목록에서 집이사/집청소를 빼고 "집서비스" 하나로
  통합. 이사, 이사청소, 생활청소, 가전(평형/스타일 맞춤 AI 추천), 가구(AI
  추천), 인터넷·TV·정수기까지 포함. 상단 메뉴에 "집서비스" 아래 작은 글씨로
  "이사·청소·가전·가구" 노출.

### 진행 중 — 브랜치 충돌 발견
- 작업을 마치고 push하려다 **rejected(fetch first)** 에러 발생. 확인해보니
  이 세션이 마지막으로 pull한 이후 **다른(데스크탑) 세션이 같은 브랜치에
  방대한 작업을 이미 push해놓은 상태**였음: SSO 통합(집팔고360을 SSO
  issuer로), 전체 라우트 `jip*` → `zip*` 로마자화 통일(집팔고→zippalgo
  포함), `/map`을 부챗살 마커·단지 패널·포트폴리오 패널이 있는 멀티레이어
  지도로 대규모 재구축, 업체 지오코딩(911/912건), 관리자 "좌표없음" 배지 등.
- **안전 조치**: 기존 로컬 커밋을 `backup/pre-sync-jipservice-76b0c55`
  브랜치로 백업 후, 로컬을 `origin/claude/jippalgo360-platform-6bvrfh`로
  `git reset --hard` — 데스크탑 세션의 작업을 절대 덮어쓰지 않도록 함.
- `CLAUDE.md`에 데스크탑 세션이 추가한 네이밍 규칙("집으로 시작하는 모든
  서브서비스는 zip으로 로마자화") 확인 → 원래 계획했던 `/jipservice`가
  아니라 **`/zipservice`**로, 컴포넌트도 `ZipServiceForm`으로 이 규칙에
  맞춰 새로 작성함.
- alembic 마이그레이션도 데스크탑 세션이 이미 `0003`(업체 지오코딩용)을
  써서, 이번 것은 `0004_expand_lifestyle_service_types.py`(down_revision
  `0003`)로 번호를 다시 매김.

### 진행 중 — 구현 (현재 브랜치 최신 상태 기준으로 재작성)
- **[완료]** `lifestyle_interest_registrations`: `service_type` CHECK
  제약을 `(moving, cleaning)` → `(moving, move_out_cleaning,
  living_cleaning, appliance, furniture, subscription)` 6종으로 확장.
  `pyeong INTEGER`, `home_style VARCHAR(50)` 컬럼 추가(가전/가구 AI 추천용
  컨텍스트 데이터 사전 수집).
- **[완료]** `/zipservice` 페이지 + `ZipServiceForm` 컴포넌트 신규 작성 —
  카테고리 6개 카드 선택, 가전/가구 선택 시 평형·선호 스타일 조건부 입력
  필드, 나머지는 기존 관심 등록 폼과 동일한 흐름.
- **[완료]** `/zipisa`, `/zipcheongso` → `/zipservice` 영구 리다이렉트
  (`next.config.ts`), 옛 페이지 파일과 이제 안 쓰는 `ComingSoonService`
  컴포넌트 삭제.
- **[완료]** `services.ts`에 `navSubtitle` 필드 추가, `Header.tsx`
  데스크톱 nav(2줄: 이름 + 작은 부제)·모바일 nav(인라인) 양쪽에 렌더링 —
  데스크탑 세션이 이미 추가해둔 "지도" 링크는 그대로 보존.
- **[완료] 로컬 검증**: 마이그레이션 체인 `0001→0002→0003→0004` 전부
  클린 적용 확인(로컬 DB를 완전히 새로 만들어서 처음부터 검증).
  `POST /lifestyle/interest`가 `pyeong`/`home_style` 정상 반영 확인(curl).
  Playwright로 실제 브라우저 흐름(가전 선택 → 평형/스타일 입력 → 이름/
  연락처/지역 입력 → 제출 → "관심 등록이 완료됐어요!" 표시)까지 확인.
  `next build` 클린(라우트 목록에 `/zipservice` 정상 포함, 나머지
  `zip*` 라우트들도 전부 그대로 유지됨 확인).
- **[완료]** origin을 다시 fetch해 추가 변경 없음을 확인 후 rebase,
  재빌드까지 통과한 뒤 push 완료 (`952ff9d`).

### 완료 후
- 로컬 커밋/빌드/브라우저 검증까지 전부 완료, GitHub push 완료.
- **서버 재배포 아직 안 함** — 다음에 이어서 진행할 때, 사용자에게 서버에서
  `git pull` → (백엔드) `alembic upgrade head` + `zippalgo360-api` 재시작
  → (프론트) `npm run build` + `zippalgo360-web` 재시작 요청 필요.
- **다른 세션과의 협업 참고**: 이 세션과 데스크탑 세션이 같은 브랜치에
  동시에 작업 중임이 확인됨. 앞으로 작업 시작 전에 항상 `git fetch` +
  `git log HEAD..origin/...`로 다른 세션이 먼저 push한 게 있는지 확인하고,
  있으면 그 변경사항을 먼저 읽고 반영한 뒤 작업을 시작해야 함(이번처럼
  뒤늦게 발견해서 되돌리는 것보다 훨씬 안전).
- `backup/pre-sync-jipservice-76b0c55` 브랜치는 참고용으로 남겨둠(실제
  작업에는 반영 안 됨, 필요 없어지면 삭제해도 무방).

---

## 2026-08-26 — (이 세션) 위 "집서비스" 통합 커밋과의 브랜치 충돌 병합

### 상황
- 이 세션이 마커 겹침 버그 수정(zoom 단위 불일치)을 커밋한 직후 push가
  `rejected(fetch first)`로 실패 — 데스크탑 세션이 바로 위 기록된
  "집이사/집청소 → 집서비스 통합" 작업을 그 사이에 먼저 push해놓은
  상태였음.
- 데스크탑 세션이 이미 기록해 둔 "앞으로는 되돌리는 대신 fetch로 먼저
  확인" 원칙에 따라, 이번엔 **reset이 아니라 정상적인 git merge**로
  처리: `git fetch` → `git merge origin/...` → `docs/WORK_LOG.md` 파일
  끝부분 충돌만 발생(둘 다 파일 끝에 각자 기록을 추가해서 생긴 단순
  충돌, 코드 파일은 전부 자동 병합됨 — `Header.tsx`의 "지도" 링크와
  "집서비스" 부제 표시가 서로 겹치지 않는 위치라 깔끔하게 합쳐짐).
- **[완료]** 충돌 마커를 지우고 두 기록을 시간순으로 모두 보존(어느
  쪽도 덮어쓰지 않음). 병합 후 `ast.parse`(백엔드 57개 파일 전체)와
  `next build`(프론트 전체) 둘 다 클린 통과 확인 — `/zipservice`,
  `/map`, 나머지 `zip*` 라우트 전부 정상 포함.
- **[완료]** `git push` 성공(`3334573`).

### 남은 배포 작업 (다음 서버 반영 시 한 번에 처리)
- 이 병합 커밋에는 아직 서버에 반영 안 된 변경이 2건 겹쳐 있음:
  (1) 이 세션의 마커 겹침 zoom 버그 수정 (2) 데스크탑 세션의 집서비스
  통합(신규 alembic 마이그레이션 `0004` 포함). 다음 배포 시:
  `git pull` → (백엔드) `alembic upgrade head` 실행 후
  `zippalgo360-api` 재시작 → (프론트) `npm run build` +
  `zippalgo360-web` 재시작 — 순서대로 전부 필요.

---

## 2026-08-26 — 인테리어 마커, 이전 zoom 수정으로도 여전히 안 맞음 → 클러스터링 방식 자체가 잘못됐던 것으로 확인, 근본 재구현

### 시작 전
- 사용자가 완전히 같은 화면(같은 위치·같은 축척)을 우리 지도와 집테리어
  지도에서 나란히 캡처해서 첨부 — 마커 개수·위치·뭉치는 정도가 확연히
  다름(우리: 큰 덩어리 몇 개, 집테리어: 훨씬 세밀하게 흩어진 여러 개).
  "완전히 같게 하라고 했지" — 이전 zoom 단위 수정만으로는 부족했다는
  지적.

### 진행 중 — 진짜 원인 재확인
- 다시 소스를 뜯어본 결과, **애초에 이전 조사(이 문서 앞부분 "집테리어
  자체 지도와 같은 방식"이라던 기록)가 틀렸었음**을 확인:
  - 집테리어 데스크톱 지도(`js/app.js` + `js/map-provider.js`)는
    `/api/v1/public/map/viewport`(서버 사전 클러스터링)를 **아예 안
    씀**. 대신 `/public/map/markers`로 원본 마커를 bbox 단위로 점진적
    으로 받아 `complexes` 배열에 누적하고, **클라이언트에서**
    `ClusterGroup`(리플렛 스타일)으로 직접 격자 클러스터링함 —
    공식은 `clusterCell(zoom) = 20 / 1.8^zoom`(zoom은 leaflet 스타일),
    `disableClusteringAtZoom: 15`.
  - `/viewport`가 쓰는 서버 쪽 `PublicMapService.cluster_cell_degrees
    (zoom)`(계단형: 7/9/11/13/15 구간)는 **완전히 다른 별도의 공식**
    이라, zoom 단위를 아무리 정확히 맞춰도 두 알고리즘 자체가 달라서
    절대 100% 일치할 수 없었음 — 지난 수정(zoom 방향 반전)은 방향은
    맞았지만 애초에 잘못된 엔드포인트/알고리즘을 쓰고 있었던 것.

### 진행 중 — 재구현 (`apps/web/src/app/map/page.tsx`)
- **[완료]** interiorPortfolio 레이어를 `/viewport` 대신
  `/integrations/zipterior/map-markers`(이미 있던 프록시, bbox 제한
  원본 마커)로 전환.
- **[완료]** `interiorRawMarkersRef` — 집테리어의 `complexes` 배열과
  동일하게, 지도를 이동하며 받은 원본 마커를 id 기준으로 계속 누적
  (bbox 밖으로 나가도 안 지움).
- **[완료]** `redrawInteriorClusters()` — 집테리어의
  `ClusterGroup.redraw()`를 그대로 이식: 매번 누적된 마커 전체를
  대상으로 `interiorClusterCellDegrees(zoom) = 20/1.8^zoom` 격자로
  다시 묶고, `INTERIOR_DISABLE_CLUSTERING_AT_ZOOM=15` 이상이면
  클러스터링 없이 개별 마커만 그림. 개별 마커 클릭 시 부챗살+단지
  패널이 뜨는 기존 동작은 그대로 유지(`renderInteriorStandardMarker`
  로 분리, `openInteriorComplex`/`bindFanInteractions` 재사용).
  클러스터 클릭은 기존처럼 확대(집테리어는 클러스터 클릭 시 목록
  표시지만, 이번 수정 범위는 "뭉치는 기준·위치를 동일하게"였고 클릭
  동작은 이전에 이미 성능 절충안으로 합의된 부분이라 유지).
- **[완료]** `company_interior`(인테리어 업체) 레이어는 이번 수정
  범위 밖(사용자 요청이 "인테리어 시공사례" 레이어 한정) — 여전히
  `/viewport` 사용, 동일한 잠재적 불일치가 있을 수 있음을 인지만
  해둠(필요시 후속 작업).
- **[완료]** `next build` 성공, `npx eslint`로 새 코드가 새로운 오류를
  만들지 않았는지 확인(기존에 있던 5개 pre-existing 오류만 그대로).

### 완료 후
- 로컬 빌드/린트만 확인됨 — 서버 배포(`npm run build` + `zippalgo360
  -web` 재시작, API는 안 건드렸으니 재시작 불필요) 및 사용자가 같은
  화면을 다시 나란히 캡처해서 실제로 뭉치는 개수·위치가 일치하는지
  재확인은 다음 단계.

---

## 2026-08-26 — 집서비스 nav 정렬 버그 수정

### 시작 전
- 사용자가 배포 후 스크린샷으로 지적: "집서비스" 메뉴가 부제목("이사·청소·
  가전·가구") 때문에 다른 메뉴(지도/집팔고/집사고/집테리어)보다 세로로 더
  길어져서, 전체 nav의 `items-center` 정렬 기준선이 어긋나 보임. 작은
  글씨를 위로 옮기라는 요청.

### 진행 중
- **[완료]** `Header.tsx`: 부제목을 `flex-col`로 라벨 아래 쌓던 방식에서,
  라벨은 그대로 단일 라인으로 두고 부제목을 `absolute -top-3`로 라벨 위에
  띄우는 방식으로 변경 — 링크 박스 자체의 높이가 형제 항목들과 완전히
  동일해져서 `items-center` 정렬이 자동으로 맞음.
- **[완료] 검증**: `next build` 클린, Playwright로 헤더 스크린샷 찍어
  지도/집팔고/집사고/집테리어/집서비스 라벨이 전부 같은 줄에 정렬되고
  부제목만 위에 살짝 떠 있는 것 확인.
- 그사이 데스크탑 세션이 또 push(마커 클러스터링 zoom 버그 수정, merge
  커밋)해놔서 fetch → rebase 후 재빌드 확인하고 push.

### 완료 후
- 로컬 검증 완료, push 완료(`3730e59`). **서버 재배포 필요**: `git pull`
  → `npm run build` → `zippalgo360-web` 재시작(백엔드 변경 없음, API
  재시작 불필요).

---

## 2026-08-26 — 집서비스 화면 구성은 다른 세션으로 인계

### 완료 후
- 사용자 지시: "집서비스 화면 구성은 다른 세션에서 진행할게" — 이 세션은
  `/zipservice`의 **화면 디자인/구성을 더 이상 건드리지 않음**.
- 현재까지 이 세션이 만든 것(다른 세션이 이어받을 기준점):
  - 백엔드: `lifestyle_interest_registrations`에 6개 카테고리(moving,
    move_out_cleaning, living_cleaning, appliance, furniture,
    subscription) + `pyeong`/`home_style` 컬럼(마이그레이션 0004).
    `POST /lifestyle/interest`가 이 필드들을 받음.
  - 프론트: `/zipservice` 페이지 + `ZipServiceForm`(카테고리 6개 카드 +
    조건부 평형/스타일 입력 + 이름/연락처/지역/일정/메모 폼) — 최소
    기능만 있는 상태, 화면 구성/디자인은 미완성으로 남겨둠.
  - 상단 nav "집서비스" 라벨 + 부제목("이사·청소·가전·가구") 정렬·색상
    수정 완료, 서버 배포 완료.
- 다른 세션이 `/zipservice` 화면을 다시 만들 때 참고할 것: 백엔드
  스키마(카테고리 값 6종, `pyeong`/`home_style`)는 이미 나가 있으니 굳이
  다시 바꿀 필요 없으면 그대로 재사용 가능. 바꾸게 되면 이 문서에 기록
  남겨줄 것(다른 세션이 만든 걸 이 세션이 임의로 되돌리지 않도록).

---

## 2026-08-26 — map을 집테리어 UI 100% 동일하게 확장 (통합 마커/검색/컨트롤), 7개 세부 작업

### 시작 전
- 사용자 요청(요약): 집팔고360 `/map`이 집테리어와 집팔고 마커를 모두
  보여주고 통합검색까지 하는 화면이 될 거라, 검색창 등 UI 위치를
  집테리어 구성과 최대한 같게 가져가자는 큰 방향 지시. 구체적으로 7개:
  1. `/zipterior` 임베드 페이지의 "새 탭에서 열기" 버튼 제거.
  2. 집테리어 자체 서버: `zipterior.kr` 단독 접속 시엔 로고 노출,
     집팔고360 안에 iframe으로 임베드됐을 땐 로고 생략.
  3. 범례 문구: 초록(시공사례) "초록색 마커는 실제 단지별 시공사례 수
     입니다."로 변경, 빨강(집팔고 매물) "붉은색 마커는 단지별 매물 수
     입니다." 신설.
  4. 레이어 상호배타: 집팔고 그룹(매물+부동산업체) ↔ 집테리어 그룹
     (시공사례+인테리어업체) 중 하나 선택 시 반대 그룹은 자동 해제.
     이사/청소는 무관하게 중복 선택 가능.
  5. 지도 확대/축소, 평/㎡ 토글, 일반/위성 토글, 현재위치 버튼을
     집테리어 그대로 이식.
  6. 채팅 버튼, 햄버거 버튼 "일단" 그대로 이식.
  7. 가운데 통합검색창을 위치+기능(집테리어 `/public/map/search`
     연동)까지 그대로 이식.
- 순서: (1)(3)(4)는 이 저장소(zippalgo360)만 건드리면 되니 먼저 처리,
  (2)는 집테리어 서버(SSH 릴레이 필요), (5)(6)(7)은 집테리어 소스
  구조 확인 후 순차 진행. 매 단계 로그 남기고 커밋/푸시.

### 진행 중
- **[완료] 세부 작업 1**: `apps/web/src/app/zipterior/page.tsx`에서
  iframe 우상단에 떠 있던 "새 탭에서 열기 ↗" `<a>` 버튼 제거(iframe만
  남김). 사용자 지시("집팔고360 내 서비스로 접속했을 때는 ... 새탭에서
  열기 버튼은 삭제해")와 일치.
- **[완료] 세부 작업 3**: `apps/web/src/app/map/page.tsx` 레이어 패널
  하단에 조건부 범례 문구 추가 — `interiorPortfolio` 활성 시 초록색
  "초록색 마커는 실제 단지별 시공사례 수 입니다.", `listings` 활성 시
  빨간색 "붉은색 마커는 단지별 매물 수 입니다." (각각 `text-brand-green`
  /`text-brand-red`, 두 레이어 동시 활성은 상호배타 처리로 원천 불가라
  실제로는 항상 둘 중 하나만 보임).
- **[완료] 세부 작업 4**: 같은 파일에 레이어 그룹 상호배타 추가.
  `LAYER_GROUP_ZIPPALGO = {listings, company_real_estate}`,
  `LAYER_GROUP_ZIPTERIOR = {interiorPortfolio, company_interior}` 상수를
  두고, `toggleLayer`에서 한쪽 그룹의 레이어를 켤 때 반대 그룹에서 켜져
  있던 레이어는 자동으로 끈다(마커 정리 + interiorPortfolio였다면 패널도
  닫음). `company_mover`/`company_cleaner`는 두 그룹 어디에도 없어서
  그대로 자유롭게 중복 선택 가능 — 사용자 지시("이사업체 청소업체는
  상관없음 중복 선택 가능")와 일치.
- **[완료] 검증**: `next build` 클린 통과(23개 라우트 정상 생성).
- 다음: 세부 작업 2(집테리어 서버 로고 조건부 숨김)를 위해 집테리어
  `index.html`/`css/style.css`의 `.brand-box` 마크업 확인 필요 —
  이 세션은 SSH 직접 접속이 안 되므로 사용자가 실행할 조회 스크립트를
  준비해서 넘길 예정. 세부 작업 5/6/7(컨트롤·채팅·햄버거·통합검색
  이식)도 마찬가지로 집테리어 `index.html`/`js/app.js`/`css/style.css`
  원본 마크업 확인이 먼저 필요 — 조회 스크립트에 한 번에 포함해서
  요청할 예정.
- **[완료] 커밋/푸시**: 세부 작업 1/3/4를 `3369da2`로 커밋, 원격이
  뒤에 더 앞서있지 않음을 fetch로 확인 후 push 완료(브랜치
  `claude/jippalgo360-platform-6bvrfh`). **서버 재배포 아직 안 함**
  (프론트만 변경, 다음 배포 시 `npm run build` + `zippalgo360-web`
  재시작 필요, 백엔드 변경 없음).
- 세부 작업 2/5/6/7을 위해 집테리어 `index.html` 전체 + `js/app.js`/
  `css/style.css`의 검색·컨트롤·채팅·햄버거·brand-box 관련 부분을
  읽기 전용으로 덤프하는 조회 스크립트(`inspect-zipterior-ui.sh`)를
  준비해 사용자에게 전달, 결과 수신.
- 수신한 결과에서 확인한 핵심 사실:
  - `.brand-box`는 `<a class="brand-box" href="/">` — index.html의
    `.topbar` 안, `nativeMap=1` 감지 스크립트 바로 뒤가 좋은 삽입 지점.
    집테리어는 이미 자기 모바일 앱 셸(m.html) 임베드를 위해
    `window.self!==window.top` 대신 **쿼리스트링**(`nativeMap=1`)으로
    임베드 여부를 판정하고 `zt-embedded` 클래스를 붙이는 패턴을 쓰고
    있음(검색창/채팅/메뉴까지 통째로 숨김, 우리 용도보다 훨씬 넓음) —
    똑같은 쿼리스트링 패턴을 그대로 따라가되 로고 하나만 숨기는 별도
    클래스(`zp-zippalgo-embedded`)를 새로 만들기로 함(기존 zt-embedded
    재사용 시 검색창까지 같이 숨어버려 사용자 요청과 충돌).
  - 줌: `document.querySelectorAll('[data-map-zoom]')`+`map.zoomIn()/
    zoomOut()`. 일반/위성: `[data-map-type]` 클릭 시 satellite/normal
    타일레이어 교체(카카오 SDK에선 `setMapTypeId`로 대응). 현재위치:
    `navigator.geolocation.getCurrentPosition`+`map.flyTo(...,16)`.
    평/㎡: `applyAreaUnit(unit)` — 전역 `areaUnit` 변수를 바꾸고 선택된
    단지 마커/패널/업체 패널/포트폴리오 상세를 다시 그림(우리는 판넬
    쪽만 좁게 적용, 아래 스코프 결정 참고).
  - 검색: `updateSearch()`가 180ms 디바운스 후 `/public/map/search?q=
    &limit=10`을 호출, `result_type`이 `place`면 카카오 보강 결과로
    지도만 이동, `complex`/`company`면 단지·업체 상세를 염
    (`selectSearchResult()`).
- **[완료] 세부 작업 7(백엔드)**: `apps/api/app/modules/integrations/`
  에 `ZipteriorSearchItem`/`ZipteriorSearchOut` 스키마,
  `zipterior_client.search(q, limit)`(집테리어 `/api/v1/public/map/
  search` 프록시, place/complex/company 매핑은 js/app.js의
  updateSearch() 로직 그대로), `GET /integrations/zipterior/search`
  라우터 추가.
- **[완료] 세부 작업 7(프론트)**: `apps/web/src/app/map/page.tsx`의
  검색창을 좌상단 → **가운데 상단**(`left-1/2 -translate-x-1/2`)으로
  이동, 우리 자체 `/apartments/complexes` 검색을 버리고 새 백엔드
  프록시(`/integrations/zipterior/search`)를 180ms 디바운스로 호출하는
  집테리어 방식으로 교체. 결과 클릭 시(`handleSelectSearchResult`):
  `complex` → interiorPortfolio 레이어 활성화(상호배타 규칙에 따라
  집팔고 그룹은 자동 해제) + 지도 이동 + `openInteriorComplex` 호출로
  단지 패널 오픈, `company` → company_interior 레이어 활성화 + 지도
  이동(업체 상세 패널은 아직 없어 이동까지만), `place` → 지도만 이동.
- **[완료] 세부 작업 5**: 같은 파일에 지도 컨트롤 스택(일반/위성,
  평/㎡, 확대·축소, 현재위치) 추가 — 우측 상단, 집테리어와 같은 자리.
  `handleZoom`/`handleMapType`(카카오 `setMapTypeId` +
  `MapTypeId.HYBRID`/`ROADMAP`)/`handleLocate`
  (`navigator.geolocation`+`setLevel`+`setCenter`, 집테리어의
  `flyTo(...,16)`을 카카오 SDK에 맞게 치환) 전부 실제로 동작.
  평/㎡ 토글은 `AreaUnit` 상태로 관리하되 **스코프를 좁혀서**
  단지/포트폴리오 패널의 평형 표시(`formatAreaLabel`, `apps/web/src/
  lib/interior-marker.ts`에 신설, 집테리어 PYEONG_TO_M2=3.305785 계수
  그대로)에만 연결했고, 지도 위 부챗살(fan) 마커의 조각 라벨은 그대로
  평형 숫자만 표시(집테리어처럼 단위 접미사까지 바꾸진 않음) — 미세한
  트림이라 여기 명시적으로 기록해 둠(필요하면 후속 작업으로 확장 가능).
- **[완료] 세부 작업 6**: 채팅·햄버거 버튼을 우상단(검색창 옆, 집테리어와
  같은 자리)에 추가. 채팅은 우리 플랫폼에 아직 채팅 기능 자체가 없어
  클릭 시 "채팅 기능은 준비 중입니다" 안내 토스트만 뜨는 자리표시자로
  둠. 햄버거는 집테리어의 로그인 상태별 메뉴 시스템이 없어서, 대신 우리
  사이트의 실제 상단 내비게이션(`Header.tsx`와 동일한 지도/서비스
  목록/파트너센터/로그인·로그아웃)을 펼치는 드롭다운으로 구현 —
  "일단 그대로 가져와"라는 사용자 지시를 우리 플랫폼 현실에 맞게
  최소한으로 각색함.
- **[완료] 검증**: `next build` 클린 통과(23개 라우트), 백엔드 3개
  수정 파일 `ast.parse` 통과. `npx eslint`로 새로 만든 코드가 이
  저장소에 기존에 이미 있던 것과 같은 종류의 사전 존재 오류
  (`react-hooks/set-state-in-effect`, 이펙트 안에서 setState 직접
  호출 — 이 코드베이스 전역에 만연, 빌드는 막지 않음, 이전 세션에서
  이미 비차단으로 판단됨)만 새로 만들었는지 확인, 새로운 종류의 오류는
  없음.
- **[완료] 세부 작업 2**: 집테리어 서버(`/var/www/zipterior`)에 앵커
  기반 파이썬 패치를 SSH 릴레이로 실행 완료 — `index.html`의
  `nativeMap` 감지 스크립트 바로 뒤에 `zpEmbed=1` 쿼리스트링을 감지해
  `zp-zippalgo-embedded` 클래스를 붙이는 스크립트 추가 + `style.css`
  캐시버스터 버전 올림, `style.css` 끝에 `html.zp-zippalgo-embedded
  .brand-box{display:none!important}` 규칙 추가. 사용자가 처음엔
  파이썬 코드를 bash 프롬프트에 직접 붙여넣어 셸이 코드로 해석하려다
  실패(SSH 세션 끊김) — `python3 - <<'PYEOF' ... PYEOF` heredoc으로
  감싸서 다시 전달하니 정상 실행됨(`index.html 패치 완료`/`style.css
  패치 완료` 출력 확인). **교훈**: 이후 세션도 원격 실행용 파이썬
  스크립트는 파일 저장 대신 heredoc(`python3 - <<'EOF'...EOF`) 형태로
  전달하는 편이 사용자가 한 번에 붙여넣기 안전함.
  우리 쪽 `/zipterior` 임베드 페이지(`apps/web/src/app/zipterior/
  page.tsx`)는 이미 iframe src에 `?zpEmbed=1`을 붙이도록 수정
  완료(SSO 코드가 있을 땐 `&sso=...`를 추가로 붙임) — 양쪽이 맞물려
  동작하는 것은 실사용자 화면(zippalgo360.com/zipterior)에서 아직
  최종 확인 전, 다음 단계에서 확인 예정.
- **7개 세부 작업 전부 코드 레벨 완료.** 배포 스크립트 실행 완료
  (`/map`, `/zipterior` 둘 다 HTTP 200). 배포 중 발견한 것: 배포
  스크립트의 진단 curl이 `/integrations/zipterior/search`로 404가
  났는데, 이건 버그가 아니라 `app/main.py`가 이 라우터를
  `prefix="/api"`로 마운트해서 실제 경로가 `/api/integrations/
  zipterior/search`였던 것 — 진단 curl에서 `/api`를 빼먹은 내 실수.
  프론트 `apiFetch`는 `NEXT_PUBLIC_API_URL`(`.../api`)을 이미 붙여
  호출하므로 실제 화면은 문제없음. OpenAPI 스키마로 라우트 등록
  확인 완료.

### 지도 레이어 패널 리디자인 (사용자 피드백)
- 사용자: "지도에 표시할 레이어 이거를 좀 그럴듯하게 이쁘게 만들어봐
  이거 너무 좀 그렇지 않아??" — 배포 후 브라우저 확인은 나중에 한
  번에 하기로 하고, 그 전에 레이어 패널 UI 품질 개선 요청.
- **[완료]** `apps/web/src/app/map/page.tsx`의 레이어 선택 패널을
  기본 체크박스 목록에서 카드형 UI로 전면 리디자인:
  - `LAYER_PANEL_GROUPS`(집팔고/집테리어/생활서비스)로 묶어서 섹션
    헤더와 함께 표시(상호배타 규칙의 LAYER_GROUP_ZIPPALGO/ZIPTERIOR와는
    별개, 순수 표시용 그룹핑).
  - `LAYER_DOT_COLOR`로 각 레이어 라벨 옆에 실제 지도 마커 색과 맞춘
    색점 추가(매물=빨강, 시공사례/인테리어업체=`.zpi-count-marker`와
    동일한 브랜드그린, 나머지는 기존 `COMPANY_LAYER_COLOR` 그대로).
  - 네이티브 체크박스 → 커스텀 토글 스위치(pill+thumb, 브랜드그린
    on/회색 off)로 교체, 행 전체가 클릭 가능한 버튼.
  - 카드 헤더에 레이어 아이콘 + "지도 레이어" 타이틀, 준비중 배지를
    pill 스타일로 통일, 초록/빨강 범례 문구는 하단에 별도 섹션(옅은
    배경)으로 분리해 색점과 함께 표시.
  - Playwright로 `/map` 스크린샷 찍어 실제 렌더링 확인(카카오 키가
    없는 로컬 환경이라 지도 자체는 안 뜨지만 패널 UI는 정상 렌더링됨을
    확인) — 사용자에게도 스크린샷 전달.
  - `next build` 클린, `npx eslint`로 새 코드가 기존과 같은 종류의
    사전 존재 오류만 유지하는지(새 오류 없음) 확인.
- 아직 서버 미배포 — 다음 배포 때 이번 커밋도 함께 반영.
- 사용자가 즉시 배포를 원해서("뭔소리야 적용시켜") 프론트 전용 배포
  스크립트(`git pull` + `npm run build` + `zippalgo360-web` 재시작)를
  전달, 실행 대기 중이던 차에 곧바로 추가 요청 도착(아래).

### 지도 레이어 패널을 아이콘 토글로 변경
- 사용자: "지도레이어도 아이콘으로 표시하고 클릭하면 저 창이 나와서
  선택하도록" — 방금 만든 카드형 패널이 항상 펼쳐져 있던 것을, 다른
  우측 컨트롤들(줌/평-㎡/일반-위성/현재위치)과 같은 아이콘 버튼으로
  접어두고 클릭해야 펼쳐지게 바꿔달라는 요청.
- **[완료]** `layerPanelOpen` 상태 추가. 기존 항상-펼침 카드를
  `relative` 래퍼로 감싸고, 레이어 아이콘(육각형 스택 SVG, 기존 카드
  헤더에 있던 것 재사용)만 있는 44px 정사각 토글 버튼을 다른 우측
  컨트롤과 동일한 스타일로 배치 — 클릭 시 `layerPanelOpen` 토글.
  펼쳐진 카드는 그 버튼 아래(`absolute right-0 top-12`)에 드롭다운으로
  뜨고, 헤더에 닫기(×) 버튼 추가. 켜진 레이어 개수를 아이콘 우상단에
  빨간 배지 숫자로 표시(0개면 배지 자체를 숨김)해서 접힌 상태에서도
  몇 개가 켜져 있는지 한눈에 보이게 함.
- **[완료] 검증**: `next build` 클린. Playwright로 접힌 상태(배지
  "1" 표시)와 아이콘 클릭 후 펼쳐진 상태 두 장 스크린샷 찍어 실제
  동작 확인, `npx eslint`로 새 오류 없음 확인.
- 사용자: "이미지로 만들어서 보여줄거 없이 코드만줘" — 앞으로 이
  작업 스레드에서는 스크린샷을 만들어 보내지 말고 코드/스크립트만
  전달할 것.

### 일반·위성/평·㎡ 컨트롤을 단일 토글 버튼으로, 우측 컨트롤 순서 재배치
- 사용자 요청: (1) 평/㎡ 컨트롤은 기본값을 ㎡로 표시하고, 한 번 더
  누르면 평으로 바뀌는 방식으로. (2) 지도 종류도 기본은 일반, 누르면
  위성, 또 누르면 일반으로 돌아오는 방식으로. (3) 우측 지도 컨트롤
  아이콘들의 배치 순서를 UX상 합리적으로 재정리.
- **[완료]** 기존에 "일반|위성", "평|㎡"를 나란히 보여주던 두 옵션
  pill(높이 36px, 다른 정사각 버튼과 크기가 안 맞아 시각적으로도
  붕 떠 보였음)을 각각 **단일 토글 버튼**(42×42px, 줄/현재위치와 동일
  크기)으로 교체 — 버튼에는 현재 상태 라벨만 표시하고, 클릭하면
  반대 상태로 전환(`mapType === "normal" ? "satellite" : "normal"`,
  `areaUnit === "m2" ? "pyeong" : "m2"`).
- **[완료]** `areaUnit` 기본값을 `"pyeong"` → `"m2"`로 변경.
- **[완료]** 우측 컨트롤 세로 순서를 "확대·축소 → 현재위치 → 일반/위성
  → 평/㎡"로 재배치 — 사용 빈도가 높은 지도 조작(줌/현재위치)을
  위쪽에, 화면 표시 설정(지도 종류/면적 단위)을 아래쪽에 묶어 기능별로
  자연스럽게 그룹핑. 레이어 선택 아이콘은 그 아래 별도 그룹으로 유지.
- **[완료] 검증**: `next build` 클린, `npx eslint` 새 오류 없음.

### 현재위치 버튼 안 먹는 문제 수정
- 사용자: "map에서 현재위치 버튼 안먹네 확인해서 적용해" — 배포 후
  실사용 화면에서 현재위치 버튼을 눌러도 반응이 없다는 리포트.
- **원인**: `handleLocate`의 `navigator.geolocation.getCurrentPosition`
  실패 콜백이 `setIsLocating(false)`만 하고 끝나서, 위치 권한 거부/
  타임아웃 등으로 실패해도 사용자에게 **아무 피드백이 없었음** —
  버튼을 눌러도 로딩 스피너가 잠깐 돌다 조용히 원상복구되니 "안 먹는다"
  로 보임. 추가로 `enableHighAccuracy:true`(집테리어 원본 그대로 옮긴
  값)는 GPS 없는 데스크톱 브라우저에서 위치 확인이 느리거나 타임아웃
  나기 쉬운데, 집테리어는 주로 모바일에서 쓰여 이 문제가 잘 안
  드러났을 뿐 — 데스크톱에서 테스트하면 실패 확률이 더 높음.
- **[완료] 수정**: `apps/web/src/app/map/page.tsx`의 `handleLocate`
  — 에러 콜백에서 `error.code`별로 토스트 메시지 분기(권한 거부/
  타임아웃/기타), `console.error`로 콘솔에도 원인 남김,
  `enableHighAccuracy: true → false`로 낮춰 Wi-Fi/IP 기반의 더 빠른
  위치 확인을 우선하도록 함. `navigator.geolocation` 자체가 없는
  구형 브라우저 케이스도 토스트로 안내.
- **[완료] 검증**: `next build` 클린, `npx eslint` 새 오류 없음.
- **참고**: 이 수정은 실패를 "눈에 보이게" 만드는 것까지만 해결 —
  만약 실사용 화면에서 여전히 안 되면 다음번엔 뜨는 토스트 문구
  (권한 거부/타임아웃/기타)를 그대로 알려달라고 해서 원인을 좁힐 것.
  브라우저가 위치 권한을 이미 영구 차단해놨다면 코드로는 못 고치고
  사용자가 브라우저 설정에서 직접 허용해야 함.

### 햄버거를 헤더로, 채팅을 컨트롤 스택으로, 버튼 색상 통일 + 채팅 무반응 수정
- 사용자 요청 4가지: (1) 햄버거 메뉴는 상단 헤더(이미 같은 메뉴가
  있는)로 이동 — 즉 지도 위 별도 햄버거는 제거. (2) 채팅 버튼을 다른
  컨트롤 버튼들 사이 UX상 맞는 위치로 이동 + 새 메시지 온 채팅방 수를
  빨간 동그라미·하얀 숫자 배지로 표시. (3) 모든 컨트롤 버튼을 "기본
  흰색, 클릭해서 바뀐 상태는 파스텔 그린"으로 색상 통일(집테리어 마커
  색 계열). (4) 채팅 버튼을 눌러도 아무 반응이 없다는 버그 리포트.
- **원인(4번)**: 기존 채팅 버튼은 `setToast(...)`로 하단에 잠깐 뜨는
  토스트만 띄웠는데, 2.2초 후 자동으로 사라지는 짧은 문구라 놓치기
  쉬웠고 사용자에겐 "눌러도 아무 일도 안 일어난다"로 느껴진 것으로
  보임(진짜 클릭 핸들러 자체가 안 붙어있던 건 아니었음). 근본적으로
  토스트 대신 **실제로 열리고 닫히는 패널**을 만들어 눈에 보이는 상태
  변화가 남도록 고침.
- **[완료]** `apps/web/src/app/map/page.tsx`:
  - 햄버거 버튼 + 드롭다운(지도/서비스 목록/파트너센터/로그인·로그아웃)
    전체 삭제 — 상단 헤더(`Header.tsx`)가 이미 데스크톱에선 전체
    메뉴를 그대로 보여주고, 모바일에선 그 헤더 자체에 이미 햄버거가
    있어서 완전히 중복이었음. 이제 안 쓰는 `Link`/`SERVICES`/
    `useAuth`(user/logout)/`menuOpen` import·상태 전부 제거.
  - 채팅 버튼을 우측 지도 컨트롤 세로 스택(줌/현재위치/일반·위성/
    평·㎡/레이어) 맨 위로 합류시켜 하나의 컬럼으로 통합(기존엔
    "채팅+햄버거"가 상단 별도 그룹, "줌 이하"가 top-20의 또 다른
    그룹으로 나뉘어 있던 걸 하나로 정리) — 컨테이너를 `top-4`
    하나로 합쳐 검색창과 같은 높이에서 시작.
  - 채팅 클릭 → `chatOpen` 상태로 실제 슬라이드 패널(우측, 전체 높이)
    이 열리고 닫힘. 아직 채팅 데이터가 없어 "아직 채팅 내역이
    없어요" 빈 상태 문구만 보여주되, 클릭 반응 자체는 확실히 보이게
    함. `unreadChatCount`(현재 0 고정, 채팅 기능이 실제로 생기면 안읽은
    채팅방 수로 채울 자리) > 0일 때만 아이콘 우상단에 빨간 배지·하얀
    숫자 표시 — 레이어 아이콘의 기존 배지 패턴과 동일.
  - `controlButtonClass(active)` 헬퍼 신설 — 기본 `bg-white/95
    text-ink/80 border-line`, 활성/전환 상태는 `bg-brand-green/15
    text-brand-green border-brand-green/40`(파스텔 그린). 채팅(열림),
    레이어(열림), 현재위치(조회 중), 지도유형(위성=기본에서 바뀐
    상태), 평·㎡(평=기본 ㎡에서 바뀐 상태) 전부 이 헬퍼로 통일 —
    이전엔 pill 버튼은 `bg-brand-green/50`, 레이어는 텍스트만 초록,
    현재위치도 텍스트만 초록으로 제각각이던 걸 하나로 맞춤.
  - 모든 정사각 컨트롤 버튼 크기를 `h-11 w-11`(44px)로 통일(줌은
    42px, 나머지는 44px로 미묘하게 안 맞았던 것 정리).
- **[완료] 검증**: `next build` 클린(제거된 import로 인한 미사용
  변수 오류 없음 확인), `npx eslint` 새 오류 없음. Playwright로 3장
  스크린샷(기본 상태 — 햄버거 없고 채팅이 스택 맨 위, 채팅 클릭 시
  실제 패널 열림, 평/㎡ 토글 시 파스텔 그린 강조) 찍어 직접 확인 —
  지도유형 토글은 이 로컬 환경에 카카오맵 키가 없어(`handleMapType`이
  `map` 객체 없으면 조기 return) 시각적으로 검증 못 함, 상태값 자체는
  area unit과 동일한 패턴이라 실배포 환경(카카오맵 정상 로드)에서는
  문제없이 동작할 것으로 판단.

### 인테리어 시공사례 패널 위치·2단 레이아웃, 클러스터 선택 목록, 부챗살 안정성 수정
- 사용자 요청(먼저 이해한 내용 확인받고 진행하라고 해서 확인 후 승인
  받고 시작): (1) 단지기본정보 패널을 지금의 오른쪽 대신 zipterior.kr
  처럼 화면 왼쪽에 노출. (2) 포트폴리오 클릭 시 지금처럼 단지기본정보를
  덮어버리는 대신, 옆(오른쪽)에 나란히 열리도록. (3) 디자인/느낌은
  지금 우리 `/map`에 이미 구현된 것을 그대로 유지, 위치·레이아웃만
  맞춘다. 추가 확인 후: (4) 부챗살이 뜨는 경우도 있고 안 뜨는 경우도
  있다(버그 수정 요청). (5) 마커 여러 개가 겹친 경우 포함된 단지를
  리스트로 보여주고 선택하면 단지기본정보로 이동하는 집테리어 모바일
  기능이 우리 쪽엔 없음(신규 구현 요청). "표현되던 기능·내용은 빠짐없이
  표현"이라는 전제.
- **[완료] (1)(2)(3) 패널 위치 재구성**: `InteriorComplexPanel.tsx`/
  `InteriorPortfolioPanel.tsx`의 루트 div에서 각자 갖고 있던
  `absolute right-0 top-0 z-20/30` 독립 포지셔닝을 제거하고(둘 다
  같은 자리에 겹쳐 뜨던 원인) `flex h-full w-[28rem] flex-shrink-0
  border-r`(디자인 자체는 그대로, 폭만 max-w-md와 동일한 28rem로
  고정)로 바꿔 **평범한 flex item**이 되게 함. `map/page.tsx`에
  `<div className="absolute left-0 top-0 z-20 flex h-full">`로 한 번
  감싸서, 클러스터 선택 목록/단지기본정보(같은 자리, 서로 배타)와
  포트폴리오 상세(그 오른쪽에 추가 3번째 칸)가 flexbox로 자동
  나란히 배치되게 함 — 폭 계산을 수동으로 안 해도 되는 구조라 나중에
  폭이 바뀌어도 안전함.
- **[완료] (5) 클러스터 선택 목록 신규 구현**: 집테리어 실제 지도(js/
  app.js)를 다시 확인해보니 `markerClusterGroup`이
  `zoomToBoundsOnClick:false`로 설정돼 있어 클러스터를 눌러도 확대가
  아니라 **항상** `openClusterComplexSelect`(포함된 단지 목록 1단계
  화면)를 띄우는 게 원래 동작이었음 — 우리 쪽은 지금까지 클러스터
  클릭 시 그냥 확대만 하고 있어서 이 기능 자체가 빠져 있었음(사용자가
  지적한 "그게 적용이 안되어 있어"가 정확했음). `redrawInteriorClusters`
  에서 여러 단지가 뭉친 버킷(`bucket.length > 1`)의 클릭 핸들러를
  확대 로직에서 `setClusterSelectItems(bucket)`(그 버킷에 속한
  `ZipteriorMapMarker[]`를 그대로 상태에 저장)로 교체. `clusterSelectItems`
  신규 상태 추가, `closeInteriorPanels`가 이것도 같이 정리하도록 수정.
  좌측 패널 자리에 "1단계 · 아파트 단지를 선택해 주세요" 헤더 + 단지
  카드 목록(이름/지역/시공건수)을 새로 만들고, 카드 클릭 시
  `openInteriorComplex(marker.id)` 호출로 2단계(단지기본정보)로 넘어감
  — 집테리어 모바일의 1단계→2단계 흐름과 동일. `company_interior`
  레이어(인테리어 업체, 서버 사전 클러스터링 `/viewport` 사용,
  개별 항목 식별 정보 자체가 응답에 없음)는 이번 범위 밖 — 확대만
  하는 기존 동작 유지, 필요하면 서버 응답 스키마 확장이 별도로 필요함.
- **[완료] (4) 부챗살 안정성 수정**: `openInteriorComplex`를 호출하는
  경로가(검색 결과 선택, 방금 만든 클러스터 목록 선택 등) 늘어나면서,
  클릭 시점에 그 단지가 화면에 **개별 마커로 없는**(다른 단지와 뭉쳐
  클러스터 상태이거나 그 위치를 아직 한 번도 안 불러온) 경우가
  흔해졌는데, 기존 코드는 `entry`(그 단지의 지도 위 DOM/오버레이)가
  없으면 그냥 조용히 포기하고 끝나서 — 패널은 열리지만 지도 위
  부챗살은 영영 안 나타나는 게 근본 원인이었음. 이제 `entry`가 없으면
  그 단지의 실제 좌표(캐시된 상세 정보의 latitude/longitude)로 지도를
  이동시켜(`map.setLevel(Math.min(현재레벨,4)); map.setCenter(...)`)
  클러스터를 풀어준다 — 그러면 `idle` 이벤트로 `redrawInteriorClusters`
  가 다시 돌면서 그 단지가 개별 마커로 그려지고, 함수 끝의 기존 복원
  로직(캐시된 상세정보 + entry 존재 확인 후 부챗살 재적용)이 자동으로
  부챗살을 그려준다 — 즉 "언젠가는 반드시 뜨게" 만드는 자가치유 구조.
  추가로 비동기 fetch 도중 사용자가 다른 단지를 또 클릭한 경우 오래된
  응답이 방금 클릭한 단지를 덮어쓰지 않도록 `selectedComplexIdRef`
  기준 최신성 체크(staleness guard)도 같이 넣음(원래 없던 잠재
  버그였음, 김에 같이 고침).
- **[완료] 검증**: `next build` 클린, `npx eslint` 새 오류 없음(기존
  패턴만 유지). 로컬엔 카카오맵 키/집테리어 실 데이터가 없어 마커
  클릭 상호작용 자체는 재현 테스트 못 함 — dev 서버로 `/map` 정적
  렌더링(런타임 에러 없음)만 확인, 실제 마커 클릭 흐름은 배포 후
  사용자 확인 필요.

---

## 2026-08-26 — (이 세션) 다른 세션(`claude/zippalgo360-interior-service-tz2qfv`)과의 브랜치 충돌 발견 및 병합

### 시작 전
- 배포 스크립트 실행 중 서버(`/srv/zippalgo360`)의 `git pull`이
  "divergent branches" 에러로 실패 — 서버가 이 세션이 계속 배포해온
  `claude/jippalgo360-platform-6bvrfh`가 아니라 **다른 브랜치**
  (`claude/zippalgo360-interior-service-tz2qfv`)에 체크아웃돼 있었고,
  그 브랜치에 다른 세션이 진행한 커밋들(이미 origin에 푸시됨,
  유실 위험 없음)이 있어서 갈라진 상태였음.
- 진단: `git merge-base`로 두 브랜치의 분기점이 이 세션의 커밋
  `121ecc8`(햄버거 제거 커밋 직후)임을 확인. 다른 세션은 그 지점에서
  이어받아 (1) 지도 우측 컨트롤 버튼이 위성 지도 위에서 반투명 배경
  때문에 안 보이던 버그를 불투명 흰 배경 + 선택 시 빨간 글자로 수정
  (`apps/web/src/app/map/page.tsx`의 `controlButtonClass` — 이 세션이
  만든 파스텔 그린 배경 버전을 대체), (2) `/zipterior` 임베드 페이지가
  모바일 기기에서는 집테리어의 모바일 전용 경로(`/m`)로 접속하도록
  개선(`apps/web/src/app/zipterior/page.tsx`), (3) 집테리어 서버 쪽에
  같은 색상 통일 + `/m`용 zpEmbed·SSO 스크립트 패치를 진행 — 세 파일
  다 이 세션도 건드렸었지만 실제 겹치는 줄은 없어서(다른 함수/다른
  구간) 병합이 완전히 자동으로 됨.
- **[완료]** `git fetch origin claude/zippalgo360-interior-service-tz2qfv`
  → `git merge origin/claude/zippalgo360-interior-service-tz2qfv`
  실행. `apps/web/src/app/map/page.tsx`, `apps/web/src/app/zipterior/
  page.tsx`는 자동 병합 성공(다른 세션의 버그 수정 버전을 그대로
  채택 — 위성지도 가시성 문제는 실사용 버그라 최신 수정이 우선함).
  `docs/WORK_LOG.md`만 두 세션이 파일 끝에 각자 새 절을 이어붙인
  전형적인 append 충돌 — 기존 프로토콜대로 **양쪽 기록 다 유지**,
  시간순으로 이어붙여 해결(어느 쪽도 삭제하지 않음).
- **[완료] 재검증**: 병합 후 `next build` 클린 재확인(다른 세션의
  `controlButtonClass` 교체가 이 세션이 그 뒤에 추가한 채팅/줌/현재
  위치/레이어 버튼들과 시그니처 호환이라 추가 수정 불필요했음).
- **교훈**: 서버(`/srv/zippalgo360`)가 정확히 어느 브랜치를 추적하는지
  이 세션은 매번 가정만 하고 실제로 확인한 적이 없었다 — 다음부터는
  배포 스크립트에 `git branch --show-current`를 첫 줄로 넣어서 이런
  불일치를 배포 실패 전에 미리 드러내는 게 나음.
- **[완료] 양쪽 브랜치 모두 갱신**: 병합 커밋(`80b88bf`)을
  `claude/jippalgo360-platform-6bvrfh`에 푸시한 뒤, 같은 커밋을
  `claude/zippalgo360-interior-service-tz2qfv`에도 fast-forward로
  푸시(둘 다 그냥 `git push origin <ref>`로 안전하게 fast-forward
  가능함을 push 전에 `git merge-base --is-ancestor`로 미리 확인) —
  서버가 지금 체크아웃돼 있는 브랜치를 그대로 두고 평범한 `git pull`
  한 번이면 두 세션 작업이 전부 반영되도록 만듦(브랜치 전환 요청
  불필요, 다른 세션이 이어서 그 브랜치를 계속 써도 히스토리 그대로
  보존됨 — force push 전혀 안 씀).
- **[완료] 서버 배포 확인**: 사용자가 `git pull`(브랜치 이름 없이,
  현재 체크아웃된 `claude/zippalgo360-interior-service-tz2qfv` 기준)
  실행 → `f4d37f2..4387fd1` fast-forward 성공, 충돌 없음(두 브랜치
  모두 fast-forward 푸시해둔 대로 정확히 동작함). `npm run build`
  클린, `zippalgo360-api`/`web` 재시작 상태 `active`, `/map` HTTP 200
  확인. 이번 병합/배포로 이 세션의 최근 작업(인테리어 패널 왼쪽+2단
  레이아웃, 클러스터 선택 목록, 부챗살 안정성 수정)과 다른 세션의
  작업(위성지도 컨트롤 버튼 가시성 수정, 모바일 `/m` 임베드)이 실서비스
  에 동시에 반영됨.

---

## 2026-08-26 — `/zipterior` 임베드, 모바일 기기는 집테리어 모바일 버전(`/m`)으로 접속

### 시작 전
- 사용자: "zipterior.kr/m으로 접속하면 집테리어 모바일 버전으로 접속하게
  되는데 zippalgo360.com/zipterior 로 모바일 기기로 접속하면 모바일
  버전으로 접속하도록 수정하자 — 집팔고360에 집테리어 다 넣으면
  zipterior.kr은 없어질 예정이라서."
- 현재 `apps/web/src/app/zipterior/page.tsx`는 기기 구분 없이 항상
  `https://zipterior.zippalgo360.com/?zpEmbed=1`(데스크톱 버전) 하나만
  iframe에 넣고 있음 — 모바일 기기로 접속해도 데스크톱 버전이 그대로
  뜸.
- **이 세션은 `zipterior.kr`/`zipterior.zippalgo360.com`에 아웃바운드
  네트워크 접근이 막혀있어(egress 프록시가 차단, 이전 세션들과 동일한
  제약) `/m` 경로의 실제 HTML 구조를 직접 확인할 수 없었음** — 트레일링
  슬래시 유무, `zpEmbed=1`/`sso=` 쿼리스트링이 데스크톱과 동일하게
  동작하는지, 무엇보다 로고 숨김(`zp-zippalgo-embedded` 클래스, 이전
  세션에서 `index.html`/`style.css`에 서버 사이드로 패치함)과 SSO
  자동 로그인 스크립트(역시 `index.html`에 패치됨)가 `/m`이 서빙하는
  파일에도 적용되어 있는지는 코드만으로는 판단 불가. 사용자 확인 필요.

### 진행 중
- **[완료]** `apps/web/src/app/zipterior/page.tsx` — `navigator.userAgent`로
  모바일 기기(Android/iPhone/iPad/iPod/Mobi)를 감지해 iframe src의
  경로를 `/`(데스크톱) 대신 `/m`(모바일)으로 바꾸도록 수정.
  `zpEmbed=1`/`sso=` 쿼리스트링 부착 로직은 기존과 동일하게 유지,
  경로만 갈아끼움 (`buildEmbedUrl(isMobile, ssoCode?)` 헬퍼로 정리).
- **[완료] 검증**: `next build` 클린, `npx eslint` 새 오류 없음.
- **미검증(반드시 실사용 확인 필요)**:
  1. `https://zipterior.zippalgo360.com/m`이 `zipterior.kr/m`과 동일한
     서버/파일을 서빙하는지 (도메인만 다르므로 서빙 자체는 될 것으로
     예상하나 직접 curl/브라우저 확인 못함).
  2. `/m`이 서빙하는 파일이 `index.html`과 별개 파일(예: `m.html` 또는
     별도 디렉토리)이라면, 앞서 `index.html`에어 넣었던 로고 숨김
     (`zpEmbed=1` → `zp-zippalgo-embedded` 클래스)과 SSO 자동 로그인
     삽입 스크립트가 그 파일에는 없을 가능성이 큼 — 있다면 모바일
     iframe에서 집테리어 로고가 다시 보이거나 SSO 자동 로그인이
     안 될 수 있음. 필요시 이전 세션과 같은 방식(SSH로 사용자가
     anchor 기반 패치 스크립트 실행)으로 `/m` 쪽 파일에도 동일 패치를
     추가해야 함.

### 배포 및 후속 확인 (같은 세션, 사용자 SSH 릴레이)
- 사용자가 서버에서 `git checkout claude/zippalgo360-interior-service-tz2qfv`
  → `git pull` → `npm run build` → `sudo systemctl restart
  zippalgo360-web` 실행, 배포 완료.
- **[완료] 검증 1**: `curl -I https://zipterior.zippalgo360.com/m` → `200
  OK`, `curl -s .../m | head`로 확인한 HTML이 스크린샷(집팔고360
  플랫폼바+서비스아이콘 5개+지도/견적요청/포트폴리오/MY집테리어 탭)과
  일치 — 도메인 자체는 정상 서빙 확인.
- **[확인됨] 문제 2 실제로 존재**: `curl -s .../m | grep -i
  "zpEmbed\|nativeMap\|sso"` 결과, `zpEmbed`/`sso` 문자열이 전혀 없음
  (매치된 건 `m.html`이 자기 내부 지도 패널용으로 쓰는
  `index.html?nativeMap=1` iframe 참조뿐, 우리 임베드 감지와 무관).
  즉 로고/플랫폼바 숨김도, SSO 자동 로그인도 지금 `/m`에서는 전혀
  동작 안 함.
- **[완료] 파일 위치 확인**: `ls -la /var/www/zipterior/`로 확인—
  `/m`이 실제로 서빙하는 파일은 `index.html`과 별개인
  **`/var/www/zipterior/m.html`**(정적 파일, 26272 bytes로
  `curl`의 `Content-Length`와 일치). `index.html`에 있던 zpEmbed
  감지 스크립트·style.css의 `zp-zippalgo-embedded` 규칙·SSO exchange
  스크립트는 전부 `index.html` 전용으로 들어가 있어서 `m.html`에는
  하나도 안 들어있던 것 — 다음 단계로 `m.html`에도 동일한 패치를
  넣어야 함(진행 중, 다음 항목 참고).
- 참고로 `/var/www/zipterior/`에는 파일 수정마다 `.bak_YYYYMMDD_HHMMSS_설명`
  백업이 계속 쌓이는 자체 관례가 있음(예:
  `index.html.bak_20260826_094446_before_sso_frontend`가 SSO 패치
  직전 백업으로 추정) — 우리가 `m.html`을 패치할 때도 이 관례를
  따라 패치 전 백업을 먼저 뜨는 게 안전.

### `m.html`에 zpEmbed 감지 + SSO 스크립트 패치 (같은 세션, SSH 릴레이)
- `index.html`은 `nativeMap=1`(m.html이 자기 자신을 내부 지도/상세/채팅
  패널용 iframe으로 재사용할 때 쓰는, 우리 용도와 무관한 기존
  파라미터)→`zt-embedded` 클래스 패턴이 있고 SSO exchange 스크립트도
  있지만(로고 숨김용 `zp-zippalgo-embedded`는 확인 결과 유실됨, 이번
  범위 밖으로 보류), `m.html`은 우리 용도의 `zpEmbed`/`sso` 처리가
  전혀 없었음. `m.html`의 중복 UI는 `.m-platbar`(집팔고360 로고+검색+
  메뉴+알림벨)와 `.m-service-nav`(집팔고/집사고/집테리어/집이사/
  집청소 5개 아이콘, 집테리어만 활성 나머지 "예정") — 둘 다 우리
  Next.js 쪽 전역 `Header.tsx`(모든 라우트 최상단에 항상 렌더링,
  `apps/web/src/app/layout.tsx`)가 이미 제공하는 진짜 헤더/내비게이션과
  내용이 겹침(m.html 쪽은 실제 링크가 아니라 전부 "예정" 표시라 더
  혼란스러움).
- **[완료]** 사용자가 SSH로 python3 heredoc 앵커 패치 실행(패치 전
  `m.html`/`css/mobile.css` 백업 먼저 뜸):
  - `m.html` `<head>`에 `zpEmbed=1` 쿼리스트링 감지 스크립트 추가
    (`nativeMap`→`zt-embedded`와 동일 패턴, 클래스명은
    `zp-zippalgo-embedded`로 index.html 쪽과 통일) — `css/mobile.css`
    링크 태그 캐시버스터도 `v=1.11.5-panel-expand` →
    `v=1.12.0-zp-embed`로 올림.
  - `m.html`에 SSO exchange 스크립트 추가(`index.html`의 기존 스크립트와
    동일 로직 — `?sso=코드`를 `/auth/sso/exchange`로 교환 후
    `ZipteriorAPI.save`+`location.reload()`) — `js/api-client.js` 로드
    직후, `js/customer-data.js` 직전에 삽입.
  - `css/mobile.css`의 기존 `.app-shell.map-panel-open .m-platbar,
    .m-service-nav, .m-subnav{display:none}` 규칙 바로 뒤에
    `html.zp-zippalgo-embedded .m-platbar, .m-service-nav{display:none
    !important}` 추가(`.m-subnav`는 그대로 유지 — 지도/견적요청/
    포트폴리오/MY집테리어 탭은 실제 기능이라 안 건드림).
- **[완료] 검증**: `grep`으로 `m.html`에 두 스크립트, `mobile.css`에
  새 규칙 모두 정상 삽입 확인. **미검증(실사용 확인 필요)**: 브라우저
  로 `zippalgo360.com/zipterior` 모바일 접속 시 실제로 중복 헤더가
  사라지고 로그인 상태가 이어지는지 — curl로는 JS 실행이 안 돼 클래스
  부착 자체는 확인 불가.
- **보류(다음 항목)**: `index.html`의 로고(`.brand-box`) 숨김용
  `zp-zippalgo-embedded` 패치가 유실된 상태라, 데스크톱 임베드
  (`zippalgo360.com/zipterior`를 PC로 접속)에서도 지금은 집테리어
  로고가 다시 노출될 가능성 있음 — 이번 세션 범위 밖이라 손대지
  않았고, 사용자에게 별도 확인 요청 필요.

### 후속: PC 로고 숨김 복원 + 모바일 검색창 확대 버그 수정
- 사용자 실사용 확인 결과: (1) 위에서 보류했던 PC 로고 노출 실제로
  재현됨 → 수정 요청. (2) 모바일에서 `/zipterior` 메인화면 검색창을
  누르면 "아파트 검색" 전체화면 오버레이가 뜨면서 화면 자체가 확대된
  것처럼 리사이징되는 버그 리포트(스크린샷 첨부).
- **원인(2번)**: iOS Safari는 포커스되는 `<input>`의 `font-size`가
  16px 미만이면 자동으로 페이지를 확대한다 — `.m-search-box input`이
  `font-size:14px`였음(로그인 폼의 `.m-login-id-row/.m-login-pw-row
  input`도 동일하게 14px, 같은 버그 소지가 있어 같이 고침).
- **[완료]** `index.html` — `m.html`에 넣은 것과 동일한 패턴으로
  `zpEmbed=1` 감지 스크립트 신규 추가(이전엔 아예 없었음, `nativeMap`
  스크립트와는 별개), `css/style.css` 링크 캐시버스터
  `v=2.5.80-map-compact` → `v=2.5.81-zp-embed`.
- **[완료]** `css/style.css` 파일 끝에
  `html.zp-zippalgo-embedded .brand-box{display:none!important}` 추가.
- **[완료]** `css/mobile.css` — `.m-search-box input`,
  `.m-login-id-row/.m-login-pw-row input` 두 곳 모두
  `font-size:14px` → `16px`.
- **[완료] 검증**: 패치 직후 터미널 출력이 큰 heredoc 붙여넣기로
  한 번 뒤섞여서(`anchor1 매치 0개` AssertionError로 보이는 텍스트가
  같이 찍힘) 실제 반영 여부가 불확실했으나, 재확인 결과 오탐으로
  확인됨 — `grep -c`로 `index.html`/`style.css` 양쪽 다
  `zp-zippalgo-embedded` 정확히 1개씩만 존재(중복 삽입 없음),
  `index.html`의 `<link>` 버전도 `v=2.5.81-zp-embed`로 정상 반영,
  **원격 `curl -s https://zipterior.zippalgo360.com/?zpEmbed=1`로도
  스크립트/버전 정상 서빙 확인**(정적 파일이라 서버 재시작 불필요,
  파일 저장 즉시 반영). `mobile.css`의 `font-size:16px` 두 곳도
  로컬 grep으로 확인.
- **미검증(실사용 확인 필요)**: 브라우저로 PC 로고 안 보이는지,
  모바일 검색창 눌렀을 때 더 이상 확대 안 되는지.

### 후속: 지도 우측 컨트롤 버튼을 /map 페이지와 같은 색상으로 통일
- 사용자 요청: "현재 map 오른쪽 버튼스타일로 집테리어 접속시 지도화면의
  오른쪽 버튼에도 적용" — `zippalgo360.com/map`에서 이미 통일해둔
  흰 배경/파스텔 그린 활성 상태 버튼 스타일을 집테리어 지도 화면
  (줌/현재위치/지도유형/평·㎡/레이어)에도 적용해달라는 요청.
- **판단**: 지도유형(일반|위성)·평/㎡ 버튼은 지금 2버튼 pill 구조
  (`.map-type-control`/`.area-unit-control`, 각 버튼 30×28px, 선택
  시 진초록 단색 채움)라 `/map`처럼 "단일 토글 버튼"으로 완전히
  바꾸려면 자바스크립트까지 손대야 해서 실서비스 지도가 깨질 위험이
  있음 — **구조/동작(pill, JS)은 그대로 두고 색상·테두리·그림자만**
  `/map`과 통일하는 것으로 범위를 정함(사용자에게 이 판단을 설명하고
  바로 진행, 별도 승인 대기 없이 실행). 또한 `zipterior.kr` 직접
  방문자 화면에는 전혀 영향 없도록 `html.zp-zippalgo-embedded` 스코프
  안에서만 적용(`zpEmbed=1`일 때만).
- **[완료]** `css/style.css` 파일 끝에 스코프 규칙 추가 —
  `.zipterior-zoom-control`/`.locate-control`/`.map-type-control`/
  `.area-unit-control`/`.marker-style-control` 컨테이너를 흰 배경
  카드(`rgba(255,255,255,.95)`, 테두리 `#e6e9e7`, `border-radius:12px`,
  옅은 그림자)로, 각 버튼 기본 텍스트는 `rgba(32,36,33,.7~.8)`
  (`--color-ink`), 활성/hover 상태는 파스텔 그린
  `rgba(33,70,59,.15)` 배경 + `#21463b`(`--color-brand-green`) 글자로
  통일(`apps/web/src/app/globals.css`의 실제 브랜드 색상 값을 그대로
  가져다 씀). pill 구분선(`<span>|</span>`)은 옅은 회색으로 톤다운만.
- **[완료]** `index.html`의 `css/style.css` 링크 캐시버스터
  `v=2.5.81-zp-embed` → `v=2.5.82-zp-controls`로 재차 갱신.
- **[완료] 검증**: `curl -s https://zipterior.zippalgo360.com/?zpEmbed=1`
  로 링크 버전 갱신 확인, `curl -s
  https://zipterior.zippalgo360.com/css/style.css?v=2.5.82-zp-controls`
  로 새 규칙 4줄 모두 정상 서빙 확인(원격 실서비스 기준).
- **미검증(실사용 확인 필요)**: 브라우저로 실제 버튼 색상이 의도한
  대로 바뀌었는지, pill 레이아웃이 안 깨졌는지(글꼴/줄바꿈 등).

### 후속: 위성지도에서 컨트롤 버튼이 안 보이는 문제 (반투명 → 불투명)
- 사용자 실사용 확인: 위성 지도 위에서는 배경(rgba(255,255,255,.95)
  반투명 흰색 + blur)이 위성 이미지에 묻혀 버튼이 잘 안 보임.
- **[완료]** `css/style.css`의 방금 추가한 컨트롤 카드 배경을
  `rgba(255,255,255,.95)` → `#fff`(완전 불투명)로, 의미 없어진
  `backdrop-filter:blur(8px)`도 `none`으로 변경(반투명이 아니라 블러
  효과 자체가 안 보임). `index.html`의 `style.css` 캐시버스터
  `v=2.5.82-zp-controls` → `v=2.5.83-opaque-controls`.
- **[완료] 검증**: `curl -s
  https://zipterior.zippalgo360.com/css/style.css?v=2.5.83-opaque-controls`
  로 실서비스에 `background:#fff` 정상 반영 확인.
- **미검증(실사용 확인 필요)**: 위성 지도 위에서 실제로 버튼이 잘
  보이는지.

### 후속: 선택(active) 상태도 여전히 반투명이라 안 보임 → 흰 배경 고정 + 빨간 글자
- 사용자 재확인: 안 보이던 건 기본 상태가 아니라 **클릭해서 선택된
  (active) 상태** — `rgba(33,70,59,.15)`(반투명 파스텔 그린)도 위성
  지도 위에서 마찬가지로 묻힘. 사용자 지시: 선택 상태도 배경은 그냥
  흰색으로 두고, 글자색만 빨간색으로 바꾸자.
- **[진행 중, 서버 실행 확인 안 됨] 집테리어 서버**: `css/style.css`의
  `.locate-control.active`, `.map-type-control/.area-unit-control
  button.active`, `.zipterior-zoom-control button:hover/:active`
  전부 배경을 `rgba(33,70,59,.15)` → `#fff`(고정 불투명), 글자·테두리
  색을 `#21463b`(그린) → `#bb1730`(브랜드 레드)로 바꾸는 패치 스크립트
  준비함. `index.html` 캐시버스터도 `v=2.5.83-opaque-controls` →
  `v=2.5.84-active-red-text`로 올리게 되어있음. **중간에 제가 이 세션
  로컬 샌드박스에서 실수로 먼저 이 스크립트를 실행해봐서 "No such
  file" 에러가 났음(서버가 아니라 세션 자체 컨테이너에서 실행됨) —
  실수 인지 후 사용자에게 올바른 블록을 다시 전달했으나, 사용자가
  실제로 서버 SSH에서 실행했다는 확인은 아직 못 받음.** 다음 턴에
  꼭 확인/재요청 필요.
- **[완료] 우리 저장소**: 사용자가 "PC버전도 같이 바꿔야지"라고
  지적 — 저희 자체 `apps/web/src/app/map/page.tsx`의
  `controlButtonClass`도 선택 상태에 동일한 반투명 파스텔 그린
  (`bg-brand-green/15`)을 쓰고 있어 같은 문제가 잠재해있었음(아직
  실사용 리포트는 없었지만 동일 원인이라 선제 수정). 기본/선택 상태
  모두 배경을 불투명 흰색(`bg-white`)으로 고정하고, 선택 상태는
  테두리·글자색만 `border-brand-red text-brand-red`로 변경.
  `backdrop-blur`는 완전 불투명 배경에서 의미가 없어져 같이 제거.
- **[완료] 검증**: 집테리어 쪽은 `curl`로 실서비스 CSS에
  `color:#bb1730` 반영 확인. 우리 쪽은 로컬 `next build` 클린,
  git 커밋 완료(아직 서버 미배포 — 다음 배포 시 `git pull` →
  `npm run build` → `systemctl restart zippalgo360-web` 필요).
- **미검증(실사용 확인 필요)**: 양쪽 다 브라우저로 위성 지도 위에서
  선택된 버튼(흰 배경 + 빨간 글자)이 잘 보이는지.

### 후속: "zipterior.kr/m과 100% 동일해야 한다" — m.html 플랫폼바 숨김 되돌림
- 사용자 재확인: 맨 처음 요청("zipterior.kr/m 접속 화면과 동일하게
  나와야 함")을 다시 강조. 그 사이 제가 "집팔고360 자체 헤더와
  중복된다"고 판단해서 임의로 넣었던 `.m-platbar`/`.m-service-nav`
  숨김 CSS(zpEmbed 스코프)가 오히려 "동일해야 한다"는 원 요청과
  충돌하는 제 임의 판단이었음을 인지 — 사용자 요청대로 완전 원복.
- **[완료]** `css/mobile.css`에서 `html.zp-zippalgo-embedded
  .m-platbar, .m-service-nav{display:none!important}` 규칙 삭제.
  `m.html`의 `mobile.css` 캐시버스터 `v=1.12.0-zp-embed` →
  `v=1.12.1-revert-platbar-hide`.
  (zpEmbed 감지 스크립트 자체와 SSO exchange 스크립트는 유지 —
  전자는 지금 반응하는 CSS가 없어 시각적으로 완전히 무해, 후자는
  로그인 자동 연동이라는 별개의 의도된 기능이라 유지.)
- **[완료] 검증**: 서버에서 `diff <(curl -s https://zipterior.kr/m)
  <(curl -s https://zipterior.zippalgo360.com/m)` 실행 →
  **"완전히 동일함(차이 없음)"** — 두 URL이 파라미터 없이 접속 시
  100% 동일한 HTML을 서빙함을 실측으로 확인. (참고: `?zpEmbed=1&sso=`
  파라미터가 붙는 실제 임베드 상황에서는 로그인된 사용자의 경우
  SSO 자동 로그인으로 화면이 "로그인 상태"로 보일 수 있음 — 이는
  의도된 차이이지 버그 아님, 사용자에게 설명함.)
- **미검증(실사용 확인 필요)**: 브라우저로 실제 모바일 접속 시
  `zipterior.kr/m`과 육안으로도 동일하게 보이는지.

### 후속: `/map` 버튼 색상 수정 서버 배포 + 동시 작업 중인 다른 세션 커밋 병합 확인
- 사용자가 `git checkout` → `git pull` → `npm run build` →
  `systemctl restart zippalgo360-web`로 배포 실행, 빌드 성공.
- **[확인] 다른 동시 세션의 커밋이 이 브랜치에 같이 들어와 있음**:
  `git pull` 결과가 `docs/WORK_LOG.md`만 9줄 바뀐 것처럼 보였지만,
  이 세션 쪽에서 다시 `git fetch`+로그 확인해보니 실제로는 origin의
  `claude/zippalgo360-interior-service-tz2qfv`에 이 세션이 모르는
  커밋 3개(`b7af698`/`4387fd1`/`4d07aa5`)가 추가로 올라와 있었음.
  `b7af698`("인테리어 시공사례 패널 왼쪽+2단 레이아웃, 클러스터 선택
  목록" 등)은 **동시에 같은 저장소에서 작업 중인 다른 Claude
  세션**(브랜치 `claude/jippalgo360-platform-6bvrfh`)의 작업으로,
  `apps/web/src/app/map/page.tsx`를 이 세션과 겹치게 수정했지만
  git이 충돌 없이 자동 병합함(다른 부분을 건드림).
- **[완료] 검증**: 로컬에서 `git pull`로 같은 상태 동기화 후
  `controlButtonClass`가 이번 세션이 만든 흰 배경+빨간 글자 스타일
  그대로 남아있는지 grep으로 확인(다른 세션 커밋에 덮어써지지 않음),
  `next build` 클린 재확인.
- **참고**: 두 세션이 같은 파일을 동시에 건드리고 있어서 앞으로도
  이런 병합이 반복될 수 있음 — 다음 세션은 배포 전 항상 origin의
  최신 커밋 로그를 한 번 더 확인하는 게 안전.

### 후속: 지도유형/평·㎡을 pill 2버튼에서 /map과 같은 "단일 토글 버튼"으로
- 사용자: `zippalgo360.com/map`의 우측 버튼 정리된 상태를 스크린샷으로
  보여주며 "집테리어 접속 시 지도화면도 똑같이 정리해줘"(내 주변
  시공사례 위젯은 그대로 유지) 요청.
- **구현**: `app.js`(핵심 지도 로직)는 전혀 건드리지 않고, 두 가지만
  추가:
  1. `css/style.css` — `html.zp-zippalgo-embedded` 스코프 안에서
     `.map-type-control`/`.area-unit-control`의 비활성 버튼과 `|`
     구분선을 숨기고, 활성 버튼만 컨테이너 전체(44×44px)를 채우게 함.
  2. `index.html`에 새 스크립트 삽입(`locateControl` 버튼 바로 뒤) —
     `zp-zippalgo-embedded`일 때만 동작, 보이는(활성) 버튼을 누르면
     숨겨진 비활성 버튼을 `element.click()`으로 대신 클릭해 기존
     `data-map-type`/`data-area-unit` 클릭 핸들러를 그대로 재사용
     (`HTMLElement.click()`은 `display:none`이어도 그 요소의 리스너를
     실행시키므로 안전 — app.js 자체 로직·상태 변경 없음).
  `index.html` 캐시버스터 `v=2.5.84-active-red-text` →
  `v=2.5.85-single-toggle`.
  - **범위를 정한 이유**: 버튼들의 세로 배치 순서까지 `/map`과 완전히
    맞추는 건(줌→현재위치→지도유형→평/㎡ 순서) 하지 않음 — 지금 각
    컨트롤이 독립적으로 `position:absolute`+개별 `top/right` 값을
    가지고 있고 `zt-compact`/`zt-embedded`/모바일 미디어쿼리마다
    좌표가 다 다르게 튜닝돼 있어서, DOM 순서/좌표를 옮기면 특정
    화면 크기에서 깨질 위험이 큼. 사용자가 요청한 "정리"의 핵심(pill
    2버튼 → 깔끔한 단일 버튼)만 낮은 리스크로 구현.
  - "내 주변 시공사례" 위젯(`.local-stats`)은 요청대로 손대지 않음.
- **[완료] 검증**: `curl`로 실서비스에 `wireToggle` 스크립트 3회
  등장(함수 정의+호출 2번), `single-toggle` CSS 규칙 정상 반영 확인.
- **미검증(실사용 확인 필요)**: 실제로 버튼을 눌렀을 때 지도유형/
  평·㎡가 정상적으로 전환되는지(코드로 대신 클릭하는 방식이라 반드시
  실제 클릭 테스트 필요), 위성지도 전환 시 버튼 자체 표시도 정상인지.

---

## 2026-08-26 — 단지 마커 클릭 시 왼쪽 패널을 감안해 지도 중심 보정

### 시작 전
- 사용자가 배포 후 실제 화면 스크린샷 첨부: 마커 클릭 시 부챗살은
  뜨지만 왼쪽 단지기본정보 패널 바로 옆(거의 붙어서 반쯤 가려진
  자리)에 어정쩡하게 위치함. "마커 클릭하면 지도가 이동하면서 마커가
  지도 가운데 오도록 하고 왼쪽에 단지정보 노출 되도록 조정" 요청.

### 진행 중
- **원인**: 인테리어 패널은 지도 위에 `position:absolute`로 뜨는
  오버레이라 지도 `<div>` 자체의 폭은 줄어들지 않는다. 그래서
  `map.setCenter(target)`을 부르면 target은 **지도 전체 폭 기준
  정중앙**에 오는데, 그 정중앙 근처 왼쪽 448px(`LEFT_PANEL_WIDTH_PX`,
  패널 폭)가 패널에 가려져 있어 마커가 패널 바로 옆/뒤에 걸치게 됨.
  게다가 개별(비클러스터) 마커를 직접 클릭하는 가장 흔한 경로
  (`openInteriorComplex`의 "entry 있음" 빠른 경로)는 애초에 지도를
  전혀 움직이지 않고 있었음(마커가 그 자리에 이미 있으니 손 안 댐) —
  그래서 원래 마커 위치가 화면 왼쪽 근처였다면 패널이 열리자마자
  그 위로 덮여버림.
- **[완료]** `centerMapOnComplex(lat, lng)` 헬퍼 신규 작성 — 카카오맵
  SDK의 `Projection.coordsFromContainerPoint`로 "지도 컨테이너 기준
  (정중앙 − 패널폭/2) 지점의 실제 좌표"를 구해 그걸 새 지도 중심으로
  삼는 방식(먼저 target을 정중앙에 놓은 뒤 이 계산을 하면, target은
  새 중심보다 패널폭/2만큼 오른쪽에 남아 원하는 자리 — "패널을 뺀
  나머지 화면 영역의 정중앙" — 에 오게 됨). `coordsFromContainerPoint`
  가 없는 경우(구버전 SDK 등)엔 조용히 단순 setCenter로 폴백.
- **[완료]** 이 헬퍼를 세 곳에 적용: (1) `openInteriorComplex`의
  "entry 있음"(표준 마커 직접 클릭) 경로 — 원래 지도를 전혀 안
  움직이던 것에 새로 추가. (2) 같은 함수의 "entry 없음"(클러스터
  안에 있었거나 미로딩) 폴백 경로 — 기존 plain `setCenter`를 교체.
  (3) 검색 결과에서 단지를 선택했을 때(`handleSelectSearchResult`)
  — 여기서 먼저 plain `setCenter`를 부르면 뒤이어 호출되는
  `openInteriorComplex`가 또 한 번 움직여 화면이 두 번 튀어 보이는
  문제가 있어, 이 경로에서는 plain `setCenter` 호출 자체를 제거하고
  `openInteriorComplex` 안의 보정된 이동에 맡기도록 정리.
- **[완료] 검증**: `next build` 클린, `npx eslint` 새 오류 없음(기존
  패턴만 유지). 로컬엔 실제 카카오맵 SDK 인스턴스가 없어
  `Projection.coordsFromContainerPoint` 좌표 계산 자체를 실행해 볼
  방법이 없었음 — 카카오맵 공식 API 문서상의 메서드명·동작 방식을
  근거로 작성, 배포 후 사용자 실사용 확인 필요.

---

## 2026-08-26 — 클러스터 선택 목록에서 단지를 골랐을 때 지도가 안 움직이던 문제 수정

### 시작 전
- 사용자: 중앙 정렬 보정은 잘 되는데(개별 마커 직접 클릭 케이스 확인
  완료), 여러 단지가 뭉친 마커 클릭 → 목록에서 단지 1개 선택 →
  단지정보는 뜨는데 지도는 그대로 멈춰있음. "이때도 해당 단지 마커를
  선택한거랑 같은 개념이니까 해당 단지로 지도 이동하고 부챗살 마커도
  보여줘야지."

### 진행 중
- **원인 추정**: `openInteriorComplex`는 단지 상세 API 응답을
  `await`한 **뒤에야** 지도를 이동시키는 구조라, 클러스터 목록 선택
  경로에서는 네트워크 왕복만큼 반응이 늦어질 뿐 아니라, 화면에 개별
  마커가 없을 때 줌을 `Math.min(현재줌, 4)`로만 조정해서 이미 4보다
  가까운 줌이면 전혀 안 당겨져 두 단지가 계속 같은 격자 셀에 남아
  재클러스터링되는 경우가 있었음 — 그러면 부챗살을 그릴 개별 마커
  자체가 다음 redraw에서도 안 생겨서 "지도도 안 움직이고 부챗살도
  안 뜨는" 것처럼 보임.
- **[완료]** 목록 항목 자체가 이미 좌표(`ZipteriorMapMarker.latitude/
  longitude`)를 갖고 있으므로, 클릭 즉시(비동기 fetch를 기다리지 않고)
  `centerMapOnComplex`로 먼저 지도를 이동시키고, 줌은 확실히 클러스터가
  풀리도록 고정값(3)으로 당김 — `openInteriorComplex`는 그 뒤에
  이어서 호출해 부챗살·패널을 마저 처리(좌표가 같아 두 번째 이동은
  실질적으로 no-op, 화면이 튀지 않음).
- **[완료]** 같은 이유로 검색 결과에서 단지를 선택하는 경로
  (`handleSelectSearchResult`)도 동일하게 수정 — 검색 결과 항목의
  좌표로 즉시 이동 후 `openInteriorComplex` 호출.
- **[완료]** `openInteriorComplex`의 "entry 없음" 폴백 경로 줌 로직도
  `Math.min(현재줌, 4)` → `Math.min(현재줌, 3)`으로 좀 더 확실하게
  당기도록 조정(클러스터 해제 신뢰성 강화).
- **[완료] 검증**: `next build` 클린, `npx eslint` 새 오류 없음.
  마찬가지로 로컬에 실제 카카오맵 인스턴스가 없어 클러스터 목록 선택
  후 지도가 실제로 움직이는지는 재현 테스트 못 함 — 배포 후 확인 필요.
---

## 2026-08-26 — (이 세션) 집서비스 화면 재설계 — 숨고/아정당 스타일 + 회원가 비교

### 시작 전
- 위 인계 기록을 이어받아 이 세션이 진행. 사용자 요청: 최신 트렌드
  (숨고·아정당류 견적 매칭 플랫폼)에 맞는 디자인으로 PC/모바일 모두
  재설계하고, 집사고/집테리어처럼 "견적 신청 → 업체 매칭" 흐름을 갖추되,
  **집팔고360 회원(집팔고/집테리어 이용 고객)이면 더 저렴한 회원가**를
  일반가와 비교해서 부각시켜 보여줄 것.
- 백엔드는 건드리지 않기로 함 — 인계 기록의 권고대로 기존
  `POST /lifestyle/interest` 스키마(6개 카테고리 + `pyeong`/`home_style`)를
  그대로 재사용. "회원"은 별도 등급 데이터가 없어 **집팔고360에 로그인된
  사용자 = 회원가 적용 대상**으로 단순화(이미 집팔고360이 통합회원 신원
  기준이라는 아키텍처 원칙과 일치).
- 가격 비교에 쓸 실제 시세 데이터가 없어(서비스 자체가 아직
  `preparing` 상태, 실제 업체 매칭 전) **참고용 평균 시세 범위 +
  회원 할인율(정적 값)**로 구현하고, 화면/FAQ에 "참고용" 문구를 명시해
  확정 견적으로 오인되지 않게 함 — 실제 매칭 데이터가 쌓이면 이 정적
  값을 교체하면 됨.

### 진행 중
- **[완료] `apps/web/src/lib/lifestyle-data.ts` 신규** — 카테고리 6종
  메타데이터(라벨/설명/지역 라벨/카테고리별 빠른 질문 2개 내외/평균
  시세 범위/회원 할인율)를 한 곳에 정의. 견적 마법사와 랜딩 페이지가
  공유.
- **[완료] `apps/web/src/components/lifestyle/` 신규 컴포넌트**
  - `CategoryIcon.tsx` — 의존성 추가 없이 인라인 SVG로 카테고리별
    라인 아이콘 6종(트럭/반짝임/스프레이/냉장고/소파/와이파이).
  - `CategoryGrid.tsx` — 랜딩의 카테고리 6칸 그리드(아이콘+평균가+CTA,
    `/zipservice/new?category=`로 이동).
  - `MemberBenefitSection.tsx` — 일반가 vs 회원가 비교 카드 섹션
    (로그인 상태에 따라 "회원가 적용 대상" 배지 또는 "가입하고 확인"
    CTA 전환).
  - `ZipServiceFaq.tsx` — 아코디언 FAQ(참고 시세라는 점 등 고지).
  - `MobileStickyCta.tsx` — 모바일 전용 하단 고정 CTA 바.
  - `ZipServiceWizard.tsx` — 기존 단일 폼(`ZipServiceForm.tsx`, 삭제됨)을
    대체하는 4단계 마법사(카테고리 선택 → 카테고리별 빠른 질문(칩
    선택, appliance/furniture는 기존 평형/스타일 입력 유지) → 일정·지역
    → 신청자 정보+가격 요약+제출). 빠른 질문 응답은 백엔드 스키마 변경
    없이 `memo` 필드에 읽기 좋은 텍스트로 합쳐서 전송.
- **[완료] `/zipservice` 페이지 재설계** — 히어로(카피+일반가/회원가
  예시 카드) → 신뢰 요소 4종 → 회원가 비교 섹션 → 카테고리 그리드 →
  진행 단계(4단계) → FAQ → 하단 CTA 배너, 모바일은 하단 고정 CTA 바.
- **[완료] `/zipservice/new` 신규 라우트** — `zipsago/new`와 동일한
  패턴으로 `Suspense`로 감싸 `useSearchParams`(카테고리 쿼리 파라미터
  프리셋) 사용.
- **[완료] 검증**: `npm run build`(Next 16 Turbopack) 클린 통과,
  `npm run lint` 통과(기존에 있던 무관한 15개 lint 오류는 이 세션이
  건드리지 않은 파일들 — `auth-context.tsx`, `zipterior/page.tsx`,
  `zipsago/assignments/page.tsx`, `InteriorComplexPanel.tsx`,
  `InteriorPortfolioPanel.tsx`, `kakao-maps.ts` — 이번 작업 범위 밖이라
  손대지 않음). `npm run dev` 띄운 뒤 Playwright로 PC(1440px)/모바일
  (390px) 스크린샷 확인 — 히어로 카드 하단 "누적 카테고리" 플로팅
  배지가 참고 문구 텍스트와 겹치는 버그를 발견해 `absolute -bottom-5`
  배치를 카드 아래 일반 흐름 배치로 수정, 재스크린샷으로 해결 확인.
  마법사 4단계 진행/칩 선택/유효성 검증(다음 버튼 비활성화)도 브라우저
  상호작용으로 확인.

### 완료 후
- 로컬 검증 완료. **서버 미배포** — 이 세션은 서버에 SSH 직접 접속이
  안 되므로, 사용자가 아래 명령어를 서버에서 실행해야 반영됨(백엔드
  변경 없음, `zippalgo360-api` 재시작 불필요):
  ```bash
  cd /srv/zippalgo360
  git pull origin claude/jippalgo360-service-screen-lmv8de
  cd apps/web
  npm run build
  sudo systemctl restart zippalgo360-web
  ```
- 다음에 이어받는 세션이 알아야 할 것: 가격 비교에 쓰인 시세/할인율은
  전부 `apps/web/src/lib/lifestyle-data.ts`의 정적 값(참고용, 실제
  업체 매칭 데이터 없음)이다. 실제 업체가 붙거나 실 견적 데이터가
  쌓이면 이 파일의 `priceRange`/`memberDiscountPct`를 실데이터 기반으로
  교체할 것.

---

## 2026-08-26 — (이 세션) 업체 프로필(사진·홍보문구·직접 선택) UI 목업 추가

### 시작 전
- 사용자 추가 요청: 숨고처럼 "업체 사진 + 홍보 내용을 보고 고객이 직접
  업체를 선택"하는 화면도 포함해서 디자인을 다시 뽑아달라고 함. 참고용
  숨고 URL도 공유했으나, 이 세션의 네트워크 egress 정책이
  `soomgo.com`을 차단해서 실제 사이트는 열어보지 못함(우회 시도하지
  않고 사용자에게 그대로 보고함) — 숨고의 잘 알려진 "고수 프로필 카드"
  패턴(사진/평점/응답률/뱃지/한줄소개 + 견적요청 버튼)을 일반 지식으로
  적용.
- **중요한 판단**: "업체 사진/홍보 내용"을 보여주려면 실제 업체 데이터
  (사진, 소개글, 후기)가 있어야 하는데, 현재 DB엔 그런 컬럼이 없고
  실제로 가입된 이사/청소 업체도 0건이다(온보딩 페이지가 아직
  `real_estate` 타입만 지원). 그래서 실제 업체인 것처럼 보이는 가짜
  데이터를 백엔드에 심어 라이브 사이트에 배포하는 것은 사용자를
  기만할 위험이 있다고 판단 — AskUserQuestion으로 구현 범위(실기능 vs
  디자인 목업)를 먼저 물었으나 사용자가 그 질문을 넘기고 대신 "숨고
  사이트 보고 디벨롭해봐, 일단 목업으로 만들고 적용하는게 낫지
  않나?"라고 직접 답을 줌 → **이번 라운드는 프론트엔드 전용 목업으로
  한정, 백엔드(`apps/api`)는 전혀 건드리지 않음.** 목업 업체명도 실제
  존재할 법한 특정 브랜드를 흉내내지 않도록 일반적인 조합형 이름만
  사용(예: "든든이사 파트너스", "클린맘 홈케어").

### 진행 중
- **[완료] `apps/web/src/lib/mock-companies.ts` 신규** — 파일 최상단에
  "이 데이터는 실제 업체가 아니며, 실제 적용 시 백엔드 스키마 확장과
  실 데이터 연동이 필요하다"는 경고 주석을 남김. 카테고리 6종 각각에
  1~2개씩 총 7개 목업 업체(이름/한줄소개/설명/뱃지/평점/후기수/응답률/
  응답시간/완료건수/서비스지역/그라디언트 컬러/회원혜택 문구).
- **[완료] 신규 컴포넌트**
  - `CompanyLogo.tsx` — 실제 사진 대신 업체명 첫 글자 + 그라디언트로
    만든 플레이스홀더 로고(외부 이미지·실사 사진 없이도 "있어 보이는"
    카드 디자인을 위함).
  - `ProCard.tsx` — 숨고 스타일 업체 카드(로고+평점+뱃지+응답률/응답
    시간/완료건수/서비스지역+회원혜택 문구+"프로필 보기"/"이 업체에
    견적요청" 버튼 2개).
  - `FeaturedCompanies.tsx` — 랜딩 페이지에 노출할 추천 업체 3곳 섹션.
- **[완료] `/zipservice/companies` 신규 페이지** — 카테고리 탭으로
  필터링되는 업체 목록 그리드(`useSearchParams`로 카테고리 쿼리
  프리셋 지원, `Suspense`로 감쌈). 하단에 "위 업체 프로필은 디자인
  검토를 위한 예시" 고지 문구 추가(기존 가격 비교 섹션의 참고용 고지
  패턴과 동일하게).
- **[완료] `/zipservice/companies/[id]` 신규 페이지** — 업체 상세
  프로필(커버+로고, 소개, 뱃지, 서비스지역/회원혜택, 목업 후기 3건,
  "이 업체에 견적요청" CTA). 기존 `zippalgo/listings/[id]`와 동일한
  패턴(`"use client"` + `useParams()`)으로 구현 — 이 Next.js 16
  프로젝트는 `AGENTS.md`가 "훈련 데이터와 다를 수 있다"고 명시하고
  있어 기존 동적 라우트 관례를 그대로 따름.
- **[완료] `ZipServiceWizard.tsx` 확장** — `?company=<id>` 쿼리로
  들어오면 해당 업체를 자동 타겟팅(카테고리도 업체 기준으로 자동
  프리셋)하고 상단에 선택된 업체 칩을 표시, "전체 업체에게 받기"로
  해제 가능. 백엔드 스키마는 바꾸지 않았으므로 타겟 업체명은 기존
  `memo` 필드 맨 앞줄("요청 업체: OOO")에 얹어서 전송 — 실제 업체별
  라우팅/알림 기능은 아직 없음(이 목업 라운드의 범위 밖).
- **[완료] `/zipservice` 랜딩에 반영** — 히어로 CTA에 "업체 둘러보고
  선택하기" 버튼 추가, `CategoryGrid` 각 카드에 "업체 둘러보기" 보조
  링크 추가(카드 전체를 `<Link>`로 감싸던 구조를 `<div>`+내부 2개
  `<Link>`로 변경해 중첩 앵커 문제 회피), `MemberBenefitSection`/
  `CategoryGrid` 다음에 `FeaturedCompanies` 섹션 삽입.
- **[완료] 검증**: `npm run build`(Turbopack) 클린 통과 —
  `/zipservice/companies`(정적), `/zipservice/companies/[id]`(동적)
  포함. `npm run lint`에서 이번에 건드린 파일 관련 오류 없음(기존에
  있던 무관 파일 lint 오류는 그대로, 손대지 않음). `npm run dev` +
  Playwright로 PC(1440px)/모바일(390px) 스크린샷 확인 — 업체 목록
  그리드/탭 필터, 업체 상세 프로필, 마법사에 업체 칩이 뜨는 흐름까지
  전부 정상 동작 확인.

### 완료 후
- 로컬 검증 완료, 커밋/푸시는 이 기록 직후 진행 예정. **서버
  미배포** — 이전과 동일하게 사용자가 서버에서 `git pull` →
  `npm run build` → `zippalgo360-web` 재시작 필요(백엔드 변경 없음).
- **다음 세션·사용자가 결정해야 할 것**: 이 업체 프로필 UI를 실제로
  "적용"하려면 (1) `apps/api`의 `companies` 테이블에 사진/소개/뱃지용
  컬럼과 공개 조회 API 추가, (2) 이사/청소 등 업체 타입 온보딩 UI
  개설(현재 `onboarding/company`는 `real_estate`만 지원), (3) 견적
  요청이 특정 업체에게 실제로 전달·알림되는 라우팅 로직 추가가
  필요함. 그 전까지 `mock-companies.ts`의 데이터는 **디자인 검토
  용도로만 사용**하고, 실제 서비스 오픈 전에 반드시 실 데이터로
  교체할 것 — 다음 세션이 이 사실을 모른 채 이 화면을 그대로
  실서비스로 안내하지 않도록 굵게 남겨둠.

---

## 2026-08-26 — (이 세션) 숨고 홈 화면 구조를 그대로 참고해 `/zipservice` 전면 재구성 (PC 우선)

### 시작 전
- 사용자가 숨고 홈 화면 스크린샷 여러 장(상단 검색 히어로, 카테고리
  아이콘 그리드, "오늘의 추천 고수", 프로모 배너, "지금 필요한 서비스"
  4카드, 포트폴리오, 커뮤니티 인기글, "숨고 이야기" 매거진, 지역 칩 +
  업체 리크루트 섹션까지)을 직접 업로드하며 "숨고 화면하고 100%
  똑같이 만들어봐, 일단 목업으로, PC 버전부터"라고 요청. 이어서 "이미지
  여기저기 쓰고, CI·로고만 집서비스로 바꾸고 색상은 집팔고 CI 색상
  사용"이라고 구체화함.
- 헤더/푸터는 사이트 전체가 공유하는 전역 컴포넌트(`layout.tsx`)라
  숨고 스타일로 새로 만들지 않고 기존 것 그대로 둠 — 이번 작업은
  `/zipservice` 페이지의 검색 히어로부터 하단 CTA까지 **콘텐츠
  영역 전체**를 숨고 홈 구조에 맞춰 다시 짬.
- 색상은 숨고의 보라색 대신 기존 `globals.css`에 정의된 집팔고360
  CI(브랜드 레드 `--color-brand-red`, 그린 계열
  `--color-brand-green/-2/-3`, 블루 `--color-brand-blue`)만 순환
  사용 — 새 색상 토큰을 추가하지 않음.
- "이미지도 가져다 쓰라"는 요청은, 실사진을 스크래핑하거나 가짜 업체
  사진처럼 보이게 만들 수 없어서(이전 라운드에서 이미 "실제 업체
  아님" 원칙을 세움) 대신 아이콘 일러스트 카드(색상 배경 + 라인
  아이콘)로 대체 — 사진처럼 보이되 특정 실물을 사칭하지 않는 방식.
  숨고의 커뮤니티 인기글 같은 자사에 없는 기능은 "집서비스 인기
  후기" 같은 정직한 형태로 재해석함.

### 진행 중
- **[완료] 신규 아톰 컴포넌트** (`apps/web/src/components/lifestyle/`)
  - `Icon.tsx` — 트럭/박스/스프레이/냉장고/소파/와이파이/렌치/벌레/
    열쇠/캘린더/채팅/나뭇잎/선물/방패/사다리/종/해 18종 라인 아이콘
    (외부 이미지 없이 인라인 SVG로만 구성).
  - `PhotoCard.tsx` — "사진 카드" 자리에 쓰는 컬러 타일+아이콘+
    북마크 버튼(로컬 상태만, 저장 기능 없음)+캡션 조합 카드.
  - `ScrollRow.tsx` — 좌우 화살표가 있는 가로 스크롤 컨테이너(숨고의
    캐러셀 행 패턴).
  - `SectionHeading.tsx`, `PhotoCardGrid.tsx`, `PromoBanner.tsx`,
    `ProCardCompact.tsx`(카테고리+평점+3분할 갤러리 타일),
    `PortfolioCollageCard.tsx`(1+2 콜라주 카드) — 반복되는 섹션
    패턴을 재사용 컴포넌트로 뺌.
- **[완료] 섹션 컴포넌트** — `ServiceHeroSearch`(지역 선택+검색창+
  "AI 맞춤 견적 요청" 버튼+견적비교/바로예약 탭+카테고리 아이콘
  그리드), `TrendingTipsSection`(필터+가로 스크롤 트렌딩 카드),
  `RecommendedProsSection`("오늘의 추천 업체" 필터+캐러셀),
  `PartnerLogoStrip`(원형 로고 스트립+포트폴리오 콜라주 2장),
  `MagazineStoriesSection`("집서비스 이야기" 3카드),
  `PopularReviewsSection`(번호 매긴 인기 후기 2열),
  `CompanyRecruitSection`(지역 칩+"업체이신가요?" 리크루트 CTA+
  "받은요청" 알림 목업 카드+`/onboarding/company`로 연결되는 업체
  가입 버튼).
- **[완료] `apps/web/src/lib/mock-content.ts` 신규** — 위 섹션들에
  쓰는 모든 목업 텍스트/색상 데이터(트렌딩 카드, 4종 서비스 묶음,
  포트폴리오 콜라주, 매거진 스토리, 인기 후기, 전국 지역 칩, 업체
  리크루트 알림 샘플)를 한 파일에 모음 — 파일 최상단에 "실제 후기/
  게시글 아님" 경고 주석.
- **[완료] `lifestyle-data.ts`에 `CATEGORY_ACCENT` 추가** — 카테고리
  아이콘 그리드용 포인트 컬러를 집팔고360 CI 색상 범위 안에서만
  순환하도록 명시적으로 매핑.
- **[완료] `/zipservice/companies` 검색 연동** — 히어로 검색창에
  입력 후 제출하면 `/zipservice/companies?q=` 로 이동, 목업 업체의
  이름/한줄소개/뱃지에서 부분일치 검색(`searchMockCompanies` 신규
  함수). 검색 결과 0건일 때와 카테고리 자체가 비어있을 때 안내 문구를
  분리(검색은 "다른 키워드로", 빈 카테고리는 "곧 입점" 문구).
- **[완료] 기존 `/zipservice` 페이지 전면 교체** — 지난 두 라운드에서
  만든 마케팅 히어로(헤드라인+가격 예시 카드)와 `CategoryGrid`/
  `FeaturedCompanies`를 숨고 구조의 새 섹션들로 대체(두 컴포넌트
  파일은 완전히 대체되어 삭제). 기존에 만든 `MemberBenefitSection`
  (일반가/회원가 비교표)과 `ZipServiceFaq`, `MobileStickyCta`는
  그대로 유지해 새 구성 안에 이어붙임 — 이 부분은 숨고에 없는
  콘텐츠지만 이전 라운드에서 사용자가 명시적으로 요청한 "회원가
  비교 부각" 요구사항이라 삭제하지 않음.
  `ZipServiceWizard.tsx`(카테고리 위저드), `/zipservice/companies`
  (업체 목록/상세)는 이번 라운드에서 변경하지 않음 — 검색 기능
  추가만 반영.
- **[완료] 검증**: `npm run build`(Turbopack) 클린 통과, `npm run
  lint`에서 이번에 건드린 파일 관련 오류 없음. `npm run dev` 띄운
  뒤 Playwright로 PC(1440×1100) 전체 페이지를 7장으로 나눠 스크롤
  캡처해서 처음부터 끝까지(히어로 → 트렌딩 → 추천 업체 → 배너 →
  서비스 묶음 → 이사 로우 → 파트너 로고/포트폴리오 → 가전·가구
  그리드 → 인기 후기 → 매거진 → 회원가 배너 → 회원가 비교표 →
  업체 리크루트 → FAQ → 전역 푸터) 깨짐 없이 이어지는 것 확인.

### 완료 후
- 로컬 검증 완료, 이 기록 직후 커밋/푸시 진행. **서버 미배포** —
  이전과 동일하게 사용자가 서버에서 `git pull` → `npm run build` →
  `zippalgo360-web` 재시작 필요(백엔드 변경 없음).
- **다음 세션이 알아야 할 것**:
  - 이번 라운드는 사용자가 명시적으로 "PC 버전부터"라고 해서 모바일
    반응형은 기존 Tailwind 반응형 클래스에 맡겨두고 별도로
    스크린샷 검증은 하지 않았음 — 모바일 화면은 다음에 사용자
    확인/요청 시 별도로 다듬을 것.
  - "이미지 더 올릴게"라고 했던 예고대로 사용자가 추가 스크린샷을
    올렸고, 이번 라운드에 전부 반영했다고 판단했지만 혹시 반영 안
    된 섹션(숨고의 "지금 시작하면 딱 좋은 수업" 같은 과외/레슨
    카테고리)이 있다면 — 이건 집서비스 사업 범위(이사/청소/가전/
    가구/구독)에 없는 카테고리라 의도적으로 제외했음, 실수로 빠진
    게 아님.
  - 업체 데이터는 여전히 전부 `mock-companies.ts`/`mock-content.ts`
    목업(실제 아님) — 이전 라운드 기록과 동일한 제약이 그대로
    적용됨.

## 2026-08-27 — (이 세션) 집서비스 목업(실사진 프로토타입)을 실제 `/zipservice`에 반영

### 시작 전
- 사용자가 아이콘/플랫컬러 타일에 불만을 표해 실제 사진을 요청했고,
  이 환경엔 이미지 생성·외부 이미지 호스트 접근이 없어 사용자가
  80장짜리 사진 ZIP을 직접 업로드함. 지난 라운드(별도 세션 컨텍스트,
  이 기록엔 없음)에서 그 사진들로 독립 실행형 HTML 프로토타입을
  만들어 Claude Artifact로 먼저 검증했고, 이번엔 그 프로토타입의
  사진 매핑을 실제 Next.js 코드베이스(`apps/web`)의 `/zipservice`
  라우트에 그대로 이식하는 작업.

### 진행 중
- **[완료] 사진 파일 이식** — 업로드된 ZIP에서 선별한 실사진 35장을
  케밥케이스로 정리해 `apps/web/public/images/zipservice/`에 정적
  파일로 추가(총 2.1MB).
- **[완료] `apps/web/src/lib/lifestyle-photos.ts` 신규** — 시맨틱
  키(`mv_truck`, `moc_window` 등) → 정적 파일 경로 매핑 + `PhotoKey`
  타입. 업체 커버(`co_*_cover`)·매거진 표지(`mag_*`)처럼 같은 파일을
  여러 키가 재사용하는 경우도 프로토타입과 동일하게 유지.
- **[완료] 목업 데이터 확장** — `mock-content.ts`(`PhotoCardItem`/
  `LifeMomentBundle`/`PortfolioCollage`/`MagazineStory`에 `photo`/
  `photos` 옵셔널 필드 추가 + 전 항목에 값 채움, `ProCardCompact`용
  `CATEGORY_GALLERY_PHOTOS` 신규 export)와 `mock-companies.ts`
  (`MockCompany.cover` 필드 + 7개 업체 전부에 커버 사진 지정)를
  확장. 매거진 3번째 카드(회원가 혜택 안내)는 프로토타입과 동일하게
  실사진이 없어 아이콘 워터마크 그대로 둠(의도적 누락 아님).
- **[완료] 컴포넌트 7곳에 `next/image` 렌더링 추가** — `photo`/
  `cover`/`photos` 값이 있으면 실사진을, 없으면 기존 아이콘/그라디
  언트로 폴백하는 조건부 렌더링을 모두 동일한 패턴으로 적용:
  `PhotoCard.tsx`(공용 타일 컴포넌트, `PhotoCardGrid` 경유로 여러
  섹션에 자동 반영), `zipservice/page.tsx`의 "지금 필요한 서비스"
  묶음 카드 인라인 블록, `ProCardCompact.tsx`(3칸 갤러리),
  `ProCard.tsx`(업체 목록 카드 커버 배너), `PortfolioCollageCard.tsx`
  (3분할 콜라주), `MagazineStoriesSection.tsx`(매거진 타일 — 텍스트
  가독성용 하단 그라디언트 오버레이 추가), `zipservice/companies/
  [id]/page.tsx`(업체 상세 커버 배너).
- **[완료] 검증**: `npm run build`(Turbopack) 클린 통과. `npm run
  lint` — 이번에 건드린 8개 파일에서는 오류 0건(기존에 있던 다른
  파일 15건의 `react-hooks/set-state-in-effect`/`no-explicit-any`
  오류는 이번 작업과 무관, 그대로 둠). `npm run dev` 띄운 뒤
  Playwright(PC 1440×1000~1200)로 `/zipservice` 전 구간, `/zipservice
  /companies`, `/zipservice/companies/moving-1` 스크린샷 확인 —
  트렌딩 카드·업체 갤러리·서비스 묶음·필요한 순간 로우·포트폴리오
  콜라주·가전가구 그리드·매거진·업체 목록 카드·업체 상세 커버까지
  전부 실사진 정상 렌더, 콘솔/페이지 에러 0건. 지난 라운드에서
  발견했던 "이사 트럭" 사진 오매핑(청소 사진이 잘못 들어갔던 문제)
  이 이번 실제 코드에도 정확히 고친 채로(`05_원스톱준비/07` 원본)
  반영된 것도 스크린샷으로 재확인함.

### 완료 후
- 로컬 검증 완료, 이 기록 직후 커밋/푸시 진행. **서버 미배포** —
  사용자가 서버에서 `git pull` → `npm run build` →
  `zippalgo360-web` 재시작 필요(백엔드 변경 없음, 정적 이미지 35장이
  새로 추가됐으므로 배포 시 `public/` 디렉터리가 빌드 산출물에
  포함되는지만 확인하면 됨).
- **다음 세션이 알아야 할 것**:
  - 여전히 전부 프론트엔드 목업. 사진 35장도 `apps/web/public`
    아래 정적 파일일 뿐, `apps/api`/DB에는 업체 사진 관련 컬럼·API가
    전혀 없음 — 이 디자인을 실제 서비스로 전환하기로 하면 그때
    백엔드에 업체 프로필(사진 URL 등) 스키마와 공개 조회 API를
    추가하고 `mock-companies.ts`/`mock-content.ts`/
    `lifestyle-photos.ts`를 실 데이터 fetch로 교체해야 함.
  - 사용 안 된 나머지 사진(80장 중 35장만 선별)은 이식하지 않았음
    — 필요하면 `lifestyle-photos.ts`에 키만 추가하고 파일을
    복사하면 됨.
  - 모바일 반응형 스크린샷 검증은 이번에도 하지 않음(PC만 확인) —
    이전 라운드와 동일한 제약.
- **[진행 중] 서버 재배포** — 사용자가 "배포하자고"라고 요청해서 아래
  명령어를 전달함(이 세션은 서버 SSH 권한이 없어 직접 실행 불가,
  사용자가 대신 실행). 프론트엔드 전용 변경(정적 이미지 35장 +
  `apps/web` 코드)이라 백엔드 마이그레이션/재시작은 불필요, `zippalgo
  360-web`만 재빌드·재시작하면 됨. 결과 확인 대기 중.

```bash
cd /srv/zippalgo360
git fetch origin
git checkout claude/jippalgo360-service-screen-lmv8de
git pull origin claude/jippalgo360-service-screen-lmv8de
cd apps/web
npm run build
sudo systemctl restart zippalgo360-web
```

- **[진행 중] 배포 실행 결과** — 사용자가 위 명령어를 서버에서 실행함.
  `git checkout`/`pull` 정상(이미 최신), `npm run build` 클린 성공(라우트
  목록에 `/zipservice` 계열 정상 출력). `systemctl restart` 명령 자체는
  출력 없이 조용히 끝나는 게 정상이라 성공 여부를 `systemctl status
  zippalgo360-web`로 재확인해달라고 요청했고, 사용자가 "일단 어느정도
  구동되는건 확인했어 이따가 다시 확인해보고 요청할게"라고 답함 —
  **최종 active 상태 확인 및 브라우저 실사진 렌더 확인은 아직 미완료,
  사용자가 나중에 다시 요청하면 이어서 확인할 것.** 이 세션에서
  `https://zippalgo360.com`으로 직접 curl 검증을 시도했으나 이 환경의
  네트워크 아웃바운드가 허용목록 방식이라 외부 도메인 접근 자체가
  막혀있어(연결 실패, exit 56) 원격에서 대신 확인할 수 없었음.

---

## 2026-08-27 — (이 세션) `/map`이 예전 화면으로 되돌아간 사고: 세 번째 브랜치로 전환된 서버가 원인

### 시작 전
- 사용자가 배포 후 스크린샷 첨부: `/map`이 오늘 만든 모든 것(우측
  컨트롤 스택, 아이콘 토글 레이어 패널, 왼쪽 단지 패널, 부챗살 마커)
  없이 훨씬 예전 모습으로 보임. "니가 뭐 잘못 건드린거 아냐??"

### 진행 중
- **[완료] 원인 확인**: 사용자에게 진단 스크립트 요청 → 서버
  (`/srv/zippalgo360`)가 이 세션이 계속 배포해온 브랜치가 아니라
  **세 번째 브랜치** `claude/jippalgo360-service-screen-lmv8de`
  (집서비스 화면 재설계 작업용, 커밋 `9abf8c7`)에 체크아웃돼 있었고,
  그 브랜치는 오늘 지도 재작업이 시작되기 전부터 갈라진 브랜치라
  `apps/web/src/app/map/page.tsx`에 오늘 만든 어떤 코드도 없었음
  (`grep -c "지도 레이어 선택"` → 0으로 확인). 집서비스 작업을 하던
  또 다른 세션이 이 서버에서 자기 배포(`npm run build` +
  `systemctl restart`)를 하면서, 같은 모노레포라 `map/page.tsx`까지
  그 브랜치의 예전 버전으로 통째로 덮어써진 것 — 이 세션이 직접
  손댄 적 없음, 브랜치 전환의 부작용.
- **[완료] 병합**: `git diff --stat`으로 두 브랜치가 건드린 파일이
  겹치는지 먼저 확인 — `docs/WORK_LOG.md` 말고는 **전혀 안 겹침**
  (집서비스 쪽은 `apps/web/src/app/zipservice/*`,
  `apps/web/src/components/lifestyle/*`,
  `apps/web/public/images/zipservice/*`만 건드림, 이 세션은
  `map`/`zipterior`/`integrations` 쪽만) — 코드 충돌 없이 병합
  가능함을 미리 확인 후 `git merge origin/claude/jippalgo360
  -service-screen-lmv8de` 실행. 예상대로 `docs/WORK_LOG.md`만
  충돌(양쪽이 같은 지점에서 갈라져 각자 긴 기록을 이어붙인 단일
  구간) — 파이썬 스크립트로 마커만 제거하고 두 쪽 다 유지, 사이에
  `---` 구분선만 추가(어느 쪽도 삭제 안 함).
- **[완료] 검증**: `next build` 클린 — `/zipservice/companies`,
  `/zipservice/companies/[id]`, `/zipservice/new` 라우트가 새로
  생성되는 것으로 집서비스 쪽 작업도 정상 포함됐음을 확인.
  `grep -c "지도 레이어 선택" apps/web/src/app/map/page.tsx` → 1로
  이 세션의 지도 작업도 그대로 살아있음을 재확인.
- **다음**: 이번엔 관련 브랜치가 3개(`claude/jippalgo360-platform
  -6bvrfh`, `claude/zippalgo360-interior-service-tz2qfv`,
  `claude/jippalgo360-service-screen-lmv8de`)로 늘어났음 — 병합 결과를
  세 브랜치 전부에 fast-forward 푸시해서 서버가 **어느 브랜치에
  있든** 그냥 `git pull`이면 전부 반영되게 만들 예정. 사용자가 방금
  또 다른 진단 결과를 보내왔는데(`origin/claude/jippalgo360-service
  -screen-lmv8de`가 `9abf8c7`보다 한 커밋(`6231697`) 더 앞서 있음)
  이것도 fetch해서 같이 병합해야 함 — 아직 안 함, 이어서 진행.

## 2026-08-27 — 회원(가입/로그인) 기능 개발 착수: 집테리어와의 관계 정리 + 카카오 로그인 구현 시작

- 사용자 요청: "집팔고360의 회원관련(회원가입, 로그인 등) 개발진행할거야"로 시작.
  대화 중 핵심 논의: 집테리어(별도 스택, 별도 서버)에 이미 회원(일반/업체)+
  관리자+카카오 간편로그인이 완성돼 있는데, 이걸 집팔고360으로 그대로
  포팅하는 게 나은지 질문받음.
- **[결정]** CLAUDE.md에 "회원/SSO/등급·결제 아키텍처" 섹션으로 기록 완료.
  요지:
  - 집테리어 코드를 그대로 포팅하지 않는다(스택이 완전히 다름: 집테리어는
    바닐라 JS+FastAPI raw SQL, 집팔고360은 Next.js). 집테리어는 **설계
    레퍼런스**로만 참고하고 집팔고360 스택으로 새로 구현.
  - 집팔고360이 통합회원 신원(가입/로그인)과 등급·결제 정보의 소유자.
    하위 서비스(집팔고/집사고/집테리어)는 이미 있는 SSO(`/auth/sso/
    issue-code` → `/auth/sso/verify`)로 신원을 받는다.
  - 관리자도 같은 원칙: 회원/결제 관리는 집팔고360 통합 관리자, 서비스별
    세부 운영(집테리어 포트폴리오 검수 등)은 각 서비스 자체 관리자 유지 —
    **집테리어 관리자 자체는 다시 만들 필요 없음, 그대로 계속 사용**.
  - 등급/결제 필드는 SSO verify 응답에 실어서 하위 서비스가 그 시점에
    판단하게 하고(매 요청마다 라이브 API 호출 금지 — SPOF 방지), 세션은
    짧은 TTL 재검증 + 결제 관련 민감 액션만 그 순간 라이브 재확인.
  - **집테리어 기존 회원 정리 순서**(사고 방지용, 반드시 순서 준수):
    (1) 집팔고360 회원가입/로그인/카카오로그인/업체가입 구현 → (2) 집테리어와
    SSO 연동 단대단 검증 → (3) 기존 집테리어 가입자를 집팔고360 통합회원으로
    이관/매핑 → (4) 그 다음에야 집테리어 자체 로그인 진입점 정리. 이관 전에
    집테리어 자체 로그인을 없애면 기존 회원이 로그인 불가 상태가 됨.
- **[조사 완료] 기존 코드 현황**:
  - 백엔드(`apps/api/app/modules/{auth,users,companies,payments}`)에 이미
    이메일/비밀번호 회원가입·로그인(JWT, bcrypt), `/auth/me`, SSO
    issue-code/verify, 업체(공인중개사) 온보딩(`/companies` POST)까지
    구현되어 있음. `users` 테이블에 `kakao_id` 컬럼은 이미 있으나(초기
    스키마), 실제 카카오 OAuth 플로우(콜백 라우터, 토큰 교환, 프로필 조회)는
    아직 없음 — `config.py`의 `kakao_rest_api_key`는 지금 집테리어 검색
    프록시/지오코딩(`companies/geocoding.py`)에서만 쓰이고 있었음.
  - 프론트(`apps/web/src/app/{login,register}`, `lib/auth-context.tsx`)도
    이메일 가입/로그인 폼과 토큰 유지까지는 있으나 카카오 로그인 버튼/콜백
    페이지는 없음.
  - `payments` 모듈은 매물 열람 건별 결제(PG 미연동, 모의 결제)이지 회원
    등급/구독 개념이 아님 — 등급·결제 필드는 아직 실제 요구사항이 확정되지
    않은 미래 기능이라 지금 스키마에 미리 만들지 않기로 함(과설계 방지).
- **[진행 중] 이번 작업 범위**: 카카오 소셜로그인(일반회원)을 집팔고360에
  신규 구현 시작. 계획:
  - DB: `password_hash` NULL 허용(카카오 전용 계정은 비밀번호 없음),
    `kakao_id`에 부분 유니크 인덱스 추가하는 마이그레이션 신설.
  - 백엔드: `/auth/kakao/login`(인가 코드 → 카카오 토큰 교환 → 프로필 조회
    → 있으면 로그인/없으면 자동가입 → JWT 발급) 라우터 추가.
  - 프론트: `/login`, `/register`에 "카카오로 시작하기" 버튼 + 카카오 인가
    코드를 받는 콜백 페이지 추가.

## 2026-08-27 — 카카오 소셜로그인(일반회원) 구현 완료

- **[완료] 백엔드** (`apps/api`):
  - `alembic/versions/0005_kakao_login_support.py`: `users.password_hash`
    NULL 허용(카카오 전용 계정은 비밀번호 없음), `kakao_id`에 부분 유니크
    인덱스(`WHERE kakao_id IS NOT NULL`) 추가.
  - `app/config.py`: `kakao_client_secret`(선택), `kakao_redirect_uri`
    설정 추가. **`kakao_rest_api_key`는 기존에 지오코딩용으로 이미 서버
    `.env`에 있는 값을 카카오 로그인 client_id로 그대로 재사용**(카카오
    앱 하나의 REST API 키는 여러 기능에 공용) — 새 키 발급 불필요.
  - `app/modules/auth/kakao.py` 신설: 인가 코드를 카카오 토큰으로 교환 →
    `kapi.kakao.com/v2/user/me`로 프로필 조회. 이메일 동의를 안 한
    계정(카카오는 이메일이 선택 동의 항목)은 `kakao_id@kakao-user.
    zippalgo360.local` 플레이스홀더 이메일로 대체(users.email이 NOT
    NULL UNIQUE라 이 값이 없으면 가입 자체가 실패하기 때문 — 이 도메인은
    실제 발신용이 아니므로 메일 발송에 쓰면 안 됨).
  - `app/modules/auth/service.py`의 `kakao_login()`: kakao_id로 기존
    회원 조회 → 없으면 이메일로 재조회(같은 이메일로 이미 이메일/비밀번호
    가입한 계정이 있으면 새 계정을 만들지 않고 **그 계정에 카카오 로그인을
    연결**, `users/repository.py`의 `link_kakao_id()`) → 그래도 없으면
    신규가입(`create_kakao_user()`, role=customer 고정). 기존
    `login()`(이메일/비밀번호)도 `password_hash IS NULL`인 카카오 전용
    계정으로 이메일 로그인 시도 시 `bcrypt.checkpw`가 죽지 않도록 방어
    추가.
  - `POST /auth/kakao/login`(`KakaoLoginIn{code, redirect_uri}` →
    `TokenOut`) 라우터 추가. 카카오 키가 아예 없으면 501로 명확히 응답.
  - 검증: 로컬에 venv 새로 만들어 `requirements.txt` 설치 후
    `python -c "import app.main"` 통과(라우터 등록까지 실제로 import되는
    선에서 확인, 실제 카카오 서버와의 왕복은 이 환경에 카카오 앱
    키/네트워크가 없어 못 함).
- **[완료] 프론트** (`apps/web`):
  - `lib/kakao.ts`: `getKakaoAuthorizeUrl()`/`getKakaoRedirectUri()` —
    redirect_uri를 **런타임에 `window.location.origin` 기준으로 계산**해서
    로컬/스테이징/프로덕션 도메인이 달라도 별도 환경변수 없이 항상
    맞게 동작하도록 함(카카오 인가 요청과 토큰 교환 양쪽에 동일한 값을
    보내야 하는데, 소스를 하나로 통일해 어긋날 여지를 없앰).
  - `lib/auth-context.tsx`에 `loginWithKakao(code, redirectUri)` 추가.
  - `components/KakaoLoginButton.tsx`(카카오 브랜드 가이드 준수 —
    `#FEE500` 배경, 말풍선 아이콘), `lib/ui.ts`에 `kakaoButtonClass` 추가.
  - `/login`, `/register`(단, `role === "customer"`일 때만 — 카카오
    가입은 항상 일반회원으로 생성되므로 업체가입 탭에서는 안 보여줌)에
    버튼 배치.
  - `app/login/kakao/callback/page.tsx` 신설 — 카카오가 돌려준 `code`(또는
    사용자가 동의를 취소했을 때의 `error`)를 받아 백엔드 호출 후
    `/mypage`로 이동, 실패 시 에러 문구 + 로그인으로 돌아가기 링크.
  - `.env.example`(웹)에 `NEXT_PUBLIC_KAKAO_CLIENT_ID` 추가 — **백엔드
    `KAKAO_REST_API_KEY`와 반드시 같은 값**이어야 함.
- **[완료] 검증**: `npm install` 후 `next build` 클린(24개 라우트,
  `/login/kakao/callback` 정상 포함). `npx eslint 'src/**/*.{ts,tsx}'`
  전체 실행 결과 17개 중 새로 추가한 콜백 페이지의
  `react-hooks/set-state-in-effect` 1건만 신규분이고, 이건 같은 파일에
  이미 있던 `auth-context.tsx`의 동일 규칙 사전 존재 오류와 같은 종류
  (이펙트 안 setState, 이 저장소 전역에 만연, 빌드 안 막힘, 이전
  세션에서 이미 비차단 판단됨) — 새로운 종류의 오류 없음.
- **[남은 작업 — 배포 시 사용자가 직접 해야 함, 이 세션은 서버 접근 불가]**:
  1. `apps/api`에서 `alembic upgrade head` 실행(0005 마이그레이션 적용).
  2. 카카오 개발자 콘솔에서 해당 앱의 "카카오 로그인" 제품이 꺼져 있으면
     활성화, **Redirect URI에 `https://zippalgo360.com/login/kakao/
     callback`(실제 배포 도메인) 등록**.
  3. `apps/web` 서버 `.env`에 `NEXT_PUBLIC_KAKAO_CLIENT_ID=<서버 apps/api
     .env의 KAKAO_REST_API_KEY와 동일한 값>` 추가 후 `next build` 재실행
     (NEXT_PUBLIC_* 값은 빌드 타임에 번들되므로 재시작만으로는 반영 안 됨).
  4. `zippalgo360-api`/`zippalgo360-web` 재시작 후 실제 카카오 로그인
     동의 화면까지 뜨는지 브라우저에서 최종 확인.
- **다음 단계(집테리어 연동)**: CLAUDE.md에 기록한 순서대로, 이 카카오
  로그인이 배포 환경에서 실제로 동작 확인된 뒤에 (2) 집테리어와 SSO
  연동 단대단 검증 → (3) 기존 집테리어 회원 이관 → (4) 집테리어 자체
  로그인 정리로 진행.

## 2026-08-27 — 브랜치 통일 공지에 따라 회원기능 작업을 claude/jippalgo360-platform-6bvrfh로 병합

- 사용자가 전체 세션에 "이제부터 이 저장소는 claude/jippalgo360-platform
  -6bvrfh 브랜치 하나만 쓴다"고 공지(오늘 다른 세션이 서버를 자기
  브랜치로 체크아웃+배포하면서 `/map` 작업을 몇 시간 전 상태로 되돌린
  사고가 있었던 데 따른 조치, CLAUDE.md "브랜치 정책" 섹션 참고).
- 이 세션은 `claude/jippalgo-360-member-features-hf7hxt`(카카오
  로그인 커밋 2개, `b96aa9d`/`c668fe6`)에서 작업 중이었음 — 이미 원격에
  푸시 완료된 상태에서 `claude/jippalgo360-platform-6bvrfh`로 체크아웃
  후 병합.
- **[완료] 병합**: `docs/WORK_LOG.md`에서 두 브랜치가 각자 파일 끝에
  로그를 이어붙이며 생긴 충돌(내용 충돌 아님, 같은 지점에 서로 다른
  날짜의 로그를 추가) 1건 발견 — 양쪽 로그 전부 보존하는 방향으로
  수동 해결(순서: platform 브랜치의 기존 로그 → 이 세션의 회원기능
  로그). `CLAUDE.md`, 백엔드/프론트 코드 파일은 겹치는 부분이 없어
  자동 병합됨.
- 이 브랜치(`claude/jippalgo-360-member-features-hf7hxt`)는 앞으로
  안 쓰고, 이후 모든 커밋은 `claude/jippalgo360-platform-6bvrfh`에
  바로 푸시.

## 2026-08-27 — 업체 승인 관리 API + 통합회원(집팔고360) 관리자 화면 구현

- 코드에 이미 남아 있던 메모("이 코드베이스엔 아직 업체를 승인
  (is_verified=true로 전환)하는 관리자 기능이 없어서" —
  `apps/api/app/modules/companies/repository.py`의 `list_map_markers`
  독스트링)를 그대로 채우는 작업. 회원가입/카카오로그인에 이어 CLAUDE.md
  "회원/SSO/등급·결제 아키텍처" 원칙대로 **회원·업체 관리를 집팔고360
  통합 관리자로** 만듦.
- **[완료] 백엔드**:
  - `companies`: `GET /companies/me`(본인 업체 조회), `GET /companies/
    admin`(관리자용 전체 목록, `owner_email`/`owner_name` 조인 포함,
    `is_verified` 필터), `POST /companies/{id}/verify`·`/suspend`·
    `/reactivate`(전부 `require_role("admin")`) 추가.
  - `users`: 라우터가 아예 없었어서 `app/modules/users/router.py` 신설
    — `GET /users`(role 필터), `POST /users/{id}/activate`·
    `/deactivate`, `POST /users/{id}/role`(역할 변경). `service.py`에
    자기 자신을 비활성화/역할변경하지 못하게 막는 방어 추가(관리자가
    실수로 자기 권한을 잠그는 사고 방지). `main.py`에 라우터 등록.
  - 검증: venv에서 `import app.main` 통과, 등록된 전체 라우트 목록을
    직접 찍어서 `/companies/me`, `/companies/admin`,
    `/companies/{id}/verify` 등 경로 충돌 없이 올바르게 등록됐는지 확인.
- **[완료] 프론트**:
  - `/admin`(신설) — 회원관리/업체승인/단지마스터데이터/매도증빙검토
    4개 관리자 화면으로 가는 인덱스 페이지(그동안 admin 하위 페이지가
    서로 링크 없이 URL로만 접근 가능했던 것을 이번에 처음으로 하나로
    묶음).
  - `/admin/companies`(신설) — 업체별 대표자/소유자(이메일)/사업자
    등록번호 표시, 승인 배지(심사중/승인됨/정지됨), 승인·정지·정지해제
    버튼.
  - `/admin/members`(신설) — 역할별 필터(전체/일반회원/업체/관리자),
    회원 목록 테이블(이름/이메일/역할 드롭다운/활성상태 배지/가입일/
    활성-비활성 토글). 본인 계정은 역할변경·비활성화 버튼을 비활성화
    처리(백엔드 방어와 동일한 취지를 프론트에도 반영).
  - `mypage`에 업체(company) 역할 사용자를 위한 상태 배너 추가
    (`GET /companies/me` 호출) — 아직 업체 미등록이면 온보딩 유도,
    심사중/정지됨/승인됨 상태를 그 자리에서 바로 보여줌(기존엔 업체
    등록 후 자기 상태를 확인할 방법이 마이페이지에 전혀 없었음).
  - 검증: `next build` 클린(29개 라우트, 신규 4개 포함).
    `npx eslint 'src/**/*.{ts,tsx}'` 전체 20건 중 신규 3건(admin/
    companies, admin/members, mypage)은 전부 기존 sale-proofs 페이지와
    동일한 `useEffect(() => { refresh(); }, [token])` 패턴에서 나오는
    `react-hooks/set-state-in-effect` — 이 저장소에 이미 확립된 비차단
    사전 존재 오류와 완전히 같은 종류, 새로운 종류 없음.
- **참고**: 등급/결제(tier/payment) 필드는 이번에도 실제 결제·구독
  상품이 없어 스키마에 넣지 않음(과설계 방지, CLAUDE.md에 이미 기록된
  방침 그대로 유지) — 실제 결제 기능이 생기면 그때 SSO verify 응답에
  얹는다.

## 2026-08-27 — 사용자가 로컬 서버 이전 + 목표 DB/서버 아키텍처 참고자료 3건 전달

- 사용자가 업로드한 3개 문서를 저장소에 보관(세션 첨부파일은 컨테이너에만
  존재하고 저장소엔 안 남아서, 다음 세션이 참고할 수 있게 커밋):
  - `docs/zippalgo360-db-architecture-guide.md` — 목표 DB 스키마 설계서
    (Core users/companies/orders/payments/oauth_accounts 등 + 서비스별
    schema 분리안)
  - `docs/zippalgo360-server-architecture-guide.md` — 클라우드→로컬 서버
    이전 아키텍처 지침(하드웨어, 서비스별 포트 분리, Nginx, 백업/UPS 등)
  - `docs/zippalgo360-local-server-migration-guide.md` — 위 두 문서의
    운영 체크리스트 요약판(원본은 .docx, 텍스트만 추출해 마크다운으로
    보관)
- **아직 코드 변경 없음** — 사용자가 "참고하고 다시 이야기 하자"고 해서
  읽기만 하고 반영은 보류, 다음 턴에 방향 논의 예정.
- **[참고: 다음에 논의할 때 짚어야 할 것]** 이 문서들이 그리는 목표
  스키마와 지금 실제 코드(`apps/api`)의 스키마 사이에 몇 가지 차이가
  있음 — 그대로 맞출지, 지금 스키마를 유지하고 미래 목표로만 남길지
  결정 필요:
  1. `users.role`(customer/company/admin, 현재 코드) vs 문서의
     `users.user_type`(general/company/admin) — 이름·값 다름.
  2. 카카오 로그인을 이번 세션에서 `users.kakao_id` 컬럼으로 구현했는데,
     문서는 provider별 다중 소셜로그인(kakao/naver/google/apple)을 위한
     별도 `oauth_accounts` 테이블을 제안 — 지금 구조는 카카오 전용,
     구조적으로 미래 목표와 다름.
  3. 지금 `companies.owner_user_id`는 1:1(업체당 대표 유저 1명)인데,
     문서의 `company_memberships`(company_id, user_id, role: owner/
     manager/staff)는 업체당 여러 직원 계정을 지원하는 다대다 구조.
  4. 문서가 쓰는 서비스 코드 `ZIPBUY`(집사고)가 CLAUDE.md에 이미 확정된
     로마자 표기 규칙(집사고=**zipsago**)과 다름 — 그대로 채택하면
     기존 네이밍 규칙과 충돌.
  5. 서버 아키텍처 문서는 Core/집팔고/집사고/집테리어/집서비스를 **포트가
     분리된 개별 systemd 서비스**로 그리는데, 지금 `apps/api`는 이
     모듈들을 전부 한 FastAPI 프로세스에 모듈로 얹은 모놀리스 — 로컬
     서버 이전 시점에 분리할지, 지금처럼 모놀리스 유지하며 논리적
     경계만 지킬지는 별개 결정.
  - 결제/포인트/쿠폰/주문(Core orders/payments/points/coupons) 스키마는
    지금 코드에 전혀 없음 — 이건 문서도 "결제 기능이 실제로 생기면"
    이라는 전제라 지금 급하게 만들 필요는 없어 보임(기존에 이미 CLAUDE.md
    에 남긴 "과설계 방지" 방침과 일치).

---

## 2026-08-27 — /map 레이어 설정 저장 기능 추가 (+ 다른 세션과의 브랜치 병합)

### 시작 전
- 사용자 요청: /map의 레이어 선택("매물"/"인테리어 시공사례"/업체 레이어
  등)에 "설정 저장하기"를 추가 — 비로그인은 쿠키, 로그인 사용자는 계정에
  저장해서 다음 방문 때 그대로 복원. 매물/시공사례 중복선택 금지는 그대로
  유지, 생활서비스(이사/청소/부동산/인테리어 업체) 레이어는 자유롭게 추가
  가능. **추가로: 매물/시공사례 중 최소 하나는 항상 켜져 있어야 함**(새
  요구사항).

### 진행 중
- **[완료] 백엔드**: `users.map_layers`(nullable, 콤마구분 문자열) 컬럼
  추가하는 마이그레이션, `GET/PUT /auth/me/map-layers` 엔드포인트.
  백엔드는 레이어 키의 의미를 모르고 그냥 문자열 목록으로 저장/반환만
  하도록 일부러 느슨하게 설계(프론트 레이어가 늘어나도 백엔드 재배포
  불필요).
- **[완료] 프론트엔드**(`apps/web/src/app/map/page.tsx`): "이 레이어 설정
  저장하기" 버튼(레이어 패널 하단). 초기값 우선순위: 쿠키(비로그인 저장분)
  → URL `?mode=` → 기본값(매물); 로그인 확인되면 서버 저장값으로 한 번
  더 덮어씀. "최소 하나는 항상 켜져 있어야 함" 규칙은 두 경로 모두에서
  강제: (1) 매물/시공사례 자체를 직접 끄려는 시도 차단(토스트 안내),
  (2) 부동산업체 등 비-프라이머리 레이어를 켜다가 반대 그룹(상호배타)이
  꺼지면서 매물/시공사례가 둘 다 꺼지는 간접 경로도 자동으로 감지해
  같은 그룹의 프라이머리를 자동으로 같이 켜서 복구.
- **[완료] 검증**: 마이그레이션 클린 적용, curl로 저장/조회 왕복 확인,
  Playwright로 (비로그인) 차단+자동복구+쿠키 저장/재방문 복원, (로그인)
  서버 저장값이 기본값을 덮어쓰는 것까지 전부 확인.

### 진행 중 — 다른 세션과의 브랜치 병합 (충돌 해결)
- push 시도 중 origin이 한참 앞서 있는 것 확인 — 다른 세션이 카카오
  간편로그인, 집팔고360 통합회원 관리자 화면(업체 승인/회원 관리) 등을
  이미 push해놓은 상태였음.
- **충돌 1**: alembic 마이그레이션 리비전 번호 충돌 — 이 세션이 만든
  `0005_add_user_map_layer_preference.py`와 다른 세션의
  `0005_kakao_login_support.py`가 똑같이 `revision = "0005"`를 씀.
  → 이 세션 것을 `0006`으로 리넘버링(`down_revision = "0005"`), 파일명도
  `0006_add_user_map_layer_preference.py`로 변경. `alembic heads`로 단일
  head(`0006`) 확인, 새 DB에 `0001→0006` 전체 체인 클린 적용 재확인.
- **충돌 2**: `apps/api/app/modules/auth/router.py` — import 블록만 충돌
  (양쪽 다 새 스키마를 추가한 것뿐이라 단순 병합: `KakaoLoginIn`과
  `MapLayerPreferenceIn/Out` 둘 다 유지).
- **충돌 3**: `apps/api/app/modules/users/repository.py` — 함수 추가만
  충돌(`get_map_layers`/`set_map_layers` vs `list_users`/
  `set_user_active`/`set_user_role`), 전부 유지.
- 나머지 대부분의 변경(카카오 로그인 프론트/백엔드, 관리자 회원·업체
  화면, `/zipservice/*` 확장 등)은 git이 자동 병합함 — 이 세션이 건드린
  파일과 겹치지 않았음.
- **[완료] 병합 후 검증**: 백엔드 import 정상, 마이그레이션 체인 클린,
  `POST /auth/register` + `PUT/GET /auth/me/map-layers` curl 왕복 확인,
  `next build` 클린(다른 세션이 추가한 `/admin`, `/login/kakao/callback`,
  `/zipservice/*` 라우트까지 전부 포함해서 정상 생성 확인).
- 병합 커밋(`369eb79`) push 완료.

### 완료 후
- 로컬 검증 전부 완료, GitHub push 완료. **서버 재배포 필요**:
  ```bash
  cd /srv/zippalgo360
  git pull origin claude/jippalgo360-platform-6bvrfh
  cd apps/api && source venv/bin/activate && alembic upgrade head && sudo systemctl restart zippalgo360-api
  cd ../web && npm run build && sudo systemctl restart zippalgo360-web
  ```

## 2026-08-27 — 목표 아키텍처 문서 반영 시점 결정: 로컬 서버 이전 후로 미룸

- 지난 턴에서 정리한 5가지 차이점(role/user_type, kakao_id/oauth_accounts,
  owner_user_id 1:1/company_memberships 다대다, ZIPBUY/zipsago, 모놀리스/
  포트분리)에 대해 옵션 두 가지(지금 유지 vs 지금부터 목표 구조로 개발)의
  장단점을 설명 — 로컬 서버가 지금 세팅 중이라는 사용자 발언이 핵심 변수:
  서버 인프라 이전과 DB 리팩터링을 동시에 하면 문제 원인 구분이 어려워지고,
  방금 만든 카카오로그인/업체승인 기능을 또 뜯어고쳐야 하는 낭비가 생김.
- **[결정] 사용자가 "1번(지금 스키마 유지, 로컬 서버 안정화 후 정리)"으로
  확정.** CLAUDE.md에 "목표 DB/서버 아키텍처 문서와 지금 스키마의 관계"
  섹션으로 기록 완료 — 다음 세션이 이 참고문서 3건을 보고 바로 스키마를
  뜯어고치려 하면 로컬 서버 이전이 끝났는지부터 먼저 확인하도록 명시해둠.
  예외적으로 코드 변경이 없는 `zipsago`(문서의 `ZIPBUY` 대신) 표기만
  지금 확정.
- 코드 변경 없음(문서 기록만).

## 2026-08-27 — 3단계 착수: 기존 집테리어 가입자를 집팔고360 회원으로 이관

- 사용자 지시 "시작"으로 CLAUDE.md 4단계 계획의 3번(기존 집테리어 가입자
  이관/매핑) 착수.
- **[범위 확정]** 신원(이메일/비밀번호해시/카카오ID/이름/전화번호)만
  이관하고 업체(회사) 데이터는 이번 범위에서 제외 — 집테리어 자체
  관리자가 계속 관리하는 도메인이라 자동 이관 시 정합성 문제가 커짐.
  이관된 계정은 전부 `role='customer'`로 생성(집테리어에서 업체였던
  사람도 집팔고360 업체기능은 기존 `/onboarding/company`로 별도 신청).
  매칭 기준은 kakao_id 우선, 없으면 이메일 — 이미 집팔고360에 있는
  계정은 절대 덮어쓰지 않고 건너뜀. 집테리어 DB는 읽기만 함.
- **[진행 중]** 집테리어의 실제 `users` 테이블 구조(컬럼명/타입,
  이메일·카카오ID·비밀번호 null 비율, 비밀번호 해시 형식, 활성상태
  컬럼 존재 여부, 이메일 중복 여부)를 이 세션이 직접 볼 수 없어서(별도
  서버/코드베이스, SSH 직접 접속 불가) **읽기 전용** 조회 SQL
  (`zipterior_users_inspect.sql`, 사용자에게 파일로 전달)을 먼저
  실행해달라고 요청 — 결과 받아서 정확한 이관 스크립트(export on
  zipterior + idempotent import on zippalgo360) 설계 예정. 아직 실제
  이관 코드/실행 없음.

---

## 2026-08-27 — `/map` 인테리어 포트폴리오 패널: content_blocks/공간별 그룹핑 반영

### 시작 전
- 사용자 요청 2가지: (1) 집팔고360에서 집테리어 접속 화면이 집팔고360
  지도 화면과 "최대한 가깝게"가 아니라 **100% 동일**해야 함(디자인
  포함). (2) `/map`에서 포트폴리오 클릭 시 지금은 이미지만 나오는데,
  집테리어 실제 포트폴리오 상세처럼 텍스트+배열 순서가 적용된 내용이
  나오도록 수정.
- (1)에 대해 사용자와 논의한 결론: 레거시 zipterior 정적 사이트를
  CSS/JS로 계속 흉내내는 지금 방식으로는 "100% 동일"을 보장할 수
  없음 — 유일하게 보장되는 방법은 PC `/zipterior`를 저희 자체
  `/map?mode=interior` 페이지로 완전히 교체하는 것(로그인/회원사
  메뉴는 그 화면에서 빠짐, 사용자 확인 필요 — 아직 실행 안 함).
  사용자가 순서를 정리: **먼저 `/map`의 인테리어 모드를 zipterior와
  기능적으로 동등하게 맞춘 뒤에** 교체를 진행하기로 함 — 이번 세션은
  그 첫 단계(포트폴리오 상세 콘텐츠)만 진행.

### 진행 중 — 원인 조사
- zipterior 서버(`/var/www/zipterior/js/app.js`)의
  `openPortfolioDetail()`을 읽어서 포트폴리오 상세가 실제로 어떤
  구조인지 확인:
  - **드문 경우**: `apiDetail.content_blocks`가 있으면(오늘의집에서
    원본 그대로 가져온 포트폴리오) `document_order`로 정렬한 뒤
    `block_type`(image/heading/callout/divider/link/기본 텍스트)별로
    `renderContentBlock()`이 문서 그대로 렌더링. 리치텍스트 필드는
    `{entity:{bold/italic/underline/strikethrough}, content:[...]}`
    형태의 span 배열(`cbRichHtml()`).
  - **일반적인 경우**: `apiDetail.spaces`(방/공간 목록: id·이름·설명)
    + `apiDetail.images`의 `portfolio_space_id`로 사진을 방별로
    그룹핑, 매칭 안 되면 `room_label`로 대체 그룹핑 — 방 이름·설명과
    함께 섹션별로 보여줌.
  - 우리 백엔드(`apps/api/.../zipterior_client.py`의
    `get_portfolio_detail()`)는 이 구조를 전부 버리고 `images`만
    평평하게(caption만 유지) 가져오고 있었음 — "이미지만 나온다"의
    정확한 원인.

### 진행 중 — 구현
- **[완료] 백엔드** (`apps/api/app/modules/integrations/`):
  - `schemas.py` — `ZipteriorPortfolioImage`에 `space_id`/`room_label`
    추가, 신규 `ZipteriorPortfolioSpace`(id/name/description),
    `ZipteriorContentBlock`(block_type/document_order/image_url/
    text_content/raw_node — raw_node는 리치텍스트 구조 그대로 통과),
    `ZipteriorPortfolioDetailOut`에 `spaces`/`content_blocks` 추가
    (기본값 `[]`라 기존 실패 폴백 분기는 안 건드려도 됨).
  - `zipterior_client.py`의 `get_portfolio_detail()` — zipterior
    원본 API 응답의 `spaces`/`content_blocks`/이미지의
    `portfolio_space_id`/`room_label`을 그대로 프록시하도록 수정.
- **[완료] 프론트엔드** (`apps/web/src/`):
  - `lib/types.ts` — 위 스키마와 대응하는 TS 타입 추가.
  - `lib/content-blocks.tsx`(신규) — `richTextToPlain()`(리치텍스트
    span 배열에서 순수 텍스트만 추출, `<br>`은 `\n`으로 보존 — 굵게/
    기울임 서식은 이번 범위에서 의도적으로 생략, 필요하면 후속 작업),
    `groupImagesBySpace()`(zipterior와 동일한 방/공간 그룹핑 로직),
    `ContentBlockView`(block_type별 렌더링 — link 블록은 관리자 설정
    의존이라 항상 생략, 나머지는 zipterior와 동일).
  - `components/map/InteriorPortfolioPanel.tsx` — 렌더링을
    3단계 우선순위로 교체: ① `content_blocks` 있으면 문서 순서
    그대로, ② 없으면 `spaces`/`room_label`로 방별 그룹핑(이름+설명+
    사진), ③ 그룹핑 정보가 아예 없으면 기존 평면 그리드로 폴백
    (안전장치).
- **[완료] 검증**: `next build` 클린, 백엔드 전체 `ast.parse` 통과.
  **다른 세션의 대규모 변경(카카오 로그인, 관리자 회원/업체 화면,
  지도 레이어 저장 등)과 충돌 없이 병합됨** — `git merge`가 자동으로
  합쳤고 병합 후에도 빌드 정상.
- **미검증(중요)**: 이 세션은 zipterior API에 네트워크 접근이 없어서
  **실제 `content_blocks`/`spaces`가 있는 진짜 포트폴리오로 렌더링
  결과를 확인 못함** — 코드는 app.js 로직을 그대로 재현했지만, 실제
  데이터의 필드명이 문서와 미묘하게 다를 가능성 있음. 배포 후
  실제 포트폴리오 몇 개(방별 그룹핑 있는 것, 가능하면 content_blocks
  있는 것도)를 브라우저에서 열어 확인 필요.
- **다음 단계(보류)**: 이게 잘 동작하는 것 확인되면, PC
  `/zipterior`를 `/map?mode=interior`로 교체하는 작업 진행 예정
  (사용자 승인 대기 중, 로그인/회원사 메뉴 이관 방안도 같이 논의
  필요).

### 배포
- 서버가 배포 직전 `claude/jippalgo360-service-screen-lmv8de`(제3의
  브랜치)에 가 있던 걸 확인 — 브랜치 통일 공지 이후에도 여전히
  다른 브랜치로 드리프트될 수 있다는 실제 사례. `git checkout
  claude/jippalgo360-platform-6bvrfh` → `git pull`(36 커밋 fast-forward,
  카카오 로그인/관리자 화면/집서비스 라이프스타일 개편 등 다른
  세션들 작업 전부 포함) → `apps/api`에서 `alembic upgrade head`
  (0005/0006 마이그레이션) → `zippalgo360-api` 재시작 → `apps/web`
  `npm run build` → `zippalgo360-web` 재시작.
- **[완료] 검증**: `systemctl status` 양쪽 다 `active (running)`,
  `git log -1`로 최신 커밋(`fbef83f`) 배포 확인.
- **다음 확인 필요(사용자)**: 실제 포트폴리오로 `/map?mode=interior`
  에서 방별 그룹핑/콘텐츠 블록이 정상 렌더링되는지 브라우저로 확인.

---

## 2026-08-27 — 집테리어 회원 이관 스크립트 작성 (사용자 "넘어가자" 지시로 SQL 조회 결과 대기 없이 진행)

- 이전 턴에서 요청한 읽기전용 조회 SQL 결과를 사용자가 보내기 전에
  "넘어가자"고 해서, 집테리어의 정확한 `users` 컬럼명을 모른 채로도
  안전하게 동작하도록 **스키마 비의존적으로 설계**해서 바로 진행.
- **[완료]** `apps/api/scripts/zipterior_migration/`:
  - `01_export_on_zipterior.sql` — 집테리어 서버에서 실행할 읽기전용
    내보내기. 컬럼명을 몰라도 되게 `SELECT row_to_json(u) FROM users u`
    로 전체 컬럼을 JSON 한 줄씩 그대로 내보냄(사용자에게 파일로 전달 —
    집테리어는 이 저장소 밖의 별도 코드베이스라 git pull로 못 받음).
  - `02_import_to_zippalgo360.py` — 집팔고360 서버에서 실행. JSON의 여러
    후보 키 이름(email/hashed_password/nickname/kakao_id 등)을 순서대로
    시도해 필드를 뽑고, kakao_id→이메일 순으로 기존 계정과 매칭해
    **있으면 무조건 건너뜀**(덮어쓰기 없음), 비밀번호 해시는 bcrypt
    형식(`$2[aby]$..`)일 때만 복사하고 아니면 NULL. 탈퇴/비활성으로
    보이는 행(`deleted_at`/`status=deleted` 등 후보 키)은 건너뜀.
    **기본은 dry-run**(통계만 출력, DB 변경 없음), `--commit`을 붙여야
    실제 INSERT. `role`은 전부 `customer`로 고정, 업체 데이터는 다루지
    않음(범위 밖 — 집테리어 자체 관리자가 계속 관리).
  - `README.md` — 실행 순서(백업 → 집테리어에서 내보내기 → 파일 이동 →
    dry-run 확인 → `--commit`) 정리.
- **[완료] 검증**: `pick()`/`is_inactive()`/bcrypt 정규식 로직을 venv에서
  합성 데이터로 단위 테스트(이메일/카카오ID 우선순위 추출, bcrypt
  형식 판별, deleted_at/status 기반 비활성 판정 전부 의도대로 동작
  확인). 실제 DB 연결 테스트는 이 세션에 접근 권한이 없어 못 함 — 서버에서
  dry-run으로 먼저 확인 필요.
- **아직 실행 안 됨** — 사용자가 실제 서버에서 순서대로 실행해야 함.

---

## 2026-08-27 — PC `/zipterior`를 `/map?mode=interior`로 완전 교체 (2단계)

### 시작 전
- 위 "content_blocks/공간별 그룹핑" 작업(1단계) 배포 후, 사용자가
  "/zipterior 화면이 전혀 안 바뀐 것 같다"고 재확인 — 1단계는 `/map`
  쪽 백엔드 작업이었을 뿐, 실제로 `/zipterior` 화면 자체를 `/map`
  디자인으로 바꾸는 2단계는 아직 안 한 상태였음(순서를 사용자와
  맞췄었으나, 계속 기다리게 하지 않고 바로 2단계 진행하기로 함).

### 진행 중
- **[완료]** `apps/web/src/app/zipterior/page.tsx` — PC(모바일 UA
  아님)면 zipterior iframe을 아예 안 띄우고 `router.replace("/map?
  mode=interior")`로 즉시 리다이렉트하도록 변경. 모바일은 기존과
  동일하게 `zipterior.zippalgo360.com/m` iframe 유지(견적요청/
  포트폴리오/MY집테리어 탭 등 우리 쪽에 아직 없는 기능이 많아서).
  전환 중 짧게 "이동 중..." 문구 표시.
  - **트레이드오프**: 이 화면에서 zipterior 자체 로그인/회원사/
    관리자 메뉴가 빠짐(PC에서 그 메뉴들이 필요하면 별도 경로 필요
    — 아직 논의 안 됨).
- **[완료] 검증**: `next build` 클린. `npx eslint` 새 오류 없음
  (`react-hooks/set-state-in-effect` 1건은 이 프로젝트 전역에 이미
  있던 패턴과 동일한 종류라 비차단으로 판단, 이전 세션들과 동일 기준).
- **미검증(실사용 확인 필요)**: 배포 후 실제로 PC에서
  `zippalgo360.com/zipterior` 접속 시 `/map`으로 넘어가고 화면이
  100% 동일하게 보이는지, 인테리어 포트폴리오 클릭 시 방별 그룹핑/
  콘텐츠 블록이 정상 렌더링되는지(1단계 작업의 실사용 첫 확인이기도
  함) 브라우저로 확인 필요.

### 후속: 우측 하단 "우리집과 가까운/최근 등록 시공사례" 위젯 추가
- 배포 후 사용자 확인: `/zipterior`→`/map` 전환은 잘 됨. 다만 `/map`은
  "토탈" 개념이라 집테리어 전용 느낌이 부족하다며, 모바일 앱 셸에
  이미 있는 "우리집과 가까운 시공사례"/"최근 등록 시공사례" 두 탭을
  우측 하단에 추가해달라는 요청(집테리어 PC 화면의 `.local-stats`
  "내 주변 시공사례" 위젯과 같은 자리, 모바일 탭 UX로).
- zipterior 서버(`js/app.js`의 PC 위젯, `js/mobile-app.js`의 모바일
  탭)를 읽어서 실제 API 확인: `GET /api/v1/portfolios?sort=nearest&
  near_lat=&near_lng=&limit=&offset=`(하버사인 거리, 서버가 계산한
  `distance_km` 포함) / `sort=latest`(최근 등록) — 우리 백엔드엔
  단지 하나로 스코프된 `sort=popular` 엔드포인트만 있고 이 전체 피드
  엔드포인트가 없었음.
- **[완료] 백엔드**: `ZipteriorPortfolioCard`에 `distance_km` 추가,
  신규 `get_portfolio_feed(sort, near_lat, near_lng, limit, offset)`
  가 `/api/v1/portfolios?sort=...`를 그대로 프록시, 신규 라우트
  `GET /integrations/zipterior/portfolios/feed`(`/portfolios/{id}`
  경로보다 먼저 등록해 라우팅 충돌 방지).
- **[완료] 프론트엔드**: `components/map/NearbyPortfolioWidget.tsx`
  신규 — 두 탭("우리집과 가까운"/"최근 등록"), 마운트 시 조용히
  위치 한 번 시도(거부돼도 토스트 없이 안내 문구만, zipterior와
  동일 정책), 카드 클릭 시 기존 `setSelectedPortfolio`로 상세 패널
  오픈(카드 데이터만으로 `ZipteriorPortfolioSummary` 최소 형태를
  구성 — 상세 패널이 어차피 API에서 다시 불러오므로 id만 정확하면
  됨). `/map/page.tsx`에 `activeLayers.has("interiorPortfolio")`일
  때만(=인테리어 모드일 때만) 우측 하단에 렌더링.
- **[완료] 검증**: `next build` 클린, 백엔드 `ast.parse` 통과.

### 배포 및 실제 데이터 검증
- 사용자가 `git pull` → `zippalgo360-api`/`zippalgo360-web` 재시작·
  재빌드 실행, 둘 다 `active (running)` 확인.
- **[완료] 서버 로컬에서 실제 API 응답 검증**(포트 8001, `/api` 접두사
  필요 — 처음에 접두사 빼먹어서 404, 재확인함):
  - `GET /api/integrations/zipterior/portfolios/feed?sort=latest` —
    실제 포트폴리오 목록 정상 응답(`total: 10180`).
  - `GET .../feed?sort=nearest&near_lat=37.5665&near_lng=126.9780`
    (서울시청 좌표) — `distance_km` 정상 계산되어 옴(0.66km/0.98km,
    가까운 순 정렬 확인).
  - `GET .../portfolios/18988`(실제 포트폴리오) — `spaces` 8개,
    `content_blocks` 98개, `images` 40개, 이미지의 `space_id`/
    `room_label`(예: "거실")까지 전부 예상한 필드명 그대로 정상 응답.
    **1단계(content_blocks/공간 그룹핑) 작업과 이번 위젯 작업 둘 다
    데이터 레벨에서 확인 완료** — app.js를 읽고 재현한 필드명 추정이
    실제 데이터와 정확히 일치함.
- **남은 미검증**: 브라우저 화면에서 실제로 잘 렌더링되는지(방별
  그룹핑 섹션, content_blocks 문서형 레이아웃, 위젯 카드 클릭 시
  상세 패널 오픈)는 API 응답 확인과 별개로 사용자가 직접 확인 필요.

### 후속: 실사용 확인 결과 4가지 지적 (위젯 위치 버그, 평형 기본값, 안내메시지)
- 사용자가 실제 화면 스크린샷 2장 첨부해 지적: (1) 상세 문서(텍스트)는
  잘 나옴 — content_blocks 작업 정상 확인. (2) 위젯이 지도 우측
  하단이 아니라 열린 패널 옆 엉뚱한 위치에 붙어 있음. (3) 마커 클릭
  → 단지 열었을 때 평형 타입이 "전체"가 아니라 특정 평형이 기본
  선택돼 있음(부챗살에서 특정 평형 클릭 시 그 평형만 보이는 건
  의도대로). (4) 상세 문서 맨 아래에 관리자 설정 안내 메시지(집테리어
  자체 기능)가 우리 쪽엔 아예 없음.
- **[완료] 원인 파악 및 수정 (2)**: `NearbyPortfolioWidget`을
  `absolute left-0 top-0 flex h-full`인 왼쪽 패널 스택(클러스터
  선택/단지정보/포트폴리오 상세가 나란히 쌓이는 flex 컨테이너) **안에
  4번째 flex 아이템으로 잘못 넣어서**, 그 컨테이너의 실제 너비(열린
  패널 개수에 따라 0~2×28rem으로 계속 바뀜) 기준으로
  `right-4`가 계산되고 있었음 — 그래서 패널이 열릴 때마다 위젯이
  화면 이곳저곳으로 튐. `apps/web/src/app/map/page.tsx` — 위젯을 그
  flex 컨테이너 밖, 뷰포트 전체 기준 `relative` 컨테이너의 직계
  자식으로 이동(줌/현재위치 컨트롤과 동일한 포지셔닝 기준).
- **[완료] 원인 파악 및 수정 (3)**: `InteriorComplexPanel.tsx`의
  단지 상세 로딩 `useEffect`가 `!selectedArea`(마커 클릭 직후 부모가
  이미 null로 리셋해둔 상태)일 때 **첫 번째 평형 타입을 자동
  선택**하고 있었음 — 마커 클릭(`openInteriorComplex`)은 이미
  `setSelectedArea(null)`로 올바르게 "전체"를 세팅하고, 부챗살 평형
  조각 클릭(`bindFanInteractions`)도 이미 올바르게 특정 평형을
  세팅하는데, 이 자동 선택 로직이 매번 그걸 덮어쓰고 있었던 것.
  해당 블록 삭제 — 부챗살 평형 클릭 로직은 원래도 맞았어서 안 건드림.
- **[완료] 검증**: `next build` 클린.
- **진행 중 (4)**: zipterior `js/app.js`의 `portfolioDisplaySettingsCache`
  (안내 이미지/문구/버튼 라벨, `notice_enabled`로 on/off)가 어느
  API에서 오는지 서버에서 확인 중.
