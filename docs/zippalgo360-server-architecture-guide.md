# 집팔고360 통합 플랫폼 서버 아키텍처 지침서

작성 기준: 2026-08-27

## 1. 플랫폼 정의

집팔고360(zippalgo360.com)은 메인 포털 서비스이며, 하나의 회원 계정으로 아래 하위 서비스를 모두 사용한다.

- 집팔고: 매물 등록/조회, 부동산 정보, 매물 사진, 중개업체의 유료 매물정보 열람
- 집사고: 매수 희망 정보, 견적요청, 지역/조건에 맞는 부동산 업체 배포
- 집테리어: 포트폴리오, 업체정보, 대량 이미지, 견적문의, 채팅문의
- 집서비스: 이사/청소/인터넷 등 생활서비스 견적, 가전/가구 등 쇼핑

회원가입, 로그인, 업체회원, 결제, 주문, 내정보, 사용기록은 집팔고360 Core에서 통합 관리한다.

## 2. 핵심 설계 원칙

1. 집팔고360을 메인 플랫폼으로 둔다.
2. 회원/인증/결제/주문/내정보는 Core에서 중앙 관리한다.
3. 하위 서비스는 서비스별 API를 분리한다.
4. 한 물리 서버 안에서는 API 간 통신을 localhost(127.0.0.1) 기반으로 한다.
5. 외부 사용자는 zippalgo360.com 및 공개 API 경로만 접근한다.
6. 이미지 파일은 DB에 저장하지 않고 파일시스템에 저장한다.
7. Nginx가 정적 이미지를 직접 전송하도록 한다.
8. 집테리어 기존 독립 구조는 최대한 유지하되 인증/결제/회원 연동만 Core 기준으로 통합한다.
9. 현재 단계에서는 과도한 마이크로서비스/Docker 분리는 하지 않는다.
10. 추후 서비스가 커지면 집테리어, 집서비스, 이미지/CDN 등을 별도 서버로 분리할 수 있게 API 경계를 유지한다.

## 3. 권장 서비스 구성

외부:
- zippalgo360.com -> Nginx -> Next.js Web / Core API

내부:
- zippalgo360-web
- zippalgo360-core-api
- zippalgo-api
- zipbuy-api
- zipterior-api
- zipservice-api
- PostgreSQL 16
- Nginx
- systemd

예시 내부 포트:
- Core API: 127.0.0.1:8100
- 집팔고 API: 127.0.0.1:8101
- 집사고 API: 127.0.0.1:8102
- 집테리어 API: 127.0.0.1:8103
- 집서비스 API: 127.0.0.1:8104
- Next.js Web: 127.0.0.1:3000

실제 포트는 기존 클라우드 설정을 확인한 후 충돌 없이 확정한다.

## 4. 요청 흐름

사용자 브라우저
-> zippalgo360.com
-> Nginx
-> Next.js / Core API
-> 필요 시 서비스별 내부 API
-> PostgreSQL

이미지:
사용자 브라우저
-> Nginx
-> /data/media/... 의 WebP 이미지 직접 전송

API는 이미지 바이너리를 중계하지 않고 가급적 이미지 URL/메타데이터만 반환한다.

## 5. 인증/회원

모든 하위 서비스에서 동일한 user_id를 사용한다.

예:
users.id = 12345

해당 사용자가:
- 집팔고 매물 등록
- 집사고 견적요청
- 집테리어 문의/채팅
- 집서비스 주문
을 해도 모두 user_id=12345로 연결한다.

업체는 company_id 기준으로 통합하고, 회원과 업체 관계는 별도 멤버십 테이블로 관리한다.

## 6. 결제/주문

결제는 집팔고360 Core에서 중앙 처리한다.

서비스별로 별도 PG/결제 시스템을 중복 구축하지 않는다.

주문/결제 데이터에는 service_type과 service_reference_id를 저장해 어느 서비스의 어떤 행위인지 연결한다.

