# 집테리어 기존 회원 → 집팔고360 이관

CLAUDE.md 4단계 계획의 3번("기존 집테리어 가입자를 집팔고360 통합회원으로
이관/매핑") 실행 스크립트.

## 범위

- 신원(이메일/비밀번호해시/이름/전화번호/카카오ID)만 이관. 업체(회사) 데이터는
  다루지 않음 — 집테리어 자체 관리자가 계속 관리.
- 이관된 계정은 전부 `role='customer'`로 생성.
- 매칭: kakao_id 우선, 없으면 이메일. 이미 집팔고360에 있는 계정은 **절대
  덮어쓰지 않고 건너뜀**.
- 비밀번호 해시는 bcrypt 형식일 때만 복사, 아니면 NULL(카카오 연동 있으면
  카카오로그인으로 이용 가능).

## 실행 순서

1. **(필수) 집팔고360 DB 백업** — `--commit` 실행 전 반드시:
   ```bash
   pg_dump <zippalgo360_db 접속정보> > pre-zipterior-migration-backup.sql
   ```
2. **집테리어 서버**에서 읽기 전용 내보내기:
   ```bash
   psql <zipterior_db 접속정보> -f 01_export_on_zipterior.sql
   # zipterior_users_export.jsonl 생성됨
   ```
3. 그 파일을 **집팔고360 서버**(`/srv/zippalgo360`)로 옮김(scp 등).
4. 집팔고360 서버에서 **미리보기(dry-run, 기본값)**:
   ```bash
   cd /srv/zippalgo360/apps/api
   source venv/bin/activate
   python scripts/zipterior_migration/02_import_to_zippalgo360.py \
     /path/to/zipterior_users_export.jsonl
   ```
   → 생성/건너뜀/비밀번호 형식 등 통계만 출력, DB는 전혀 안 바뀜.
5. 미리보기 숫자가 이상하지 않으면(예: `skipped_no_identifier`가 비정상적으로
   크면 export 파일 자체를 다시 확인) **실제 반영**:
   ```bash
   python scripts/zipterior_migration/02_import_to_zippalgo360.py \
     /path/to/zipterior_users_export.jsonl --commit
   ```
6. 완료 후 `/admin/members`에서 새로 생긴 회원 수 확인.

## 안전장치

- export는 `SELECT`만 사용(집테리어 DB 전혀 수정 안 함).
- import는 기본이 dry-run — `--commit`을 명시해야만 실제로 INSERT.
- 기존 집팔고360 계정은 이메일/kakao_id 매칭 시 무조건 건너뜀(업데이트도 안 함).
- 재실행해도 안전(idempotent) — 이미 이관된 계정은 자동으로 건너뜀.
