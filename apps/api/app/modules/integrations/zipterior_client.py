import httpx

from app.config import get_settings
from app.modules.integrations.schemas import (
    ZipteriorCompanySummary,
    ZipteriorPortfolioCard,
    ZipteriorPortfolioListOut,
)

settings = get_settings()

REQUEST_TIMEOUT_SECONDS = 5.0


def _absolute_media_url(path: str | None) -> str | None:
    if not path:
        return None
    if path.startswith("http://") or path.startswith("https://"):
        return path
    return f"{settings.zipterior_api_base_url}{path if path.startswith('/') else '/' + path}"


def _to_card(item: dict) -> ZipteriorPortfolioCard:
    company = item["company"]
    thumbnail = None
    representative_image = item.get("representative_image")
    if representative_image:
        thumbnail = representative_image.get("thumbnail", {}).get("path") or representative_image.get(
            "thumbnail_path"
        )
    thumbnail = thumbnail or item.get("representative_thumbnail_path")

    # TODO: 집테리어 프론트엔드의 실제 포트폴리오 상세 라우팅 확인 후 조정 필요.
    detail_url = f"{settings.zipterior_api_base_url}/?portfolio={item['id']}"

    return ZipteriorPortfolioCard(
        id=item["id"],
        title=item["title"],
        summary=item.get("summary"),
        company=ZipteriorCompanySummary(
            id=company["id"],
            name=company["name"],
            logo_path=_absolute_media_url(company.get("logo_path")),
            phone=company.get("phone"),
        ),
        complex_id=item.get("complex_id"),
        complex_name=item.get("complex_name"),
        apartment_type_id=item.get("apartment_type_id"),
        apartment_type_name=item.get("apartment_type_name"),
        pyeong_label=item.get("pyeong_label"),
        thumbnail_url=_absolute_media_url(thumbnail),
        view_count=item.get("view_count", 0),
        like_count=item.get("like_count", 0),
        published_at=item["published_at"],
        detail_url=detail_url,
    )


def get_portfolios_for_complex_type(
    *, complex_id: int, apartment_type_id: int | None, limit: int = 6
) -> ZipteriorPortfolioListOut:
    """같은 단지·같은 평형 타입의 집테리어 시공사례를 가져온다.

    집테리어 API가 응답하지 않아도(네트워크 장애, 배포 중단 등) 집팔고360의
    나머지 기능이 영향받지 않도록 실패 시 available=False로 빈 목록을 돌려준다.
    """
    params: dict = {"complex_id": complex_id, "limit": limit, "sort": "popular"}
    if apartment_type_id is not None:
        params["apartment_type_id"] = apartment_type_id

    try:
        response = httpx.get(
            f"{settings.zipterior_api_base_url}/api/v1/portfolios",
            params=params,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
    except (httpx.HTTPError, ValueError, KeyError):
        return ZipteriorPortfolioListOut(items=[], total=0, available=False)

    try:
        items = [_to_card(item) for item in data["items"]]
    except (KeyError, TypeError):
        return ZipteriorPortfolioListOut(items=[], total=0, available=False)

    return ZipteriorPortfolioListOut(items=items, total=data.get("total", len(items)), available=True)