예:
service_type:
- ZIPPALGO
- ZIPBUY
- ZIPTERIOR
- ZIPSERVICE

## 7. 내정보 통합

한 계정에서 아래를 통합 조회할 수 있어야 한다.

- 등록 매물
- 구매/열람한 매물정보
- 집사고 견적요청
- 집테리어 견적/채팅
- 집서비스 견적
- 쇼핑 주문
- 결제내역
- 적립금/쿠폰
- 업체 활동내역

서비스별 테이블은 분리해도 Core가 user_id/company_id 기준으로 조회해 한 화면에 통합한다.

## 8. 이미지/미디어

집테리어는 이미지 수십만 장 규모를 전제로 한다.

권장 디렉터리:
- /data/media/zippalgo/
- /data/media/zipbuy/
- /data/media/zipterior/
- /data/media/zipservice/

이미지 정책:
- WebP 유지
- 기존 리사이즈 정책 유지
- 포트폴리오 상세 Lazy Loading 적용
- 대표이미지는 eager/우선 로딩 유지
- 갤러리는 loading="lazy", decoding="async" 적용 권장
- Nginx 정적 파일 전송
- 브라우저 캐시 헤더 적용
- 향후 CDN 전환 가능하도록 URL 규칙 고정

## 9. 로컬 서버 하드웨어

현재 대상 서버:
- CPU: Intel Core i5-8500 (6C/6T)
- RAM: 16GB
- GPU: 2GB (서버 성능에 사실상 영향 없음)
- SSD 120GB: OS
- SSD 250GB: 앱/DB
- HDD 1TB: 이미지/미디어
- 별도 HDD: 백업
- 인터넷: 1Gbps, 실측 약 600Mbps

권장 배치:
SSD 120GB
- Ubuntu Server 24.04 LTS
- Nginx
- Node.js
- Python
- systemd
- 시스템 로그

SSD 250GB
- /srv/zippalgo360
- /srv/zipterior 또는 통합 앱 경로
- PostgreSQL 데이터
- venv/node_modules/build 결과
- 임시 업로드/캐시

