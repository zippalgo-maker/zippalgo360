import httpx
from fastapi import HTTPException, status

from app.config import get_settings

settings = get_settings()

REQUEST_TIMEOUT_SECONDS = 5.0

# 카카오 계정에 이메일 동의를 안 했거나(선택 동의 항목) 앱이 이메일 스코프
# 검수를 통과하지 못한 경우 kakao_account.email이 아예 안 내려온다. users.email이
# NOT NULL UNIQUE라 이 경우에도 가입은 되게, kakao_id 기반의 플레이스홀더
# 이메일을 만든다 — 실제 수신 가능한 주소가 아니므로 이 도메인으로는 발송 금지.
_PLACEHOLDER_EMAIL_DOMAIN = "kakao-user.zippalgo360.local"


class KakaoProfile:
    def __init__(self, kakao_id: str, email: str, nickname: str):
        self.kakao_id = kakao_id
        self.email = email
        self.nickname = nickname


def fetch_kakao_profile(code: str, redirect_uri: str | None) -> KakaoProfile:
    if not settings.kakao_rest_api_key:
        raise HTTPException(
            status_code=status.HTTP_501_NOT_IMPLEMENTED,
            detail="카카오 로그인이 아직 설정되지 않았습니다.",
        )

    token_data = {
        "grant_type": "authorization_code",
        "client_id": settings.kakao_rest_api_key,
        "redirect_uri": redirect_uri or settings.kakao_redirect_uri,
        "code": code,
    }
    if settings.kakao_client_secret:
        token_data["client_secret"] = settings.kakao_client_secret

    try:
        token_response = httpx.post(
            "https://kauth.kakao.com/oauth/token",
            data=token_data,
            headers={"Content-Type": "application/x-www-form-urlencoded;charset=utf-8"},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        token_response.raise_for_status()
        access_token = token_response.json()["access_token"]

        profile_response = httpx.get(
            "https://kapi.kakao.com/v2/user/me",
            headers={"Authorization": f"Bearer {access_token}"},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        profile_response.raise_for_status()
        profile = profile_response.json()
    except (httpx.HTTPError, KeyError, ValueError) as exc:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="카카오 인증에 실패했습니다.",
        ) from exc

    kakao_id = str(profile["id"])
    kakao_account = profile.get("kakao_account", {})
    email = kakao_account.get("email") or f"{kakao_id}@{_PLACEHOLDER_EMAIL_DOMAIN}"
    nickname = kakao_account.get("profile", {}).get("nickname") or "카카오사용자"

    return KakaoProfile(kakao_id=kakao_id, email=email, nickname=nickname)
