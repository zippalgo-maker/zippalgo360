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
