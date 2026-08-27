-- 집테리어 서버에서 실행. 읽기 전용 — 아무것도 수정하지 않음.
--
-- users 테이블의 실제 컬럼명을 몰라도 되도록 row_to_json으로 전체 컬럼을
-- 그대로 JSON 한 줄씩 내보낸다(스키마를 미리 조사할 필요 없이 안전하게
-- "일단 전부 내보내고" 나중에(import 스크립트에서) 필요한 필드만 골라 쓴다).
--
-- 실행:
--   psql <zipterior_db 접속정보> -f 01_export_on_zipterior.sql
-- 결과 파일: 실행한 위치에 zipterior_users_export.jsonl 생성됨.

\copy (SELECT row_to_json(u) FROM users u) TO 'zipterior_users_export.jsonl'
