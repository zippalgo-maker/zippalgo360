"""집테리어 users 내보내기(jsonl)를 집팔고360 users 테이블로 이관한다.

집테리어 서버에서 01_export_on_zipterior.sql로 만든
zipterior_users_export.jsonl 파일을 이 스크립트가 있는 서버(집팔고360)로
옮긴 뒤 실행한다.

범위(중요):
- 신원(이메일/비밀번호해시/이름/전화번호/카카오ID)만 이관한다. 업체(회사)
  데이터는 다루지 않는다.
- 이관되는 계정은 전부 role='customer'로 생성한다.
- kakao_id가 있으면 kakao_id로, 없으면 이메일로 기존 집팔고360 계정과
  매칭한다. 매칭되면(이미 있는 계정이면) **절대 덮어쓰지 않고 건너뛴다.**
- 비밀번호 해시는 bcrypt 형식($2a$/$2b$/$2y$로 시작)일 때만 그대로
  복사한다. 형식이 다르면(다른 해시 알고리즘이거나 없음) NULL로
  두고(카카오 연동이 있으면 카카오 로그인으로, 없으면 이후 비밀번호 재설정
  기능이 생기면 그걸로 로그인 가능) 통계에 집계한다.
- 기본은 dry-run(미리보기)이다. 실제로 DB에 반영하려면 --commit을 붙여야
  한다. 반드시 사전에 zippalgo360_db를 pg_dump로 백업한 뒤 --commit을
  실행할 것(로컬 서버 이전 가이드의 "운영 변경 전 백업" 원칙).

사용법:
    python 02_import_to_zippalgo360.py zipterior_users_export.jsonl            # dry-run
    python 02_import_to_zippalgo360.py zipterior_users_export.jsonl --commit   # 실제 반영
"""

import argparse
import json
import re
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # apps/api를 import 경로에 추가

from sqlalchemy import text  # noqa: E402

from app.database import engine  # noqa: E402

BCRYPT_RE = re.compile(r"^\$2[aby]\$\d{2}\$.{53}$")

# 집테리어 쪽 실제 컬럼명을 미리 알 수 없어서, 흔히 쓰이는 후보 이름들을
# 순서대로 시도한다(첫 번째로 값이 있는 키를 사용).
FIELD_CANDIDATES: dict[str, list[str]] = {
    "email": ["email"],
    "password_hash": ["password_hash", "hashed_password", "passwordHash"],
    "name": ["name", "nickname", "username", "full_name"],
    "phone": ["phone", "phone_number", "mobile", "mobile_number"],
    "kakao_id": ["kakao_id", "kakaoId", "kakao_uid"],
}


def pick(row: dict, keys: list[str]) -> str | None:
    for key in keys:
        value = row.get(key)
        if value not in (None, ""):
            return str(value)
    return None


def is_inactive(row: dict) -> bool:
    for key in ("deleted_at", "withdrawn_at"):
        if row.get(key):
            return True
    for key in ("is_active", "active"):
        if key in row and row[key] is False:
            return True
    status = row.get("status")
    if isinstance(status, str) and status.lower() in ("deleted", "withdrawn", "inactive", "banned"):
        return True
    return False


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("export_file", help="zipterior_users_export.jsonl 경로")
    parser.add_argument("--commit", action="store_true", help="실제로 DB에 반영한다(기본은 미리보기만)")
    args = parser.parse_args()

    rows = []
    with open(args.export_file, encoding="utf-8") as f:
        for line_no, line in enumerate(f, start=1):
            line = line.strip()
            if not line:
                continue
            try:
                rows.append(json.loads(line))
            except json.JSONDecodeError:
                print(f"[경고] {line_no}행 JSON 파싱 실패, 건너뜀")

    print(f"입력 행 수: {len(rows)}")

    stats = {
        "created": 0,
        "skipped_existing": 0,
        "skipped_no_identifier": 0,
        "skipped_inactive": 0,
        "hash_copied": 0,
        "hash_dropped": 0,
    }
    to_insert = []

    with engine.connect() as conn:
        for row in rows:
            if is_inactive(row):
                stats["skipped_inactive"] += 1
                continue

            email = pick(row, FIELD_CANDIDATES["email"])
            kakao_id = pick(row, FIELD_CANDIDATES["kakao_id"])

            if not email and not kakao_id:
                stats["skipped_no_identifier"] += 1
                continue
            if not email:
                # 카카오 전용 계정인데 이메일이 없는 경우 — 우리 쪽 카카오 로그인과
                # 동일한 플레이스홀더 규칙을 써서, 나중에 이 사람이 직접
                # 카카오로그인하면 kakao_id로 같은 계정에 매칭되게 한다.
                email = f"{kakao_id}@kakao-user.zippalgo360.local"

            existing = None
            if kakao_id:
                existing = conn.execute(
                    text("SELECT id FROM users WHERE kakao_id = :kakao_id"),
                    {"kakao_id": kakao_id},
                ).first()
            if existing is None:
                existing = conn.execute(
                    text("SELECT id FROM users WHERE email = :email"),
                    {"email": email},
                ).first()
            if existing is not None:
                stats["skipped_existing"] += 1
                continue

            password_hash = pick(row, FIELD_CANDIDATES["password_hash"])
            if password_hash and BCRYPT_RE.match(password_hash):
                stats["hash_copied"] += 1
            else:
                if password_hash:
                    stats["hash_dropped"] += 1
                password_hash = None

            name = pick(row, FIELD_CANDIDATES["name"]) or "집테리어 회원"
            phone = pick(row, FIELD_CANDIDATES["phone"])

            to_insert.append(
                {
                    "email": email,
                    "password_hash": password_hash,
                    "name": name,
                    "phone": phone,
                    "kakao_id": kakao_id,
                }
            )
            stats["created"] += 1

        print("\n=== 미리보기(dry-run) 결과 ===")
        for key, value in stats.items():
            print(f"  {key}: {value}")

        if not args.commit:
            print("\n실제로 반영하려면 --commit 옵션을 붙여 다시 실행하세요.")
            print("(반드시 먼저 zippalgo360_db를 pg_dump로 백업할 것)")
            return

        for user in to_insert:
            conn.execute(
                text(
                    """
                    INSERT INTO users (email, password_hash, name, phone, kakao_id, role)
                    VALUES (:email, :password_hash, :name, :phone, :kakao_id, 'customer')
                    """
                ),
                user,
            )
        conn.commit()
        print(f"\n{stats['created']}명 생성 완료.")


if __name__ == "__main__":
    main()
