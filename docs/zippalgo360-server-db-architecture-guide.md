# 집팔고360 통합 플랫폼 서버·DB 아키텍처 최종 통합 지침서

- 작성 기준일: 2026-08-28
- 문서 상태: 실제 로컬 구성과 이전 진행 상태를 반영한 최신 개정본(DNS 최종 전환 전)
- 대상 플랫폼: 집팔고360(`zippalgo360.com`)
- 대상 서버: `zippalgo360-server`
- 운영 원칙: 클라우드에서 로컬 서버로 최종 이전한 뒤 로컬 서버만 운영

---

## 0. 문서 목적과 적용 우선순위

이 문서는 집팔고360, 집테리어, 집서비스의 서버 구성, DB 소유권, 미디어 저장, 백업, 보안, 결제 처리, 장애 대응 및 클라우드 종료 절차를 하나로 통합한 운영 기준서다.

이 문서의 우선순위는 다음과 같다.

1. 실제 서버와 기존 클라우드에서 확인된 값
2. 이 문서에 명시된 확정 운영 원칙
3. 신규 기능을 위한 목표 구조
4. 아직 확인되지 않은 항목에 대한 권장안

확인되지 않은 장치명, UUID, 비밀번호, API Secret, 인증서 개인키 등은 추측해서 기록하거나 적용하지 않는다. 실제 값을 확인한 뒤 변경 이력과 함께 이 문서에 추가한다.

서버 이전과 대규모 DB 리팩터링은 동시에 진행하지 않는다. 기존 클라우드 구성을 우선 동일하게 복원하고 서비스 정상 작동을 확인한 뒤 목표 구조로 점진적으로 개선한다.

---

## 1. 플랫폼 정의

집팔고360은 하나의 계정과 업체 체계를 사용하는 통합 메인 플랫폼이다.

### 1.1 하위 서비스

- 집팔고
  - 매물 등록 및 조회
  - 부동산 정보
  - 매물 사진
  - 중개업체의 유료 매물정보 열람
- 집테리어
  - 포트폴리오
  - 업체정보
  - 대량 이미지
  - 견적문의
  - 채팅문의
- 집서비스
  - 이사·청소·인터넷 등 생활서비스 견적
  - 가전·가구 등 쇼핑

### 1.2 집팔고360 Core 소유 기능

- 회원가입 및 로그인
- 일반회원·업체회원
- 공통 `user_id` 및 `company_id`
- 인증 및 권한
- 결제 및 주문
- 내정보
- 통합 사용이력
- 쿠폰·적립금
- 알림

집테리어는 사용자와 브랜드 관점에서는 집팔고360의 하위 서비스다. 다만 서버 내부에서는 장애 격리, 독립 배포 및 향후 서버 분리를 위해 Zipterior API 경계를 유지한다.

---

## 2. 최종 운영 모델

### 2.1 확정 운영 방식

- 로컬 PC를 서버 전용으로 사용한다.
- Windows 11 Home은 제거하고 Ubuntu Server 24.04 LTS를 단독 설치한다.
- Windows VM, WSL2 또는 Docker 기반 운영으로 전환하지 않는다.
- 평상시 관리는 별도 Windows PC에서 SSH로 수행한다.
- 비상 시 서버에 모니터와 키보드를 직접 연결하여 콘솔 로그인한다.
- 클라우드 서버는 이전 완료와 로컬 운영 검증 후 종료한다.
- 클라우드와 로컬을 장기간 이중 운영하지 않는다.
- 클라우드를 상시 대기 서버나 장기 백업 서버로 사용하지 않는다.

### 2.2 클라우드의 역할

클라우드는 이전 기간 동안의 원본 서버다. 클라우드 종료 전까지는 데이터 누락 방지를 위해 최종 동기화와 검증에만 사용한다.

클라우드 종료 후 운영 구조는 다음과 같다.

```text
사용자
  -> 인터넷/DNS
  -> 사무실 공유기
  -> Nginx :80/:443
  -> Next.js 및 서비스별 API
  -> PostgreSQL / 미디어 파일시스템
```

이 구조는 단일 물리 서버 구조이며 고가용성(HA) 구조가 아니다. 서버 본체, 서비스 SSD, 공유기, 회선 또는 전원 장애 시 서비스가 중단될 수 있다. 4TB 백업 HDD는 복구 수단이지 무중단 장치가 아니다.

---

## 3. 핵심 아키텍처 원칙

1. 집팔고360을 유일한 메인 플랫폼으로 둔다.
2. 회원·업체·인증·결제·주문·내정보는 Core가 기준 소유자다.
3. 서비스별 API 경계를 유지한다.
4. 같은 물리 서버의 서비스 간 통신은 `127.0.0.1`을 사용한다.
5. 외부 사용자는 Nginx를 통해 공개 URL만 접근한다.
6. 서비스가 다른 서비스의 업무 DB에 직접 SQL을 실행하지 않는다.
7. 교차 서비스 데이터는 합의된 ID와 내부 API 계약으로 조회·변경한다.
8. 이미지 바이너리는 DB에 저장하지 않는다.
9. Nginx가 정적 미디어를 직접 전송한다.
10. 현재 단계에서는 과도한 마이크로서비스 분리나 Docker 도입을 하지 않는다.
11. 향후 서비스 규모가 커질 경우 API 경계를 기준으로 서버를 분리할 수 있게 유지한다.
12. 결제·주문·권한 부여는 중복 실행과 부분 실패를 전제로 설계한다.
13. 운영 서버의 변경은 백업, 검증, 배포, 롤백 순서를 반드시 따른다.

---

## 4. 현재 실행 구조와 확정 포트

| 구성요소 | 경로/프로세스 | 바인딩 |
|---|---|---|
| zippalgo360-web | Next.js | `127.0.0.1:3000` |
| zippalgo360-api | FastAPI | `127.0.0.1:8001` |
| zipterior-api | FastAPI | `127.0.0.1:8000` |
| PostgreSQL 16 | 단일 인스턴스 | `127.0.0.1:5432` |
| Nginx | TLS 종단·리버스 프록시·정적 파일 | 외부 `80/443` |

현재 확인된 기존 클라우드 경로는 다음과 같다.

- zippalgo360-web: `/srv/zippalgo360/apps/web`
- zippalgo360-api: `/srv/zippalgo360/apps/api`
- zipterior-api: `/srv/zipterior/backend`
- 집테리어 기존 정적 프론트: `/var/www/zipterior`
- 집테리어 업로드: `/var/www/zipterior/uploads`
- 포트폴리오 업로드: `/var/www/zipterior/uploads/portfolios`

집서비스는 실제 구현 상태를 확인하지 않은 채 임의로 별도 프로세스를 만들지 않는다. 현재 코드 안의 모듈 경계를 먼저 확인한 뒤 분리 필요성이 확인될 때만 서비스 프로세스를 추가한다.

---

## 5. 로컬 서버 하드웨어와 물리 배치

### 5.1 확정 하드웨어

- CPU: Intel Core i5-8500, 6코어 6스레드
- RAM: 16GB급, OS 표시 약 15GiB
- GPU: 2GB, 서버 서비스에서는 사용하지 않음
- 시스템 SSD: 120GB급
- 서비스 SSD: 250GB급
- 미디어 HDD: 1TB급
- 백업 HDD: 4TB급(운영체제 표시 약 3.6TiB), 설치 및 ext4 초기화 완료
- 인터넷: 1Gbps 회선, 실측 약 600Mbps

### 5.2 역할 분리

| 저장장치 | 용도 |
|---|---|
| 시스템 SSD | Ubuntu, 시스템 패키지, Nginx, systemd, 시스템 로그 |
| 서비스 SSD | PostgreSQL, 앱, venv, node_modules, 빌드 결과, 릴리스, 임시 업로드 |
| 미디어 HDD | 집팔고·집테리어·집서비스 이미지와 미디어 |
| 4TB 백업 HDD | DB·미디어·설정·릴리스의 버전 보존형 백업 |

서비스 SSD와 미디어 HDD는 각각 단일 디스크이므로 장애 시 서비스가 중단된다. 4TB 백업으로 복구는 가능하지만 무중단 전환은 불가능하다. SMART 감시와 복구 절차를 유지하고, 가능하면 교체용 SSD/HDD를 신속하게 확보할 수 있도록 모델과 용량을 기록한다.

---

## 6. 실제 로컬 서버 구축 상태

### 6.1 기본 정보

- Hostname: `zippalgo360-server`
- 관리 계정: `serveradmin`
- OS: Ubuntu Server 24.04.4 LTS
- Kernel 확인값: `6.8.0-138-generic x86_64`
- Swap: 4GiB
- 현재 LAN IP 확인값: `192.168.0.218`
- SSH 비밀번호는 설치 후 변경했으며 문서에 기록하지 않는다.

### 6.2 시스템 SSD

- 현재 확인 장치: `/dev/sdb`
- 모델: `SAMSUNG MZ7LN128`
- 물리 표시 용량: 약 119.2G
- Ubuntu LVM 사용
- root LV를 `lvextend -l +100%FREE -r`로 확장 완료
- `/` 파일시스템: 약 115G, ext4

### 6.3 서비스 SSD

- 현재 확인 장치: `/dev/sda`
- 모델: `WDC WDS240G2G0A`
- 물리 표시 용량: 약 223.6G
- 파티션: `/dev/sda1`, ext4
- LABEL: `service_data`
- UUID: `8e334fd6-b71b-476e-a783-50d287f23896`
- 마운트: `/srv-data`
- 표시 용량: 약 220G

### 6.4 미디어 HDD

- 현재 확인 장치: `/dev/sdd`
- 모델: `TOSHIBA DT01ACA1`
- 물리 표시 용량: 약 931.5G
- 파티션: `/dev/sdd1`, ext4
- LABEL: `media_data`
- UUID: `44b969da-de84-4610-8fc5-444e0d35e59d`
- 마운트: `/data/media`
- 표시 용량: 약 916G

### 6.5 백업 HDD

