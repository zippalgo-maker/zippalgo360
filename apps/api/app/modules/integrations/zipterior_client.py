import re

import httpx

from app.config import get_settings
from app.modules.integrations.schemas import (
    ZipteriorApartmentType,
    ZipteriorCompanyMapMarker,
    ZipteriorCompanyMapMarkerListOut,
    ZipteriorCompanySummary,
    ZipteriorComplexDetailOut,
    ZipteriorComplexPortfolioListOut,
    ZipteriorMapMarker,
    ZipteriorMapMarkerListOut,
    ZipteriorPortfolioCard,
    ZipteriorPortfolioDetailOut,
    ZipteriorPortfolioImage,
    ZipteriorPortfolioListOut,
    ZipteriorPortfolioSummary,
    ZipteriorViewportItem,
    ZipteriorViewportOut,
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


def get_interior_viewport(
    *,
    marker_type: str,
    zoom: int,
    north: float,
    south: float,
    east: float,
    west: float,
    has_portfolio: bool = False,
    source_limit: int = 3000,
) -> ZipteriorViewportOut:
    """줌 레벨에 맞춰 집테리어 서버가 미리 클러스터링해서 내려주는 지도
    뷰포트를 가져온다(`/api/v1/public/map/viewport`) — 집테리어 자체
    지도가 쓰는 것과 같은 엔드포인트. `get_interior_map_markers`(원본
    마커를 그대로 주는 `/map/markers`)와 달리, 줌아웃 상태에서도 브라우저가
    수천 개 원본 마커를 직접 다루지 않고 이미 뭉쳐진 소수의 클러스터/
    마커만 받는다 — 실측: zoom=8 넓은 화면에서 원본 1,261건이 클러스터
    4개로 줄어서 옴.
    """
    params: dict = {
        "marker_type": marker_type,
        "zoom": zoom,
        "north": north,
        "south": south,
        "east": east,
        "west": west,
        "source_limit": source_limit,
    }
    if has_portfolio:
        params["has_portfolio"] = "true"

    try:
        response = httpx.get(
            f"{settings.zipterior_api_base_url}/api/v1/public/map/viewport",
            params=params,
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
        items = [
            ZipteriorViewportItem(
                item_type=item["item_type"],
                marker_type=item["marker_type"],
                id=item.get("id"),
                name=item.get("name"),
                latitude=float(item["latitude"]),
                longitude=float(item["longitude"]),
                count=item["count"],
                portfolio_count=item.get("portfolio_count") or 0,
                apartment_type_count=item.get("apartment_type_count"),
                logo_path=item.get("logo_path"),
            )
            for item in data["items"]
        ]
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return ZipteriorViewportOut(
            zoom=zoom, clustered=False, items=[], total_items=0, source_marker_count=0, available=False
        )

    return ZipteriorViewportOut(
        zoom=data.get("zoom", zoom),
        clustered=data.get("clustered", False),
        items=items,
        total_items=data.get("total_items", len(items)),
        source_marker_count=data.get("source_marker_count", 0),
        available=True,
    )


# 아래 3개 함수(get_complex_detail/get_complex_portfolios/get_portfolio_detail)는
# 집팔고360 지도의 "인테리어 시공사례" 마커를 클릭했을 때 집테리어 지도와
# 동일한 화면(부채꼴 마커 → 단지 기본정보 → 평형별 포트폴리오 → 포트폴리오
# 상세)을 보여주기 위한 것. 필드 매핑은 집테리어 자체 프론트
# (js/app.js의 mapApiComplex/mapApiType/mapApiPortfolio)의 로직을 그대로
# Python으로 옮긴 것 — 두 프론트가 같은 데이터를 같은 방식으로 해석하게
# 맞추기 위함.


def _pyeong_label(pyeong_label: str | None, supply_area_m2: float | None, exclusive_area_m2: float | None) -> str:
    # 집테리어 js/app.js의 pyeongLabelFromType()과 동일: pyeong_label이
    # 있으면 그 안의 숫자 부분만 뽑아 쓴다("70A" -> "70") — 문자가 섞여
    # 있어도(공급면적 기준 타입 코드 등) 평형 숫자만 남긴다.
    if pyeong_label:
        match = re.search(r"\d+(?:\.\d+)?", str(pyeong_label))
        if match:
            return match.group(0)
    m2 = supply_area_m2 or exclusive_area_m2 or 0
    return str(max(1, int(m2 / 3.305785))) if m2 else "평형"


def _to_apartment_type(item: dict) -> ZipteriorApartmentType:
    supply = float(item.get("supply_area_m2") or 0) or None
    exclusive = float(item.get("exclusive_area_m2") or 0) or None
    area = _pyeong_label(item.get("pyeong_label"), supply, exclusive)
    type_name = str(item.get("type_name") or "A")
    type_code = type_name[len(area):].strip() if type_name.startswith(area) else type_name
    return ZipteriorApartmentType(
        id=item["id"],
        area=area,
        type=type_code or type_name,
        count=int(item.get("portfolio_count") or 0),
        supply_area_m2=supply,
        exclusive_area_m2=exclusive,
        room_count=item.get("room_count"),
        bathroom_count=item.get("bathroom_count"),
        rate=f"{(exclusive / supply * 100):.1f}%" if supply and exclusive else None,
        floor_plan_path=_absolute_media_url(item.get("floor_plan_path")),
    )


def get_complex_detail(complex_id: int) -> ZipteriorComplexDetailOut:
    """단지 기본정보(집테리어 마커 클릭 시 뜨는 패널 상단)를 가져온다."""
    try:
        response = httpx.get(
            f"{settings.zipterior_api_base_url}/api/v1/public/complexes/{complex_id}",
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        item = response.json()
        images = [
            url
            for url in (
                _absolute_media_url(image.get("image_path")) for image in (item.get("images") or [])
            )
            if url
        ]
        return ZipteriorComplexDetailOut(
            id=item["id"],
            name=item["name"],
            latitude=float(item["latitude"]),
            longitude=float(item["longitude"]),
            address=item.get("road_address")
            or item.get("jibun_address")
            or " ".join(filter(None, [item.get("sido"), item.get("sigungu"), item.get("eupmyeondong")])),
            year=str(item.get("completion_year") or "-"),
            households=f"{item['household_count']:,}세대" if item.get("household_count") else "정보없음",
            buildings=f"{item['building_count']}개동" if item.get("building_count") else "정보없음",
            parking=f"{item['parking_count']:,}대" if item.get("parking_count") else "정보없음",
            heating=item.get("heating_type") or "정보없음",
            builder=item.get("builder_name") or "정보없음",
            portfolio_count=int(item.get("portfolio_count") or 0),
            apartment_types=[_to_apartment_type(t) for t in (item.get("apartment_types") or [])],
            images=images,
            available=True,
        )
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return ZipteriorComplexDetailOut(
            id=complex_id,
            name="",
            latitude=0,
            longitude=0,
            address="",
            year="-",
            households="정보없음",
            buildings="정보없음",
            parking="정보없음",
            heating="정보없음",
            builder="정보없음",
            portfolio_count=0,
            apartment_types=[],
            images=[],
            available=False,
        )


def _portfolio_budget(budget_min: float | None, budget_max: float | None) -> str:
    def won(value: float | None) -> str:
        if not value:
            return ""
        return f"{round(float(value) / 10000):,}만원"

    a, b = won(budget_min), won(budget_max)
    if a and b:
        return f"{a}~{b}"
    return a or b or "예산 미등록"


def _to_portfolio_summary(item: dict, fallback_complex_name: str = "") -> ZipteriorPortfolioSummary:
    company = item.get("company") or {}
    supply = item.get("supply_area_m2")
    area = item.get("pyeong_label") or (f"{max(1, round(float(supply) / 3.305785))}평" if supply else "평형")
    return ZipteriorPortfolioSummary(
        id=item["id"],
        company_id=company.get("id"),
        company_name=company.get("name") or "인테리어 업체",
        complex_name=item.get("complex_name") or fallback_complex_name,
        title=item.get("title") or "",
        scope=item.get("construction_scope") or "시공범위 미등록",
        budget=_portfolio_budget(item.get("budget_min"), item.get("budget_max")),
        duration=f"{item['construction_days']}일" if item.get("construction_days") else "기간 미등록",
        date=str(item.get("published_at") or item.get("construction_date") or "")[:10].replace("-", "."),
        area=area,
        type=item.get("apartment_type_name") or "",
        image=_absolute_media_url(
            item.get("representative_thumbnail_path")
            or item.get("representative_medium_path")
            or item.get("representative_large_path")
        ),
    )


def get_complex_portfolios(*, complex_id: int, limit: int = 100, offset: int = 0) -> ZipteriorComplexPortfolioListOut:
    """단지 상세 패널의 포트폴리오 카드 목록(평형/타입 필터는 프론트에서)."""
    try:
        response = httpx.get(
            f"{settings.zipterior_api_base_url}/api/v1/portfolios",
            params={"complex_id": complex_id, "limit": limit, "offset": offset},
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        data = response.json()
        items = [_to_portfolio_summary(item) for item in data["items"]]
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return ZipteriorComplexPortfolioListOut(items=[], total=0, available=False)

    return ZipteriorComplexPortfolioListOut(items=items, total=data.get("total", len(items)), available=True)


def get_portfolio_detail(portfolio_id: int) -> ZipteriorPortfolioDetailOut:
    """포트폴리오 카드 클릭 시 뜨는 상세(히어로 이미지 + 사진 목록 + 업체정보)."""
    try:
        response = httpx.get(
            f"{settings.zipterior_api_base_url}/api/v1/portfolios/{portfolio_id}",
            timeout=REQUEST_TIMEOUT_SECONDS,
        )
        response.raise_for_status()
        item = response.json()
        company = item.get("company") or {}
        raw_images = item.get("images") or []
        images = [
            ZipteriorPortfolioImage(src=url, caption=image.get("description") or None)
            for image in raw_images
            if (url := _absolute_media_url(image.get("large_path") or image.get("medium_path") or image.get("thumbnail_path")))
        ]
        representative = _absolute_media_url(
            item.get("representative_large_path")
            or item.get("representative_medium_path")
            or item.get("representative_thumbnail_path")
        )
        hero_image = representative or (images[0].src if images else None)
        summary = _to_portfolio_summary(item)
        return ZipteriorPortfolioDetailOut(
            id=item["id"],
            company_id=company.get("id"),
            company_name=company.get("name") or "인테리어 업체",
            company_logo=_absolute_media_url(company.get("logo_path")),
            company_phone=company.get("phone"),
            complex_id=item.get("complex_id"),
            complex_name=summary.complex_name,
            title=summary.title,
            scope=summary.scope,
            budget=summary.budget,
            duration=summary.duration,
            date=summary.date,
            area=summary.area,
            type=summary.type,
            intro=item.get("summary") or item.get("description") or "",
            hero_image=hero_image,
            images=images,
            available=True,
        )
    except (httpx.HTTPError, ValueError, KeyError, TypeError):
        return ZipteriorPortfolioDetailOut(
            id=portfolio_id,
            company_name="",
            complex_name="",
            title="",
            scope="",
            budget="",
            duration="",
            date="",
            area="",
            type="",
            intro="",
            images=[],
            available=False,
        )
