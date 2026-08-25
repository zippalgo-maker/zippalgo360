import httpx

from app.config import get_settings
from app.modules.integrations.schemas import (
    ZipteriorCompanyMapMarker,
    ZipteriorCompanyMapMarkerListOut,
    ZipteriorCompanySummary,
    ZipteriorMapMarker,
    ZipteriorMapMarkerListOut,
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


def get_interior_map_markers(
    *,
    north: float | None = None,
    south: float | None = None,
    east: float | None = None,
    west: float | None = None,
    sido: str | None = None,
    sigungu: str | None = None,
    limit: int = 1000,
) -> ZipteriorMapMarkerListOut:
    """시공사례(포트폴리오)가 있는 단지의 지도 마커 목록.

    집테리어의 공개 지도 API(marker_type=complex, has_portfolio=true)를 그대로
    프록시한다. 실패 시(네트워크 장애, 배포 중단 등) available=False로 빈 목록을
    돌려주어 집팔고360 지도 화면이 깨지지 않도록 한다.
    """
    params: dict = {"marker_type": "complex", "has_portfolio": "true", "limit": limit}
    if north is not None:
        params["north"] = north
    if south is not None:
        params["south"] = south
    if east is not None:
        params["east"] = east
    if west is not None:
        params["west"] = west
    if sido:
        params["sido"] = sido
    if sigungu:
        params["sigungu"] = sigungu

    try:
        response = httpx.get(
            f"{settings.zipterior_api_base_url}/api/v1/public/map/markers",
            params=params,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
        items = [
            ZipteriorMapMarker(
                id=item["id"],
                name=item["name"],
                latitude=float(item["latitude"]),
                longitude=float(item["longitude"]),
                sido=item.get("sido"),
                sigungu=item.get("sigungu"),
                portfolio_count=item.get("portfolio_count", 0),
            )
            for item in data["items"]
        ]
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return ZipteriorMapMarkerListOut(items=[], total=0, available=False)

    return ZipteriorMapMarkerListOut(items=items, total=data.get("total", len(items)), available=True)


def get_interior_companies(
    *,
    north: float | None = None,
    south: float | None = None,
    east: float | None = None,
    west: float | None = None,
    limit: int = 1000,
) -> ZipteriorCompanyMapMarkerListOut:
    """인테리어 업체(사무실) 위치 마커.

    집테리어의 공개 지도 마커 API가 `marker_type=complex`(단지)만이 아니라
    `marker_type=company`(업체)도 지원한다는 전제로 만들었다 — 아직 집테리어
    쪽에서 확정된 계약은 아니고, docs/WORK_LOG.md에 남긴 확인 요청에 대한
    응답 대기 중(데스크탑 세션). 지원하지 않으면 그냥 available=False로
    빈 목록이 돌아오므로 지도 자체는 깨지지 않는다.
    """
    params: dict = {"marker_type": "company", "limit": limit}
    if north is not None:
        params["north"] = north
    if south is not None:
        params["south"] = south
    if east is not None:
        params["east"] = east
    if west is not None:
        params["west"] = west

    try:
        response = httpx.get(
            f"{settings.zipterior_api_base_url}/api/v1/public/map/markers",
            params=params,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
        items = [
            ZipteriorCompanyMapMarker(
                id=item["id"],
                name=item["name"],
                latitude=float(item["latitude"]),
                longitude=float(item["longitude"]),
                phone=item.get("phone"),
            )
            for item in data["items"]
        ]
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return ZipteriorCompanyMapMarkerListOut(items=[], total=0, available=False)

    return ZipteriorCompanyMapMarkerListOut(items=items, total=data.get("total", len(items)), available=True)