- 현재 확인 장치: `/dev/sdc`
- 영구 식별 경로: `/dev/disk/by-id/ata-ST4000VN006-3CW104_ZW603165`
- 모델: `ST4000VN006-3CW1`
- 시리얼: `ZW603165`
- 제조사 표기 용량: 4TB, 운영체제 표시 약 3.6TiB
- 파티션: `/dev/sdc1`, GPT 단일 ext4
- LABEL: `backup_data`
- UUID: `e1bcc3cc-c5b2-46b8-8dd2-0ffb50f8ac9d`
- 마운트: `/backup`
- `/etc/fstab`: `UUID=e1bcc3cc-c5b2-46b8-8dd2-0ffb50f8ac9d /backup ext4 defaults,nofail,x-systemd.device-timeout=10s 0 2`
- 2026-08-27 사용자 승인에 따라 기존 Synology RAID/LVM/Btrfs 서명을 제거하고 백업 전용 ext4로 초기화했다.

`/dev/sdX` 이름은 디스크 추가나 부팅 순서에 따라 달라질 수 있다. 운영 설정은 위 UUID와 by-id를 기준으로 하고 장치명만으로 디스크를 초기화하거나 마운트하지 않는다.

---

## 7. 런타임과 패키지 기준

2026-08-27 실제 확인값은 다음과 같다.

- Ubuntu: 24.04.4 LTS
- Python: 3.12.3
- Git: 2.43.0
- Node.js: 22.23.2
- npm: 10.9.8
- PostgreSQL: 16.15
- PostgreSQL timezone: `Asia/Seoul`
- Nginx: 1.24.0

기존 클라우드의 핵심 런타임 계열과 동일하게 유지하는 것을 우선한다. 이전 과정에서는 런타임 메이저 버전을 동시에 변경하지 않는다.

이전 안정화 후 별도 호환성 시험을 거쳐 지원 중인 Node.js LTS로 업그레이드할 수 있다. Ubuntu 패키지는 단순 버전 문자열만 보고 임의 교체하지 않고 Ubuntu 보안 업데이트를 정상 적용한다.

운영 패키지 업데이트는 다음 원칙을 따른다.

- 보안 업데이트를 정기 적용한다.
- 대규모 업데이트 전 백업과 release checkpoint를 만든다.
- 커널·PostgreSQL·Node.js 메이저 변경은 유지보수 시간에 별도 수행한다.
- 재부팅 필요 여부와 서비스 기능을 확인한다.

---

## 8. 실제 경로와 마운트 안전 원칙

### 8.1 권장 실제 배치

```text
/srv-data/apps/zippalgo360
/srv-data/apps/zipterior
/srv-data/postgresql/16/main
/srv-data/releases
/data/media/zippalgo
/data/media/zipterior
/data/media/zipservice
/data/media/zipterior/uploads
/backup/database
/backup/media
/backup/releases
/backup/configs
/backup/logs
/backup/manifests
```

### 8.2 기존 절대경로 호환

기존 코드와 systemd가 `/srv/zippalgo360`, `/srv/zipterior`, `/var/www/zipterior/uploads`를 사용하므로 이전 중 코드를 무리하게 변경하지 않는다.

우선 검토할 호환 구조는 다음과 같다.

- `/srv/zippalgo360` -> `/srv-data/apps/zippalgo360`
- `/srv/zipterior` -> `/srv-data/apps/zipterior`
- `/var/www/zipterior/uploads` -> `/data/media/zipterior/uploads`

심볼릭 링크보다 bind mount를 우선 검토한다. 실제 적용 전에 기존 경로의 파일과 권한을 확인한다.

### 8.3 마운트 실패 방지

`/srv-data` 또는 `/data/media`가 마운트되지 않은 상태에서 서비스를 시작하면 OS SSD의 빈 디렉터리에 DB나 이미지가 기록될 수 있다. 이를 방지하기 위해 다음을 강제한다.

- PostgreSQL은 `/srv-data`가 실제 마운트된 경우에만 시작한다.
- zippalgo360 및 zipterior 서비스는 필요한 앱 경로가 마운트된 경우에만 시작한다.
- Zipterior API와 Nginx 미디어 제공은 `/data/media` 및 업로드 bind mount가 준비된 뒤 시작한다.
- systemd에 `RequiresMountsFor=` 또는 동등한 mount dependency를 사용한다.
- 필요한 경우 `ConditionPathIsMountPoint=`로 실제 마운트 여부를 확인한다.
- 마운트 실패 시 서비스도 명확히 실패시키고 관리자에게 알린다.
- `nofail`로 조용히 무시하여 서비스가 잘못된 위치에 쓰게 하지 않는다.
- 재부팅 후 마운트와 서비스 시작 순서를 검증한다.

### 8.4 PostgreSQL 데이터 경로

현재 확인된 PostgreSQL `data_directory`는 다음과 같다.

```text
/srv-data/postgresql/16/main
```

PostgreSQL 데이터 디렉터리는 실행 중 파일 복사 방식으로 백업하거나 이동하지 않는다. cluster 상태, 서비스 유닛, 소유권, 권한을 확인하고 PostgreSQL 공식 도구를 사용한다.

---

## 9. 네트워크와 외부 공개

### 9.1 공유기에서 공개할 포트

- TCP 80
- TCP 443

PostgreSQL, Next.js, FastAPI 포트는 외부에 공개하지 않는다.

### 9.2 필수 확인

- 공인 IPv4 여부
- CGNAT 여부
- 80/443 포트포워딩 가능 여부
- 외부 업로드 속도
- 유동 IP 여부
- 유동 IP인 경우 DNS 갱신 방식
- 공유기 재부팅 후 포트포워딩 유지 여부
- 내부/외부 DNS 접근 검증

2026-08-27 사전 확인 당시 로컬 회선 외부 IPv4는 `118.33.143.183`이고 `zippalgo360.com`과 `www.zippalgo360.com`은 기존 클라우드 IP `115.68.195.144`를 가리킨다. 이는 DNS 전환 전 상태다. 공유기 관리 주소 `192.168.0.1`의 응답은 확인했으나 WAN IP·CGNAT·80/443 포트포워딩은 관리 페이지 로그인 후 검증해야 한다. 앱과 TLS 내부 검증이 끝나기 전에는 DNS를 변경하지 않는다.

### 9.3 SSH

- SSH를 인터넷 전체에 공개하지 않는다.
- LAN, VPN 또는 Tailscale 접근을 우선한다.
- 불가피한 외부 SSH는 허용 IP를 제한한다.
- 키 기반 인증이 정상 작동하는 것을 확인한 뒤 비밀번호 로그인을 비활성화한다.
- root 직접 로그인을 금지한다.
- 관리 계정에 최소 권한과 `sudo`를 적용한다.
- fail2ban과 방화벽 로그를 확인한다.

### 9.4 호스트 방화벽

- 기본 정책은 inbound deny로 설정한다.
- 외부에는 80/443만 허용한다.
- SSH는 LAN/VPN/허용 IP만 허용한다.
- PostgreSQL과 내부 API 포트는 loopback만 사용한다.
- 사용하지 않는 서비스와 포트를 비활성화한다.

### 9.5 실제 SSH·UFW 적용값

2026-08-27 적용 후 별도 공개키 세션으로 확인한 값은 다음과 같다.

- UFW: active, 부팅 시 자동 활성화
- 기본 정책: incoming deny, outgoing allow, routed deny
- SSH 22/tcp: `192.168.0.0/24`에서만 허용
- HTTP 80/tcp와 HTTPS 443/tcp: IPv4·IPv6 허용
- PostgreSQL 5432: `127.0.0.1` loopback 전용
- SSH: `serveradmin` 공개키 로그인만 허용
- root 로그인, 비밀번호 인증, keyboard-interactive 인증, X11 forwarding: 금지
- 관리 공개키 새 세션 접속 성공 및 비밀번호 전용 접속 거부 확인
- 설정 백업: `/etc/ssh/zippalgo360-pre-security-20260827_234823`, `/etc/ufw.pre-zippalgo360-20260827_234823`
- 적용 보고서: `/srv-data/docs/ZIPPALGO360_SECURITY_APPLY_20260827.txt`

fail2ban은 현재 미설치다. SSH가 키 전용이고 호스트 방화벽에서 LAN 전용으로 제한되므로 SSH 보호만을 위한 즉시 설치 우선순위는 낮다. 실제 Nginx/API 공개 후 인증·로그인 공격 패턴과 rate limit을 확인하여 HTTP 보호 용도로 도입 여부를 다시 판단한다.

---

## 10. Nginx 기준

### 10.1 역할

- `zippalgo360.com` TLS 종단
- Next.js reverse proxy
- API 경로 reverse proxy
- 정적 이미지 직접 전송
- 캐시 헤더
- 업로드 크기 제한
- 요청 제한과 기본 보안 헤더

### 10.2 공개 URL

```text
/api/core/
/api/zippalgo/
/api/zipterior/
/api/zipservice/
/media/
/uploads/           # 기존 집테리어 URL 호환
```

### 10.3 필수 설정 원칙

- TLS 1.2/1.3을 사용한다.
- 인증서 자동 갱신과 갱신 시험을 수행한다.
- HTTP는 HTTPS로 리다이렉트한다.
- HSTS는 HTTPS 전체 기능과 갱신이 검증된 뒤 적용한다.
- 로그인, 결제, 검색, 업로드 API에 적절한 rate limit을 적용한다.
- `client_max_body_size`를 서비스 요구량에 맞게 제한한다.
- `X-Forwarded-For`, `X-Forwarded-Proto`, `Host` 전달과 신뢰 프록시 범위를 명확히 한다.
- CSP, `X-Content-Type-Options`, frame 정책 등 기본 보안 헤더를 적용한다.
- 내부 관리·health 상세 엔드포인트를 외부에 그대로 공개하지 않는다.
- 사용자 입력 파일 경로에서는 스크립트 실행을 허용하지 않는다.

### 10.4 이미지 캐시

