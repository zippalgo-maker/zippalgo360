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
