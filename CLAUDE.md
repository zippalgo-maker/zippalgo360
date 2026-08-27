# 집팔고360 프로젝트 작업 지침

## 최우선 규칙: 모든 작업은 기록한다

**이 규칙은 다른 어떤 판단보다 우선한다.** 특히 서버(115.68.195.144) 배포/운영처럼
되돌리기 어렵거나 다음 세션이 상태를 모르면 사고로 이어지는 작업은 반드시
`docs/WORK_LOG.md`에 기록한다.

- **작업 시작 전**: 무엇을, 왜 하는지 한두 줄로 먼저 기록한다.
- **작업 중**: 중요한 결정, 발견한 문제, 막힌 지점이 생기면 그 즉시 추가한다.
  끝나고 나서 몰아서 쓰지 않는다.
- **작업 완료 후**: 결과(성공/실패)와 서버에 실제로 반영된 최종 상태를 기록한다.
- 기록 후에는 `docs/WORK_LOG.md` 변경사항을 커밋·푸시해서 유실되지 않게 한다.

새 세션이 시작되거나 컨텍스트가 초기화되어도 **`docs/WORK_LOG.md`를 가장 먼저
읽고** 서버에 지금까지 뭐가 설치·설정되어 있는지 파악한 뒤 작업을 이어간다.
이 세션은 서버에 SSH로 직접 접속할 수 없고, 사용자가 명령어를 대신 실행해주는
방식으로만 서버 상태를 바꿀 수 있으므로, 기록이 곧 유일한 진실의 출처(source of
truth)다.

## 브랜치 정책: 모든 세션은 `claude/jippalgo360-platform-6bvrfh` 하나만 쓴다

이 저장소에서 동시에 여러 Claude 세션이 작업하는 경우가 흔하다. 세션마다
제각각 다른 브랜치를 만들어 작업하면, 서버(`/srv/zippalgo360`)가 그중
한 브랜치로 체크아웃된 채 배포될 때 **다른 세션의 최신 작업이 예전
버전으로 통째로 덮어써지는 사고**가 난다(2026-08-27 실제 발생 — 집서비스
작업 세션이 서버를 자기 브랜치로 전환+배포하면서 `/map`이 반나절치
작업과 함께 몇 시간 전 상태로 되돌아감).

- **모든 세션은 `claude/jippalgo360-platform-6bvrfh` 브랜치에서
  작업하고 거기로 바로 푸시한다.** 이 브랜치가 이 저장소의 기본
  브랜치(origin HEAD)다. 새 세션이 시작되면서 자동으로 다른 이름의
  브랜치가 배정되더라도, 작업 시작 전에 `claude/jippalgo360-platform
  -6bvrfh`로 갈아타거나 병합해서 그 브랜치 기준으로 커밋·푸시할 것.
- **서버에서 배포하기 전엔 항상 `git branch --show-current`로 현재
  브랜치를 확인**하고, `claude/jippalgo360-platform-6bvrfh`가 아니면
  먼저 그 브랜치로 전환 + `git pull`부터 한다. 다른 브랜치로 체크아웃한
  채로 배포하지 않는다.
- **푸시 전엔 항상 `git fetch` 후 fast-forward 가능한지 확인**하고,
  뒤처져 있으면 `git merge origin/claude/jippalgo360-platform-6bvrfh`
  (rebase나 reset이 아님)로 합친 뒤 다시 푸시한다. 충돌 나면 양쪽 작업을
  전부 보존하며 수동으로 해결한다(임의로 한쪽을 버리지 않는다).
- 이 규칙을 어기고 다른 브랜치에서 서버 배포를 하게 되면 반드시
  `docs/WORK_LOG.md`에 그 사실과 병합 결과를 기록한다.

## 프로젝트 구조

- `apps/web` — Next.js 프론트엔드 (집팔고360 메인, 집팔고, 집사고, 통합 지도)
- `apps/api` — FastAPI 백엔드 (SQLAlchemy Core + raw SQL, Alembic)
- `docs/` — 기획/레퍼런스/작업 기록

## 네이밍 규칙

- "집"으로 시작하는 모든 서브서비스의 영문 표현은 **`jip`이 아니라 `zip`으로
  로마자화**한다: 집팔고=**zippalgo**, 집사고=**zipsago**, 집테리어=**zipterior**,
  집이사=**zipisa**, 집청소=**zipcheongso**. 한글 발음을 그대로 로마자화한
  `jip*` 표기는 쓰지 않는다(2026-08-26, `apps/web/src/app/{jipalgo,jipsago,
  jipterior,jipisa,jipcheongso}` → `apps/web/src/app/{zippalgo,zipsago,
  zipterior,zipisa,zipcheongso}`로 라우트 폴더/slug/링크/컴포넌트명 전체를
  이 규칙에 맞춰 일괄 수정함).
- 서버에 이미 존재하는 별도 인프라(집테리어의 `/srv/zipterior`,
  `zipterior_app`/`zipterior_db`, `zipterior-api.service`,
  `zipterior.zippalgo360.com` 등)는 이 저장소가 관리하는 프론트엔드 라우트와
  무관한, 이미 `zip` 표기를 쓰던 별도 코드베이스/서버라 이번 규칙과 항상
  일치한다 — 그대로 유지, 변경 대상 아님.

## 아키텍처 원칙

- 집팔고360이 아파트 단지/평형 등 공유 마스터 데이터의 **소유자(own API, own DB)**다.
  집테리어는 집팔고360의 하위 브랜드이며, 장기적으로 집테리어가 집팔고360의 API를
  쓰는 구조로 전환한다 (지금은 반대로 집팔고360이 집테리어 공개 API를 프록시해서
  포트폴리오/지도 데이터를 가져오는 과도기 상태).
- 서버 배포 시 집테리어와 완전히 분리된 이름을 쓴다: `/srv/zippalgo360`,
  `zippalgo_app`/`zippalgo360_db`, `zippalgo360-api`/`zippalgo360-web` systemd
  서비스, 별도 nginx 서버블록. 집테리어의 기존 설정(`/srv/zipterior`,
  `zipterior_app`/`zipterior_db`, `zipterior-api.service`, 포트 8000)은 건드리지 않는다.