긴 브라우저 캐시를 적용할 파일은 덮어쓰지 않고 해시 또는 버전이 포함된 새 파일명을 사용한다. 같은 URL의 파일을 교체해야 한다면 `immutable` 캐시를 사용하지 않거나 버전 쿼리/경로를 변경한다.

---

## 11. 서비스 간 통신과 장애 격리

### 11.1 통신 원칙

- 같은 서버에서는 `127.0.0.1`을 사용한다.
- 이미지 바이너리는 API 간 중계하지 않는다.
- URL과 메타데이터만 반환한다.
- 다른 서비스 DB에 직접 접속하지 않는다.
- API 계약에 버전을 부여하고 변경 호환성을 관리한다.

### 11.2 내부 API 보안

localhost 통신도 무조건 신뢰하지 않는다.

- 서비스 간 인증 토큰 또는 서명된 요청을 사용한다.
- `SSO_SHARED_SECRET` 등 비밀값은 Git과 문서에 저장하지 않는다.
- Secret 파일의 소유자와 권한을 제한한다.
- Secret 교체 절차와 이전 Secret의 폐기 시점을 기록한다.
- 요청에 audience, 발급 시각, 만료 시각, nonce 또는 동등한 재전송 방지 정보를 둔다.
- 클라우드 종료 후 클라우드에서 사용했던 서비스 Secret과 SSH 키를 교체한다.

### 11.3 API 안정성

- 모든 내부 호출에 연결/응답 timeout을 둔다.
- 무제한 retry를 금지한다.
- 조회 요청만 제한적으로 재시도한다.
- 결제·주문·권한 부여 요청은 idempotency 없이 자동 재시도하지 않는다.
- 서비스별 health check와 readiness check를 구분한다.
- 요청 추적용 correlation ID를 서비스 간 전달한다.
- 집테리어 장애 시 집팔고360 전체가 중단되지 않도록 해당 영역만 오류 처리한다.
- 통합 내정보 화면은 한 서비스 장애 시 가능한 데이터만 표시하고 실패 서비스를 명시한다.

---

## 12. 회원·업체·인증 통합

### 12.1 최종 기준 ID

- 회원 기준 ID: Core `users.id`
- 업체 기준 ID: Core `companies.id`

신규 기능은 Core ID를 기준으로 개발한다.

### 12.2 이전 단계 ID 처리

기존 Zipterior 사용자·업체 ID와 Core ID가 숫자상 동일하다고 가정하지 않는다. 이전 단계에서는 mapping table을 사용한다.

`core_service_user_map`

- `id`
- `service_type`
- `core_user_id`
- `external_user_id`
- `status`
- `created_at`
- `updated_at`
- `UNIQUE(service_type, external_user_id)`
- 서비스별 1:1 매핑이 확정된 경우 `UNIQUE(service_type, core_user_id)`

`core_service_company_map`

- `id`
- `service_type`
- `core_company_id`
- `external_company_id`
- `status`
- `created_at`
- `updated_at`
- `UNIQUE(service_type, external_company_id)`
- 서비스별 1:1 매핑이 확정된 경우 `UNIQUE(service_type, core_company_id)`

매핑 테이블의 기준 소유자는 Core로 한다. 다른 DB의 ID는 cross-database FK로 강제할 수 없으므로 API 검증과 정기 무결성 검사로 관리한다.

### 12.3 인증/세션

`auth_sessions`

- UUID PK
- `user_id`
- `refresh_token_hash`
- `ip_address`
- `user_agent`
- `expires_at`
- `created_at`
- `revoked_at`

`oauth_accounts`

- `id`
- `user_id`
- `provider`
- `provider_user_id`
- `created_at`
- `UNIQUE(provider, provider_user_id)`

세션에는 refresh token 원문을 저장하지 않는다. refresh token rotation과 탈취 재사용 탐지를 적용한다. 브라우저 인증 쿠키는 `Secure`, `HttpOnly`, 적절한 `SameSite` 정책과 CSRF 방어를 사용한다.

---

## 13. PostgreSQL 구성과 DB 소유권

### 13.1 인스턴스

로컬 서버에서는 PostgreSQL 16 인스턴스 하나를 사용한다.

### 13.2 이전 시 복원 대상

| DB | 현재 owner | 확인 규모 | 확장 기능 |
|---|---|---:|---|
| `zippalgo360_db` | `zippalgo_app` | 약 14MB | `plpgsql` |
| `zipterior_db` | `zipterior_app` | 약 2.6GB | `citext`, `pgcrypto`, `plpgsql` |
| `zipterior_test` | `zipterior_app` | 약 14MB | `citext`, `pgcrypto`, `plpgsql` |

이전 단계에서는 기존 DB명, owner, extension을 우선 동일하게 복원한다. 서비스 정상화 전에는 임의로 DB를 합치거나 schema를 재배치하지 않는다.

### 13.3 논리적 소유권

- Core·집팔고·현재 공통 플랫폼 기능: `zippalgo360_db`
- 집테리어 업무 데이터: `zipterior_db`, Zipterior API만 직접 접근
- 집서비스: 실제 구현 확인 후 `zippalgo360_db` 내부 schema 또는 별도 DB 여부 결정
- `zipterior_test`: 운영 데이터와 권한 분리

### 13.4 운영 안정화 후 권한 강화

애플리케이션 runtime role이 DB 객체 owner와 동일하면 불필요한 DDL 권한을 가질 수 있다. 이전 완료 후 다음 구조로 단계적으로 강화한다.

- 객체 소유용 `NOLOGIN` owner role
- 앱 실행용 최소 권한 LOGIN role
- schema migration 전용 role
- 테스트 전용 role
- 운영 DB와 테스트 DB의 `CONNECT` 권한 분리
- PostgreSQL superuser를 애플리케이션에서 사용하지 않음
- `pg_hba.conf`에서 DB·role·접속 위치를 제한
- `listen_addresses`는 로컬 서버 요구에 맞게 loopback으로 제한

`zipterior_test`가 운영 `zipterior_app` 자격증명으로 운영 DB와 동시에 접근할 수 있는 구조는 최종 상태로 유지하지 않는다.

---

## 14. 목표 Core DB 구조

이 절은 신규 기능과 점진적 통합을 위한 목표 구조다. 이전 시 기존 DB를 즉시 이 구조로 재구축하지 않는다.

### 14.1 사용자

`users`

- `id BIGSERIAL PRIMARY KEY`
- `email`
- `phone`
- `password_hash`
- `name`
- `user_type`
- `status`
- `created_at TIMESTAMPTZ`
- `updated_at TIMESTAMPTZ`
- `last_login_at TIMESTAMPTZ`

필수 규칙:

- 이메일은 정규화하거나 `citext`/함수 인덱스를 사용해 대소문자 무시 UNIQUE를 보장한다.
- 전화번호는 국가번호를 포함한 한 가지 형식으로 정규화한다.
- 전화번호 UNIQUE 적용 여부는 계정 정책을 확정한 뒤 결정한다.
- 비밀번호는 안전한 password hashing 알고리즘으로 저장한다.

`user_profiles`

- `user_id PRIMARY KEY/FK users.id`
- `nickname`
- `profile_image_url` 또는 `profile_media_id`
- `address`
- `marketing_agreed`
- `privacy_agreed`
- `terms_agreed`
- 동의 약관 버전 및 동의 시각
- `updated_at`

### 14.2 업체

`companies`

- `id BIGSERIAL PRIMARY KEY`
- `name`
- `business_number`
- `company_type`
- `phone`
- `email`
- `address`
- `logo_url` 또는 `logo_media_id`
- `status`
- `created_at`
- `updated_at`
- 정규화된 `business_number` UNIQUE

`company_memberships`

- `id BIGSERIAL PRIMARY KEY`
- `company_id FK`
- `user_id FK`
- `role`
- `status`
- `created_at`
- `UNIQUE(company_id, user_id)`

`company_services`

- `company_id FK`
- `service_type`
- `enabled BOOLEAN`
- `status`
- `created_at`
- `updated_at`
- `UNIQUE(company_id, service_type)`

서비스 유형:

- `ZIPPALGO`
- `ZIPTERIOR`
- `ZIPSERVICE`

---

## 15. 주문·결제·환불·포인트·쿠폰

### 15.1 주문

`orders`

- `id BIGSERIAL PRIMARY KEY`
- 외부 노출용 `public_id UUID UNIQUE`
- `user_id FK`
- `company_id nullable`
- `service_type`
- `service_reference_id`
- `order_type`
- `title`
- `currency`
- `amount`
- `discount_amount`
- `final_amount`
- `status`
- `idempotency_key UNIQUE`
- `created_at`
- `updated_at`

금액은 원 단위 정수 또는 명확한 `NUMERIC` 정책을 사용하고 음수 방지 CHECK를 둔다. `final_amount = amount - discount_amount` 등 금액 관계는 애플리케이션 검증과 DB 제약을 함께 검토한다.

`service_reference_id`는 여러 서비스 테이블을 가리키는 다형 참조이므로 DB FK를 직접 걸기 어렵다. Core는 서비스 API를 통해 존재와 소유권을 검증하고 정기 무결성 검사를 수행한다.

### 15.2 결제

`payments`

- `id BIGSERIAL PRIMARY KEY`
- `order_id FK`
- `user_id FK`
- `provider`
- `transaction_id`
- `payment_method`
- `currency`
- `amount`
- `status`
- `paid_at`
- `cancelled_at`
- 필요한 필드만 선별한 `provider_metadata JSONB`
- `created_at`
- `UNIQUE(provider, transaction_id)`

PG 응답 전체를 무조건 저장하지 않는다. 카드정보, 인증값, 전화번호, 이메일 등 불필요한 개인정보와 Secret이 로그나 JSONB에 들어가지 않도록 허용 필드만 저장한다.

`payment_webhook_events`

- `id`
- `provider`
- `event_id`
- `event_type`
- `received_at`
- `processed_at`
- `status`
- `error_message`
- `UNIQUE(provider, event_id)`

