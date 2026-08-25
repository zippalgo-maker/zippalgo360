import httpx

from app.config import get_settings

settings = get_settings()

REQUEST_TIMEOUT_SECONDS = 3.0


def geocode_address(address: str) -> tuple[float, float] | None:
    """주소를 (latitude, longitude)로 변환한다.

    REST API 키가 없거나, 요청 실패, 매칭되는 주소 없음 등 어떤 이유로든
    실패하면 None을 반환한다 — 업체 가입을 막지 않고 지도 마커만 비워둔다
    (관리자가 나중에 주소를 정정하면 재시도할 수 있음).
    """
    if not settings.kakao_rest_api_key:
        return None

    try:
        response = httpx.get(
            "https://dapi.kakao.com/v2/local/search/address.json",
            params={"query": address},
            headers={"Authorization": f"KakaoAK {settings.kakao_rest_api_key}"},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        documents = response.json().get("documents", [])
        if not documents:
            return None
        first = documents[0]
        return float(first["y"]), float(first["x"])
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return None
