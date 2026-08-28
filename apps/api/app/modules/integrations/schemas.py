from datetime import datetime

from pydantic import BaseModel


class ZipteriorCompanySummary(BaseModel):
    id: int
    name: str
    logo_path: str | None
    phone: str | None


class ZipteriorPortfolioCard(BaseModel):
    id: int
    title: str
    summary: str | None
    company: ZipteriorCompanySummary
    complex_id: int | None
    complex_name: str | None
    apartment_type_id: int | None
    apartment_type_name: str | None
    pyeong_label: str | None
    thumbnail_url: str | None
    view_count: int
    like_count: int
    published_at: datetime
    detail_url: str
    distance_km: float | None = None
    """`sort=nearest`로 조회했을 때만 채워지는, 기준 좌표로부터의 거리(km)."""


class ZipteriorPortfolioListOut(BaseModel):
    items: list[ZipteriorPortfolioCard]
    total: int
    available: bool
    """집테리어 API에 접속할 수 없을 때 False. 이 경우 items는 빈 배열."""


class ZipteriorMapMarker(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    sido: str | None
    sigungu: str | None
    portfolio_count: int


class ZipteriorMapMarkerListOut(BaseModel):
    items: list[ZipteriorMapMarker]
    total: int
    available: bool
    """집테리어 API에 접속할 수 없을 때 False. 이 경우 items는 빈 배열."""


class ZipteriorCompanyMapMarker(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    phone: str | None = None


class ZipteriorCompanyMapMarkerListOut(BaseModel):
    items: list[ZipteriorCompanyMapMarker]
    total: int
    available: bool
    """집테리어 API에 접속할 수 없거나 아직 이 마커 종류를 지원하지 않을 때 False."""


class ZipteriorViewportItem(BaseModel):
    item_type: str
    """"cluster" 또는 "marker"(개별)."""
    marker_type: str
    id: int | None = None
    name: str | None = None
    latitude: float
    longitude: float
    count: int
    """이 클러스터/마커가 대표하는 개수(개별 마커면 1)."""
    portfolio_count: int = 0
    apartment_type_count: int | None = None
    logo_path: str | None = None


class ZipteriorViewportOut(BaseModel):
    zoom: int
    clustered: bool
    items: list[ZipteriorViewportItem]
    total_items: int
    """실제로 화면에 그릴 클러스터/마커 개수(적음, 이게 보통 원본 개수가 아님)."""
    source_marker_count: int
    """이 뷰포트 안에 있는 원본 마커 총합(클러스터링 전 진짜 개수)."""
    available: bool
    """집테리어 API에 접속할 수 없을 때 False."""


class ZipteriorApartmentType(BaseModel):
    """집테리어 지도의 "부채꼴 마커" 한 조각(평형 타입)에 대응."""

    id: int
    area: str
    """평형 숫자(예: "34")."""
    type: str
    """타입 기호(예: "A", "B")."""
    count: int
    """이 타입의 시공사례 건수."""
    supply_area_m2: float | None = None
    exclusive_area_m2: float | None = None
    room_count: int | None = None
    bathroom_count: int | None = None
    rate: str | None = None
    floor_plan_path: str | None = None


class ZipteriorComplexDetailOut(BaseModel):
    id: int
    name: str
    latitude: float
    longitude: float
    address: str
    year: str
    households: str
    buildings: str
    parking: str
    heating: str
    builder: str
    portfolio_count: int
    apartment_types: list[ZipteriorApartmentType]
    images: list[str]
    available: bool
    """집테리어 API에 접속할 수 없거나 단지를 못 찾으면 False."""


class ZipteriorPortfolioSummary(BaseModel):
    """단지 상세 패널의 포트폴리오 카드 한 장에 대응."""

    id: int
    company_id: int | None = None
    company_name: str
    complex_name: str
    title: str
    scope: str
    budget: str
    duration: str
    date: str
    area: str
    type: str
    image: str | None = None


class ZipteriorComplexPortfolioListOut(BaseModel):
    items: list[ZipteriorPortfolioSummary]
    total: int
    available: bool
    """집테리어 API에 접속할 수 없을 때 False."""


class ZipteriorPortfolioImage(BaseModel):
    src: str
    caption: str | None = None
    space_id: str | None = None
    """이미지가 속한 공간(방)의 id — `spaces` 목록의 id와 매칭. 매칭되는
    공간이 없으면 None이고, 그 경우 room_label로 대체 그룹핑한다."""
    room_label: str | None = None
    """space_id가 없을 때 쓰는 대체 방 이름(집테리어 app.js의 room_label과
    동일한 fallback 그룹핑 키)."""


class ZipteriorPortfolioSpace(BaseModel):
    """포트폴리오 사진을 방(공간)별로 묶어서 보여주기 위한 그룹 — 집테리어
    포트폴리오 상세의 기본 표시 방식(예: 거실/침실/주방)."""

    id: str
    name: str
    description: str | None = None


class ZipteriorContentBlock(BaseModel):
    """집테리어가 오늘의집에서 원본 그대로 가져온 일부 포트폴리오에만 있는,
    작성자가 정한 순서대로 텍스트·사진·구분선 등이 섞인 문서형 콘텐츠 블록.
    렌더링 규칙은 집테리어 app.js의 renderContentBlock()과 동일하게
    프론트에서 처리하므로, 여기서는 원본 구조를 그대로 통과시킨다."""

    block_type: str
    document_order: int
    image_url: str | None = None
    text_content: str | None = None
    raw_node: dict | None = None


class ZipteriorPortfolioDisplaySettingsOut(BaseModel):
    """포트폴리오 상세 맨 아래 고정 안내문구/이미지/견적문의 CTA — 집테리어
    관리자가 설정하는 값을 그대로 프록시(`GET /public/portfolio-display-
    settings`). notice_enabled가 꺼져 있으면 프론트에서 아무것도 안 그린다."""

    notice_enabled: bool
    notice_image_path: str | None = None
    notice_text: str | None = None
    notice_button_label: str | None = None


class ZipteriorPortfolioDetailOut(BaseModel):
    id: int
    company_id: int | None = None
    company_name: str
    company_logo: str | None = None
    company_phone: str | None = None
    complex_id: int | None = None
    complex_name: str
    title: str
    scope: str
    budget: str
    duration: str
    date: str
    area: str
    type: str
    intro: str
    hero_image: str | None = None
    images: list[ZipteriorPortfolioImage]
    spaces: list[ZipteriorPortfolioSpace] = []
    content_blocks: list[ZipteriorContentBlock] = []
    detail_url: str = ""
    """집테리어 자체 견적문의 모달로 이어지는 원본 상세 페이지 — 우리 쪽에
    아직 없는 기능(포트폴리오별 견적문의 폼)의 폴백 링크로 쓴다."""
    available: bool
    """집테리어 API에 접속할 수 없거나 포트폴리오를 못 찾으면 False."""


class ZipteriorSearchItem(BaseModel):
    """집테리어 통합검색(`/public/map/search`) 결과 한 건 — 단지/업체/
    카카오 보강 장소(place, 아파트·오피스텔·지하철역 등) 셋 중 하나."""

    kind: str
    id: str
    title: str
    sub: str
    tail: str
    latitude: float | None = None
    longitude: float | None = None


class ZipteriorSearchOut(BaseModel):
    items: list[ZipteriorSearchItem]
    available: bool
    """집테리어 API에 접속할 수 없으면 False."""