PG 웹훅의 서명을 검증하고 중복 이벤트를 안전하게 무시한다.

### 15.3 환불

`refunds`

- `id`
- `payment_id FK`
- `provider_refund_id`
- `amount`
- `reason`
- `status`
- `idempotency_key UNIQUE`
- `processed_at`
- `created_at`

### 15.4 포인트

`point_transactions`

- `id`
- `user_id`
- `type`
- `amount`
- `balance_after`
- `service_type`
- `reference_id`
- `idempotency_key UNIQUE`
- `expires_at`
- `created_at`

포인트 증감은 동시성 충돌을 방지하기 위해 트랜잭션과 row lock 또는 동등한 원자적 갱신을 사용한다. 현재 잔액과 원장 합계가 일치하는지 정기 검증한다.

### 15.5 쿠폰

`coupons`

- `id`
- `code UNIQUE`
- `name`
- `discount_type`
- `discount_value`
- `min_order_amount`
- `starts_at`
- `ends_at`
- `status`

`user_coupons`

- `id`
- `coupon_id`
- `user_id`
- `used_order_id nullable`
- `issued_at`
- `used_at`
- `expires_at`
- 중복 발급 정책에 맞는 UNIQUE 제약

---

## 16. 결제 분산 트랜잭션과 재처리

외부 PG, Core DB, 서비스별 API/DB는 하나의 ACID 트랜잭션으로 묶을 수 없다. 따라서 다음 상태 흐름을 사용한다.

```text
PENDING_PAYMENT
  -> PAID
  -> FULFILLING
  -> COMPLETED

실패 시:
PENDING_PAYMENT / PAID / FULFILLING
  -> FAILED 또는 MANUAL_REVIEW
```

필수 원칙:

1. 주문 생성에 `idempotency_key`를 사용한다.
2. PG transaction ID와 webhook event ID에 UNIQUE를 둔다.
3. 결제 성공 기록과 서비스 권한 반영 요청 사이에는 outbox 또는 동등한 영속 작업 큐를 사용한다.
4. 서비스 권한 부여 API도 idempotent하게 만든다.
5. 부분 실패는 재처리 가능해야 한다.
6. 결제 성공인데 서비스 권한이 없는 건, 권한은 있는데 결제가 취소된 건을 찾는 대사 작업을 운영한다.
7. retry 횟수와 간격을 제한하고 최종 실패는 관리자에게 알린다.
8. 환불도 별도의 상태 머신과 idempotency를 사용한다.
9. 결제·환불·매물 비공개정보 열람·업체 권한 변경은 감사 로그를 남긴다.

---

## 17. 서비스별 목표 데이터 영역

### 17.1 집팔고

`zippalgo.listings`

- `id`
- `owner_user_id`
- 단지·주소 필드
- `property_type`
- `title`
- `description`
- `price`
- `status`
- `created_at`
- `updated_at`

`zippalgo.listing_images`

- `id`
- `listing_id`
- `media_id` 또는 단일 기준 `storage_key`
- `sort_order`
- `created_at`
- `UNIQUE(listing_id, sort_order)` 검토

`zippalgo.listing_private_info`

- `listing_id PRIMARY KEY/FK`
- `owner_name`
- `owner_phone`
- `exact_address`
- `private_notes`
- `updated_at`

민감한 매물 정보는 공개 매물 테이블과 분리하고 열람 권한 검사를 서버에서 수행한다.

`zippalgo.listing_unlocks`

- `id`
- `listing_id`
- `company_id`
- `user_id`
- `order_id`
- `amount`
- `unlocked_at`
- `expires_at nullable`
- 동일 구매의 중복 생성 방지 UNIQUE 제약

`zippalgo.broker_matches`

- `id`
- `listing_id`
- `company_id`
- `status`
- `created_at`

### 17.2 집테리어

현재 이전 단계에서는 기존 `zipterior_db`를 그대로 복원한다. 핵심 엔티티는 다음과 같다.

- `apartment_complexes`
- `apartment_types`
- `companies`
- `portfolios`
- `portfolio_images`
- `portfolio_spaces/categories`
- `reviews`
- `likes`
- `comments`
- `estimate_requests`
- `chat_rooms`
- `chat_messages`

집팔고360 Core는 Zipterior DB를 직접 조회하지 않는다. 사용자·업체 연결은 Core mapping table을 사용한다.

### 17.3 집서비스

`zipservice.service_categories`

- `id`
- `parent_id nullable`
- `name`
- `slug UNIQUE`
- `type`
- `enabled`
- `sort_order`

`zipservice.quote_requests`

- `id`
- `user_id`
- `category_id`
- `region`
- `desired_date`
- `details JSONB`
- `status`
- `created_at`
- `updated_at`

`zipservice.quote_targets`

- `id`
- `quote_request_id`
- `company_id`
- `delivery_status`
- `delivered_at`
- `viewed_at`
- `responded_at`
- `UNIQUE(quote_request_id, company_id)`

`zipservice.quotes`

- `id`
- `quote_request_id`
- `company_id`
- `amount`
- `message`
- `status`
- `created_at`

### 17.4 쇼핑

`zipservice.products`, `product_images`, `cart_items`, `order_items`를 사용한다. 실제 결제와 주문 상태의 기준은 Core `orders`와 `payments`다.

향후 집서비스가 별도 DB로 분리되면 `order_items.order_id`에 cross-database FK를 사용할 수 없다. 이 경우 `core_order_id`를 외부 식별자로 저장하고 API/outbox로 무결성을 관리한다.

---

## 18. 활동이력·감사로그·알림

### 18.1 활동이력

`activity_logs`는 내정보 요약과 사용자 활동 표시용이다. 서비스별 원본 데이터를 대체하지 않는다.

- `user_id`
- `company_id nullable`
- `service_type`
- `action_type`
- `reference_type`
- `reference_id`
- 필요한 정보만 선별한 `metadata JSONB`
- `created_at`

### 18.2 감사로그

`audit_logs`

- `actor_user_id`
- `action`
- `target_type`
- `target_id`
- `ip_address`
- `request_id`
- `metadata JSONB`
- `created_at`

필수 감사 대상:

- 결제 및 환불
- 업체 권한 변경
- 매물 비공개정보 열람
- 관리자 변경
- 보안 설정 변경
- 백업 복원
- DB migration 실행

감사로그에는 비밀번호, 전체 토큰, 카드정보, Secret을 저장하지 않는다. 보존 기간과 열람 권한을 별도로 정한다.

### 18.3 알림

`notifications`와 `notification_deliveries`를 분리한다. 이메일·SMS·카카오·푸시 발송은 중복 방지키와 재시도 제한을 사용한다.

---

## 19. 파일·미디어 저장 구조

### 19.1 물리 저장소

```text
/data/media/zippalgo/
/data/media/zipterior/
/data/media/zipservice/
/data/media/zipterior/uploads/
```

집테리어 기존 URL `/uploads/...`는 유지한다.

### 19.2 DB 메타데이터

`media_files`

- `id BIGSERIAL PRIMARY KEY`
- `service_type`
- `owner_type`
- `owner_id`
- `storage_key`
- `mime_type`
- `width`
- `height`
- `size_bytes`
- `checksum`
- `created_at`
- `deleted_at`
- `UNIQUE(service_type, storage_key)`

DB에는 가능한 한 상대 `storage_key`를 기준값으로 저장한다. 실제 파일시스템 절대경로와 공개 URL을 독립된 진실값으로 중복 저장하지 않는다. 공개 URL은 서비스 설정과 `storage_key`로 생성한다.

서비스별 이미지 테이블은 `media_files.id`를 참조하거나, 기존 구조를 유지하는 동안 어느 테이블이 기준 원본인지 명확히 정한다.

### 19.3 업로드 처리

1. 인증·권한 확인
2. 업로드 요청 크기 제한
3. 허용 확장자 검사
4. 실제 파일 signature/magic 검사
5. 이미지 디코딩 가능 여부 검사
6. 최대 픽셀 수, 가로·세로, 파일 크기 제한
7. 서버에서 안전하게 디코딩 후 WebP 재인코딩
8. UUID 또는 콘텐츠 해시 기반 파일명 생성
9. 임시 경로에 저장
10. 검증 완료 후 같은 파일시스템 안에서 atomic rename
11. DB 메타데이터 기록
12. 실패 시 임시 파일과 고아 파일 정리

원본 사용자 파일명을 실제 저장 경로로 직접 사용하지 않는다. `..`, 절대경로, 제어문자, 이중 확장자 등 경로 조작을 차단한다. 업로드 디렉터리에 실행 권한을 부여하지 않는다.

### 19.4 이미지 표시 성능

- WebP 정책 유지
- 기존 리사이즈 정책 유지
- 대표 이미지와 첫 화면 이미지는 우선 로딩
- 갤러리는 `loading="lazy"`, `decoding="async"` 기본 검토
- 포트폴리오당 약 50장, 장당 약 1MB 규모 전제
- HDD iowait와 실제 응답시간을 측정
- 병목이 확인된 경우 이미지 SSD 또는 CDN을 검토

---

## 20. 인덱스와 DB 제약 기본 원칙

다음은 최소 검토 대상이다.

- `users`: 정규화 email UNIQUE, phone 인덱스/정책상 UNIQUE
- `companies`: 정규화 business_number UNIQUE
- `company_memberships(company_id, user_id)` UNIQUE
- `company_services(company_id, service_type)` UNIQUE
- `oauth_accounts(provider, provider_user_id)` UNIQUE
- `orders(idempotency_key)` UNIQUE
- `orders(user_id, status, created_at)`
- `payments(provider, transaction_id)` UNIQUE
- `payments(order_id)`
- `payment_webhook_events(provider, event_id)` UNIQUE
- `activity_logs(user_id, service_type, created_at)`
- `listings(owner_user_id, status)`
- `listing_unlocks(company_id, listing_id)`
- `portfolios(company_id, complex_id, status)`
- `estimate_requests(user_id/company_id/status)`
- `chat_messages(room_id, created_at)`
- `quote_requests(user_id, status)`
- `quote_targets(company_id, delivery_status)`
- `notifications(user_id, read_at)`
- 이미지 테이블 `(owner_id, sort_order)`