HDD 1TB
- /data/media/*

추가 HDD
- /backup
- PostgreSQL dump
- 이미지 백업
- 설정/서비스 파일 백업

## 10. 운영체제/런타임

클라우드와 최대한 동일하게 맞춘다.

- Ubuntu Server 24.04 LTS
- PostgreSQL 16
- Python 3.12
- Node.js 22
- npm 10
- Nginx 1.24 계열
- Git
- systemd
- fail2ban
- OpenSSH

Docker는 현재 클라우드에서 사용하지 않으므로 이전 과정에서 새로 도입하지 않는다.

## 11. 네트워크

공유기에서 외부 공개:
- TCP 80
- TCP 443

SSH는 외부 전체 공개를 피한다.
필요하면:
- 특정 IP 제한
- VPN/Tailscale
- 비표준 포트가 아니라 키 기반 인증 + 방화벽 우선

확인 필수:
- 공인 IPv4 여부
- CGNAT 여부
- 80/443 포트포워딩 가능 여부
- 업로드 속도
- 유동IP 여부

## 12. Nginx

역할:
- zippalgo360.com TLS 종단
- Next.js reverse proxy
- API reverse proxy
- 정적 이미지 직접 전송
- 캐시 헤더
- gzip/brotli 가능 시 적용
- 업로드 크기 제한 설정

외부 URL은 가능하면 하나의 도메인 아래 경로 기반으로 정리한다.

예:
- /api/core/
- /api/zippalgo/
- /api/zipbuy/
- /api/zipterior/
- /api/zipservice/
- /media/

내부에서는 localhost API로 연결한다.

## 13. 장애 격리

서비스별 systemd 유닛을 유지한다.

집테리어 API 장애 시:
- 집팔고360 전체가 죽지 않도록 한다.
- 집테리어 영역만 오류 처리한다.

Core 장애는 회원/결제/통합기능에 영향이 크므로 health check와 로그를 강화한다.

## 14. 백업

최소 정책:
- PostgreSQL: 매일 pg_dump
- 이미지: rsync 증분 백업
- Nginx/systemd/.env: 변경 시 백업
- Git 코드: 별도 원격 저장소 유지
- 백업 HDD는 서비스 HDD와 물리적으로 분리

백업은 실제 복구 테스트까지 해야 완성으로 본다.

## 15. UPS

UPS에는 최소:
- 서버 PC
- 공유기
- 인터넷 모뎀/ONT

정전이 일정 시간 이상 지속되면 서버가 정상 shutdown 되도록 구성하는 것이 이상적이다.

## 16. 이전 전략

1. 현재 클라우드 구조 조사
2. 로컬 Ubuntu 설치
3. 디스크 마운트/권한
4. PostgreSQL/Node/Python/Nginx 설치
5. 코드 복제
6. .env 이전 및 로컬용 값 조정
7. DB dump/restore
8. 이미지 rsync
9. systemd 서비스 복제
10. Nginx 설정
11. 내부 API localhost 점검
12. 임시 도메인/hosts로 테스트
13. 기능/결제/회원/이미지 검증
14. 최종 DB/이미지 증분 동기화
15. DNS 전환
16. 클라우드 유지 상태로 며칠 검증
17. 안정화 후 클라우드 종료 여부 결정

## 17. 이전 시 반드시 확인할 기존 서버 정보

- 실제 PostgreSQL DB명/role
- 각 서비스 systemd ExecStart
- 각 API 실제 포트
- 집테리어 이미지 실제 저장 경로
- /mnt/vdb_data 사용 구조
- Nginx zippalgo360/zipterior 설정
- .env 변수 목록
- 도메인/SSL 인증서 갱신 방식
- 업로드 파일 경로
- cron/timer 작업
- 현재 DB 간 관계 및 집테리어 연동 방식

이 문서는 로컬 서버 구축/이전 작업의 기준 문서로 사용한다.


## 18. 2026-08-27 로컬 서버 최종 확정사항

### 운영 방식
- 로컬 PC는 서버 전용으로 사용한다.
- Windows 11 Home은 제거하고 Ubuntu Server 24.04 LTS 단독 설치로 확정한다.
- 평상시 관리는 별도 Windows PC의 Windows Terminal에서 SSH로 접속한다.
- 비상 시 서버 PC에 모니터/키보드를 직접 연결해 콘솔 로그인한다.
- Windows + VM / WSL2 / Docker 전환은 하지 않는다.
- 현재 클라우드 Ubuntu 환경과 최대한 동일하게 복제한다.

### 확정 하드웨어
- CPU: Intel Core i5-8500 (6코어 6스레드)
- RAM: 16GB
- GPU: 2GB (서버 서비스에는 사용하지 않음)
- SSD 120GB: Ubuntu Server 24.04 LTS 시스템 디스크
- SSD 250GB: PostgreSQL, 집팔고360/집테리어 앱, 런타임/빌드
- HDD 1TB: 집테리어 중심의 대용량 WebP 이미지/미디어
- HDD 4TB: 전용 백업 디스크
- 인터넷: 사무실 1Gbps 회선, 실측 약 600Mbps
- 향후 실제 HDD I/O 병목이 확인될 때 이미지 디스크를 1~2TB SSD로 교체 가능

### 플랫폼 구조
집팔고360(zippalgo360.com)이 메인 포털이다.

하위 서비스:
- 집팔고 API: 매물/부동산/사진, 업체의 유료 매물정보 열람
- 집사고 API: 매수요청/매물/업체정보, 부동산 업체 대상 요청 배포
- 집테리어 API: 포트폴리오/업체/사진/견적/채팅
- 집서비스 API: 이사/청소/인터넷 견적, 가전/가구 쇼핑

공통 Core:
- 회원가입/로그인
- 일반/업체 회원
- 공통 user_id/company_id
- 결제/주문
- 내정보/통합 사용기록
- 권한/알림

서비스별 API 경계는 유지한다. 같은 서버 내부 API 호출은 localhost/127.0.0.1을 우선 사용한다.
집테리어 이미지는 API가 바이너리를 중계하지 않고 URL/메타데이터를 반환하며 Nginx가 정적 파일을 직접 제공하는 구조를 목표로 한다.

### 이미지 정책
- 현재 WebP 정책 유지
- 포트폴리오당 약 50장, 장당 약 1MB 규모를 전제로 한다.
- 집팔고360 내부 집테리어 포트폴리오 UI에서 일반 <img> 갤러리에 명시적 lazy loading이 없는 부분이 확인되었으므로 이전 전후 기능 검증 후 개선한다.
- 대표 이미지/첫 화면 이미지는 즉시 로딩을 유지한다.
- 갤러리에는 loading="lazy", decoding="async" 적용을 기본 검토한다.
- 이미지 HDD 성능은 실제 운영에서 iowait/응답시간을 측정해 판단한다.
- 성능 문제가 없으면 HDD 유지, 병목이 확인되면 이미지용 SSD 또는 CDN을 검토한다.

### 백업 정책 — 4TB HDD
4TB HDD는 단순 실시간 미러가 아니라 복구 가능한 버전 백업용으로 사용한다.

권장 경로:
- /backup/database
- /backup/media
- /backup/releases
- /backup/configs
- /backup/logs

정책:
1. PostgreSQL: 정기 pg_dump + 중요 작업 직전 백업
2. 미디어: rsync 기반 증분 백업. 원본 삭제가 즉시 백업 삭제로 전파되지 않도록 구성
3. 코드: Git + 작업 전 Release checkpoint
4. Nginx/systemd/.env: 변경 전 및 정기 백업
5. 운영 수정 전 반드시 백업/검증/롤백 포인트 생성
6. 결제/회원 데이터가 본격 운영되면 PostgreSQL WAL/PITR 도입 검토
7. 백업 성공 여부뿐 아니라 실제 복원 테스트를 정기적으로 수행
8. 장기적으로 핵심 DB 백업은 암호화하여 외부 저장소에도 2차 보관 권장

### 운영 변경 강제 절차
운영 서버에서 Claude/GPT를 이용한 수정 포함 모든 주요 변경은 다음 순서를 따른다.

1. 현재 상태 확인
2. Git 상태 확인
3. 코드/설정/DB 중 변경 영향 대상 백업
4. pre-change checkpoint 생성
5. 변경
6. 문법/빌드/서비스 상태 검증
7. 기능 테스트
8. 정상 시 release 확정
9. 문제 시 데이터는 보존하고 코드/설정 중심으로 선택적 rollback
10. DB rollback은 명확한 필요와 백업 시점을 확인한 경우에만 수행

VM 전체 롤백처럼 최신 회원/결제/견적 데이터를 함께 과거로 되돌리는 방식은 기본 롤백 방식으로 사용하지 않는다.

### 설치 안전 원칙
- Ubuntu 설치 시 120GB SSD를 설치 대상으로 사용한다.
- 가능하면 설치 중 250GB SSD, 1TB HDD, 4TB HDD는 물리적으로 분리하여 오선택/포맷을 방지한다.
- Ubuntu 설치 완료 후 디스크를 하나씩 연결하여 UUID 기반 /etc/fstab 마운트를 구성한다.
- 250GB SSD는 서비스용, 1TB HDD는 /data/media, 4TB HDD는 /backup 용도로 명확히 구분한다.

### 이전 원칙
서버 이전과 DB 대규모 리팩터링을 동시에 하지 않는다.
현재 클라우드의 집팔고360/집테리어를 우선 동일하게 복제하고 정상 작동을 확인한 후 목표 DB 구조로 점진적으로 개선한다.
DNS 전환 전 로컬에서 전체 기능을 검증하고, 전환 후에도 기존 클라우드는 일정 기간 롤백용으로 유지한다.
