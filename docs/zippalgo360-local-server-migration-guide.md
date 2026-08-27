# 집팔고360 로컬 서버 구축·이전 작업 지침

기준일: 2026-08-27 / Ubuntu Server 단독 운영 확정

## 최종 하드웨어

- Intel i5-8500 / RAM 16GB
- SSD 120GB: Ubuntu Server 24.04 LTS
- SSD 250GB: PostgreSQL + 집팔고360/집테리어 앱
- HDD 1TB: WebP 이미지/미디어
- HDD 4TB: 전용 백업
- 인터넷: 1Gbps 회선, 실측 약 600Mbps

## 운영 원칙

- Windows 11 제거, Ubuntu Server 24.04 LTS 단독 설치
- 평상시 별도 Windows PC에서 SSH 관리, 비상 시 로컬 콘솔 사용
- 현재 클라우드와 동일한 Ubuntu/PostgreSQL/Node/Python/Nginx/systemd 환경을 최대한 복제
- 집팔고360 Core + 집팔고/집사고/집테리어/집서비스 API 경계 유지
- 내부 API는 localhost 통신, 이미지 정적 전송은 Nginx 담당

## 백업/롤백

- 4TB HDD는 단순 미러가 아니라 버전 보존형 백업으로 구성
- PostgreSQL 정기 pg_dump 및 중요 작업 전 dump
- 미디어 rsync 증분 백업, 원본 삭제가 즉시 백업 삭제로 전파되지 않게 구성
- Git + release checkpoint + nginx/systemd/.env 백업
- 운영 변경 전 반드시 백업 → 변경 → 검증 → release 또는 선택적 rollback
- DB와 코드 롤백을 분리하여 최신 회원/결제 데이터를 불필요하게 과거로 되돌리지 않음

## 이전 순서

1. 클라우드 실제 DB/포트/이미지 경로/Nginx/systemd/.env 조사
2. Ubuntu 설치 및 디스크 구성
3. 런타임/PostgreSQL/Nginx 설치
4. 코드/DB/이미지 복제
5. 내부 API 및 정적 이미지 경로 검증
6. 회원/업체/결제/집팔고/집사고/집테리어/집서비스 전체 기능 테스트
7. 최종 증분 동기화 후 DNS 전환
8. 기존 클라우드는 안정화 기간 동안 롤백용으로 유지

---
> 원본은 사용자가 업로드한 `ZIPPALGO360_LOCAL_SERVER_MIGRATION_GUIDE.docx`(2026-08-27)이며,
> 이 저장소에는 텍스트만 마크다운으로 옮겨 보관한다(세션에 첨부된 파일은 이 저장소에 남지
> 않으므로, 다음 세션이 참고할 수 있도록 커밋해 둠). `docs/zippalgo360-db-architecture-guide.md`,
> `docs/zippalgo360-server-architecture-guide.md`와 함께 같은 날 도착한 3부작 자료.