모든 FK는 `ON DELETE` 동작을 명시한다. 결제·주문·환불·매물정보 열람 기록은 물리 삭제하지 않는다. 일반 업무 데이터의 soft delete는 `deleted_at`을 사용하고 UNIQUE 제약과 충돌할 경우 partial unique index를 검토한다.

핵심 정수형 ID는 BIGINT를 사용하고 외부 노출에는 UUID 또는 안전한 public ID를 별도로 사용한다.

---

## 21. 백업 아키텍처

### 21.1 기본 원칙

- 4TB HDD는 단순 실시간 미러가 아니라 버전 보존형 백업으로 사용한다.
- 원본 삭제가 즉시 모든 백업 세대에 전파되지 않게 한다.
- DB·미디어·설정·릴리스를 함께 복구할 수 있어야 한다.
- 백업 성공 로그만 확인하지 않고 실제 복원시험을 수행한다.
- 클라우드 서버를 백업 서버로 유지하지 않는다.

### 21.2 백업 경로

```text
/backup/database
/backup/media
/backup/configs
/backup/releases
/backup/logs
/backup/manifests
```

`/backup`은 UUID 기반으로 자동 마운트한다. `nofail`은 백업 HDD 장애 시 서버 자체의 부팅 정지를 피하기 위한 옵션일 뿐, 루트 파일시스템의 빈 `/backup` 디렉터리에 백업을 계속 써도 된다는 뜻이 아니다. 모든 백업 서비스와 타이머는 실행 전 `/backup`이 실제 마운트 지점인지 확인하고, systemd 유닛에는 `ConditionPathIsMountPoint=/backup`과 `RequiresMountsFor=/backup`을 적용한다. 마운트 확인이 실패하면 백업은 즉시 실패 처리하고 알림을 발생시킨다.

### 21.3 PostgreSQL 논리 백업

- `zippalgo360_db` 정기 `pg_dump`
- `zipterior_db` 정기 `pg_dump`
- 필요한 경우 `zipterior_test` 별도 백업
- `pg_dumpall --globals-only`로 role, tablespace 등 cluster 전역 객체 백업
- extension, timezone, DB owner 목록 별도 기록
- 중요 migration과 운영 변경 직전 pre-change dump
- dump 파일 checksum 생성
- dump 명령 종료 코드와 파일 크기 검증
- 복원 후 `ANALYZE` 수행 검토

### 21.4 WAL/PITR

결제·회원 데이터가 본격적으로 발생하기 전에는 일별 dump로 시작할 수 있다. 결제 운영이 중요해지는 시점에는 다음을 추가한다.

- 정기 base backup
- WAL archiving
- WAL archive 지연 및 실패 감시
- 보존 기간과 용량 상한
- 지정 시점 복구시험

논리 dump와 WAL/PITR은 서로 대체 관계가 아니라 목적이 다른 보완 수단이다.

### 21.5 미디어 백업

- 날짜별 또는 snapshot 형태로 여러 세대를 보존한다.
- 단일 `rsync --delete` 미러만 운영하지 않는다.
- 삭제 파일이 이전 세대에 남도록 구성한다.
- DB 백업 시각과 미디어 snapshot ID를 manifest에 함께 기록한다.
- 파일 수, 총 용량, checksum 표본을 검증한다.
- 대량 최초 복사 후 증분 백업으로 전환한다.

### 21.6 권장 초기 보존 기준

- 일별 7세대
- 주별 4세대
- 월별 6세대
- 중요 변경 전 checkpoint 별도 보존

실제 용량 증가율을 측정한 뒤 보존 기간을 조정한다.

### 21.7 외부·오프라인 사본

4TB HDD가 서버와 같은 본체 또는 같은 장소에 있으면 화재, 침수, 도난, 전원 사고, 랜섬웨어에 함께 손실될 수 있다.

클라우드 서버를 운영할 필요는 없지만 핵심 DB와 설정 백업은 다음 중 하나로 추가 보관하는 것을 권장한다.

- 암호화한 이동식 HDD를 다른 장소에 보관
- 평소 분리된 오프라인 디스크를 주기적으로 연결
- 암호화된 외부 객체 저장소

외부 저장 방식은 운영 여건에 맞게 선택하되 Secret과 개인정보가 포함된 백업은 암호화한다.

### 21.8 백업 권한

- 백업 디렉터리는 root 또는 전용 backup 계정만 쓰기 가능하게 한다.
- 웹/API 서비스 계정에 `/backup` 쓰기 권한을 주지 않는다.
- 백업 스크립트와 자격증명 권한을 제한한다.
- `.env` 백업은 평문 유출 위험을 고려해 암호화와 접근 제한을 적용한다.
- 마운트되지 않은 `/backup` 경로에 백업 파일이 생성되지 않도록 실행 전 mountpoint 검사를 필수로 한다.

### 21.9 복원시험

정기적으로 별도 임시 DB 또는 격리 환경에 다음을 복원한다.

1. role/global 객체
2. DB schema와 data
3. extension
4. 미디어 표본 또는 전체 snapshot
5. 애플리케이션 연결
6. 회원 로그인
7. 주요 조회
8. 이미지 표시
9. 주문·결제 데이터 조회

복원시험 결과, 소요시간, 오류, 개선사항을 기록한다.

### 21.10 실제 자동 백업 구성값

2026-08-27 적용하고 재부팅 후 확인한 운영값은 다음과 같다.

- 실행 프로그램: `/usr/local/sbin/zippalgo360-backup`
- systemd service: `zippalgo360-backup.service`
- systemd timer: `zippalgo360-backup.timer`
- 실행 일정: 매일 03:10 KST, 최대 10분 임의 지연, `Persistent=true`
- mount 보호: `RequiresMountsFor=/backup /srv-data /data/media`, `ConditionPathIsMountPoint=/backup`
- 스크립트 내부 보호: mountpoint와 백업 UUID 재검증, 동시 실행 잠금, 여유 공간 10% 검사
- 보존: 최근 7회, 서로 다른 최근 4주와 6개월의 최신 성공본
- 최초 성공 백업 ID: `20260827_231708`
- PostgreSQL globals·custom dump·설정 archive checksum 검증 완료
- 재부팅 후 `/backup` 자동 마운트와 timer enabled/active 확인 완료
- 복원시험 ID `20260827_233910`: 최신 `postgres.dump`를 격리 임시 DB에 실제 복원, 카탈로그 객체 413개 확인, `ANALYZE` 후 임시 DB 삭제 완료
- 실제 서비스 DB 이전 후 `zippalgo360_db`, `zipterior_db`, `zipterior_test`를 대상으로 같은 복원시험을 반복한다.

---

## 22. 권장 복구 목표

다음 수치는 운영 전 최종 확인할 초기 권장 목표다.

| 대상 | 권장 RPO | 권장 RTO |
|---|---:|---:|
| 회원·결제·주문 DB | 결제 본격 운영 전 24시간 이하, 운영 후 15분 이하 목표 | 소프트웨어 장애 4시간 이내 |
| 견적·채팅 DB | 24시간 이하에서 시작, 중요도 증가 시 단축 | 4~8시간 이내 |
| 미디어 | 24시간 이하 | 디스크 용량에 따라 24시간 이내 목표 |
| 서버 전체 하드웨어 장애 | 최신 검증 백업 시점 | 교체 부품 확보 시간 포함 별도 산정 |

RPO는 허용 가능한 데이터 손실 시간이고 RTO는 서비스 복구 목표 시간이다. 실제 영업 요구와 결제 규모에 따라 더 짧게 조정한다.

---

## 23. 모니터링과 알림

로컬 서버 내부 모니터링만으로는 서버 전체 장애를 감지할 수 없으므로 외부에서 `zippalgo360.com`을 확인하는 uptime 감시를 별도로 둔다.

### 23.1 필수 감시 항목

- 외부 HTTPS 응답과 인증서 만료일
- Nginx 4xx/5xx 비율
- 각 systemd 서비스 상태와 재시작 횟수
- PostgreSQL 연결 수, 장기 쿼리, lock, autovacuum, DB 용량
- WAL archive 성공 여부와 지연
- `/`, `/srv-data`, `/data/media`, `/backup` 사용률과 inode
- 디스크 SMART 상태와 온도
- CPU load, RAM, swap, iowait
- 백업 최신 성공 시각과 파일 크기
- UPS 배터리·전원 상태
- 공유기/회선 외부 연결 상태

### 23.2 용량 알림

- 70%: 사전 점검
- 80%: 정리·증설 계획 실행
- 90%: 긴급 대응

PostgreSQL과 업로드 서비스는 디스크가 완전히 차기 전에 쓰기 제한 또는 관리자 경고를 수행한다.

### 23.3 로그

- 애플리케이션 로그에 correlation ID를 포함한다.
- 개인정보, 비밀번호, 전체 토큰, Secret, 카드정보를 기록하지 않는다.
- 로그 rotate와 보존 기간을 설정한다.
- 로그가 OS SSD를 가득 채우지 않게 한다.
- 결제/보안/백업 오류는 일반 정보 로그와 분리하여 알린다.

---

## 24. UPS와 전원

UPS에는 최소한 다음을 연결한다.

- 서버 PC
- 공유기
- 인터넷 모뎀 또는 ONT

정전이 일정 시간 이상 지속되면 서버가 정상 shutdown 되도록 UPS 연동 도구를 구성한다. 실제 전원을 차단하지 않는 안전한 방식으로 배터리 상태, 알림, shutdown 조건을 시험한다.

UPS가 있어도 디스크 장애나 파일 손상을 완전히 방지하지 못하므로 백업을 대체하지 않는다.

---

## 25. 클라우드에서 로컬로 최종 이전

### 25.1 사전 준비

