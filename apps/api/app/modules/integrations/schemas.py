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
    available: bool
    """집테리어 API에 접속할 수 없거나 포트폴리오를 못 찾으면 False."""