1. 공인 IP, CGNAT, 포트포워딩 확인
2. DNS TTL을 전환 전에 낮춤
3. 로컬 Nginx와 TLS 검증
4. DB role, extension, timezone 준비
5. 앱과 미디어 경로 및 권한 준비
6. systemd mount dependency 검증
7. 4TB 백업 HDD 구성
8. 로컬 백업과 복원시험
9. 결제 idempotency와 webhook 중복 방지 확인
10. 외부 uptime과 장애 알림 구성

### 25.2 1차 이전

1. 클라우드 코드 복제
2. `.env` 변수명과 로컬 값 검토
3. DB 1차 dump/restore
4. 집테리어 약 93GB 이미지 1차 rsync
5. systemd 유닛 복제와 경로 조정
6. Nginx 설정 복제와 로컬용 조정
7. hosts 또는 임시 도메인으로 전체 기능 시험

### 25.3 필수 기능 시험

- 회원가입·로그인·로그아웃·세션 갱신
- 일반회원·업체회원 권한
- 집팔고 매물 등록·조회·수정·사진
- 유료 매물정보 열람
- 집테리어 포트폴리오·업체·이미지
- 견적문의와 채팅
- 집서비스 견적과 쇼핑
- 주문·결제·취소·환불
- 쿠폰·포인트
- 알림
- 업로드 파일 보안 검증
- 모바일·PC 화면
- Nginx 정적 이미지 캐시
- 장애 시 서비스별 오류 격리

### 25.4 최종 전환 절차

1. 전환 시작 시각 공지
2. 클라우드 애플리케이션의 사용자 쓰기 중지
3. 클라우드 cron, timer, worker, 알림 발송 작업 중지
4. 클라우드 결제 웹훅 처리 중지 또는 전환 준비
5. 최종 PostgreSQL dump와 globals dump 생성
6. 최종 이미지 증분 동기화
7. dump와 미디어 snapshot의 시각·checksum 기록
8. 로컬 DB 최종 복원
9. sequence, FK, extension, row count 및 주요 데이터 검증
10. 로컬 이미지 파일 수·용량·표본 checksum 검증
11. 로컬 서비스 시작
12. 로컬에서만 cron, timer, worker 활성화
13. PG 웹훅 목적지를 로컬 서비스로 전환
14. DNS 전환
15. 외부 네트워크에서 HTTPS, 로그인, 이미지, API 확인
16. 실제 소액 결제/취소는 승인된 시험 절차로 검증
17. 모니터링과 로그 집중 확인

두 서버에서 cron, 결제 웹훅, 문자·이메일 작업을 동시에 활성화하지 않는다.

### 25.5 전환 중 임시 롤백

클라우드는 최종 전환 검증이 끝날 때까지만 임시 원본으로 유지할 수 있다.

로컬에서 신규 쓰기가 발생한 뒤 단순히 DNS만 클라우드로 되돌리면 신규 회원·결제·견적 데이터가 사라질 수 있다. 따라서 다음 중 하나가 확인되지 않으면 데이터 생성 이후의 클라우드 롤백을 수행하지 않는다.

- 로컬 신규 데이터를 클라우드로 안전하게 역이관
- 로컬 DB를 기준으로 클라우드 DB를 재복원
- 전환 시험 단계에서 사용자 쓰기를 계속 차단

이는 장기 이중 운영을 의미하지 않는다. 최종 검증 이후 클라우드는 종료한다.

### 25.6 클라우드 종료 절차

1. 로컬 서버 정상 운영 확인
2. 로컬 DB와 미디어의 첫 정식 백업 성공 확인
3. 4TB 백업에서 복원 가능성 확인
4. 클라우드 최종 DB dump, 설정, Nginx, systemd 목록 보관
5. 필요한 최종 자료를 암호화하여 로컬 백업과 외부 사본에 보관
6. DNS가 로컬을 가리키는지 확인
7. PG, OAuth, 이메일, SMS, SSO 등 콜백 URL 확인
8. 클라우드 cron, worker, 웹훅이 완전히 중지됐는지 확인
9. 클라우드 전용 SSH 키와 Secret 폐기 또는 교체
10. 클라우드 서버 종료 및 계약 해지

클라우드 종료 후에는 해당 서버를 복구 수단으로 전제하지 않는다.

---

## 26. 운영 변경 강제 절차

운영 서버에서 사람이 직접 수정하거나 Claude/GPT를 이용해 수정하는 경우 모두 다음 순서를 따른다.

1. 현재 상태 확인
2. Git 상태 확인
3. 변경 영향 대상 확인
4. 코드·설정·DB·미디어 중 필요한 대상 백업
5. pre-change checkpoint 생성
6. 변경 수행
7. 문법 검사
8. DB migration dry-run 또는 검토
9. 빌드 검증
10. systemd 및 Nginx 설정 검증
11. 기능 시험
12. 로그와 모니터링 확인
13. 정상 시 release 확정
14. 문제 시 데이터는 보존하고 코드·설정 중심으로 선택적 rollback

DB rollback은 명확한 필요와 백업 시점을 확인한 경우에만 수행한다. 코드 오류 때문에 최신 회원·결제·견적 DB 전체를 과거로 되돌리지 않는다.

### 26.1 DB migration 원칙

- migration 도구와 migration version을 저장한다.
- 운영 DB에서 수동 DDL을 임의 실행하지 않는다.
- 가능한 경우 expand-contract 방식으로 호환성을 유지한다.
- 컬럼 삭제·타입 변경 전 코드 배포 순서와 rollback 가능성을 확인한다.
- 대용량 변경은 lock 시간과 디스크 여유를 확인한다.
- migration 전 dump와 적용 후 검증 결과를 기록한다.

---

## 27. 보안 운영 기준

### 27.1 Secret

- 비밀번호, API Secret, OAuth Secret, PG 비밀번호, 개인키를 문서와 Git에 저장하지 않는다.
- Secret의 위치와 용도만 기록한다.
- Secret 파일 권한을 최소화한다.
- 클라우드 종료 후 클라우드에서 사용한 Secret을 교체한다.
- 백업된 Secret은 암호화한다.

### 27.2 애플리케이션

- 모든 API에서 서버 측 authorization을 수행한다.
- 객체 ID만 알고 다른 사용자의 데이터에 접근하지 못하게 한다.
- 입력값 schema 검증과 SQL parameter binding을 사용한다.
- 관리자·업체 권한 변경을 감사한다.
- 로그인·비밀번호 재설정·결제·업로드에 rate limit을 적용한다.
- 가능하면 관리자 계정에 MFA를 적용한다.

### 27.3 개인정보

- 정확한 주소, 전화번호, 결제 관련 값은 필요한 범위에서만 저장·노출한다.
- 로그와 PG raw response에 개인정보가 들어가지 않게 한다.
- 개인정보 보존·삭제 정책을 서비스 정책과 맞춘다.
- 백업에서도 개인정보 보호와 보존 기간을 고려한다.

### 27.4 물리 보안

- 서버 본체와 백업 디스크 접근을 제한한다.
- 서버 장소의 온도, 먼지, 환기, 전원 상태를 관리한다.
- 분리형 외부 백업은 다른 장소에 보관한다.

---

## 28. 현재 완료 상태와 다음 단계

### 28.1 완료

- Ubuntu Server 24.04.4 LTS 단독 설치
- SSH 원격 관리 확인 및 비밀번호 변경
- 시스템 SSD LVM root 약 115G로 확장
- 서비스 SSD `/srv-data` ext4 자동 마운트
- 미디어 HDD `/data/media` ext4 자동 마운트
- UUID 기반 `/etc/fstab` 및 재부팅 검증
- Ubuntu 패키지 업데이트
- PostgreSQL 16.15 설치
- PostgreSQL `data_directory`를 `/srv-data/postgresql/16/main`으로 이전 및 검증
- OS/PostgreSQL timezone `Asia/Seoul`
- Nginx 1.24.0 설치 및 active 확인
- Node.js 22.23.2 / npm 10.9.8 설치
- 기존 클라우드 systemd/Nginx/API 포트 조사
- 기존 클라우드 DB명, role, extension, 용량 조사
- 기존 클라우드 이미지 경로와 약 93GB 용량 조사
- `.env` 변수명과 서비스 간 연동 변수 존재 확인
- 4TB HDD `ST4000VN006-3CW1`(시리얼 `ZW603165`) 물리 장착
- 기존 Synology RAID/LVM/Btrfs 서명 제거 후 GPT 단일 ext4 구성
- 백업 볼륨 LABEL `backup_data`, UUID `e1bcc3cc-c5b2-46b8-8dd2-0ffb50f8ac9d` 확정
- UUID 기반 `/etc/fstab` 등록 및 `/backup` 마운트 확인
- `/backup`과 백업 하위 디렉터리를 `root:serveradmin`, 권한 `0750`으로 구성

### 28.2 4TB HDD 구성 결과와 남은 검증

2026-08-27 다음 구성을 완료했다.

1. 모델·시리얼·용량과 서비스/미디어 디스크 UUID를 교차 확인
2. 사용자 승인 후 기존 Synology RAID/LVM/Btrfs 서명 제거
3. GPT 단일 파티션과 ext4 파일시스템 생성
4. LABEL `backup_data`와 UUID `e1bcc3cc-c5b2-46b8-8dd2-0ffb50f8ac9d` 확정
5. UUID 기반 `/etc/fstab` 등록
6. `/backup` 마운트 및 전체 3.6TiB 인식 확인
7. `database`, `media`, `configs`, `releases`, `logs`, `manifests` 디렉터리 생성
8. 루트와 하위 디렉터리를 `root:serveradmin`, 권한 `0750`으로 제한
9. 모델·시리얼·UUID·구성 시각을 `/backup/manifests/volume_identity.txt`에 기록

재부팅 후 자동 마운트, 백업 작업과 보존 정책, 최초 백업, 파일 단위 무결성 및 현재 DB의 임시 복원시험까지 완료했다. 실제 서비스 DB 이전 후 모든 운영·테스트 DB를 대상으로 동일 시험을 반복한다.

### 28.3 이후 이전 작업

- 서비스·미디어 디렉터리와 기존 절대경로 호환 구조 구성
- cloud 코드 1차 복제
- PostgreSQL role/DB/extension 준비 및 dump/restore
- 집테리어 93GB 업로드 이미지 1차 rsync
- systemd mount dependency와 서비스 유닛 구성
- Nginx 설정 구성
- 내부 API와 정적 이미지 검증
- 회원·결제·견적·채팅 기능 검증
- 백업/복원·모니터링·UPS 검증
- 최종 쓰기 중지 및 증분 동기화
- DNS 전환
- 로컬 안정화 확인
- 클라우드 최종 보관본 생성 및 폐기

---

## 29. 운영 전 최종 승인 체크리스트

### 스토리지

- [x] `/srv-data` 자동 마운트 및 재부팅 검증
- [x] `/data/media` 자동 마운트 및 재부팅 검증
- [x] `/backup` UUID 기반 `fstab` 등록 및 현재 마운트 검증
- [x] `/backup` 재부팅 후 자동 마운트 검증
- [x] 업로드 bind mount 검증
- [x] 마운트 실패 시 관련 서비스 시작 차단
- [ ] SMART 상태 정상
- [x] 용량·inode 로컬 임계치 점검 구성

### DB

- [x] DB명, owner, role, extension 복원
- [x] sequence와 FK 검증
- [ ] 운영·테스트 권한 분리 계획
- [x] globals 백업
- [x] DB별 dump
- [x] 복원시험
- [ ] 결제 운영 전 PITR 도입 시점 확정

### 앱/API

- [x] 서비스별 localhost 바인딩
- [ ] 서비스 간 인증과 Secret 권한
- [ ] timeout과 retry 제한
- [ ] idempotency key
- [ ] 결제 webhook 중복 방지
- [ ] 결제·권한 대사 작업
- [ ] correlation ID와 오류 로그

### 미디어

- [x] 기존 `/uploads/...` URL 호환
- [x] Nginx 정적 파일 제공
- [ ] 업로드 확장자·signature·크기·픽셀 검증
- [ ] 안전한 WebP 재인코딩
- [ ] UUID/해시 파일명
- [x] 버전 보존형 미디어 백업
- [x] 복원 표본 검증

### 보안

- [x] 호스트 UFW inbound deny
- [x] 호스트 UFW에서 80/443만 공개 허용
- [ ] 공유기에서 외부 80/443만 포트포워딩되는지 검증
- [x] SSH LAN/VPN/허용 IP 제한
- [x] 키 기반 SSH 및 비밀번호 인증 차단
- [ ] TLS 자동 갱신 시험
- [x] Nginx 보안 헤더와 rate limit
- [ ] Secret 비평문 관리
- [ ] 클라우드 종료 후 Secret 교체

### 운영

- [ ] 외부 uptime 감시
- [ ] 서비스·DB·디스크·백업 알림
- [ ] UPS 연결 및 정상 종료 계획
- [x] 변경 전 설정 백업과 로컬 롤백 절차 검증
- [x] 최종 전환 작업 순서 문서화
- [ ] 클라우드 cron/worker/webhook 중복 실행 방지
- [ ] 로컬 첫 정식 백업과 복원 확인 후 클라우드 폐기

---

## 30. 문서 누적 관리 규칙

다음 항목이 확정되거나 변경되면 날짜와 함께 이 문서에 기록한다.

- 하드웨어 장치명, 모델, 시리얼, UUID
- 마운트와 bind mount
- 서비스 경로와 포트
- systemd 유닛
- Nginx 경로와 인증서 갱신 방식
- DB명, role, extension, schema
- migration 정책
- backup, WAL, PITR, 보존 기간
- 결제 PG와 webhook 처리 구조
- 보안·방화벽·SSH 정책
- 모니터링과 알림
- RPO/RTO
- 클라우드 종료 완료일

변경 기록에는 최소한 다음을 남긴다.

- 날짜
- 변경 대상
- 변경 이유
- 변경 전 상태
- 적용 내용
- 검증 결과
- 백업 위치
- 롤백 방법

비밀번호와 Secret은 기록하지 않는다. 추측으로 기존 경로, DB, 포트 또는 권한을 변경하지 않는다. 실제 상태와 이 문서가 다르면 먼저 차이를 조사하고 문서를 갱신한다.

---

## 31. 최종 결정 요약

1. 집팔고360은 유일한 메인 플랫폼이다.
2. 집팔고, 집테리어, 집서비스는 하위 서비스다.
3. Zipterior API 분리 구조를 유지한다.
4. PostgreSQL은 한 인스턴스를 사용하되 DB 소유권은 논리적으로 분리한다.
5. 서비스가 다른 서비스 DB를 직접 조회·수정하지 않는다.
6. 기존 `zippalgo360_db`, `zipterior_db`, `zipterior_test`를 우선 그대로 복원한다.
7. ID는 이전 단계에서 mapping table로 연결한다.
8. 결제·주문은 Core가 소유하고 idempotency와 재처리를 필수로 한다.
9. 이미지 바이너리는 `/data/media`에 저장하고 Nginx가 제공한다.
10. 기존 `/uploads/...` URL을 유지한다.
11. `/srv-data`와 `/data/media` 마운트 실패 시 관련 서비스를 시작하지 않는다.
12. 4TB HDD는 버전 보존형 `/backup`으로 사용한다.
13. 클라우드는 최종 이전 후 종료하고 장기 병행 운영하지 않는다.
14. 로컬 단일 서버는 HA가 아니며 백업·모니터링·UPS·복구 절차로 위험을 관리한다.
15. 서버 이전 완료 전 대규모 DB 리팩터링을 하지 않는다.

이 문서를 로컬 서버 구축, 데이터 이전, 운영 변경 및 장애 복구의 기준 문서로 사용한다.

---

## 32. 2026-08-28 실제 구성 현황과 최종 전환 잔여 작업

이 절은 권장안이 아니라 2026-08-28 로컬 서버와 클라우드에서 직접 검증한 최신 상태다. 아래에서 완료로 표시하지 않은 항목은 최종 운영 전 반드시 수행한다.

### 32.1 로컬 스토리지

- OS: Ubuntu Server 24.04.4 LTS, `/` 약 115GiB
- 서비스 SSD: `/dev/sda1`, `/srv-data`, ext4, UUID `8e334fd6-b71b-476e-a783-50d287f23896`
- 미디어 HDD: `/dev/sdd1`, `/data/media`, ext4, UUID `44b969da-de84-4610-8fc5-444e0d35e59d`
- 백업 HDD: `ST4000VN006-3CW1`, 시리얼 `ZW603165`, `/dev/sdc1`, `/backup`, ext4
- 백업 HDD LABEL `backup_data`, UUID `e1bcc3cc-c5b2-46b8-8dd2-0ffb50f8ac9d`, 실사용 용량 약 3.6TiB
- 세 데이터 볼륨은 UUID 기반 자동 마운트와 재부팅 후 마운트를 확인했다.
- `/srv/zippalgo360`, `/srv/zipterior`, `/var/www/zipterior`, `/var/www/zipterior/uploads`는 systemd bind mount이며 모두 active/enabled다.
- mount 실패 시 앱과 Nginx가 잘못된 빈 경로로 시작하지 않도록 unit 의존성을 적용했다.

### 32.2 서비스와 DB

- `zippalgo360-web`: `127.0.0.1:3000`, active/enabled
- `zippalgo360-api`: `127.0.0.1:8001`, active/enabled
- `zipterior-api`: `127.0.0.1:8000`, active/enabled
- PostgreSQL 16.15: `127.0.0.1:5432`, timezone `Asia/Seoul`
- `zippalgo360_db` owner `zippalgo_app`
- `zipterior_db`, `zipterior_test` owner `zipterior_app`
- 앱 role은 login만 허용하며 superuser, createdb, createrole 권한이 없다.
- 세 DB의 owner, extension, FK, index와 sequence를 검증했다.
- NOT VALID FK 0, invalid index 0, 실제 최대 ID보다 뒤처진 sequence 0이다.
- 로컬 Web/API 기능 점검에서 집팔고360 API 57 paths, 집테리어 API 177 paths를 정상 로드했다.
- 활성 환경설정은 로컬 PostgreSQL과 최종 공개 도메인을 사용하며 이전 클라우드 IP 하드코딩은 없다.

### 32.3 미디어·백업·복원

- 집테리어 미디어 1차 동기화 결과: 1,543,405개 파일, apparent size 96,233,904,162 bytes로 클라우드와 일치했다.
- 로컬 Nginx에서 기존 `/uploads/...` URL과 실제 이미지 표본 HTTP 200을 확인했다.
- 백업은 매일 약 03:10 KST 실행하며 최근 7세대, 주간 4세대, 월간 6세대를 보존한다.
- PostgreSQL globals와 `postgres`, `zippalgo360_db`, `zipterior_db`, `zipterior_test` dump를 백업한다.
- 최신 검증 세대는 `/backup/database/20260828_074107`이다.
- dump checksum, 설정 archive, 실제 네 DB 임시 복원시험을 완료했다.
- 최신 실제 복원시험 manifest는 `/backup/manifests/restore-test-20260828_074535.manifest`이며 status `success`다.
- 클라우드 최종 전환 직전에는 쓰기를 중지한 뒤 DB 최종 dump와 미디어 증분 동기화를 다시 수행해야 한다.

### 32.4 Nginx·보안·운영 작업

- 로컬 HTTP virtual host에서 집팔고360, 집테리어, 두 `www`, `interior`, `zipterior` 서브도메인 경로를 검증했다.
- Web/API, clean URL, legacy redirect, 미디어, 숨김파일 차단이 모두 기대 HTTP 상태를 반환했다.
- `X-Content-Type-Options`, `X-Frame-Options`, `Referrer-Policy`를 적용했다.
- 일반 API는 IP당 30r/s, burst 60으로 제한한다.
- 인증·가입·SSO·refresh와 집팔고 결제 POST는 IP당 10r/m, burst 10이며 초과 응답은 HTTP 429다.
- API 동시 연결은 IP당 50, WebSocket은 IP당 10이다.
- SSH는 공개키 전용이며 UFW에서 LAN으로 제한한다.
- `/srv-data`의 활성 `.env` 계열은 `zipterior:zipterior`, mode 0600이다.
- 클라우드의 `zipterior-outbox-maintenance.timer`는 5분 주기로 실행 중이다.
- 로컬에는 동일 timer를 설치했지만 최종 전환 전까지 disabled/inactive로 유지한다.
- 두 서버에서 outbox, cron, worker 또는 webhook을 동시에 실행하지 않는다.

### 32.5 모니터링과 SMART

- `zippalgo360-health-check.timer`는 15분마다 mount, 용량, inode, 서비스, PostgreSQL, HTTP, 백업, 복원시험과 SMART를 점검한다.
- 로컬 결과는 journald와 `/srv-data/monitoring/health.status`에 기록한다.
- 용량 70% warning, 90% critical, DB 백업 30시간 초과 critical 기준이다.
- OS SSD, 4TB 백업 HDD, 1TB 미디어 HDD는 SMART 종합 판정을 통과했다.
- 서비스 SSD `WDC WDS240G2G0A-00JH30`, 시리얼 `19386L467515`은 SMART 종합 `PASSED`, 사용 수명 약 3%, 예비 공간 94%다.
- 서비스 SSD의 reallocated/grown bad block 26개가 확인됐다. program/erase/uncorrectable/CRC 오류와 커널 I/O 오류는 0이다.
- 2026-08-28 09:13 KST 약 41분의 확장 SMART 자체시험을 시작했다.
- 확장시험 정상 완료 후 26을 warning 기준값으로 등록하고, 수치 증가 시 critical 및 SSD 교체 대응한다.
- 확장시험 최종 결과 확인 전에는 SMART 항목을 완료로 처리하지 않는다.

### 32.6 DNS·TLS 현재 상태

- 로컬 LAN 주소는 DHCP `192.168.0.218`, NIC MAC `94:c6:91:3d:86:14`, gateway `192.168.0.1`이다.
- 확인된 로컬 회선 공인 IPv4는 `118.33.143.183`이다. 고정 공인 IP 여부는 별도로 확인해야 한다.
- 현재 DNS A 레코드는 아직 클라우드 `115.68.195.144`를 가리키며 TTL은 약 1,800초다.
- DNS 관리자는 Cafe24이며 AAAA 레코드는 없다.
- Certbot 2.9.0과 자동 갱신 timer를 설치했다.
- 여섯 Host의 `/.well-known/acme-challenge/` 로컬 HTTP-01 경로를 검증했다.
- DNS와 공유기 포트포워딩 전에는 로컬 인증서 발급을 시도하지 않는다.
- 클라우드 인증서 개인키는 복사하지 않고 DNS 전환 시 로컬에서 새 인증서를 발급한다.

### 32.7 최종 전환 전 필수 잔여 작업

1. 서비스 SSD 확장 SMART 시험 완료와 기준값 모니터링 확정
2. 서버 NIC MAC에 `192.168.0.218` DHCP 예약
3. 공유기 WAN 주소가 `118.33.143.183`과 일치하는지 확인하여 CGNAT 여부 판정
4. TCP 80/443만 `192.168.0.218`로 포트포워딩
5. 외부 uptime과 장애 알림 수신 채널 구성
6. UPS 연결·정상 종료 정책 확정
7. 사용자 계정으로 로그인·가입·권한·매물·포트폴리오·견적·채팅·업로드 기능시험
8. 결제 idempotency와 webhook 중복 처리 방지 확인
9. 전환 시작 시 클라우드 사용자 쓰기, cron, timer, worker, webhook 중지
10. 최종 DB dump/globals와 미디어·코드 증분 동기화
11. 로컬 DB 최종 복원 후 FK, sequence, 주요 row count, 파일 수·용량 재검증
12. 로컬 outbox timer 하나만 활성화
13. DNS A 레코드를 로컬 공인 IPv4로 변경
14. 로컬에서 새 TLS 인증서 발급 후 HTTPS와 자동 갱신 검증
15. 외부망에서 HTTPS, 로그인, API, 이미지, OAuth·PG callback 검증
16. 로컬 첫 정식 백업과 실제 복원시험 재실행
17. 안정화 관찰 후 클라우드 최종 보관본 생성, Secret 교체, 서버·계약 종료

최종 DNS 전환 전까지 클라우드는 실제 공개 운영 서버다. 클라우드에서 발생한 코드·DB·미디어 변경은 로컬 1차 이관본에 자동 반영되지 않으므로 최종 증분 동기화를 생략하면 안 된다.

---

## 33. 회원 유형별 서비스 접근 범위와 관리자 화면 구조 (2026-08-28 결정)

이 절은 12장(회원·업체·인증 통합)의 목표 구조를 실제 코드/화면 구조에 어떻게 적용할지에 대한 세부 결정과, 2026-08-28 코드 확인 결과 드러난 현재 구현 상태를 기록한다.

### 33.1 관리자 구조 결정: A안과 B안

관리자 화면을 다음 두 안 중에서 선택해야 했다.

- A안: 집테리어 관리자를 집팔고360 통합 관리자로 확장해 전 서비스를 한 화면에서 관리
- B안: 서비스별 자체 관리자를 유지하고, 집팔고360은 회원·결제 등 공통 항목만 관리

**B안으로 확정**한다. 서비스가 다른 서비스의 업무 DB에 직접 접근하지 않는다는 원칙(3장), 장애 격리 원칙(11.3), Zipterior API 경계 유지(1.2)와 일관되는 방향이다. A안은 서비스가 늘어날수록 관리자 권한 모델과 배포가 함께 꼬이는 문제가 있다.

### 33.2 회원 유형별 하위 서비스 접근 범위

- 일반회원(`customer`): 서비스별 추가 가입 없이 집팔고·집테리어·집서비스를 모두 이용한다. 하위 서비스는 별도로 이용 가능 여부를 심사하지 않는다.
- 업체회원(`company`): `company_type`(real_estate=집팔고, interior=집테리어, mover/cleaner=집서비스) 하나에만 속한다는 것을 전제로 한다. 한 업체가 여러 영역을 겸업하는 케이스는 낮은 빈도로 판단한다(2026-08-28). 이 전제가 유지되는 한 12.2절/14.2절이 제시하는 `company_memberships`/`company_services`(겸업 지원용 다대다) 구조는 도입하지 않는다.
- 접근 통제는 라우트 가드와 서버 API 권한 검사를 모두 적용한다. 프론트 라우트 가드만으로 끝내지 않는다.

### 33.3 관리자 화면 소속

| 업무 | 소속 |
|---|---|
| 회원 관리(활성화/역할) | Core |
| 업체 가입 심사(1차 게이트키핑, 사업자번호 확인) | Core |
| 단지 등 공유 마스터데이터 | Core |
| 결제/주문/쿠폰/포인트 | Core |
| 승인된 업체의 서비스 내부 운영(집팔고: 매물 검수·매도증빙 정산 / 집테리어: 포트폴리오 검수·견적 배정 / 집서비스: 견적 배정·상품 관리) | 각 서비스 자체 관리자 |

집팔고 전용 관리자는 별도 배포 단위로 분리할 필요 없이, 집팔고360 웹 앱(`apps/web`) 안에서 메뉴·경로만 Core와 분리하면 된다. 집테리어는 기존 별도 관리자(`/srv/zipterior`)를 그대로 유지하고 다시 만들지 않는다.

### 33.4 2026-08-28 코드 확인 결과

- `apps/web/src/app/admin/*`는 "집팔고360 통합 관리자"로 이름 붙어 있으나, 회원 관리·업체 승인 관리·단지 마스터데이터는 Core 성격이 맞고, 매도증빙 검토(더블베네핏)는 실제로는 집팔고 전용 업무다. 지금 admin 홈 화면은 이를 모두 "서비스 공통 항목"으로 표기하고 있어 재분류가 필요하다.
- 업체가입 화면(`apps/web/src/app/onboarding/company/page.tsx`)이 `company_type: "real_estate"`를 하드코딩해서 전송한다. 지금 실제로 동작하는 업체가입은 집팔고(공인중개사)뿐이며, 집테리어·집서비스 업체가입 경로는 아직 없다.
- SSO 발급/검증(`/auth/sso/issue-code`, `/auth/sso/verify`)은 구현돼 있으나, 12.3절이 정한 등급·결제상태 필드는 아직 포함돼 있지 않고, 실제 운영 트래픽으로 하위 서비스와의 단대단 검증은 확인되지 않았다.
- 집테리어 기존 가입자 이관 스크립트(`apps/api/scripts/zipterior_migration/`)는 작성돼 있으나 서버에서 실행되지 않았다. 이 단계가 끝나기 전에는 집테리어 자체 로그인 진입점을 정리하지 않는다.
- 2026-08-27 PC `/zipterior` → `/map?mode=interior` 전환 작업으로 그 화면에서 집테리어 자체 로그인·회원사 메뉴 진입점이 먼저 빠졌다. 이관 단계가 끝나기 전에 발생한 상태 변화이며 33.5절 미정 사항으로 관리한다.

### 33.5 미정 사항

다음 세션은 아래 항목을 임의로 결론 내리지 말고, 사용자와 확인한 뒤 이 문서를 갱신하고 진행한다.

1. 집테리어·집서비스 업체가입을 이 SSO 체계로 언제 받을지.
2. `/map?mode=interior`에서 빠진 집테리어 자체 로그인·회원사 메뉴 처리 방식.
3. 관리자 권한 세분화(전체를 보는 슈퍼관리자 vs 서비스별 담당자) 도입 시점.
4. 매도증빙 검토 화면을 실제로 집팔고 관리자 섹션으로 이동하는 시점.
5. 업체 겸업 케이스가 실제로 발생할 경우 `company_memberships`/`company_services` 전환 재검토.
